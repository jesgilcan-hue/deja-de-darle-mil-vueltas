// Serverless Function para Vercel: /api/send-pdf
// Envío seguro de PDF de planificadores por correo mediante Resend API
// Remitente oficial de materiales: recursos@editorialmenosruido.com
// Formato humano personal (como un email normal escrito por una persona)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

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
      desc: 'Si te gusta planificar tu semana en papel y prefieres tenerlo todo encuadernado sobre tu mesa en lugar de acumular folios sueltos, tienes el cuaderno completo aquí:',
      webUrl: 'https://www.editorialmenosruido.com/planificador-semanal-simple.html',
      amazonUrl: 'https://www.editorialmenosruido.com/ir/amazon-semanal-simple.html'
    };

    if (nameLower.includes('diario') || nameLower.includes('90') || nameLower.includes('anual')) {
      bookRecommendation = {
        title: 'Planificador de 90 Días',
        desc: 'Si buscas una estructura diaria para enfocarte en una sola prioridad y no dispersarte con listas interminables, este es el cuaderno físico diseñado para acompañarte día a día:',
        webUrl: 'https://www.editorialmenosruido.com/planificador-90-dias.html',
        amazonUrl: 'https://www.editorialmenosruido.com/ir/amazon-90-dias.html'
      };
    } else if (nameLower.includes('horario') || nameLower.includes('reversible')) {
      bookRecommendation = {
        title: 'Planificador Semanal Reversible',
        desc: 'Si necesitas organizar tu tiempo por horas y prefieres tener todas las semanas reunidas en un solo cuaderno en tu mesa, puedes ver el formato físico aquí:',
        webUrl: 'https://www.editorialmenosruido.com/planificador-semanal-reversible.html',
        amazonUrl: 'https://www.editorialmenosruido.com/ir/amazon-semanal-reversible.html'
      };
    }

    // Plantilla de email en formato personal (como un correo normal entre personas, sin cajas llamativas)
    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Tu plantilla en PDF</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #222222; font-size: 15px; line-height: 1.65;">
  <div style="max-width: 560px; margin: 0 auto;">
    
    <p style="margin: 0 0 16px 0;">Hola,</p>

    <p style="margin: 0 0 16px 0;">
      Aquí tienes el PDF de tu <strong>${cleanPlannerName}</strong> (archivo adjunto: <code>${cleanFilename}</code>) listo para que puedas imprimirlo y usarlo cuando quieras.
    </p>

    <p style="margin: 0 0 16px 0;">
      Un consejo rápido al imprimirlo: te recomiendo poner la escala al 100% (tamaño real en los ajustes de tu impresora, sin ajustar ni reducir a página) para que los renglones y las casillas te queden con espacio cómodo para escribir a mano.
    </p>

    <p style="margin: 0 0 16px 0;">
      ${bookRecommendation.desc}
      <br>
      👉 <a href="${bookRecommendation.amazonUrl}" style="color: #87553b; font-weight: 600; text-decoration: underline;">Ver el ${bookRecommendation.title} en Amazon</a>
      <br>
      <span style="font-size: 13.5px; color: #666;">(O conocer todos los detalles en nuestra web: <a href="${bookRecommendation.webUrl}" style="color: #666; text-decoration: underline;">editorialmenosruido.com</a>)</span>
    </p>

    <p style="margin: 0 0 20px 0;">
      Cualquier duda, sugerencia o comentario sobre la plantilla, puedes responder directamente a este correo.
    </p>

    <p style="margin: 0 0 28px 0;">
      Un saludo cordial,<br>
      <strong>Editorial Menos Ruido</strong><br>
      <a href="https://www.editorialmenosruido.com" style="color: #666666; text-decoration: underline; font-size: 14px;">editorialmenosruido.com</a>
    </p>

    <!-- PIE LEGAL Y BOTÓN DE BAJA -->
    <div style="border-top: 1px solid #e5e0d8; padding-top: 18px; margin-top: 28px; font-size: 12px; color: #777777; line-height: 1.55;">
      <p style="margin: 0 0 10px 0;">
        Recibes este correo porque has solicitado la plantilla <em>${cleanPlannerName}</em> en editorialmenosruido.com.
      </p>
      <p style="margin: 0 0 12px 0;">
        Si no deseas recibir más avisos ni recursos de la editorial, puedes darte de baja en cualquier momento con este botón:
      </p>
      <div>
        <a href="https://www.editorialmenosruido.com/baja.html" style="display: inline-block; padding: 6px 14px; font-size: 12px; color: #555555; background-color: #faf7f2; border: 1px solid #d4cdc3; border-radius: 4px; text-decoration: none; font-weight: 500;">
          Darme de baja
        </a>
      </div>
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
        reply_to: 'contacto@editorialmenosruido.com',
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
