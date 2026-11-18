// Sincronización local de facturas, costes de Lulu y resumen contable desde Firestore
// Uso: node scripts/sync-cuentas.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import {
  buildInvoiceMetadata,
  generateCustomerInvoicePdfBuffer,
  generateLuluPaymentReceiptPdfBuffer,
  generateAccountingSummaryPdfBuffer
} from '../lib/invoice-pdf.js';

const TARGET_ROOT = process.env.CUENTAS_DIR || 'C:\\Users\\IA\\Documents\\Proyectos_Jesus\\Cuentas-Menosruido';
const DIR_FACTURAS = path.join(TARGET_ROOT, 'Facturas-Cliente');
const DIR_LULU = path.join(TARGET_ROOT, 'Pagos-Lulu');
const DIR_RESUMEN = path.join(TARGET_ROOT, 'Resumen');
const FORCE = process.argv.includes('--force');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf8'),
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'editorialmenosruido.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'editorialmenosruido'
};

function ensureDirs() {
  [TARGET_ROOT, DIR_FACTURAS, DIR_LULU, DIR_RESUMEN].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function safeFilePart(str) {
  return String(str || 'SIN-ID').replace(/[^A-Za-z0-9_-]/g, '_');
}

function toIsoDateOnly(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function toEsDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function mergeOrders(rawDocs) {
  const byOrderNum = new Map();
  for (const raw of rawDocs) {
    const key = String(raw.orderNumber || raw.id || '').trim();
    if (!key) continue;
    const prev = byOrderNum.get(key) || {};
    byOrderNum.set(key, {
      ...prev,
      ...raw,
      customer: { ...(prev.customer || {}), ...(raw.customer || {}) },
      book: { ...(prev.book || {}), ...(raw.book || {}) },
      pricing: { ...(prev.pricing || {}), ...(raw.pricing || {}) },
      luluJob: { ...(prev.luluJob || {}), ...(raw.luluJob || {}) },
      invoice: { ...(prev.invoice || {}), ...(raw.invoice || {}) }
    });
  }
  return Array.from(byOrderNum.values()).sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return db - da;
  });
}

