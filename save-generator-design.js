// save-generator-design.js - Permite guardar la configuración actual del generador en Firestore
import { auth, db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { openAuthModal } from './auth-modal.js';

export function setupGeneratorSave(btnId, getGeneratorDataFn) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
      if (typeof window.showToast === 'function') {
        window.showToast('Inicia sesión para guardar tu diseño en Mi Espacio');
      }
      openAuthModal();
      return;
    }

    try {
      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>⏳</span> Guardando...';

      const designData = getGeneratorDataFn();
      const designsRef = collection(db, 'users', user.uid, 'designs');

      await addDoc(designsRef, {
        name: designData.name || 'Planificador Semanal Personalizado',
        type: designData.type || 'Planificador Semanal',
        summary: designData.summary || 'Configuración personalizada',
        editUrl: window.location.pathname,
        data: designData.data || {},
        createdAt: serverTimestamp()
      });

      if (typeof window.showToast === 'function') {
        window.showToast('✓ Guardado con éxito en Mi Espacio');
      } else {
        alert('✓ Guardado con éxito en Mi Espacio');
      }

      btn.innerHTML = originalText;
      btn.disabled = false;
    } catch (err) {
      console.error('Error al guardar diseño:', err);
      if (typeof window.showToast === 'function') {
        window.showToast('No se pudo guardar el diseño. Inténtalo de nuevo.');
      }
      btn.disabled = false;
      btn.innerHTML = '<span>💾</span> Guardar en Mi Espacio';
    }
  });
}
