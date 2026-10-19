// order-email-notifier.js - Motor centralizado de notificaciones reales por correo (Resend API)
// Dispara automáticamente AMBOS correos desde pedidos@editorialmenosruido.com en cada evento del pedido:
// 1. Correo oficial para el CLIENTE (enviado a jesusgil_87@hotmail.com / email del cliente + copia a jesgilcan@gmail.com)
// 2. Correo interno para el GESTOR DE LA WEB / DUEÑO (enviado a jesgilcan@gmail.com con desglose de Lulu, margen y preflight)

import { auth } from './firebase-config.js';

const OWNER_EMAIL = 'jesgilcan@gmail.com';
const TEST_CLIENT_EMAIL = 'jesusgil_87@hotmail.com';

function getSafeClientRecipients(orderCustomerEmail) {
  const clean = String(orderCustomerEmail || '').trim().toLowerCase();
  // Solo enviar a las cuentas reales del propietario/cliente de prueba para no enviar correos a emails ficticios de semillas demo
  if (clean === TEST_CLIENT_EMAIL || clean === OWNER_EMAIL) {
    return Array.from(new Set([clean, TEST_CLIENT_EMAIL, OWNER_EMAIL]));
  }
  return [TEST_CLIENT_EMAIL, OWNER_EMAIL];
}

function getBindingLabel(bindingType) {
  if (bindingType === 'perfect' || bindingType === 'softcover') return 'Tapa Blanda (Mate)';
  if (bindingType === 'hardcover') return 'Tapa Dura (Casewrap)';
  return 'Anillas Metálicas (Wire-O)';
}

