import { upload } from '@vercel/blob/client';
import { auth } from './firebase-config.js';

/**
 * Sube un Blob PDF directamente desde el navegador a Vercel Blob usando token autenticado.
 */
export async function uploadPdfBlobToCloud(pdfBlob, filename = 'documento.pdf', folder = 'pedidos') {
  if (!auth.currentUser && typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Debes iniciar sesión para subir PDFs a la nube.');
  }
  const idToken = await user.getIdToken();
  const safeName = String(filename || 'documento.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeFolder = String(folder || 'pedidos').replace(/[^a-zA-Z0-9/_-]/g, '');
  const pathname = `${safeFolder}/${user.uid}/${Date.now()}_${safeName}`;

  const result = await upload(pathname, pdfBlob, {
    access: 'public',
    handleUploadUrl: '/api/blob-upload-token',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });

  return result.url;
}

if (typeof window !== 'undefined') {
  window.uploadPdfBlobToCloud = uploadPdfBlobToCloud;
}
