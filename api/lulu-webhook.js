// Serverless Function para Vercel: /api/lulu-webhook
// Recibe notificaciones PRINT_JOB_STATUS_CHANGED de Lulu Direct API (Sandbox o Producción),
// actualiza el pedido en Firestore y envía correos reales al cliente y al desarrollador/admin.

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { sendEditorialEmail } from '../lib/email-helper.js';
import { explainLuluErrors } from '../lib/lulu-error-guide.js';

const FIREBASE_WEB_API_KEY =
  process.env.VITE_FIREBASE_API_KEY ||
  Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8');

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      apiKey: FIREBASE_WEB_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'editorialmenosruido.firebaseapp.com',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'editorialmenosruido'
    });

const firestoreDb = getFirestore(firebaseApp);
const OWNER_EMAIL = 'jesgilcan@gmail.com';

function extractLuluMessages(job) {
  const out = [];
  if (job?.status?.message) out.push(String(job.status.message));
  if (Array.isArray(job?.status?.messages)) {
    job.status.messages.forEach(m => out.push(typeof m === 'string' ? m : JSON.stringify(m)));
  }
  const items = Array.isArray(job?.line_items) ? job.line_items : [];
  items.forEach(it => {
    const msgs = it?.status?.messages;
    if (Array.isArray(msgs)) {
      msgs.forEach(m => out.push(typeof m === 'string' ? m : JSON.stringify(m)));
    } else if (msgs && typeof msgs === 'object') {
      const norm = msgs.printable_normalization || msgs;
      Object.entries(norm).forEach(([k, v]) => {
        if (Array.isArray(v)) v.forEach(x => out.push(`${k}: ${String(x).trim()}`));
        else if (v) out.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
      });
    }
  });
  return out;
}

