// save-generator-design.js - Permite guardar o sobrescribir configuraciones en Firestore con modal interactivo
import { auth, db } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { openAuthModal } from './auth-modal.js';

export function setupGeneratorSave(btnId, getGeneratorDataFn) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  // Si el usuario acaba de iniciar sesión tras haber intentado guardar, recuperar el borrador y disparar el guardado
  window.addEventListener('mr-auth-success', async (e) => {
    const pendingRaw = window.localStorage.getItem('mr_pending_save_design');
    if (pendingRaw) {
      try {
        const pendingDesign = JSON.parse(pendingRaw);
        window.localStorage.removeItem('mr_pending_save_design');
        if (e.detail) {
          await triggerSaveFlow(btn, pendingDesign, e.detail);
        }
      } catch (err) {
        console.error('Error restaurando diseño pendiente:', err);
      }
    }
  });

  btn.addEventListener('click', async () => {
    // Si auth aún está resolviéndose, esperar brevemente a auth.currentUser
    let user = auth.currentUser;
    if (!user) {
      // Guardar el estado actual del generador antes de abrir el modal para que no se pierda jamás
      try {
        const currentDraft = getGeneratorDataFn();
        window.localStorage.setItem('mr_pending_save_design', JSON.stringify(currentDraft));
        window.localStorage.setItem('mr_auth_return_url', window.location.href);
      } catch (e) {}

      if (typeof window.showToast === 'function') {
        window.showToast('Inicia sesión para guardar tu diseño en Mi Espacio');
      }
      openAuthModal();
      return;
    }

    const currentDesign = getGeneratorDataFn();
    await triggerSaveFlow(btn, currentDesign, user);
  });
}

async function triggerSaveFlow(btn, currentDesign, user) {
  let originalText = btn.innerHTML;
  try {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Consultando...';

    const currentType = currentDesign.type || 'Planificador Semanal';

    // Consultar diseños del usuario en Firestore
    const designsRef = collection(db, 'users', user.uid, 'designs');
    const snap = await getDocs(designsRef);
    
    const existingDesigns = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.type === currentType) {
        existingDesigns.push({ id: d.id, ...data });
      }
    });

    // Ordenar por fecha descendente
    existingDesigns.sort((a, b) => {
      const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

    btn.disabled = false;
    btn.innerHTML = originalText;

    // Abrir modal de selección
    openSaveChoiceModal(currentDesign, existingDesigns, user);

  } catch (err) {
    console.error('Error al preparar guardado:', err);
    notifyToast('No se pudieron cargar tus diseños. Inténtalo de nuevo.');
    btn.disabled = false;
    btn.innerHTML = originalText || '<span>💾</span> Guardar en Mi Espacio';
  }
}

