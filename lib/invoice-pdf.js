// Generador de facturas y recibos contables en PDF usando PDFKit y fuentes embebidas
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONT_PATHS = {
  sans: path.join(__dirname, 'fonts', 'arial.ttf'),
  sansBold: path.join(__dirname, 'fonts', 'arialbd.ttf'),
  serif: path.join(__dirname, 'fonts', 'georgia.ttf'),
  serifBold: path.join(__dirname, 'fonts', 'georgiab.ttf')
};

function registerFonts(doc) {
  const hasSans = fs.existsSync(FONT_PATHS.sans);
  const hasSansBold = fs.existsSync(FONT_PATHS.sansBold);
  const hasSerif = fs.existsSync(FONT_PATHS.serif);
  const hasSerifBold = fs.existsSync(FONT_PATHS.serifBold);

  if (hasSans) doc.registerFont('EMR-Sans', FONT_PATHS.sans);
  if (hasSansBold) doc.registerFont('EMR-Sans-Bold', FONT_PATHS.sansBold);
  if (hasSerif) doc.registerFont('EMR-Serif', FONT_PATHS.serif);
  if (hasSerifBold) doc.registerFont('EMR-Serif-Bold', FONT_PATHS.serifBold);

  return {
    sans: hasSans ? 'EMR-Sans' : 'Helvetica',
    sansBold: hasSansBold ? 'EMR-Sans-Bold' : 'Helvetica-Bold',
    serif: hasSerif ? 'EMR-Serif' : 'Times-Roman',
    serifBold: hasSerifBold ? 'EMR-Serif-Bold' : 'Times-Bold'
  };
}

function pdfToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function formatEur(num) {
  const val = Number(num || 0);
  return `${val.toFixed(2).replace('.', ',')} €`;
}