async function postEmailPayload(idToken, payload) {
  let res = null;
  try {
    res = await fetch('/api/send-admin-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });
  } catch (localErr) {
    res = await fetch('https://www.editorialmenosruido.com/api/send-admin-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });
  }
  if (!res) return { ok: false };
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && !!data.success, data };
}

/**
 * Envía en paralelo el email del Cliente y el email del Gestor de la Web para cualquier evento del pedido
 */
export async function sendOrderLifecycleEmails(order, eventType, extraInfo = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser || !order) {
    return { sentClient: false, sentManager: false };
  }

  try {
    const idToken = await currentUser.getIdToken();
    const orderNumber = order.orderNumber || order.id || 'MR-2026-0000';
    const customerName = order.customer?.name || 'Cliente';
    const customerEmail = order.customer?.email || TEST_CLIENT_EMAIL;
    const customerPhone = order.customer?.phone || '+34 600 000 000';
    const fullAddress = `${order.customer?.address || 'Calle Serrano 42'}, ${order.customer?.postalCode || '28001'} ${order.customer?.city || 'Madrid'} (${order.customer?.province || 'Madrid'})`;
    const customerNotes = order.customer?.notes || 'Sin instrucciones adicionales';

    const bookTitle = order.book?.title || 'Cuaderno Personalizado Menos Ruido';
    const bindingLabel = getBindingLabel(order.book?.bindingType);
    const pageCount = order.book?.pageCount || 143;
    const spineMm = order.book?.spineWidthMm || (pageCount * 0.057).toFixed(1);
    const fileSizeMb = order.book?.fileSizeMb || (pageCount * 0.32).toFixed(1);

    const totalPaid = parseFloat(order.pricing?.totalPaid || 27.90).toFixed(2);
    const luluCost = parseFloat(order.pricing?.luluCostEstimate || 17.14).toFixed(2);
    const stripeFee = (parseFloat(totalPaid) * 0.015 + 0.25).toFixed(2);
    const netMargin = (parseFloat(totalPaid) - parseFloat(luluCost) - parseFloat(stripeFee)).toFixed(2);

    const carrier = order.shipping?.carrier || order.luluJob?.carrier || 'Correos Express';
    const tracking = order.shipping?.trackingNumber || order.luluJob?.trackingCode || 'CEX-84920144';
    const luluJobId = order.luluJob?.jobId || ('LULU-' + Math.floor(100000 + Math.random() * 900000));

    const clientProfileUrl = 'https://www.editorialmenosruido.com/mi-espacio.html?tab=pedidos';
    const adminOrdersUrl = 'https://www.editorialmenosruido.com/admin-pedidos.html';

    let clientSubject = '';
    let clientBody = '';
    let clientBtnText = '📦 Ver mi pedido y archivos en Mi Espacio';
    let clientBtnUrl = clientProfileUrl;

    let managerSubject = '';
    let managerBody = '';
    let managerBtnText = '⚡ Abrir Gestor de Pedidos (Backoffice)';
    let managerBtnUrl = adminOrdersUrl;

    if (eventType === 'order_created') {
      clientSubject = `📦 Confirmación de tu pedido #${orderNumber} · Editorial Menos Ruido`;
      clientBody = [
        `Hola ${customerName},`,
        `Hemos recibido correctamente tu pedido #${orderNumber} (${totalPaid} € · Envío incluido).`,
        `Tu cuaderno «${bookTitle}» (${bindingLabel}, ${pageCount} páginas interiores) ha entrado en la Fase 1/4: Revisión Técnica de Imprenta (300 DPI).`,
        `Como el documento de alta resolución pesa ${fileSizeMb} MB, no lo adjuntamos por correo para no saturar tu bandeja: ya lo tienes guardado y disponible para siempre en el apartado «Mis Pedidos y Cesta» de tu perfil.`,
        `Desde tu perfil también podrás consultar todos los cambios de estado y comunicarte con la empresa repartidora.`
      ].join('\n\n');

      managerSubject = `🔔 [GESTOR WEB] Nueva venta #${orderNumber} (${totalPaid} €) · Informe Lulu`;
      managerBody = [
        `Se ha registrado un nuevo pedido pagado en la web (#${orderNumber}).`,
        `DATOS DEL CLIENTE COMPRADOR:\n• Nombre: ${customerName}\n• Email: ${customerEmail}\n• Teléfono: ${customerPhone}\n• Dirección: ${fullAddress}\n• Nota para repartidor: ${customerNotes}`,
        `INFORME FINANCIERO Y LULU DIRECT API:\n• PVP cobrado al cliente (envío incluido): ${totalPaid} €\n• Coste de fabricación + envío en Lulu: -${luluCost} €\n• Comisión pasarela Stripe: -${stripeFee} €\n• BENEFICIO NETO LIMPIO: +${netMargin} €`,
        `ESPECIFICACIONES TÉCNICAS (PREFLIGHT 300 DPI):\n• Ejemplar: ${bookTitle} (${bindingLabel})\n• Páginas interiores: ${pageCount} págs (Lomo calculado: ${spineMm} mm)\n• Peso en nube del perfil: ${fileSizeMb} MB\n• Estado actual: 1/4 Pendiente de tu validación para enviar a Lulu.`
      ].join('\n\n');

    } else if (eventType === 'status_pending_review') {
      clientSubject = `🔍 Pedido #${orderNumber} en Revisión Técnica (Fase 1/4) · Editorial Menos Ruido`;
      clientBody = [
        `Hola ${customerName},`,
        `Te informamos de que tu pedido #${orderNumber} («${bookTitle}») se encuentra en la Fase 1/4: Revisión Técnica de Imprenta.`,
        `Estamos verificando los márgenes de corte (3.175 mm), la resolución a 300 DPI y el ancho exacto del lomo (${spineMm} mm) antes de dar orden de fabricación a los talleres.`,
        `Puedes consultar el estado en directo desde tu perfil.`
      ].join('\n\n');

      managerSubject = `🔍 [GESTOR WEB] Pedido #${orderNumber} situado en Fase 1/4 (Revisión Técnica)`;
      managerBody = [
        `El pedido #${orderNumber} del cliente ${customerName} (${customerEmail}) se ha situado en estado «1. Revisión Técnica (Preflight)».`,
        `Revisa el interior y la portada en el Gestor de Pedidos y pulsa «Aprobar y Enviar a Imprenta» cuando quieras lanzar la orden a Lulu.`
      ].join('\n\n');

    } else if (eventType === 'status_printing') {
      clientSubject = `🖨️ Tu cuaderno #${orderNumber} ya está en imprenta (Fase 2/4) · Editorial Menos Ruido`;
      clientBody = [
        `Hola ${customerName},`,
        `¡Buenas noticias! Tu cuaderno «${bookTitle}» (Pedido #${orderNumber}) ha superado al 100% la revisión técnica de 300 DPI y ya ha entrado en fabricación en imprenta (Fase 2/4: En Imprenta).`,
        `En estos momentos se está imprimiendo la tripa interior (${pageCount} páginas) y preparando la encuadernación en ${bindingLabel}.`,
        `En cuanto salga del taller con la empresa repartidora te enviaremos tu código de seguimiento.`
      ].join('\n\n');

      managerSubject = `🖨️ [GESTOR WEB · LULU] Orden enviada a Lulu Imprenta (#${orderNumber})`;
      managerBody = [
        `Has validado y enviado a producción en Lulu el pedido #${orderNumber} (Fase 2/4: En Imprenta).`,
        `DATOS DE PRODUCCIÓN EN LULU:\n• ID Trabajo Lulu: ${luluJobId}\n• Formato: ${bindingLabel} · ${pageCount} págs · Lomo ${spineMm} mm\n• Coste de producción + envío en Lulu: ${luluCost} € (Margen neto: +${netMargin} €)\n• Cliente notificado automáticamente en: ${customerEmail}`
      ].join('\n\n');

    } else if (eventType === 'status_shipped') {
      clientSubject = `🚚 Tu pedido #${orderNumber} está en reparto (Tracking: ${tracking})`;
      clientBody = [
        `Hola ${customerName},`,
        `Tu cuaderno «${bookTitle}» (Pedido #${orderNumber}) ya ha salido de la imprenta y está en manos de la empresa repartidora ${carrier} (Fase 3/4: En Reparto).`,
        `DATOS DE SEGUIMIENTO:\n• Empresa repartidora: ${carrier}\n• Código de seguimiento (Tracking): ${tracking}\n• Dirección de entrega: ${fullAddress}\n• Instrucciones actuales para el repartidor: ${customerNotes}`,
        `Recuerda que puedes seguir el paquete o dejar un aviso para el repartidor (horario, portería, etc.) directamente desde tu perfil en Mi Espacio.`
      ].join('\n\n');

      managerSubject = `🚚 [GESTOR WEB] Pedido #${orderNumber} en reparto (${carrier} · ${tracking})`;
      managerBody = [
        `El pedido #${orderNumber} de ${customerName} (${customerEmail}) ha pasado a la Fase 3/4: En Reparto.`,
        `INFORMACIÓN LOGÍSTICA:\n• Transportista: ${carrier}\n• Tracking asignado: ${tracking}\n• Dirección: ${fullAddress}\n• El cliente ya ha recibido su correo con el código de seguimiento y tiene habilitado el cuadro de comunicación con el repartidor en su perfil.`
      ].join('\n\n');

    } else if (eventType === 'status_delivered') {
      clientSubject = `🎉 ¡Tu pedido #${orderNumber} ha sido entregado! (Fase 4/4) · Editorial Menos Ruido`;
      clientBody = [
        `Hola ${customerName},`,
        `La empresa repartidora (${carrier}) nos confirma que tu pedido #${orderNumber} («${bookTitle}») ha sido entregado en tu dirección (Fase 4/4: Entregado).`,
        `Recuerda que en tu perfil de Mi Espacio siguen guardados para siempre los archivos digitales a 300 DPI (${fileSizeMb} MB) de tu cuaderno y tu portada por si en el futuro quieres volver a consultarlos, editarlos o encargar otra copia.`,
        `¡Gracias por confiar en Editorial Menos Ruido!`
      ].join('\n\n');

      managerSubject = `✅ [GESTOR WEB] Pedido #${orderNumber} ENTREGADO y completado (Fase 4/4)`;
      managerBody = [
        `El pedido #${orderNumber} del cliente ${customerName} (${customerEmail}) ha completado la Fase 4/4: Entregado en domicilio.`,
        `RESUMEN DE CIERRE:\n• Ejemplar: ${bookTitle} (${bindingLabel}, ${pageCount} págs)\n• Transportista: ${carrier} (Tracking: ${tracking})\n• Cobrado: ${totalPaid} € | Coste Lulu: ${luluCost} € | Beneficio Neto: +${netMargin} €\n• Ciclo de emails completado al 100%.`
      ].join('\n\n');

    } else if (eventType === 'carrier_update') {
      const msg = extraInfo.carrierMessage || order.shipping?.lastCarrierMessage || 'Tu paquete se encuentra en reparto en tu zona.';
      clientSubject = `🚚 Aviso del repartidor (${carrier}) sobre tu pedido #${orderNumber}`;
      clientBody = [
        `Hola ${customerName},`,
        `La empresa repartidora (${carrier} · Tracking ${tracking}) ha registrado una nueva actualización sobre la entrega de tu pedido #${orderNumber}:`,
        `«${msg}»`,
        `Si necesitas dejar alguna indicación para el repartidor (como entregar en conserjería o confirmar horario), puedes escribirla ahora mismo desde tu perfil en Mi Espacio.`
      ].join('\n\n');

      managerSubject = `📣 [GESTOR WEB] Aviso de repartidora enviado al cliente (#${orderNumber})`;
      managerBody = [
        `Se ha publicado y enviado por email al cliente (${customerEmail}) el siguiente aviso de la empresa repartidora (${carrier}) para el pedido #${orderNumber}:`,
        `«${msg}»`
      ].join('\n\n');

    } else if (eventType === 'customer_carrier_note') {
      const note = extraInfo.customerNote || customerNotes;
      clientSubject = `📝 Instrucción para el repartidor guardada en tu pedido #${orderNumber}`;
      clientBody = [
        `Hola ${customerName},`,
        `Hemos registrado tu nueva indicación de entrega para la empresa repartidora (${carrier} · Tracking ${tracking}) en tu pedido #${orderNumber}:`,
        `«${note}»`,
        `Puedes modificarla en cualquier momento desde el apartado «Mis Pedidos y Cesta» de tu perfil.`
      ].join('\n\n');

      managerSubject = `📝 [GESTOR WEB] El cliente ${customerName} ha añadido una nota para el repartidor (#${orderNumber})`;
      managerBody = [
        `El cliente ${customerName} (${customerEmail}) acaba de actualizar desde su perfil las instrucciones para la empresa repartidora (${carrier}) en el pedido #${orderNumber}:`,
        `NUEVA INSTRUCCIÓN DEL CLIENTE:\n«${note}»`,
        `Dirección de entrega: ${fullAddress}`
      ].join('\n\n');
    } else {
      return { sentClient: false, sentManager: false };
    }

    const highlightDetails = {
      orderNumber,
      bookTitle: `${bookTitle} (${bindingLabel} · ${pageCount} págs)`,
      address: fullAddress
    };

    const clientRecipients = getSafeClientRecipients(customerEmail);

    // Disparar AMBOS correos en paralelo desde pedidos@editorialmenosruido.com
    const [clientRes, managerRes] = await Promise.all([
      postEmailPayload(idToken, {
        to: clientRecipients,
        subject: clientSubject,
        preheader: clientSubject,
        bodyText: clientBody,
        buttonText: clientBtnText,
        buttonUrl: clientBtnUrl,
        senderType: 'pedidos',
        replyTo: 'pedidos@editorialmenosruido.com',
        highlightDetails,
        showSecondaryLinks: true,
        showUnsubscribe: false
      }),
      postEmailPayload(idToken, {
        to: [OWNER_EMAIL],
        subject: managerSubject,
        preheader: managerSubject,
        bodyText: managerBody,
        buttonText: managerBtnText,
        buttonUrl: managerBtnUrl,
        senderType: 'pedidos',
        replyTo: 'pedidos@editorialmenosruido.com',
        highlightDetails,
        showSecondaryLinks: true,
        showUnsubscribe: false
      })
    ]);

    return {
      sentClient: clientRes.ok,
      sentManager: managerRes.ok,
      clientEmailId: clientRes.data?.id || null,
      managerEmailId: managerRes.data?.id || null
    };
  } catch (err) {
    console.warn('Error en sendOrderLifecycleEmails:', err);
    return { sentClient: false, sentManager: false };
  }
}
