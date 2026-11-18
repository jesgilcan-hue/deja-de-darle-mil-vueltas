// Adaptador ligero jsPDF -> PDFKit para renderizar PDFs vectoriales en Node (Vercel Serverless)
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_MAP = {
  'Helvetica': path.join(__dirname, 'fonts', 'arial.ttf'),
  'Helvetica-Bold': path.join(__dirname, 'fonts', 'arialbd.ttf'),
  'Helvetica-Oblique': path.join(__dirname, 'fonts', 'ariali.ttf'),
  'Helvetica-BoldOblique': path.join(__dirname, 'fonts', 'arialbd.ttf'),
  'Times-Roman': path.join(__dirname, 'fonts', 'georgia.ttf'),
  'Times-Bold': path.join(__dirname, 'fonts', 'georgiab.ttf'),
  'Times-Italic': path.join(__dirname, 'fonts', 'georgiai.ttf'),
  'Times-BoldItalic': path.join(__dirname, 'fonts', 'georgiab.ttf'),
  'Courier': path.join(__dirname, 'fonts', 'arial.ttf'),
  'Courier-Bold': path.join(__dirname, 'fonts', 'arialbd.ttf'),
  'Courier-Oblique': path.join(__dirname, 'fonts', 'ariali.ttf'),
  'Courier-BoldOblique': path.join(__dirname, 'fonts', 'arialbd.ttf')
};

const MM_TO_PT = 72 / 25.4;

function sanitizePdfText(str) {
  return String(str ?? '')
    // Eliminar emojis y caracteres fuera del rango latino/europeo soportado por Arial/Georgia
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g, ' ')
    .replace(/ {2,}/g, ' ');
}

function parseRgb(r, g, b) {
  if (Array.isArray(r)) return [Number(r[0] || 0), Number(r[1] || 0), Number(r[2] || 0)];
  if (g === undefined && b === undefined) {
    const v = Number(r || 0);
    return [v, v, v];
  }
  return [Number(r || 0), Number(g || 0), Number(b || 0)];
}

function mapFont(family = 'helvetica', style = 'normal') {
  const fam = String(family || 'helvetica').toLowerCase();
  const st = String(style || 'normal').toLowerCase();
  const isBold = st.includes('bold');
  const isItalic = st.includes('italic') || st.includes('oblique');

  if (fam.includes('times')) {
    if (isBold && isItalic) return 'Times-BoldItalic';
    if (isBold) return 'Times-Bold';
    if (isItalic) return 'Times-Italic';
    return 'Times-Roman';
  }
  if (fam.includes('courier')) {
    if (isBold && isItalic) return 'Courier-BoldOblique';
    if (isBold) return 'Courier-Bold';
    if (isItalic) return 'Courier-Oblique';
    return 'Courier';
  }
  if (isBold && isItalic) return 'Helvetica-BoldOblique';
  if (isBold) return 'Helvetica-Bold';
  if (isItalic) return 'Helvetica-Oblique';
  return 'Helvetica';
}

export class JsPdfCompat {
  constructor({ orientation = 'landscape', format = [209.55, 152.4], compress = true, rotateTo6x9 = false } = {}) {
    this.rotateTo6x9 = Boolean(rotateTo6x9);
    const [w, h] = this.rotateTo6x9 ? [152.4, 228.6] : format;
    const effOrient = this.rotateTo6x9 ? 'portrait' : orientation;
    const wMm = effOrient === 'landscape' ? Math.max(w, h) : Math.min(w, h);
    const hMm = effOrient === 'landscape' ? Math.min(w, h) : Math.max(w, h);

    this.doc = new PDFDocument({
      size: [wMm * MM_TO_PT, hMm * MM_TO_PT],
      margin: 0,
      autoFirstPage: false,
      compress: Boolean(compress),
      bufferPages: false
    });

    this.chunks = [];
    this.doc.on('data', (c) => this.chunks.push(c));

    for (const [name, fontPath] of Object.entries(FONT_MAP)) {
      this.doc.registerFont(name, fontPath);
    }

    this.fillColor = [0, 0, 0];
    this.drawColor = [0, 0, 0];
    this.textColor = [0, 0, 0];
    this.fontFamily = 'helvetica';
    this.fontStyle = 'normal';
    this.fontSizePt = 10;
    this.currentLineWidthMm = 0.2;

    this.addPage([wMm, hMm], effOrient);
  }

  addPage(format = [209.55, 152.4], orientation = 'landscape') {
    const [w, h] = this.rotateTo6x9 ? [152.4, 228.6] : format;
    const effOrient = this.rotateTo6x9 ? 'portrait' : orientation;
    const wMm = effOrient === 'landscape' ? Math.max(w, h) : Math.min(w, h);
    const hMm = effOrient === 'landscape' ? Math.min(w, h) : Math.max(w, h);
    this.doc.addPage({ size: [wMm * MM_TO_PT, hMm * MM_TO_PT], margin: 0 });
    if (this.rotateTo6x9) {
      // Fondo crema completo en 6x9 y rotar -90º centrando 209.55mm en 228.6mm
      this.doc.rect(0, 0, wMm * MM_TO_PT, hMm * MM_TO_PT).fill([255, 254, 251]);
      this.doc.translate(((228.6 - 209.55) / 2) * 0, hMm * MM_TO_PT);
      this.doc.rotate(-90);
      this.doc.translate(((228.6 - 209.55) / 2) * MM_TO_PT, 0);
    }
    this.doc.font(mapFont(this.fontFamily, this.fontStyle)).fontSize(this.fontSizePt);
    this.doc.lineWidth(this.currentLineWidthMm * MM_TO_PT);
  }

