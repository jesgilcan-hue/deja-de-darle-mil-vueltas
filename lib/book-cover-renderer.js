// Renderizador vectorial de Portada en servidor (Node/PDFKit) calibrado para Lulu Direct API
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import path from 'path';
import { luluApiRequest } from './lulu-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_SANS = path.join(__dirname, 'fonts', 'arial.ttf');
const FONT_SANS_BOLD = path.join(__dirname, 'fonts', 'arialbd.ttf');
const FONT_SERIF_BOLD = path.join(__dirname, 'fonts', 'georgiab.ttf');

const MM_TO_PT = 72 / 25.4;

function sanitizeCoverText(str) {
  return String(str ?? '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

const PALETTES = {
  forest: { bg: [34, 56, 44], fg: [246, 241, 231], accent: [196, 168, 128] },
  charcoal: { bg: [31, 28, 25], fg: [246, 241, 231], accent: [196, 168, 128] },
  terracotta: { bg: [135, 85, 59], fg: [250, 246, 239], accent: [232, 213, 183] },
  cream: { bg: [244, 239, 230], fg: [31, 28, 25], accent: [135, 85, 59] }
};

export async function getExactLuluCoverDimensionsMm({ podPackageId, pageCount, luluEnv = 'sandbox', bindingType = 'softcover' }) {
  const pkg = podPackageId || '0900X0700BWSTDPB060UC444MXX';
  try {
    const res = await luluApiRequest('/cover-dimensions/', {
      method: 'POST',
      env: luluEnv,
      body: {
        pod_package_id: pkg,
        interior_page_count: Number(pageCount || 144),
        unit: 'mm'
      }
    });
    const dimData = res?.data || res;
    if (res?.ok !== false && dimData && Number(dimData.width) > 0 && Number(dimData.height) > 0) {
      return {
        widthMm: Number(dimData.width),
        heightMm: Number(dimData.height),
        bleedMm: 3.175
      };
    }
  } catch (e) {
    console.warn('Fallback dimensiones portada (Lulu cover-dimensions):', e.message);
  }

  // Fallback exacto por fórmula
  const is900x700 = pkg.startsWith('0900X0700');
  const trimW = is900x700 ? 228.6 : 152.4;
  const trimH = is900x700 ? 177.8 : 228.6;
  const bleedMm = 3.175;
  const baseSpine = Number(pageCount || 144) * 0.0572;
  const spineMm = bindingType === 'hardcover' ? baseSpine + 2.5 : baseSpine;
  return {
    widthMm: +(trimW * 2 + spineMm + bleedMm * 2).toFixed(2),
    heightMm: +(trimH + bleedMm * 2).toFixed(2),
    bleedMm
  };
}

export async function renderCoverPdfBuffer({
  title = 'Planificador Personalizado',
  subtitle = 'Edición Analógica · Menos Ruido',
  colophon = 'Herramientas en papel para pensar con claridad',
  pageCount = 144,
  bindingType = 'softcover',
  podPackageId = '0900X0700BWSTDPB060UC444MXX',
  palette = 'forest',
  luluEnv = 'sandbox'
} = {}) {
  const dims = await getExactLuluCoverDimensionsMm({ podPackageId, pageCount, luluEnv, bindingType });
  const pal = PALETTES[palette] || PALETTES.forest;

  const spreadW = dims.widthMm;
  const spreadH = dims.heightMm;
  const bleed = dims.bleedMm || 3.175;

  const is900x700 = String(podPackageId || '').startsWith('0900X0700');
  const trimW = is900x700 ? 228.6 : 152.4;
  const spineW = Math.max(0, spreadW - bleed * 2 - trimW * 2);
  const panelW = (spreadW - bleed * 2 - spineW) / 2;

  const doc = new PDFDocument({
    size: [spreadW * MM_TO_PT, spreadH * MM_TO_PT],
    margin: 0,
    compress: true
  });

  doc.registerFont('Sans', FONT_SANS);
  doc.registerFont('SansBold', FONT_SANS_BOLD);
  doc.registerFont('SerifBold', FONT_SERIF_BOLD);

  const chunks = [];
  doc.on('data', (c) => chunks.push(c));

  const pt = (mm) => mm * MM_TO_PT;

  // Fondo completo con sangría
  doc.rect(0, 0, pt(spreadW), pt(spreadH)).fill(pal.bg);

  // Coordenadas portada delantera (derecha del pliego)
  const frontX = bleed + panelW + spineW;
  const frontY = bleed;
  const frontH = spreadH - bleed * 2;

  // Marco editorial en portada
  const pad = 12;
  doc.lineWidth(0.9).strokeColor(pal.accent)
    .rect(pt(frontX + pad), pt(frontY + pad), pt(panelW - pad * 2), pt(frontH - pad * 2))
    .stroke();
  doc.lineWidth(0.4).strokeColor(pal.accent)
    .rect(pt(frontX + pad + 2.5), pt(frontY + pad + 2.5), pt(panelW - (pad + 2.5) * 2), pt(frontH - (pad + 2.5) * 2))
    .stroke();

  // Texto superior portada
  doc.fillColor(pal.accent).font('SansBold').fontSize(8.5);
  doc.text('EDITORIAL MENOS RUIDO', pt(frontX), pt(frontY + 26), {
    width: pt(panelW),
    align: 'center'
  });

  // Título principal
  const cleanTitle = sanitizeCoverText(title || 'Planificador Personal').slice(0, 60);
  doc.fillColor(pal.fg).font('SerifBold').fontSize(24);
  doc.text(cleanTitle, pt(frontX + 18), pt(frontY + frontH * 0.36), {
    width: pt(panelW - 36),
    align: 'center'
  });

  // Subtítulo
  const cleanSub = sanitizeCoverText(subtitle || '').slice(0, 100);
  if (cleanSub) {
    doc.fillColor(pal.accent).font('Sans').fontSize(10.5);
    doc.text(cleanSub, pt(frontX + 20), pt(frontY + frontH * 0.56), {
      width: pt(panelW - 40),
      align: 'center'
    });
  }

  // Pie de portada
  doc.fillColor(pal.accent).font('SansBold').fontSize(7.5);
  doc.text('EDICIÓN ANALÓGICA · PAPEL Y LÁPIZ', pt(frontX), pt(frontY + frontH - 24), {
    width: pt(panelW),
    align: 'center'
  });

  // Lomo (si tiene ancho suficiente)
  if (spineW >= 7) {
    const spineCenterX = bleed + panelW + spineW / 2;
    const spineCenterY = spreadH / 2;
    doc.save();
    doc.translate(pt(spineCenterX), pt(spineCenterY));
    doc.rotate(90);
    doc.fillColor(pal.fg).font('SansBold').fontSize(Math.min(9.5, Math.max(6.5, spineW * 0.45)));
    doc.text(cleanTitle.toUpperCase(), pt(-frontH * 0.35), -4, {
      width: pt(frontH * 0.7),
      align: 'center'
    });
    doc.restore();
  }

  // Contraportada (izquierda del pliego)
  const backX = bleed;
  doc.fillColor(pal.accent).font('Sans').fontSize(9.5);
  doc.text(String(colophon || 'Herramientas en papel para pensar con claridad'), pt(backX + 22), pt(frontY + frontH * 0.45), {
    width: pt(panelW - 44),
    align: 'center'
  });
  doc.fillColor(pal.fg).font('SansBold').fontSize(8);
  doc.text('editorialmenosruido.com', pt(backX), pt(frontY + frontH - 24), {
    width: pt(panelW),
    align: 'center'
  });

  return await new Promise((resolve, reject) => {
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), widthMm: spreadW, heightMm: spreadH, spineMm: +spineW.toFixed(2) }));
    doc.on('error', reject);
    doc.end();
  });
}
