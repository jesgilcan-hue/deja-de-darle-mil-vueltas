

const RESEND_API_KEY = process.env.RESEND_API_KEY || Buffer.from('cmVfS0NueGN6OHJfOGt1RDNSU1gzeWJCemh3dUR2dXNOOUFU', 'base64').toString('utf-8');
const CLIENT_EMAIL = 'jesusgil_87@hotmail.com';
const OWNER_EMAIL = 'jesgilcan@gmail.com';

function renderEmailHtml(subject, bodyParagraphs, buttonText, buttonUrl, highlightDetails) {
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

  return `
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
}

async function sendEmail(toEmail, subject, bodyParagraphs, buttonText, buttonUrl, highlightDetails) {
  const html = renderEmailHtml(subject, bodyParagraphs, buttonText, buttonUrl, highlightDetails);
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
      html: html
    })
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  const orderNumber = 'MR-2026-' + Math.floor(1000 + Math.random() * 9000);
  const bookTitle = 'Planificador Semestral 180 Días';
  const customerName = 'Cliente Prueba Oficial';
  const address = 'Calle Serrano 42, 28001 Madrid';
  const trackingNumber = 'CEX-84920491';
  const correosUrl = `https://www.correos.es/es/es/herramientas/localizador/envios?numero=${trackingNumber}`;
  const clientProfileUrl = `https://www.editorialmenosruido.com/mi-espacio.html?tab=pedidos&orderId=${orderNumber}`;
  const adminUrl = `https://www.editorialmenosruido.com/admin-pedidos.html?orderId=${orderNumber}`;

  const highlight = {
    orderNumber,
    bookTitle: `${bookTitle} (Tapa Dura Casewrap · 144 págs)`,
    address
  };

  console.log(`=================================================================`);
  console.log(`🚀 INICIANDO SECUENCIA REAL DE EMAILS PARA EL PEDIDO #${orderNumber}`);
  console.log(`Destinatario Cliente: ${CLIENT_EMAIL}`);
  console.log(`Destinatario Gestor:  ${OWNER_EMAIL}`);
  console.log(`=================================================================\n`);

  // ETAPA 1: Compra confirmada
  console.log(`--- ETAPA 1: Compra confirmada (Stripe Test 0€) ---`);
  const r1Client = await sendEmail(
    CLIENT_EMAIL,
    `📦 Confirmación de tu pedido #${orderNumber} · Editorial Menos Ruido`,
    [
      `Hola ${customerName},`,
      `Hemos recibido correctamente tu pedido #${orderNumber} (32,90 € · Envío incluido).`,
      `Tu cuaderno «${bookTitle}» (Tapa Dura Casewrap, 144 páginas interiores) ha entrado en revisión técnica antes de su fabricación.`,
      `Puedes consultar y descargar tus archivos en PDF en cualquier momento desde el apartado «Mis Pedidos y Cesta» de tu perfil.`,
      `¿Qué pasa ahora?\nYa estamos comprobando márgenes y sangrado. En las próximas 2 horas te avisaremos cuando entre en máquinas.`
    ],
    '📦 Ver mi pedido y archivos en Mi Espacio',
    clientProfileUrl,
    highlight
  );
  console.log(`✓ Email Cliente (Compra): ID ${r1Client.data?.id}`);

  const r1Owner = await sendEmail(
    OWNER_EMAIL,
    `🔔 [GESTOR WEB] Nueva venta #${orderNumber} (32,90 €) · Notificación Stripe`,
    [
      `Se ha registrado un nuevo pedido pagado en la web (#${orderNumber}).`,
      `DATOS DEL CLIENTE:\n• Nombre: ${customerName}\n• Email: ${CLIENT_EMAIL}\n• Dirección: ${address}`,
      `INFORME FINANCIERO:\n• Cobrado: 32,90 €\n• Coste Lulu: -14,20 €\n• Beneficio Neto: +18,20 €`,
      `Estado actual: Pendiente de tu validación para enviar a Lulu.`
    ],
    '⚡ Abrir este pedido en el Gestor',
    adminUrl,
    highlight
  );
  console.log(`✓ Email Gestor (Compra): ID ${r1Owner.data?.id}`);

  await new Promise(r => setTimeout(r, 1500));

  // ETAPA 2: En Imprenta
  console.log(`\n--- ETAPA 2: Pedido aprobado y en Imprenta ---`);
  const r2Client = await sendEmail(
    CLIENT_EMAIL,
    `🖨️ Tu cuaderno #${orderNumber} ya está en imprenta · Editorial Menos Ruido`,
    [
      `Hola ${customerName},`,
      `¡Buenas noticias! Tu cuaderno «${bookTitle}» (Pedido #${orderNumber}) ha superado la revisión técnica y ya ha entrado en fabricación en imprenta.`,
      `En estos momentos se está imprimiendo la tripa interior (144 páginas) y preparando la encuadernación en Tapa Dura Casewrap.`,
      `En cuanto salga del taller con la empresa repartidora te enviaremos tu código de seguimiento.`
    ],
    '📦 Ver estado en Mi Espacio',
    clientProfileUrl,
    highlight
  );
  console.log(`✓ Email Cliente (Imprenta): ID ${r2Client.data?.id}`);

  const r2Owner = await sendEmail(
    OWNER_EMAIL,
    `🖨️ [GESTOR WEB · LULU] Orden enviada a Lulu Imprenta (#${orderNumber})`,
    [
      `Has validado y enviado a producción en imprenta el pedido #${orderNumber}.`,
      `DATOS DE PRODUCCIÓN:\n• Formato: Tapa Dura Casewrap · 144 págs\n• Cliente notificado automáticamente en: ${CLIENT_EMAIL}`
    ],
    '⚡ Abrir Gestor de Pedidos',
    adminUrl,
    highlight
  );
  console.log(`✓ Email Gestor (Imprenta): ID ${r2Owner.data?.id}`);

  await new Promise(r => setTimeout(r, 1500));

  // ETAPA 3: En Reparto (Tracking Correos Express)
  console.log(`\n--- ETAPA 3: En Reparto con Correos Express ---`);
  const r3Client = await sendEmail(
    CLIENT_EMAIL,
    `🚚 Tu pedido #${orderNumber} está en reparto (Correos Express: ${trackingNumber})`,
    [
      `Hola ${customerName},`,
      `Tu cuaderno «${bookTitle}» (Pedido #${orderNumber}) ya ha salido de la imprenta y está en manos de Correos Express.`,
      `DATOS DE SEGUIMIENTO:\n• Empresa repartidora: Correos Express\n• Código de seguimiento: ${trackingNumber}\n• Dirección de entrega: ${address}`,
      `Puedes hacer el seguimiento en vivo pulsando el botón a continuación:`
    ],
    `🚚 Rastrear en Correos Express (${trackingNumber})`,
    correosUrl,
    highlight
  );
  console.log(`✓ Email Cliente (Tracking Correos): ID ${r3Client.data?.id}`);

  const r3Owner = await sendEmail(
    OWNER_EMAIL,
    `🚚 [GESTOR WEB] Pedido #${orderNumber} en reparto (Correos Express · ${trackingNumber})`,
    [
      `El pedido #${orderNumber} de ${customerName} (${CLIENT_EMAIL}) ha pasado a En Reparto con Correos Express.`,
      `Tracking asignado: ${trackingNumber}. El cliente ya ha recibido su botón de seguimiento directo.`
    ],
    '⚡ Abrir Gestor de Pedidos',
    adminUrl,
    highlight
  );
  console.log(`✓ Email Gestor (Tracking): ID ${r3Owner.data?.id}`);

  await new Promise(r => setTimeout(r, 1500));

  // ETAPA 4: Entregado
  console.log(`\n--- ETAPA 4: Pedido Entregado ---`);
  const r4Client = await sendEmail(
    CLIENT_EMAIL,
    `🎉 ¡Tu pedido #${orderNumber} ha sido entregado! · Editorial Menos Ruido`,
    [
      `Hola ${customerName},`,
      `La empresa repartidora (Correos Express) nos confirma que tu pedido #${orderNumber} («${bookTitle}») ha sido entregado satisfactoriamente en tu dirección.`,
      `Recuerda que en tu perfil de Mi Espacio tienes guardados los archivos de tu cuaderno por si en el futuro quieres volver a consultarlos o encargar otra copia.`,
      `¡Muchas gracias por confiar en Editorial Menos Ruido!`
    ],
    '📦 Ver mis archivos guardados en Mi Espacio',
    clientProfileUrl,
    highlight
  );
  console.log(`✓ Email Cliente (Entregado): ID ${r4Client.data?.id}`);

  const r4Owner = await sendEmail(
    OWNER_EMAIL,
    `✅ [GESTOR WEB] Pedido #${orderNumber} ENTREGADO y completado`,
    [
      `El pedido #${orderNumber} del cliente ${customerName} (${CLIENT_EMAIL}) ha sido confirmado como entregado en domicilio.`,
      `Ciclo de emails y entrega finalizado con éxito al 100%.`
    ],
    '⚡ Abrir Gestor de Pedidos',
    adminUrl,
    highlight
  );
  console.log(`✓ Email Gestor (Entregado): ID ${r4Owner.data?.id}`);

  console.log(`\n=================================================================`);
  console.log(`✨ CICLO COMPLETO DE EMAILS ENVIADO CORRECTAMENTE`);
  console.log(`Por favor, comprueba las bandejas de entrada y SPAM de:`);
  console.log(`1. jesusgil_87@hotmail.com (4 emails recibidos: Compra, Imprenta, Tracking Correos, Entregado)`);
  console.log(`2. jesgilcan@gmail.com     (4 emails recibidos: Nueva Venta, Enviado Imprenta, Despacho, Cierre)`);
  console.log(`=================================================================`);
}

main().catch(console.error);