function openSaveChoiceModal(currentDesign, existingDesigns, user) {
  let modalOverlay = document.getElementById('save-choice-modal-overlay');
  if (modalOverlay) modalOverlay.remove();

  const count = existingDesigns.length;
  const countText = count === 0 
    ? 'Aún no tienes ningún diseño guardado de este tipo.' 
    : `Tienes <strong>${count}</strong> ${count === 1 ? 'diseño guardado' : 'diseños guardados'} de este tipo.`;

  const existingListHtml = count > 0 ? `
    <div class="save-choice-existing-section">
      <h3 class="save-choice-section-title">O sobrescribir un diseño existente:</h3>
      <div class="save-choice-list">
        ${existingDesigns.map(d => `
          <div class="save-choice-item" data-id="${d.id}" data-name="${escapeHtml(d.name)}">
            <div class="save-choice-item-info">
              <h4>${escapeHtml(d.name)}</h4>
              <p>${escapeHtml(d.summary || 'Configuración guardada')} • <span class="save-item-date">${formatDate(d.updatedAt || d.createdAt)}</span></p>
            </div>
            <button type="button" class="btn-save-overwrite" data-id="${d.id}" data-name="${escapeHtml(d.name)}">
              Sobrescribir
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const html = `
    <div id="save-choice-modal-overlay" class="auth-modal-overlay" style="display: flex;">
      <div class="auth-modal-card save-choice-card">
        <button type="button" class="auth-modal-close" id="btn-close-save-choice">×</button>
        
        <div class="auth-modal-header">
          <span class="auth-modal-brand">Menos Ruido</span>
          <h2 class="auth-modal-title">Guardar en Mi Espacio</h2>
          <p class="auth-modal-subtitle">${countText} Elige si deseas guardarlo como un diseño nuevo o actualizar uno existente:</p>
        </div>

        <div class="save-choice-body">
          <!-- OPCIÓN 1: GUARDAR COMO NUEVO -->
          <div class="save-choice-new-section">
            <h3 class="save-choice-section-title">Guardar como nuevo diseño:</h3>
            <div class="save-new-form">
              <input type="text" id="save-new-name-input" class="save-new-input" value="${escapeHtml(currentDesign.name || '')}" placeholder="Nombre de este diseño..." required />
              <button type="button" class="btn-save-create" id="btn-save-as-new">
                + Guardar nuevo
              </button>
            </div>
          </div>

          <!-- OPCIÓN 2: SOBRESCRIBIR EXISTENTE -->
          ${existingListHtml}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  modalOverlay = document.getElementById('save-choice-modal-overlay');

  const closeBtn = document.getElementById('btn-close-save-choice');
  closeBtn?.addEventListener('click', () => modalOverlay.remove());
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.remove();
  });

  // Evento: Guardar como nuevo
  const btnSaveNew = document.getElementById('btn-save-as-new');
  const inputNewName = document.getElementById('save-new-name-input');

  btnSaveNew?.addEventListener('click', async () => {
    const finalName = inputNewName.value.trim() || currentDesign.name || 'Planificador Personalizado';
    btnSaveNew.disabled = true;
    btnSaveNew.textContent = 'Guardando...';

    try {
      const designsRef = collection(db, 'users', user.uid, 'designs');
      await addDoc(designsRef, {
        name: finalName,
        type: currentDesign.type || 'Planificador',
        summary: currentDesign.summary || '',
        editUrl: window.location.pathname,
        data: currentDesign.data || {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      modalOverlay.remove();
      notifyToast(`✓ "${finalName}" guardado en Mi Espacio`);
    } catch (err) {
      console.error('Error al guardar nuevo diseño:', err);
      notifyToast('Error al guardar el nuevo diseño.');
      btnSaveNew.disabled = false;
      btnSaveNew.textContent = '+ Guardar nuevo';
    }
  });

  // Eventos: Sobrescribir existente
  const overwriteBtns = modalOverlay.querySelectorAll('.btn-save-overwrite');
  overwriteBtns.forEach(b => {
    b.addEventListener('click', async () => {
      const docId = b.getAttribute('data-id');
      const targetName = b.getAttribute('data-name');
      b.disabled = true;
      b.textContent = 'Actualizando...';

      try {
        const designDocRef = doc(db, 'users', user.uid, 'designs', docId);
        await updateDoc(designDocRef, {
          summary: currentDesign.summary || '',
          editUrl: window.location.pathname,
          data: currentDesign.data || {},
          updatedAt: serverTimestamp()
        });

        modalOverlay.remove();
        notifyToast(`✓ "${targetName}" sobrescrito y actualizado`);
      } catch (err) {
        console.error('Error al sobrescribir diseño:', err);
        notifyToast('Error al actualizar el diseño.');
        b.disabled = false;
        b.textContent = 'Sobrescribir';
      }
    });
  });
}

function notifyToast(msg) {
  if (typeof window.showToast === 'function') {
    window.showToast(msg);
    return;
  }
  let toast = document.getElementById('save-fallback-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'save-fallback-toast';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

function formatDate(timestamp) {
  if (!timestamp) return 'Reciente';
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return 'Reciente';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}
