// Serverless Function para Vercel: /api/upload-pdf
// Sube PDFs de interior o portada a Vercel Blob (store público no listable) y devuelve su URL HTTPS

const FIREBASE_WEB_API_KEY =
  process.env.VITE_FIREBASE_API_KEY ||
  Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8');

async function verifyUserToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Falta token de sesión de Firebase Auth.' };
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
  const user = data?.users?.[0];
  if (!res.ok || !user?.localId) {
    return { valid: false, error: 'Sesión de Firebase inválida o expirada.' };
  }
  return { valid: true, uid: user.localId, email: user.email || '' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST.' });

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN no configurado en Vercel.' });
  }

  const auth = await verifyUserToken(req);
  if (!auth.valid) return res.status(403).json({ error: auth.error });

  try {
    const { filename = 'archivo.pdf', base64 = '', folder = 'pedidos' } = req.body || {};
    if (!base64) return res.status(400).json({ error: 'Falta contenido PDF en base64.' });

    const cleanB64 = String(base64).replace(/^data:application\/pdf;base64,/i, '');
    const buffer = Buffer.from(cleanB64, 'base64');
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeFolder = String(folder).replace(/[^a-zA-Z0-9/_-]/g, '');
    const pathname = `${safeFolder}/${auth.uid}/${safeName}`;

    const upRes = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${blobToken}`,
        'x-api-version': '7',
        'x-content-type': 'application/pdf',
        'x-add-random-suffix': '1',
        'Content-Type': 'application/pdf'
      },
      body: buffer
    });

    const data = await upRes.json().catch(() => ({}));
    if (!upRes.ok || !data.url) {
      return res.status(upRes.status || 500).json({ error: 'Error subiendo PDF a Vercel Blob', details: data });
    }

    return res.status(200).json({ ok: true, url: data.url, pathname: data.pathname });
  } catch (err) {
    console.error('Error en /api/upload-pdf:', err);
    return res.status(500).json({ error: err.message });
  }
}
