// save-generator-design.js - Permite guardar o sobrescribir configuraciones en Firestore con modal interactivo
import { auth, db } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { openAuthModal } from './auth-modal.js';

let hasUnsavedChanges = false;
let trackingInitialized = false;

export function setUnsavedChanges(val) {
  hasUnsavedChanges = !!val;
}

export function getUnsavedChanges() {
  return hasUnsavedChanges;
}

function initUnsavedTracking() {
  if (trackingInitialized) return;
  trackingInitialized = true;

  // Detectar cambios en inputs y textareas (salvo dentro de modales)
  const markDirty = (e) => {
    if (e.target && e.target.closest && (
      e.target.closest('.auth-modal-overlay') ||
      e.target.closest('.modal-backdrop') ||
      e.target.closest('#download-modal') ||
      e.target.closest('#confirm-modal') ||
      e.target.closest('#unsaved-warning-modal-overlay')
    )) {
      return;
    }
    hasUnsavedChanges = true;
  };

  document.addEventListener('input', markDirty);
  document.addEventListener('change', markDirty);

  // Detectar clics en controles interactivos de la plantilla
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target || !target.closest) return;
    if (target.closest('.auth-modal-overlay') || target.closest('#unsaved-warning-modal-overlay')) return;

    if (
      target.closest('.habit-day-dot') || 
      target.closest('.day-check-indicator') || 
      target.closest('.btn-block-action') || 
      target.closest('.td-day-cell') || 
      target.closest('.btn-shape') ||
      target.closest('.pill-toggle')
    ) {
      hasUnsavedChanges = true;
    }
  });

  // Aviso nativo del navegador al cerrar la pestaña o recargar
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Interceptar navegación por enlaces internos dentro de la web
  document.addEventListener('click', (e) => {
    if (!hasUnsavedChanges) return;
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || link.target === '_blank') {
      return;
    }

    e.preventDefault();
    openUnsavedWarningModal(link.href);
  });
}

function openUnsavedWarningModal(targetUrl) {
  let modalOverlay = document.getElementById('unsaved-warning-modal-overlay');
  if (modalOverlay) modalOverlay.remove();

  const html = `
    <div id="unsaved-warning-modal-overlay" class="auth-modal-overlay" style="display: flex; z-index: 999999;">
      <div class="auth-modal-card" style="max-width: 440px; text-align: center; padding: 28px 24px;">
        <button type="button" class="auth-modal-close" id="btn-close-unsaved-warning" style="font-size: 1.4rem;">×</button>
        
        <div class="auth-modal-header" style="margin-bottom: 14px;">
          <span class="auth-modal-brand" style="font-size: 0.72rem; letter-spacing: 1.5px; text-transform: uppercase; color: #87553b; font-weight: 700;">Menos Ruido</span>
          <h2 class="auth-modal-title" style="font-family: 'Playfair Display', Georgia, serif; font-size: 1.35rem; margin: 8px 0 6px; color: #1a1816;">¿Deseas salir sin guardar?</h2>
          <p class="auth-modal-subtitle" style="font-size: 0.88rem; color: #5a524b; line-height: 1.5; margin: 0 auto; max-width: 360px;">
            Has realizado modificaciones en tu planificador. Si abandonas la página ahora, los cambios que no hayas guardado en <strong>Mi Espacio</strong> se perderán.
          </p>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center; align-items: center; margin-top: 22px;">
          <button type="button" id="btn-stay-editing" style="flex: 1; background: #2f2a26; color: #ffffff; padding: 11px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 0.88rem; transition: background 0.15s;">
            Continuar editando
          </button>
          <button type="button" id="btn-leave-page" style="flex: 1; background: #fdf2f2; color: #991b1b; padding: 11px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid #fecaca; font-size: 0.88rem; transition: background 0.15s;">
            Salir sin guardar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  modalOverlay = document.getElementById('unsaved-warning-modal-overlay');

  const closeBtn = document.getElementById('btn-close-unsaved-warning');
  const stayBtn = document.getElementById('btn-stay-editing');
  const leaveBtn = document.getElementById('btn-leave-page');

  const closeModal = () => modalOverlay?.remove();

  closeBtn?.addEventListener('click', closeModal);
  stayBtn?.addEventListener('click', closeModal);
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  leaveBtn?.addEventListener('click', () => {
    hasUnsavedChanges = false;
    closeModal();
    window.location.href = targetUrl;
  });
}

export function checkAndLoadSavedDesign(applyDataFn) {
  initUnsavedTracking();
  const params = new URLSearchParams(window.location.search);
  const designId = params.get('load');
  if (!designId) return;

  let loaded = false;

  const runLoad = async (user) => {
    if (!user || loaded) return;
    loaded = true;

    try {
      const designDocRef = doc(db, 'users', user.uid, 'designs', designId);
      const snap = await getDoc(designDocRef);
      if (snap.exists()) {
        const item = snap.data();
        if (item.data && typeof applyDataFn === 'function') {
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
              applyDataFn(item.data);
              setTimeout(() => { hasUnsavedChanges = false; }, 400);
            });
          } else {
            applyDataFn(item.data);
            setTimeout(() => { hasUnsavedChanges = false; }, 400);
          }
          notifyToast(`✓ Diseño "${item.name || 'Guardado'}" cargado`);
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } else {
        notifyToast('No se encontró el diseño seleccionado.');
      }
    } catch (err) {
      console.error('Error al cargar diseño guardado:', err);
      notifyToast('No se pudo cargar el diseño guardado.');
    }
  };

  onAuthStateChanged(auth, runLoad);
}

export function setupGeneratorSave(btnId, getGeneratorDataFn) {
  initUnsavedTracking();
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

      hasUnsavedChanges = false;
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

        hasUnsavedChanges = false;
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
