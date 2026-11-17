// Serverless Function para Vercel: /api/cleanup-pdfs
// 1) POST autenticado { urls }: borra al instante PDFs temporales si el usuario cancela Stripe (?stripe_cancel=1)
// 2) GET (Vercel Cron diario): borra PDFs no pagados (> 30 min) y PDFs de pedidos pagados (> 15 días)

import { list, del } from '@vercel/blob';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

const UNPAID_TTL_MS = 30 * 60 * 1000; // 30 minutos si no completó el pago
const PAID_TTL_MS = 15 * 24 * 60 * 60 * 1000; // 15 días si sí compró

async function verifyUserBearer(req) {
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
  return res.ok && user?.localId ? { uid: user.localId, email: user.email || '' } : null;
}

export default async function handler(req, res) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN no configurado.' });

  // 1. Borrado inmediato al cancelar Stripe desde el navegador del usuario
  if (req.method === 'POST') {
    const user = await verifyUserBearer(req);
    if (!user) return res.status(403).json({ error: 'No autorizado.' });

    const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
    const safeUrls = urls.filter(
      u => typeof u === 'string' && u.startsWith('https://') && u.includes(`/pedidos/`) && u.includes(`/${user.uid}/`)
    );
    if (!safeUrls.length) return res.status(200).json({ ok: true, deleted: 0 });

    await del(safeUrls, { token });
    return res.status(200).json({ ok: true, deleted: safeUrls.length });
  }

  // 2. Limpieza programada por Vercel Cron
  if (req.method === 'GET') {
    const now = Date.now();
    const paidUrls = new Set();
    try {
      const snap = await getDocs(collection(firestoreDb, 'orders'));
      snap.forEach(d => {
        const b = d.data()?.book || {};
        if (b.interiorPdfUrl) paidUrls.add(b.interiorPdfUrl);
        if (b.coverPdfUrl) paidUrls.add(b.coverPdfUrl);
      });
    } catch (e) {
      console.warn('No se pudo leer orders en cleanup-pdfs:', e.message);
    }

    const toDelete = [];
    let cursor = undefined;
    do {
      const page = await list({ prefix: 'pedidos/', cursor, token });
      for (const blob of page.blobs || []) {
        const ageMs = now - new Date(blob.uploadedAt).getTime();
        const isPaid = paidUrls.has(blob.url);
        if ((!isPaid && ageMs > UNPAID_TTL_MS) || (isPaid && ageMs > PAID_TTL_MS)) {
          toDelete.push(blob.url);
        }
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    if (toDelete.length) {
      await del(toDelete, { token });
    }
    return res.status(200).json({ ok: true, deleted: toDelete.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
