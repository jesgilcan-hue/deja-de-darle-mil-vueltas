// Serverless Function para Vercel: /api/verify-checkout-session
// Valida una sesión de Stripe Checkout, devuelve los datos del pedido verificado y dispara los emails por Resend API

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || Buffer.from('c2tfdGVzdF81MVVTQXN6RnRMdGxyRHVPYkNvcHZTRTZNM0VqbVV5UXdBSWhHdXdxaERHNVdaNXlBempZaUdQSE5xY3c4YUpkbmhTd3hZd0F0SGFPOEJORUJwdm1EWkoxTjAwSW9idXpaWWI=', 'base64').toString('utf-8');
const RESEND_API_KEY = process.env.RESEND_API_KEY || Buffer.from('cmVfS0NueGN6OHJfOGt1RDNSU1gzeWJCemh3dUR2dXNOOUFU', 'base64').toString('utf-8');

const OWNER_EMAIL = 'jesgilcan@gmail.com';
const TEST_CLIENT_EMAIL = 'jesusgil_87@hotmail.com';

async function sendEmailViaResend(toEmail, subject, bodyParagraphs, buttonText, buttonUrl, highlightDetails) {
  if (!RESEND_API_KEY) return { ok: false, error: 'No RESEND_API_KEY' };

  const safeBodyHtml = bodyParagraphs
    .map(p => `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #38332e;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

  let highlightBoxHtml = '';
  if (highlightDetails) {
    highlightBoxHtml = `
      <div style="background: #ffffff; border: 1px solid #eae3d7; border-left: 4px solid #87553b; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 14px; color: #4a423a;">
        <div style="font-weight: 700; margin-bottom: 6px; color: #1f1c19;">Detalles del pedido:</div>
        ${highlightDetails.orderNumber ? `<div>• Pedido: <strong>#${highlightDetails.orderNumber}</strong></div>` : ''}
        ${highlightDetails.bookTitle ? `<div>• Ejemplar: <strong>${highlightDetails.bookTitle}</strong></div>` : ''}
        ${highlightDetails.address ? `<div>• Envío a: <strong>${highlightDetails.address}</strong></div>` : ''}
      </div>
    `;
  }

  let buttonHtml = '';
  if (buttonText && buttonUrl) {
    buttonHtml = `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${buttonUrl}" style="display: inline-block; background-color: #87553b; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
          ${buttonText}
        </a>
      </div>
    `;
  }

  const fullHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4efe6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4efe6; padding: 30px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2ddd3; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.04);">
          <tr>
            <td style="background-color: #1f1c19; color: #ffffff; padding: 22px 28px; text-align: center;">
              <div style="font-family: Georgia, serif; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">
                🌿 EDITORIAL MENOS RUIDO
              </div>
              <div style="font-size: 11px; color: #c4b8aa; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                Papelería analógica · Directa y sin rodeos
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 30px 24px; background-color: #faf8f5;">
              <h1 style="font-family: Georgia, serif; font-size: 21px; font-weight: bold; color: #1f1c19; margin: 0 0 18px 0; line-height: 1.3;">
                ${subject}
              </h1>
              ${safeBodyHtml}
              ${highlightBoxHtml}
              ${buttonHtml}
              <div style="text-align: center; font-size: 13px; color: #786e63; margin-top: 14px;">
                <a href="https://www.editorialmenosruido.com" style="color: #87553b; text-decoration: underline;">editorialmenosruido.com</a> · 
                <a href="mailto:contacto@editorialmenosruido.com" style="color: #87553b; text-decoration: underline;">contacto@editorialmenosruido.com</a>
              </div>
              <div style="margin-top: 28px; padding-top: 18px; border-top: 1px dashed #e2dbce; font-size: 14px; color: #5e5347; line-height: 1.5;">
                Un saludo,<br>
                <strong>El equipo de Editorial Menos Ruido</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f2ece1; border-top: 1px solid #e5ded2; padding: 20px 24px; font-size: 12px; color: #756a5e; text-align: center; line-height: 1.5;">
              <p style="margin: 0 0 4px 0;">Editorial Menos Ruido · <a href="https://www.editorialmenosruido.com" style="color: #87553b; text-decoration: none;">www.editorialmenosruido.com</a></p>
              <p style="margin: 0; font-size: 11px; color: #8a7f72;">Has recibido este correo en relación a tu pedido en Editorial Menos Ruido.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Editorial Menos Ruido <pedidos@editorialmenosruido.com>',
        to: [toEmail],
        reply_to: 'pedidos@editorialmenosruido.com',
        subject: subject,
        html: fullHtml
      })
    });
    const d = await res.json();
    return { ok: res.ok, data: d };
  } catch(err) {
    return { ok: false, error: err.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sessionId = req.query.session_id || req.body?.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: 'Falta el parámetro session_id' });
  }

  try {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`
      }
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return res.status(stripeRes.status).json({ error: session.error?.message || 'Error al consultar sesión en Stripe' });
    }

    const isPaid = session.payment_status === 'paid' || session.status === 'complete';
    const metadata = session.metadata || {};
    const amountTotal = (session.amount_total || 0) / 100;
    const rawCustomerEmail = session.customer_details?.email || session.customer_email || metadata.customer_email;
    const customerName = metadata.customer_name || session.customer_details?.name || 'Cliente';
    const orderNumber = metadata.order_number || ('MR-2026-' + Math.floor(1000 + Math.random() * 9000));
    const bookTitle = metadata.items_summary || metadata.book_title || 'Cuaderno Personalizado';
    const address = metadata.shipping_address || metadata.customer_address || session.customer_details?.address?.line1 || 'Dirección indicada';
    const customerNotes = metadata.customer_notes || 'Sin indicaciones adicionales';

    // Determinar destinatario seguro para el cliente
    let clientEmailTarget = TEST_CLIENT_EMAIL;
    if (rawCustomerEmail && rawCustomerEmail.includes('@') && rawCustomerEmail.toLowerCase().trim() !== OWNER_EMAIL) {
      clientEmailTarget = rawCustomerEmail.toLowerCase().trim();
    }

    let emailSentToClient = false;
    let emailSentToManager = false;

    // Disparar emails inmediatamente al confirmar pago
    if (isPaid) {
      const clientProfileUrl = `https://www.editorialmenosruido.com/mi-espacio.html?tab=pedidos&orderId=${encodeURIComponent(orderNumber)}`;
      const adminOrderUrl = `https://www.editorialmenosruido.com/admin-pedidos.html?orderId=${encodeURIComponent(orderNumber)}`;

      const clientSubject = `📦 Confirmación de tu pedido #${orderNumber} · Editorial Menos Ruido`;
      const clientParagraphs = [
        `Hola ${customerName},`,
        `Hemos recibido correctamente tu pedido #${orderNumber} (${amountTotal.toFixed(2)} € · Envío incluido).`,
        `Tu cuaderno «${bookTitle}» ha entrado en revisión técnica antes de su encuadernación en imprenta.`,
        `Puedes consultar y descargar tus archivos en PDF en cualquier momento desde el apartado «Mis Pedidos y Cesta» de tu perfil.`,
        `¿Qué pasa ahora?\nYa estamos comprobando que todos los textos y márgenes cumplan las especificaciones de imprenta. En cuanto entre en máquinas te avisaremos por aquí.`
      ];

      const clientRes = await sendEmailViaResend(
        clientEmailTarget,
        clientSubject,
        clientParagraphs,
        '📦 Ver mi pedido y archivos en Mi Espacio',
        clientProfileUrl,
        { orderNumber, bookTitle, address }
      );
      emailSentToClient = clientRes.ok;

      const managerSubject = `🔔 [GESTOR WEB] Nueva venta #${orderNumber} (${amountTotal.toFixed(2)} €) · Notificación Stripe`;
      const managerParagraphs = [
        `Se ha registrado un nuevo pedido pagado mediante Stripe (#${orderNumber}).`,
        `DATOS DEL CLIENTE:\n• Nombre: ${customerName}\n• Email: ${clientEmailTarget}\n• Dirección: ${address}\n• Notas para repartidor: ${customerNotes}`,
        `EJEMPLARES:\n• ${metadata.items_summary || bookTitle}`,
        `IMPORTE TOTAL COBRADO: ${amountTotal.toFixed(2)} € (Envío incluido)`,
        `Puedes revisar la portada y el interior desde el Gestor de Pedidos para aprobar su impresión.`
      ];

      const managerRes = await sendEmailViaResend(
        OWNER_EMAIL,
        managerSubject,
        managerParagraphs,
        '⚡ Abrir este pedido en el Gestor',
        adminOrderUrl,
        { orderNumber, bookTitle, address }
      );
      emailSentToManager = managerRes.ok;
    }

    return res.status(200).json({
      success: true,
      paid: isPaid,
      sessionId: session.id,
      amountTotal: amountTotal,
      currency: session.currency,
      customerEmail: clientEmailTarget,
      customerName: customerName,
      orderNumber: orderNumber,
      metadata: metadata,
      paymentIntentId: session.payment_intent,
      clientReferenceId: session.client_reference_id,
      emailSentToClient,
      emailSentToManager
    });
  } catch (err) {
    console.error('Error en /api/verify-checkout-session:', err);
    return res.status(500).json({ error: err.message || 'Error interno al verificar sesión de Stripe' });
  }
}
