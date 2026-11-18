// Serverless Function para Vercel: /api/generate-order-pdfs
// Genera Interior PDF (vectorial, 420+ págs en ~2s) y Portada PDF en servidor y los sube a Vercel Blob

import { put } from '@vercel/blob';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { renderInteriorPdfBuffer } from '../lib/book-interior-renderer.js';
import { renderCoverPdfBuffer } from '../lib/book-cover-renderer.js';

const FIREBASE_WEB_API_KEY =
  process.env.VITE_FIREBASE_API_KEY ||
  Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8');

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      apiKey: FIREBASE_WEB_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'editorialmenosruido.firebaseapp.com',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'editorialmenosruido'
    });

const firestoreDb = getFirestore(firebaseApp);
const ALLOWED_ADMIN_EMAILS = ['jesgilcan@gmail.com', 'jesgilcan@hotmail.com'];

async function verifyUserToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.replace('Bearer ', '').trim();
  if (!idToken) return null;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );
  const data = await res.json().catch(() => ({}));
  const user = data?.users?.[0];
  return res.ok && user?.localId ? { uid: user.localId, email: (user.email || '').toLowerCase().trim() } : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST.' });

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN no configurado.' });

  const user = await verifyUserToken(req);
  if (!user) return res.status(401).json({ error: 'Sesión requerida.' });

  const t0 = Date.now();
  try {
    const { orderNumber } = req.body || {};
    if (!orderNumber) return res.status(400).json({ error: 'Falta orderNumber.' });

    const orderRef = doc(firestoreDb, 'orders', String(orderNumber));
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      return res.status(404).json({ error: `Pedido ${orderNumber} no encontrado.` });
    }
    const order = orderSnap.data() || {};
    const customerUid = order.customer?.uid || '';
    const isAdmin = ALLOWED_ADMIN_EMAILS.includes(user.email);
    if (!isAdmin && customerUid && customerUid !== user.uid) {
      return res.status(403).json({ error: 'No autorizado para este pedido.' });
    }

    const bk = order.book || {};
    let interiorPdfUrl = bk.interiorPdfUrl || '';
    let coverPdfUrl = bk.coverPdfUrl || '';

    if (interiorPdfUrl.startsWith('https://') && coverPdfUrl.startsWith('https://')) {
      return res.status(200).json({ ok: true, interiorPdfUrl, coverPdfUrl, cached: true });
    }

    // Cargar diseño desde Firestore si existe designId
    let designData = bk.data || null;
    const designId = bk.id || '';
    if (!designData && customerUid && designId) {
      const designSnap = await getDoc(doc(firestoreDb, 'users', customerUid, 'designs', designId));
      if (designSnap.exists()) {
        designData = designSnap.data();
      }
    }
    if (!designData) {
      designData = {
        title: bk.title || 'Planificador Personalizado',
        subtitle: bk.subtitle || 'Edición Analógica · Menos Ruido',
        pageCount: bk.pageCount || 144
      };
    }

    let finalPageCount = Number(bk.pageCount || designData.pageCount || 144);
    const folderUid = customerUid || user.uid || 'anon';

    if (!interiorPdfUrl.startsWith('https://')) {
      const { buffer: intBuf, pageCount } = await renderInteriorPdfBuffer(designData);
      finalPageCount = pageCount || finalPageCount;
      const intBlob = await put(`pedidos/interior/${folderUid}/${orderNumber}_interior.pdf`, intBuf, {
        access: 'public',
        contentType: 'application/pdf',
        addRandomSuffix: true,
        token: blobToken
      });
      interiorPdfUrl = intBlob.url;
    }

    if (!coverPdfUrl.startsWith('https://')) {
      const { buffer: covBuf } = await renderCoverPdfBuffer({
        title: bk.title || designData.title || 'Planificador Personalizado',
        subtitle: bk.subtitle || designData.subtitle || 'Edición Personalizada',
        colophon: designData.data?.colophon || designData.colophon,
        pageCount: finalPageCount,
        bindingType: bk.bindingType || 'softcover',
        podPackageId: bk.podPackageId || '0600X0900BWSTDPB060UC444MXX',
        luluEnv: bk.luluEnv || 'sandbox'
      });
      const covBlob = await put(`pedidos/portadas/${folderUid}/${orderNumber}_portada.pdf`, covBuf, {
        access: 'public',
        contentType: 'application/pdf',
        addRandomSuffix: true,
        token: blobToken
      });
      coverPdfUrl = covBlob.url;
    }

    const pdfPatch = {
      book: {
        ...bk,
        pageCount: finalPageCount,
        interiorPdfUrl,
        coverPdfUrl
      }
    };
    await setDoc(orderRef, pdfPatch, { merge: true });
    if (customerUid) {
      await setDoc(doc(firestoreDb, 'users', customerUid, 'orders', String(orderNumber)), pdfPatch, { merge: true }).catch(() => {});
    }

    return res.status(200).json({
      ok: true,
      interiorPdfUrl,
      coverPdfUrl,
      pageCount: finalPageCount,
      elapsedMs: Date.now() - t0
    });
  } catch (err) {
    console.error('Error en /api/generate-order-pdfs:', err);
    return res.status(500).json({ error: err.message || 'Error generando PDFs en servidor.' });
  }
}