function mapLuluStatusToOrderStatus(luluStatusName, isSandbox = false) {
  const s = String(luluStatusName || '').toUpperCase();
  if (s === 'DELIVERED') return 'delivered';
  if (s === 'SHIPPED') return 'shipped';
  if (s === 'IN_PRODUCTION' || s === 'PRODUCTION_READY' || s === 'PRODUCTION_DELAYED') return 'printing';
  if (isSandbox && s === 'UNPAID') return 'printing';
  if (s === 'REJECTED' || s === 'ERROR' || s === 'CANCELED') return 'lulu_error';
  return 'approved_printing';
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'lulu-webhook', status: 'listening' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    const topic = payload.topic || 'PRINT_JOB_STATUS_CHANGED';
    const job = payload.data || payload;
    const jobId = job.id ? String(job.id) : '';
    const externalId = job.external_id ? String(job.external_id) : '';
    const luluStatusName = job.status?.name || 'UNKNOWN';
    const statusMessages = extractLuluMessages(job);
    const lineItem = Array.isArray(job.line_items) ? job.line_items[0] || {} : {};
    const carrierName = lineItem.carrier_name || '';
    const trackingId = lineItem.tracking_id || '';
    const trackingUrl = Array.isArray(lineItem.tracking_urls) ? lineItem.tracking_urls[0] || '' : '';

    // Guardar log del webhook para inspección del desarrollador
    try {
      const logId = `${Date.now()}_${jobId || 'nojob'}`;
      await setDoc(doc(firestoreDb, 'lulu_webhooks', logId), {
        receivedAt: new Date().toISOString(),
        topic,
        jobId,
        externalId,
        luluStatusName,
        statusMessages,
        trackingId,
        rawPayload: payload
      });
    } catch (logErr) {
      console.warn('No se pudo guardar log en lulu_webhooks:', logErr.message);
    }

    // Buscar pedido(s) en Firestore por orderNumber (external_id) o luluJob.jobId
    let matchingDocs = [];
    if (externalId) {
      const q1 = query(collection(firestoreDb, 'orders'), where('orderNumber', '==', externalId));
      const snap1 = await getDocs(q1);
      if (!snap1.empty) matchingDocs = snap1.docs;
    }
    if (!matchingDocs.length && jobId) {
      const q2 = query(collection(firestoreDb, 'orders'), where('luluJob.jobId', '==', jobId));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) matchingDocs = snap2.docs;
    }

    const orderDocSnap = matchingDocs[0] || null;
    const order = orderDocSnap ? orderDocSnap.data() : null;
    const isSandboxOrder = (order?.luluJob?.environment || order?.book?.luluEnv || 'sandbox') === 'sandbox';
    const mappedStatus = mapLuluStatusToOrderStatus(luluStatusName, isSandboxOrder);
    const messagesText = statusMessages.length ? statusMessages.join(' | ') : 'Sin mensajes adicionales';
    const actionGuides = mappedStatus === 'lulu_error' ? explainLuluErrors(statusMessages) : [];
    const shouldNotifyCustomerPrinting =
      mappedStatus === 'printing' && !order?.comms?.imprenta?.sent;
    const shouldNotifyCustomerShipped =
      mappedStatus === 'shipped' && !order?.comms?.tracking?.sent;
    const shouldNotifyCustomerDelivered =
      mappedStatus === 'delivered' && !order?.comms?.entregado?.sent;

    for (const dSnap of matchingDocs) {
      const dData = dSnap.data() || {};
      const prevTimeline = Array.isArray(dData.timeline) ? dData.timeline : [];
      const updatedLuluJob = {
        ...(dData.luluJob || {}),
        jobId: jobId || dData.luluJob?.jobId || '',
        status: luluStatusName,
        rawStatus: job.status || null,
        lastWebhookAt: new Date().toISOString(),
        ...(actionGuides.length ? { actionGuide: actionGuides.join(' ') } : {}),
        ...(carrierName ? { carrier: carrierName } : {}),
        ...(trackingId ? { trackingCode: trackingId, trackingUrl } : {})
      };

      const updatedShipping = {
        ...(dData.shipping || {}),
        ...(carrierName ? { carrier: carrierName } : {}),
        ...(trackingId ? { trackingNumber: trackingId, trackingUrl } : {}),
        lastCarrierMessage: `Lulu (${luluStatusName}): ${messagesText}`
      };

      const updatedComms = { ...(dData.comms || {}) };
      if (shouldNotifyCustomerPrinting) {
        updatedComms.imprenta = { sent: true, date: new Date().toISOString() };
      }
      if (shouldNotifyCustomerShipped) {
        updatedComms.tracking = { sent: true, date: new Date().toISOString() };
      }
      if (shouldNotifyCustomerDelivered) {
        updatedComms.entregado = { sent: true, date: new Date().toISOString() };
      }

      const newEvents = [
        {
          date: new Date().toISOString(),
          message: `Webhook Lulu [${luluStatusName}]${trackingId ? ` · Tracking: ${trackingId}` : ''} · ${messagesText}`
        }
      ];
      if (mappedStatus === 'printing') {
        newEvents.push({
          date: new Date().toISOString(),
          message: 'Tu ejemplar ha pasado la revisión técnica y está en producción.'
        });
      } else if (mappedStatus === 'shipped') {
        newEvents.push({
          date: new Date().toISOString(),
          message: trackingId
            ? `Tu pedido ha salido de imprenta (Seguimiento: ${trackingId}).`
            : 'Tu pedido ha salido de imprenta.'
        });
      } else if (mappedStatus === 'delivered') {
        newEvents.push({
          date: new Date().toISOString(),
          message: 'Tu pedido ha sido entregado en tu dirección.'
        });
      }

      const patch = {
        status: mappedStatus,
        luluJob: updatedLuluJob,
        shipping: updatedShipping,
        comms: updatedComms,
        timeline: [...prevTimeline, ...newEvents]
      };

      await setDoc(doc(firestoreDb, 'orders', dSnap.id), patch, { merge: true });
      if (dData.customer?.uid && dData.orderNumber) {
        await setDoc(doc(firestoreDb, 'users', dData.customer.uid, 'orders', dData.orderNumber), patch, { merge: true }).catch(() => {});
      }
    }

    // Enviar aviso al desarrollador/admin con el estado real y qué hacer si hay rechazo
    const orderNum = order?.orderNumber || externalId || jobId || 'DESCONOCIDO';
    const bookTitle = order?.book?.title || lineItem.title || 'Libro POD';
    const adminParagraphs = [
      `Lulu acaba de enviar una notificación automática (${topic}).`,
      `Estado recibido: ${luluStatusName}`,
      `Mensaje técnico de Lulu: ${messagesText}`
    ];
    if (actionGuides.length) {
      adminParagraphs.push(`Qué hacer para solucionarlo:\n${actionGuides.join('\n')}`);
      adminParagraphs.push('Nota: NO se ha enviado ningún correo al cliente para no confirmarle nada hasta que Lulu acepte los archivos.');
    }

    await sendEditorialEmail({
      to: OWNER_EMAIL,
      subject: `[LULU WEBHOOK] Pedido #${orderNum} → ${luluStatusName}`,
      paragraphs: adminParagraphs,
      buttonText: 'Ver pedido en Admin',
      buttonUrl: `https://www.editorialmenosruido.com/admin-pedidos?orderId=${encodeURIComponent(orderNum)}`,
      highlightDetails: {
        orderNumber: orderNum,
        bookTitle,
        luluJobId: jobId,
        luluStatus: luluStatusName,
        trackingNumber: trackingId || undefined
      }
    });

    // Notificar al cliente SOLO cuando Lulu confirma producción, envío o entrega (una sola vez por hito)
    const customerEmail = order?.customer?.email;
    if (customerEmail && (shouldNotifyCustomerPrinting || shouldNotifyCustomerShipped || shouldNotifyCustomerDelivered)) {
      const isDelivered = shouldNotifyCustomerDelivered;
      const isShipped = shouldNotifyCustomerShipped;
      const carrierLabel = carrierName || order?.shipping?.carrier || 'la empresa repartidora';
      await sendEditorialEmail({
        to: customerEmail,
        subject: isDelivered
          ? `Tu pedido #${orderNum} ha sido entregado`
          : isShipped
          ? `Tu pedido #${orderNum} ha salido de imprenta`
          : `Tu pedido #${orderNum} ha sido validado y está en impresión`,
        paragraphs: isDelivered
          ? [
              `Hola ${order?.customer?.name || ''},`,
              `La empresa repartidora (${carrierLabel}) nos confirma que tu pedido #${orderNum} («${bookTitle}») ha sido entregado en tu dirección.`,
              `Gracias por confiar en Editorial Menos Ruido.`
            ]
          : isShipped
          ? [
              `Hola ${order?.customer?.name || ''},`,
              `Tu ejemplar «${bookTitle}» ya ha salido de imprenta y está en camino con ${carrierLabel}.`,
              trackingId ? `Número de seguimiento: ${trackingId}` : 'En breve recibirás los detalles de entrega.'
            ]
          : [
              `Hola ${order?.customer?.name || ''},`,
              `La imprenta ha validado correctamente los archivos de «${bookTitle}» y tu pedido ya está en producción.`
            ],
        buttonText: (!isDelivered && trackingUrl) ? 'Seguir envío' : 'Ver mi pedido',
        buttonUrl: (!isDelivered && trackingUrl) ? trackingUrl : `https://www.editorialmenosruido.com/mi-espacio?tab=pedidos&orderId=${encodeURIComponent(orderNum)}`,
        highlightDetails: {
          orderNumber: orderNum,
          bookTitle,
          trackingNumber: trackingId || undefined
        }
      });
    }

    return res.status(200).json({ ok: true, received: luluStatusName, jobId, externalId });
  } catch (err) {
    console.error('Error en /api/lulu-webhook:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