function formatDateEs(isoOrDate) {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString('es-ES');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getBindingLabel(binding) {
  const b = String(binding || '').toLowerCase();
  if (b === 'coil' || b === 'espiral') return 'Espiral metálica';
  if (b === 'hardcover' || b === 'dura') return 'Tapa dura';
  return 'Tapa blanda';
}

export function buildInvoiceMetadata(order = {}) {
  const created = order.createdAt ? new Date(order.createdAt) : new Date();
  const year = Number.isNaN(created.getTime()) ? new Date().getFullYear() : created.getFullYear();
  const orderNumber = String(order.orderNumber || order.id || 'SIN-NUM').replace(/[^A-Za-z0-9_-]/g, '');
  const totalPaid = Number(order.pricing?.totalPaid ?? order.totalPaid ?? 0);
  const ivaRate = 4; // IVA superreducido libros en España
  const baseImponible = totalPaid > 0 ? +(totalPaid / (1 + ivaRate / 100)).toFixed(2) : 0;
  const ivaAmount = +(totalPaid - baseImponible).toFixed(2);

  const luluCostReal = order.pricing?.luluCostReal != null ? Number(order.pricing.luluCostReal) : null;
  const luluCostEst = Number(order.pricing?.luluCostEstimate ?? 0);
  const luluCost = luluCostReal != null ? luluCostReal : luluCostEst;
  const stripeFeeEst = totalPaid > 0 ? +(totalPaid * 0.015 + 0.25).toFixed(2) : 0;
  const netMarginEst = +(totalPaid - luluCost - stripeFeeEst).toFixed(2);

  return {
    invoiceNumber: order.invoice?.invoiceNumber || `EMR-${year}-${orderNumber}`,
    issuedAt: order.invoice?.issuedAt || (Number.isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString()),
    totalPaid: +totalPaid.toFixed(2),
    baseImponible,
    ivaRate,
    ivaAmount,
    luluCost: +luluCost.toFixed(2),
    luluCostIsReal: luluCostReal != null,
    stripeFeeEst,
    netMarginEst
  };
}

export async function generateCustomerInvoicePdfBuffer(order = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    info: {
      Title: `Factura ${order.orderNumber || ''} - Editorial Menos Ruido`,
      Author: 'Editorial Menos Ruido'
    }
  });
  const fonts = registerFonts(doc);
  const meta = buildInvoiceMetadata(order);

  const pageW = doc.page.width;
  const margin = 48;
  const contentW = pageW - margin * 2;

  // Cabecera oscura de marca
  doc.rect(0, 0, pageW, 92).fill('#1f1c19');
  doc.fillColor('#ffffff').font(fonts.serifBold).fontSize(20)
    .text('EDITORIAL MENOS RUIDO', margin, 26);
  doc.fillColor('#c4b8aa').font(fonts.sans).fontSize(9.5)
    .text('Papelería analógica · www.editorialmenosruido.com · pedidos@editorialmenosruido.com', margin, 53);

  // Título del documento
  doc.fillColor('#1f1c19').font(fonts.serifBold).fontSize(17)
    .text('FACTURA SIMPLIFICADA / RECIBO DE COMPRA', margin, 114);

  // Bloque de datos de factura y cliente
  const boxTop = 148;
  doc.roundedRect(margin, boxTop, contentW, 108, 6).fillAndStroke('#faf8f5', '#e2ddd3');

  const leftX = margin + 16;
  const rightX = margin + contentW / 2 + 10;

  doc.fillColor('#87553b').font(fonts.sansBold).fontSize(9)
    .text('DATOS DEL DOCUMENTO', leftX, boxTop + 14);
  doc.fillColor('#1f1c19').font(fonts.sans).fontSize(10)
    .text(`Nº Factura: ${meta.invoiceNumber}`, leftX, boxTop + 30)
    .text(`Pedido: #${order.orderNumber || '-'}`, leftX, boxTop + 46)
    .text(`Fecha: ${formatDateEs(meta.issuedAt)}`, leftX, boxTop + 62)
    .text(`Pago: Tarjeta (Stripe)`, leftX, boxTop + 78);

  const c = order.customer || {};
  const addrParts = [c.address, [c.postalCode, c.city].filter(Boolean).join(' '), c.province, c.country].filter(Boolean);
  doc.fillColor('#87553b').font(fonts.sansBold).fontSize(9)
    .text('DATOS DEL CLIENTE', rightX, boxTop + 14);
  doc.fillColor('#1f1c19').font(fonts.sans).fontSize(10)
    .text(c.name || 'Cliente Editorial Menos Ruido', rightX, boxTop + 30, { width: contentW / 2 - 26 })
    .text(c.email || '-', rightX, boxTop + 46, { width: contentW / 2 - 26 })
    .text(addrParts.join(', ') || 'Dirección indicada en pedido', rightX, boxTop + 62, { width: contentW / 2 - 26 });

  // Tabla de conceptos
  let y = boxTop + 132;
  doc.rect(margin, y, contentW, 24).fill('#1f1c19');
  doc.fillColor('#ffffff').font(fonts.sansBold).fontSize(9.5)
    .text('CONCEPTO', margin + 12, y + 7)
    .text('CANT.', margin + contentW - 150, y + 7, { width: 45, align: 'right' })
    .text('IMPORTE', margin + contentW - 95, y + 7, { width: 83, align: 'right' });

  y += 24;
  const items = Array.isArray(order.items) && order.items.length
    ? order.items
    : [{
        title: order.book?.title || 'Cuaderno Personalizado',
        binding: order.book?.bindingType || 'softcover',
        pages: order.book?.pageCount || 144,
        qty: order.book?.quantity || 1,
        price: meta.totalPaid
      }];

  items.forEach((item, idx) => {
    const rowH = 42;
    doc.rect(margin, y, contentW, rowH).fill(idx % 2 === 0 ? '#ffffff' : '#faf8f5');
    doc.moveTo(margin, y + rowH).lineTo(margin + contentW, y + rowH).strokeColor('#e5ded2').lineWidth(0.7).stroke();

    const title = item.title || order.book?.title || 'Cuaderno Personalizado';
    const specs = `${getBindingLabel(item.binding || order.book?.bindingType)} · ${item.pages || order.book?.pageCount || '-'} págs · Formato 9×7"`;
    const qty = Number(item.qty || 1);
    const linePrice = item.price != null ? Number(item.price) : meta.totalPaid;

    doc.fillColor('#1f1c19').font(fonts.sansBold).fontSize(10)
      .text(title, margin + 12, y + 8, { width: contentW - 170 });
    doc.fillColor('#6b5e53').font(fonts.sans).fontSize(8.5)
      .text(specs, margin + 12, y + 23, { width: contentW - 170 });
    doc.fillColor('#1f1c19').font(fonts.sans).fontSize(10)
      .text(String(qty), margin + contentW - 150, y + 14, { width: 45, align: 'right' })
      .text(formatEur(linePrice), margin + contentW - 95, y + 14, { width: 83, align: 'right' });

    y += rowH;
  });

  // Fila de envío incluido
  doc.rect(margin, y, contentW, 28).fill('#ffffff');
  doc.moveTo(margin, y + 28).lineTo(margin + contentW, y + 28).strokeColor('#e5ded2').lineWidth(0.7).stroke();
  doc.fillColor('#1f1c19').font(fonts.sans).fontSize(9.5)
    .text('Envío estándar a domicilio e impresión bajo demanda', margin + 12, y + 9)
    .text('Incluido', margin + contentW - 95, y + 9, { width: 83, align: 'right' });
  y += 44;

  // Bloque de totales
  const totalsW = 240;
  const totalsX = margin + contentW - totalsW;
  doc.roundedRect(totalsX, y, totalsW, 88, 6).fillAndStroke('#faf8f5', '#e2ddd3');

  doc.fillColor('#5e5347').font(fonts.sans).fontSize(9.5)
    .text('Base imponible:', totalsX + 14, y + 14)
    .text(formatEur(meta.baseImponible), totalsX + 120, y + 14, { width: 106, align: 'right' })
    .text(`IVA (${meta.ivaRate}% libros):`, totalsX + 14, y + 32)
    .text(formatEur(meta.ivaAmount), totalsX + 120, y + 32, { width: 106, align: 'right' });

  doc.moveTo(totalsX + 14, y + 52).lineTo(totalsX + totalsW - 14, y + 52).strokeColor('#d8cfc1').lineWidth(0.8).stroke();

  doc.fillColor('#1f1c19').font(fonts.sansBold).fontSize(12)
    .text('TOTAL PAGADO:', totalsX + 14, y + 61)
    .fillColor('#87553b')
    .text(formatEur(meta.totalPaid), totalsX + 120, y + 61, { width: 106, align: 'right' });

  // Referencia de pago y pie
  const refY = y + 110;
  if (order.pricing?.stripePaymentId) {
    doc.fillColor('#786e63').font(fonts.sans).fontSize(8.5)
      .text(`Referencia de transacción Stripe: ${order.pricing.stripePaymentId}`, margin, refY);
  }

  doc.fillColor('#786e63').font(fonts.sans).fontSize(8.5)
    .text(
      'Gracias por tu compra. Para cualquier consulta sobre este pedido o factura, escríbenos a pedidos@editorialmenosruido.com.',
      margin,
      doc.page.height - 76,
      { width: contentW, align: 'center' }
    );

  return pdfToBuffer(doc);
}

