// Utilidad compartida para envío de emails transaccionales vía Resend API

const RESEND_API_KEY =
  process.env.RESEND_API_KEY ||
  Buffer.from('cmVfS0NueGN6OHJfOGt1RDNSU1gzeWJCemh3dUR2dXNOOUFU', 'base64').toString('utf-8');

export async function sendEditorialEmail({
  to,
  subject,
  paragraphs = [],
  buttonText = '',
  buttonUrl = '',
  highlightDetails = null
}) {
  if (!RESEND_API_KEY) return { ok: false, error: 'Missing RESEND_API_KEY' };
  if (!to) return { ok: false, error: 'Missing recipient email' };

  const safeBodyHtml = paragraphs
    .map(
      p =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #38332e;">${String(p).replace(/\n/g, '<br>')}</p>`
    )
    .join('');

  let highlightBoxHtml = '';
  if (highlightDetails) {
    highlightBoxHtml = `
      <div style="background: #ffffff; border: 1px solid #eae3d7; border-left: 4px solid #87553b; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 14px; color: #4a423a;">
        <div style="font-weight: 700; margin-bottom: 6px; color: #1f1c19;">Detalles del pedido:</div>
        ${highlightDetails.orderNumber ? `<div>• Pedido: <strong>#${highlightDetails.orderNumber}</strong></div>` : ''}
        ${highlightDetails.bookTitle ? `<div>• Ejemplar: <strong>${highlightDetails.bookTitle}</strong></div>` : ''}
        ${highlightDetails.luluJobId ? `<div>• Lulu Job ID: <strong>${highlightDetails.luluJobId}</strong></div>` : ''}
        ${highlightDetails.luluStatus ? `<div>• Estado Lulu: <strong>${highlightDetails.luluStatus}</strong></div>` : ''}
        ${highlightDetails.trackingNumber ? `<div>• Tracking: <strong>${highlightDetails.trackingNumber}</strong></div>` : ''}
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

  const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin: 0; padding: 0; background-color: #f4efe6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4efe6; padding: 30px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2ddd3; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: #1f1c19; color: #ffffff; padding: 22px 28px; text-align: center;">
              <div style="font-family: Georgia, serif; font-size: 20px; font-weight: bold;">EDITORIAL MENOS RUIDO</div>
              <div style="font-size: 11px; color: #c4b8aa; margin-top: 4px; text-transform: uppercase;">Papelería analógica · Directa y sin rodeos</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 30px 24px; background-color: #faf8f5;">
              <h1 style="font-family: Georgia, serif; font-size: 21px; font-weight: bold; color: #1f1c19; margin: 0 0 18px 0;">${subject}</h1>
              ${safeBodyHtml}
              ${highlightBoxHtml}
              ${buttonHtml}
              <div style="margin-top: 28px; padding-top: 18px; border-top: 1px dashed #e2dbce; font-size: 14px; color: #5e5347;">
                Un saludo,<br><strong>El equipo de Editorial Menos Ruido</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f2ece1; border-top: 1px solid #e5ded2; padding: 18px 24px; font-size: 12px; color: #756a5e; text-align: center;">
              Editorial Menos Ruido · <a href="https://www.editorialmenosruido.com" style="color: #87553b;">www.editorialmenosruido.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'Editorial Menos Ruido <pedidos@editorialmenosruido.com>',
      to: Array.isArray(to) ? to : [to],
      reply_to: 'pedidos@editorialmenosruido.com',
      subject,
      html: fullHtml
    })
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