function csvEscape(val) {
  const s = String(val ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

async function main() {
  ensureDirs();
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('Conectando con Firestore (editorialmenosruido/orders)...');
  const snap = await getDocs(collection(db, 'orders'));
  const rawDocs = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  const orders = mergeOrders(rawDocs);

  console.log(`Pedidos encontrados: ${orders.length} (documentos brutos: ${rawDocs.length})`);

  let facturasCreated = 0;
  let luluCreated = 0;
  const summaryRows = [];
  const totals = {
    production: { count: 0, stripe: 0, lulu: 0, margin: 0 },
    sandbox: { count: 0, stripe: 0, lulu: 0, margin: 0 }
  };

  for (const order of orders) {
    const orderNum = safeFilePart(order.orderNumber || order.id);
    const dateIso = toIsoDateOnly(order.createdAt);
    const meta = buildInvoiceMetadata(order);
    const luluEnv = String(order.luluJob?.environment || order.book?.luluEnv || 'sandbox').toLowerCase();

    // 1. Factura cliente PDF
    const facturaPath = path.join(DIR_FACTURAS, `Factura_${orderNum}_${dateIso}.pdf`);
    if (FORCE || !fs.existsSync(facturaPath)) {
      const buf = await generateCustomerInvoicePdfBuffer(order);
      fs.writeFileSync(facturaPath, buf);
      facturasCreated++;
    }

    // 2. Pago Lulu PDF (solo si tiene Job ID)
    const jobId = order.luluJob?.jobId ? safeFilePart(order.luluJob.jobId) : '';
    if (jobId) {
      const luluPath = path.join(DIR_LULU, `Pago_Lulu_${orderNum}_Job_${jobId}.pdf`);
      if (FORCE || !fs.existsSync(luluPath)) {
        const luluBuf = await generateLuluPaymentReceiptPdfBuffer(order);
        fs.writeFileSync(luluPath, luluBuf);
        luluCreated++;
      }
    }

    // 3. Acumular fila para Resumen
    const bucket = luluEnv === 'production' ? totals.production : totals.sandbox;
    bucket.count++;
    bucket.stripe += meta.totalPaid;
    bucket.lulu += meta.luluCost;
    bucket.margin += meta.netMarginEst;

    summaryRows.push({
      dateStr: toEsDate(order.createdAt),
      orderNumber: String(order.orderNumber || order.id || '-'),
      invoiceNumber: meta.invoiceNumber,
      customerName: String(order.customer?.name || 'Cliente'),
      customerEmail: String(order.customer?.email || ''),
      bookTitle: String(order.book?.title || 'Cuaderno Personalizado'),
      podPackageId: String(order.book?.podPackageId || ''),
      status: String(order.status || ''),
      luluEnv,
      luluJobId: String(order.luluJob?.jobId || ''),
      totalPaid: meta.totalPaid,
      baseImponible: meta.baseImponible,
      ivaAmount: meta.ivaAmount,
      luluCost: meta.luluCost,
      stripeFeeEst: meta.stripeFeeEst,
      netMarginEst: meta.netMarginEst
    });
  }

  // Escribir CSV (BOM UTF-8 + punto y coma para Excel en español)
  const csvHeader = [
    'Fecha',
    'Pedido',
    'N_Factura',
    'Cliente',
    'Email',
    'Ejemplar',
    'SKU_Lulu',
    'Estado',
    'Entorno_Lulu',
    'Lulu_Job_ID',
    'Ingreso_Stripe_EUR',
    'Base_Imponible_EUR',
    'IVA_4_EUR',
    'Coste_Lulu_EUR',
    'Comision_Stripe_Est_EUR',
    'Margen_Neto_Est_EUR'
  ].join(';');

  const csvLines = summaryRows.map(r =>
    [
      csvEscape(r.dateStr),
      csvEscape(r.orderNumber),
      csvEscape(r.invoiceNumber),
      csvEscape(r.customerName),
      csvEscape(r.customerEmail),
      csvEscape(r.bookTitle),
      csvEscape(r.podPackageId),
      csvEscape(r.status),
      csvEscape(r.luluEnv),
      csvEscape(r.luluJobId),
      r.totalPaid.toFixed(2).replace('.', ','),
      r.baseImponible.toFixed(2).replace('.', ','),
      r.ivaAmount.toFixed(2).replace('.', ','),
      r.luluCost.toFixed(2).replace('.', ','),
      r.stripeFeeEst.toFixed(2).replace('.', ','),
      r.netMarginEst.toFixed(2).replace('.', ',')
    ].join(';')
  );

  const csvPath = path.join(DIR_RESUMEN, 'Resumen_Contable_MenosRuido.csv');
  fs.writeFileSync(csvPath, '\uFEFF' + [csvHeader, ...csvLines].join('\r\n'), 'utf8');

  // Escribir PDF resumen
  const summaryPdfBuf = await generateAccountingSummaryPdfBuffer(summaryRows, totals);
  const summaryPdfPath = path.join(DIR_RESUMEN, 'Resumen_Contable_MenosRuido.pdf');
  fs.writeFileSync(summaryPdfPath, summaryPdfBuf);

  console.log('--- SINCRONIZACIÓN COMPLETADA ---');
  console.log(`Facturas nuevas generadas: ${facturasCreated} -> ${DIR_FACTURAS}`);
  console.log(`Recibos Lulu nuevos generados: ${luluCreated} -> ${DIR_LULU}`);
  console.log(`Resumen CSV y PDF actualizados -> ${DIR_RESUMEN}`);
  console.log(
    `Producción: ${totals.production.count} pedidos (${totals.production.stripe.toFixed(2)} €) | Sandbox: ${totals.sandbox.count} pedidos (${totals.sandbox.stripe.toFixed(2)} €)`
  );
  process.exit(0);
}

main().catch(err => {
  console.error('Error en sync-cuentas:', err);
  process.exit(1);
});