export async function generateLuluPaymentReceiptPdfBuffer(order = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    info: {
      Title: `Pago Lulu ${order.orderNumber || ''} - Editorial Menos Ruido`,
      Author: 'Editorial Menos Ruido'
    }
  });
  const fonts = registerFonts(doc);
  const meta = buildInvoiceMetadata(order);
  const margin = 48;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  const lulu = order.luluJob || {};
  const costs = lulu.costs || {};

  doc.rect(0, 0, pageW, 84).fill('#1f1c19');
  doc.fillColor('#ffffff').font(fonts.serifBold).fontSize(18)
    .text('REGISTRO DE COSTE DE IMPRENTA · LULU DIRECT', margin, 24);
  doc.fillColor('#c4b8aa').font(fonts.sans).fontSize(9.5)
    .text('Control interno de costes de producción y envío · Editorial Menos Ruido', margin, 50);

  let y = 110;
  doc.roundedRect(margin, y, contentW, 190, 6).fillAndStroke('#faf8f5', '#e2ddd3');

  const rows = [
    ['Pedido Web:', `#${order.orderNumber || '-'}`],
    ['Factura Cliente:', meta.invoiceNumber],
    ['Fecha del Pedido:', formatDateEs(meta.issuedAt)],
    ['Lulu Print Job ID:', lulu.jobId || 'Pendiente'],
    ['Entorno Lulu:', String(lulu.environment || order.book?.luluEnv || 'sandbox').toUpperCase()],
    ['Estado Lulu:', lulu.status || order.status || '-'],
    ['SKU / Formato:', order.book?.podPackageId || '-'],
    ['Ejemplar:', `${order.book?.title || '-'} (${order.book?.pageCount || '-'} págs)`]
  ];

  let ry = y + 16;
  rows.forEach(([label, val]) => {
    doc.fillColor('#6b5e53').font(fonts.sansBold).fontSize(9.5).text(label, margin + 16, ry, { width: 140 });
    doc.fillColor('#1f1c19').font(fonts.sans).fontSize(9.5).text(String(val), margin + 160, ry, { width: contentW - 176 });
    ry += 20;
  });

  y += 214;
  doc.roundedRect(margin, y, contentW, 128, 6).fillAndStroke('#ffffff', '#d8cfc1');
  doc.fillColor('#87553b').font(fonts.sansBold).fontSize(10)
    .text('RESUMEN ECONÓMICO DEL PEDIDO', margin + 16, y + 14);

  const econRows = [
    ['Cobrado al cliente (Stripe):', formatEur(meta.totalPaid)],
    [
      meta.luluCostIsReal ? 'Coste real Lulu (imprenta + envío):' : 'Coste estimado Lulu (imprenta + envío):',
      formatEur(meta.luluCost)
    ],
    ['Comisión estimada Stripe (~1,5% + 0,25 €):', formatEur(meta.stripeFeeEst)],
    ['Margen neto estimado:', formatEur(meta.netMarginEst)]
  ];

  let ey = y + 38;
  econRows.forEach(([label, val], idx) => {
    const isLast = idx === econRows.length - 1;
    doc.fillColor(isLast ? '#1f1c19' : '#4a423a')
      .font(isLast ? fonts.sansBold : fonts.sans)
      .fontSize(isLast ? 11 : 10)
      .text(label, margin + 16, ey)
      .text(val, margin + contentW - 130, ey, { width: 114, align: 'right' });
    ey += 20;
  });

  if (costs.total_cost_excl_tax || costs.shipping_cost?.total_cost_excl_tax) {
    y += 148;
    doc.fillColor('#6b5e53').font(fonts.sans).fontSize(8.5)
      .text(
        `Detalle bruto devuelto por Lulu API: total_incl_tax=${costs.total_cost_incl_tax || '-'} · total_excl_tax=${costs.total_cost_excl_tax || '-'} · shipping_excl_tax=${costs.shipping_cost?.total_cost_excl_tax || '-'} ${costs.currency || 'EUR'}`,
        margin,
        y,
        { width: contentW }
      );
  }

  return pdfToBuffer(doc);
}