  setFillColor(r, g, b) {
    this.fillColor = parseRgb(r, g, b);
  }

  setDrawColor(r, g, b) {
    this.drawColor = parseRgb(r, g, b);
  }

  setTextColor(r, g, b) {
    this.textColor = parseRgb(r, g, b);
  }

  setLineWidth(wMm) {
    this.currentLineWidthMm = Number(wMm || 0.2);
    this.doc.lineWidth(this.currentLineWidthMm * MM_TO_PT);
  }

  setLineDashPattern(dashArray, dashPhase = 0) {
    if (Array.isArray(dashArray) && dashArray.length > 0) {
      const len = Number(dashArray[0] || 1) * MM_TO_PT;
      const space = Number(dashArray[1] ?? dashArray[0] ?? 1) * MM_TO_PT;
      this.doc.dash(len, { space, phase: Number(dashPhase || 0) * MM_TO_PT });
    } else {
      this.doc.undash();
    }
  }

  setFont(family, style = 'normal') {
    this.fontFamily = family || 'helvetica';
    this.fontStyle = style || 'normal';
    this.doc.font(mapFont(this.fontFamily, this.fontStyle));
  }

  setFontSize(pt) {
    this.fontSizePt = Number(pt || 10);
    this.doc.fontSize(this.fontSizePt);
  }

  _paint(style = 'S') {
    const s = String(style || 'S').toUpperCase();
    if (s === 'F') {
      this.doc.fill(this.fillColor);
    } else if (s === 'FD' || s === 'DF') {
      this.doc.fillAndStroke(this.fillColor, this.drawColor);
    } else {
      this.doc.stroke(this.drawColor);
    }
  }

  rect(x, y, w, h, style = 'S') {
    this.doc.rect(x * MM_TO_PT, y * MM_TO_PT, w * MM_TO_PT, h * MM_TO_PT);
    this._paint(style);
  }

  roundedRect(x, y, w, h, rx = 1, _ry = 1, style = 'S') {
    this.doc.roundedRect(x * MM_TO_PT, y * MM_TO_PT, w * MM_TO_PT, h * MM_TO_PT, rx * MM_TO_PT);
    this._paint(style);
  }

  circle(x, y, r, style = 'S') {
    this.doc.circle(x * MM_TO_PT, y * MM_TO_PT, r * MM_TO_PT);
    this._paint(style);
  }

  line(x1, y1, x2, y2) {
    this.doc.moveTo(x1 * MM_TO_PT, y1 * MM_TO_PT).lineTo(x2 * MM_TO_PT, y2 * MM_TO_PT).stroke(this.drawColor);
  }

  lines(segments, x, y, scale = [1, 1], style = 'S', closed = false) {
    const sx = Array.isArray(scale) ? Number(scale[0] ?? 1) : 1;
    const sy = Array.isArray(scale) ? Number(scale[1] ?? 1) : 1;
    let cx = x * MM_TO_PT;
    let cy = y * MM_TO_PT;
    this.doc.moveTo(cx, cy);
    for (const seg of segments || []) {
      cx += Number(seg[0] || 0) * sx * MM_TO_PT;
      cy += Number(seg[1] || 0) * sy * MM_TO_PT;
      this.doc.lineTo(cx, cy);
    }
    if (closed) this.doc.closePath();
    this._paint(style);
  }

  getTextWidth(str) {
    return this.doc.widthOfString(sanitizePdfText(str)) / MM_TO_PT;
  }

  splitTextToSize(str, maxWidthMm) {
    const rawLines = sanitizePdfText(str).split(/\r?\n/);
    const out = [];
    for (const raw of rawLines) {
      const words = raw.split(/\s+/).filter(Boolean);
      if (!words.length) {
        out.push('');
        continue;
      }
      let current = words[0];
      for (let i = 1; i < words.length; i++) {
        const test = current + ' ' + words[i];
        if (this.getTextWidth(test) <= maxWidthMm) {
          current = test;
        } else {
          out.push(current);
          current = words[i];
        }
      }
      out.push(current);
    }
    return out;
  }

  text(str, x, y, opts = {}) {
    const lines = Array.isArray(str) ? str : [String(str ?? '')];
    const align = opts.align || 'left';
    const ascender = (this.doc._font && this.doc._font.ascender) ? this.doc._font.ascender : 800;
    const baselineOffsetPt = (ascender / 1000) * this.fontSizePt;
    const lineHeightMm = (this.fontSizePt * 1.15) / MM_TO_PT;

    this.doc.fillColor(this.textColor);
    for (let i = 0; i < lines.length; i++) {
      const lineStr = sanitizePdfText(lines[i]);
      if (!lineStr) continue;
      const wPt = this.doc.widthOfString(lineStr);
      let xPt = x * MM_TO_PT;
      if (align === 'center') xPt -= wPt / 2;
      else if (align === 'right') xPt -= wPt;
      const yPt = (y + i * lineHeightMm) * MM_TO_PT - baselineOffsetPt;
      this.doc.text(lineStr, xPt, yPt, { lineBreak: false });
    }
  }

  toBuffer() {
    return new Promise((resolve, reject) => {
      this.doc.on('end', () => resolve(Buffer.concat(this.chunks)));
      this.doc.on('error', reject);
      this.doc.end();
    });
  }
}
