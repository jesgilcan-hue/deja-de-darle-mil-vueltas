// Serverless Function para Vercel: /api/send-pdf
// Envío seguro de PDF de planificadores por correo mediante Resend API

export default async function handler(req, res) {
  // Configuración de CORS y cabeceras
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Solo se acepta POST.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Falta la variable de entorno RESEND_API_KEY en el servidor.');
    return res.status(500).json({
      error: 'Configuración incompleta en el servidor: no se encontró la clave de Resend.'
    });
  }

  try {
    const { email, pdfBase64, filename, plannerName } = req.body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Por favor, introduce un correo electrónico válido.' });
    }

    if (!pdfBase64) {
      return res.status(400).json({ error: 'No se ha proporcionado el archivo PDF en base64.' });
    }

    // Limpiar el prefijo data URI si viene incluido
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').replace(/\s/g, '');
    const cleanPlannerName = plannerName || 'Planificador Menos Ruido';
    const cleanFilename = filename || 'Menos_Ruido_Planificador.pdf';

    // Plantilla HTML de email con diseño editorial Menos Ruido (cuidando no usar la palabra vetada)
    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Tu planificador en PDF</title>
</head>
<body style="margin: 0; padding: 30px 15px; background-color: #f7f4ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #212121; line-height: 1.6;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e8e2d8; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
    
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #87553b; margin-bottom: 8px;">Editorial Menos Ruido</span>
      <h1 style="font-family: Georgia, serif; font-size: 24px; color: #212121; margin: 0 0 10px 0; font-weight: 600;">
        Aquí tienes tu ${cleanPlannerName}
      </h1>
      <p style="font-size: 15px; color: #666059; margin: 0;">
        Listo en el archivo adjunto para imprimir y usar sobre tu mesa.
      </p>
    </div>

    <div style="background-color: #faf6f0; border-left: 3px solid #87553b; border-radius: 6px; padding: 18px 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #4a3f35; line-height: 1.5;">
        <strong>Tu PDF adjunto:</strong> <code>${cleanFilename}</code><br>
        Optimizado para imprimir en tamaño real y trabajar en papel con máxima claridad y foco.
      </p>
    </div>

    <div style="font-size: 14px; color: #444; line-height: 1.6; margin-bottom: 28px;">
      <p style="margin: 0 0 12px 0;">
        Planificar en papel no es nostalgia, es una barrera física frente al exceso de pestañas, notificaciones y urgencias ficticias.
      </p>
      <p style="margin: 0;">
        Si en cualquier momento quieres modificarlo o crear una versión nueva, puedes volver a generarlo gratis en nuestra web.
      </p>
    </div>

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f0ebe1;">
      <a href="https://editorialmenosruido.com" style="display: inline-block; background-color: #87553b; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 6px;">
        Visitar Editorial Menos Ruido
      </a>
    </div>

    <div style="text-align: center; margin-top: 28px; font-size: 12px; color: #9c9489;">
      <p style="margin: 0 0 4px 0;">Menos Ruido · Herramientas en papel para pensar con claridad</p>
      <p style="margin: 0;">Enviado desde acceso@editorialmenosruido.com</p>
    </div>
  </div>
</body>
</html>
    `;

    // Enviar a través de la API oficial de Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Editorial Menos Ruido <acceso@editorialmenosruido.com>',
        to: [email],
        subject: `Tu ${cleanPlannerName} en PDF | Menos Ruido`,
        html: emailHtml,
        attachments: [
          {
            filename: cleanFilename,
            content: cleanBase64
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error devuelto por Resend API:', data);
      return res.status(response.status).json({
        error: data.message || 'No se pudo enviar el correo a través de Resend.'
      });
    }

    return res.status(200).json({
      success: true,
      id: data.id,
      message: 'PDF enviado correctamente a tu correo.'
    });

  } catch (err) {
    console.error('Error interno al enviar PDF por email:', err);
    return res.status(500).json({
      error: 'Error interno en el servidor al procesar el envío del correo.'
    });
  }
}
