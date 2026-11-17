// Serverless Function para Vercel: /api/blob-upload-token
// Emite tokens de subida directa desde el navegador a Vercel Blob (sin límite de 4.5 MB)

import { handleUpload } from '@vercel/blob/client';

const FIREBASE_WEB_API_KEY =
  process.env.VITE_FIREBASE_API_KEY ||
  Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8');

async function verifyFirebaseBearer(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await verifyFirebaseBearer(authHeader);
        if (!user) {
          throw new Error('Debes iniciar sesión para subir PDFs de imprenta.');
        }
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 250 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ uid: user.uid, email: user.email })
        };
      },
      onUploadCompleted: async () => {
        // URL devuelta directamente al cliente tras completar subida
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('Error en /api/blob-upload-token:', err);
    return res.status(400).json({ error: err.message || 'Error generando token de subida' });
  }
}
