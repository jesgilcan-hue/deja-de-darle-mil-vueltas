// Serverless Function para Vercel: /api/send-pdf
// Envío seguro de PDF de planificadores por correo mediante Resend API
// Remitente oficial de materiales: recursos@editorialmenosruido.com

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

    // Determinar la recomendación del cuaderno físico según el planificador enviado
    const nameLower = cleanPlannerName.toLowerCase();
    let bookRecommendation = {
      title: 'Planificador Semanal Atemporal',
      tag: 'Formato Apaisado · 53 Semanas',
      desc: 'Si te gusta planificar tu semana en papel y prefieres tenerlo todo encuadernado sobre tu mesa en lugar de acumular folios sueltos, aquí tienes el cuaderno físico listo en Amazon.',
      webUrl: 'https://www.editorialmenosruido.com/planificador-semanal-simple.html',
      amazonUrl: 'https://www.editorialmenosruido.com/ir/amazon-semanal-simple.html',
      coverUrl: 'https://www.editorialmenosruido.com/cover_semanal_simple.jpg'
    };

    if (nameLower.includes('diario') || nameLower.includes('90') || nameLower.includes('anual')) {
      bookRecommendation = {
        title: 'Planificador de 90 Días',
        tag: 'Una sola prioridad diaria · Trimestral',
        desc: 'Si buscas una estructura diaria para enfocarte en una sola prioridad y no dispersarte con listas interminables, este es el cuaderno físico encuadernado para acompañarte cada día.',
        webUrl: 'https://www.editorialmenosruido.com/planificador-90-dias.html',
        amazonUrl: 'https://www.editorialmenosruido.com/ir/amazon-90-dias.html',
        coverUrl: 'https://www.editorialmenosruido.com/cover_90.jpg'
      };
    } else if (nameLower.includes('horario') || nameLower.includes('reversible')) {
      bookRecommendation = {
        title: 'Planificador Semanal Reversible',
        tag: 'Doble Portada · Franjas Horarias',
        desc: 'Si necesitas organizar tu tiempo por horas y prefieres tener todas las semanas reunidas en un solo cuaderno en lugar de hojas sueltas, puedes ver el formato físico aquí.',
        webUrl: 'https://www.editorialmenosruido.com/planificador-semanal-reversible.html',
        amazonUrl: 'https://www.editorialmenosruido.com/ir/amazon-semanal-reversible.html',
        coverUrl: 'https://www.editorialmenosruido.com/cover_semanal_reversible.jpg'
      };
    }

    // Plantilla HTML editorial limpia y conforme a normativa de protección de datos
    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Tu planificador en PDF</title>
</head>
<body style="margin: 0; padding: 28px 12px; background-color: #f7f4ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #212121; line-height: 1.6;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; border: 1px solid #e8e2d8; padding: 32px 28px; box-shadow: 0 4px 18px rgba(0,0,0,0.03);">
    
    <!-- CABECERA EDITORIAL -->
    <div style="text-align: center; margin-bottom: 22px;">
      <span style="display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #87553b; margin-bottom: 8px;">Editorial Menos Ruido</span>
      <h1 style="font-family: Georgia, serif; font-size: 23px; color: #212121; margin: 0 0 8px 0; font-weight: 600;">
        Aquí tienes tu ${cleanPlannerName}
      </h1>
      <p style="font-size: 14px; color: #666059; margin: 0;">
        Encontrarás tu archivo listo para imprimir adjunto a este correo.
      </p>
    </div>

    <!-- CAJA DEL ARCHIVO ADJUNTO -->
    <div style="background-color: #faf6f0; border-left: 3px solid #87553b; border-radius: 6px; padding: 14px 18px; margin-bottom: 22px;">
      <p style="margin: 0; font-size: 14px; color: #4a3f35; line-height: 1.45;">
        <strong>Archivo adjunto:</strong> <code>${cleanFilename}</code>
      </p>
    </div>

    <!-- CONSEJO SENCILLO DE IMPRESIÓN (SIN TECNICISMOS) -->
    <div style="font-size: 14px; color: #444; line-height: 1.6; margin-bottom: 24px;">
      <p style="margin: 0 0 10px 0;">
        <strong>Un consejo al imprimir:</strong> te recomendamos imprimirlo a <em>tamaño real</em> (al 100% en las opciones de tu impresora, sin reducir a página) para que los renglones y casillas queden con espacio cómodo para escribir a mano.
      </p>
    </div>

    <!-- RECOMENDACIÓN DEL CUADERNO FÍSICO (SIN TECNICISMOS) -->
    <div style="background-color: #fdfbf7; border: 1px solid #ebe4d8; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #87553b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
        ${bookRecommendation.tag}
      </span>
      <h3 style="font-family: Georgia, serif; font-size: 18px; margin: 0 0 8px 0; color: #212121;">
        ${bookRecommendation.title}
      </h3>
      <p style="font-size: 13.5px; color: #555; line-height: 1.5; margin: 0 0 16px 0;">
        ${bookRecommendation.desc}
      </p>
      <div>
        <a href="${bookRecommendation.amazonUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #87553b; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 6px; margin-right: 10px; margin-bottom: 6px;">
          Ver en Amazon ↗
        </a>
        <a href="${bookRecommendation.webUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; font-size: 13px; color: #666; text-decoration: underline; padding: 10px 0;">
          Conocer detalles en la web →
        </a>
      </div>
    </div>

    <!-- ENLACE A LA WEB RAÍZ -->
    <div style="text-align: center; padding-top: 14px; border-top: 1px solid #f0ebe1;">
      <a href="https://www.editorialmenosruido.com" style="color: #666059; text-decoration: underline; font-size: 13px;">
        Volver a Editorial Menos Ruido (editorialmenosruido.com)
      </a>
    </div>

    <!-- PIE LEGAL Y OPCIÓN DE BAJA (GDPR / LOPD) -->
    <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f4f0e8; font-size: 11.5px; color: #9c9489; line-height: 1.5;">
      <p style="margin: 0 0 6px 0;">
        Recibes este correo porque has solicitado la plantilla <strong>${cleanPlannerName}</strong> en editorialmenosruido.com.
      </p>
      <p style="margin: 0 0 6px 0;">
        Si no deseas recibir más recursos de la editorial, puedes darte de baja en cualquier momento respondiendo a este mensaje con la palabra «Baja» o consultando nuestra <a href="https://www.editorialmenosruido.com/politica-privacidad.html" style="color: #87553b; text-decoration: underline;">Política de Privacidad</a>.
      </p>
      <p style="margin: 0;">
        Editorial Menos Ruido · Herramientas en papel para pensar con claridad<br>
        Enviado desde recursos@editorialmenosruido.com
      </p>
    </div>

  </div>
</body>
</html>
    `;

    // Enviar a través de la API oficial de Resend desde recursos@editorialmenosruido.com
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Editorial Menos Ruido <recursos@editorialmenosruido.com>',
        to: [email],
        reply_to: 'recursos@editorialmenosruido.com',
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
