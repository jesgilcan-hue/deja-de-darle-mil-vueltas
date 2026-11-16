// Serverless Function para Vercel: /api/lulu-status
// Consulta el estado en tiempo real de un Print Job en Lulu Direct API (Sandbox o Producción)

import { luluApiRequest } from './lulu-client.js';

const FIREBASE_WEB_API_KEY =
  process.env.VITE_FIREBASE_API_KEY ||
  Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8');

const ALLOWED_ADMIN_EMAILS = ['jesgilcan@gmail.com', 'jesgilcan@hotmail.com'];

async function verifyAdminToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Falta token de autorización.' };
  }
  const idToken = authHeader.replace('Bearer ', '').trim();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );
  const data = await res.json().catch(() => ({}));
  const email = (data?.users?.[0]?.email || '').toLowerCase().trim();
  if (!res.ok || !email || !ALLOWED_ADMIN_EMAILS.includes(email)) {
    return { valid: false, error: 'Acceso restringido al administrador.' };
  }
  return { valid: true, email };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await verifyAdminToken(req);
  if (!auth.valid) return res.status(403).json({ error: auth.error });

  const jobId = req.query?.jobId || req.body?.jobId;
  const luluEnv = req.query?.env || req.body?.luluEnv;
  if (!jobId) {
    return res.status(400).json({ error: 'Falta jobId de Lulu.' });
  }

  try {
    const luluRes = await luluApiRequest(`/print-jobs/${encodeURIComponent(String(jobId))}/`, {
      method: 'GET',
      env: luluEnv
    });

    if (!luluRes.ok) {
      return res.status(luluRes.status || 400).json({
        ok: false,
        environment: luluRes.env,
        error: 'No se pudo consultar el Print Job en Lulu',
        details: luluRes.data
      });
    }

    const job = luluRes.data || {};
    const lineItem = Array.isArray(job.line_items) ? job.line_items[0] || {} : {};
    return res.status(200).json({
      ok: true,
      environment: luluRes.env,
      luluJobId: String(job.id || jobId),
      statusName: job.status?.name || '',
      statusMessages: job.status?.messages || [],
      trackingId: lineItem.tracking_id || '',
      trackingUrls: lineItem.tracking_urls || [],
      raw: job
    });
  } catch (err) {
    console.error('Error en /api/lulu-status:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