export async function generateAccountingSummaryPdfBuffer(rows = [], totals = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 36,
    info: {
      Title: 'Resumen Contable - Editorial Menos Ruido',
      Author: 'Editorial Menos Ruido'
    }
  });
  const fonts = registerFonts(doc);
  const margin = 36;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;

  doc.rect(0, 0, pageW, 64).fill('#1f1c19');
  doc.fillColor('#ffffff').font(fonts.serifBold).fontSize(16)
    .text('RESUMEN CONTABLE · EDITORIAL MENOS RUIDO', margin, 18);
  doc.fillColor('#c4b8aa').font(fonts.sans).fontSize(9)
    .text(`Generado el ${formatDateEs(new Date())} · Pedidos totales: ${rows.length}`, margin, 40);

  // Tarjetas resumen
  let y = 80;
  const prod = totals.production || { count: 0, stripe: 0, lulu: 0, margin: 0 };
  const sand = totals.sandbox || { count: 0, stripe: 0, lulu: 0, margin: 0 };

  doc.roundedRect(margin, y, contentW / 2 - 8, 56, 5).fillAndStroke('#faf8f5', '#87553b');
  doc.fillColor('#87553b').font(fonts.sansBold).fontSize(9)
    .text(`PRODUCCIÓN REAL (${prod.count} pedidos)`, margin + 12, y + 10);
  doc.fillColor('#1f1c19').font(fonts.sans).fontSize(9.5)
    .text(`Ingresos Stripe: ${formatEur(prod.stripe)}  |  Costes Lulu: ${formatEur(prod.lulu)}  |  Margen est.: ${formatEur(prod.margin)}`, margin + 12, y + 28);

  const rightBoxX = margin + contentW / 2 + 8;
  doc.roundedRect(rightBoxX, y, contentW / 2 - 8, 56, 5).fillAndStroke('#faf8f5', '#d8cfc1');
  doc.fillColor('#6b5e53').font(fonts.sansBold).fontSize(9)
    .text(`ENTORNO SANDBOX / PRUEBAS (${sand.count} pedidos)`, rightBoxX + 12, y + 10);
  doc.fillColor('#4a423a').font(fonts.sans).fontSize(9.5)
    .text(`Simulado Stripe: ${formatEur(sand.stripe)}  |  Coste Lulu: ${formatEur(sand.lulu)}  |  Margen est.: ${formatEur(sand.margin)}`, rightBoxX + 12, y + 28);

  y += 72;
  const cols = [
    { label: 'Fecha', x: margin, w: 62 },
    { label: 'Pedido', x: margin + 64, w: 92 },
    { label: 'Entorno', x: margin + 158, w: 56 },
    { label: 'Cliente', x: margin + 216, w: 125 },
    { label: 'Ejemplar', x: margin + 343, w: 155 },
    { label: 'Stripe', x: margin + 500, w: 64, align: 'right' },
    { label: 'Lulu', x: margin + 566, w: 64, align: 'right' },
    { label: 'Fee Est.', x: margin + 632, w: 60, align: 'right' },
    { label: 'Margen', x: margin + 694, w: 72, align: 'right' }
  ];

  const drawTableHeader = topY => {
    doc.rect(margin, topY, contentW, 20).fill('#1f1c19');
    doc.fillColor('#ffffff').font(fonts.sansBold).fontSize(8);
    cols.forEach(c => {
      doc.text(c.label, c.x + 4, topY + 6, { width: c.w - 6, align: c.align || 'left' });
    });
    return topY + 20;
  };

  y = drawTableHeader(y);

  rows.forEach((r, idx) => {
    if (y > doc.page.height - 48) {
      doc.addPage();
      y = drawTableHeader(36);
    }
    doc.rect(margin, y, contentW, 18).fill(idx % 2 === 0 ? '#ffffff' : '#faf8f5');
    doc.fillColor('#1f1c19').font(fonts.sans).fontSize(7.8);
    const values = [
      r.dateStr,
      r.orderNumber,
      r.luluEnv.toUpperCase(),
      r.customerName.slice(0, 24),
      r.bookTitle.slice(0, 30),
      formatEur(r.totalPaid),
      formatEur(r.luluCost),
      formatEur(r.stripeFeeEst),
      formatEur(r.netMarginEst)
    ];
    cols.forEach((c, i) => {
      doc.text(values[i], c.x + 4, y + 5, { width: c.w - 6, align: c.align || 'left', lineBreak: false });
    });
    y += 18;
  });

  return pdfToBuffer(doc);
}
