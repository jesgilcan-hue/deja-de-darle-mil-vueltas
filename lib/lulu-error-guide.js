// Traduce errores técnicos de preflight de Lulu Direct API a diagnóstico y pasos accionables en español

const LULU_ERROR_RULES = [
  {
    test: /font|embed/i,
    title: 'Fuentes tipográficas sin incrustar',
    action:
      'El PDF tiene fuentes sin incrustar. Solución: exporta de nuevo el PDF incrustando todas las fuentes (o convierte textos a curvas / rasteriza la portada a 300 DPI) antes de reenviarlo.'
  },
  {
    test: /spine|width|height|dimension|trim|bleed|size|aspect/i,
    title: 'Medidas, lomo o sangrado incorrectos',
    action:
      'Las dimensiones del PDF no coinciden con el formato/lomo calculado por Lulu. Solución: revisa el tamaño de página (6×9"), la sangría de 0,125" (3,175 mm) en portada y el ancho de lomo exacto para el número de páginas.'
  },
  {
    test: /page.?count|even|odd|minimum|maximum|pages/i,
    title: 'Número de páginas no válido',
    action:
      'El número de páginas no cumple requisitos (debe ser par y mínimo 32 páginas) o no coincide con el declarado. Solución: añade/quita una página en blanco al final o ajusta el conteo antes de reenviar.'
  },
  {
    test: /dpi|ppi|resolution|low.?res/i,
    title: 'Resolución de imagen insuficiente',
    action:
      'Alguna imagen está por debajo de 300 DPI. Solución: reexporta las imágenes o el PDF completo a 300 DPI reales.'
  },
  {
    test: /download|fetch|url|404|403|timeout|unreachable/i,
    title: 'No se pudo descargar el PDF desde la URL',
    action:
      'Lulu no pudo acceder al enlace del interior o la portada. Solución: verifica que las URLs HTTPS públicas responden 200 OK y vuelve a enviar.'
  },
  {
    test: /corrupt|invalid.?pdf|syntax|encrypted|password/i,
    title: 'PDF corrupto o protegido con contraseña',
    action:
      'El archivo PDF está dañado o protegido. Solución: regenera el PDF sin contraseña ni restricciones de impresión.'
  }
];

export function explainLuluErrors(messages = []) {
  const list = Array.isArray(messages) ? messages : [String(messages || '')];
  const guides = [];
  const seen = new Set();

  for (const raw of list) {
    const text = String(raw || '').trim();
    if (!text) continue;
    for (const rule of LULU_ERROR_RULES) {
      if (rule.test.test(text) && !seen.has(rule.title)) {
        seen.add(rule.title);
        const fileTarget = /\bcover\b/i.test(text)
          ? 'Portada'
          : /\binterior\b/i.test(text)
          ? 'Interior'
          : 'Archivo PDF';
        guides.push(`[${fileTarget}] ${rule.title}: ${rule.action}`);
      }
    }
  }

  if (!guides.length && list.some(Boolean)) {
    guides.push(
      'Revisa el mensaje técnico de Lulu arriba, corrige el PDF afectado (o solicita nuevo archivo al cliente si lo subió él) y pulsa «Reintentar envío a Lulu».'
    );
  }

  return guides;
}
