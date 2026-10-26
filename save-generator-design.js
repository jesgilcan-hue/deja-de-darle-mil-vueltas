// save-generator-design.js - Permite guardar o sobrescribir configuraciones en Firestore con modal interactivo
import { auth, db } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  getDoc,
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { openAuthModal } from './auth-modal.js';

let hasUnsavedChanges = false;
let trackingInitialized = false;
let currentActiveDesign = null; // { id, name, type }
let currentGeneratorGetter = null;
let currentSaveBtn = null;

export function setUnsavedChanges(val) {
  hasUnsavedChanges = !!val;
}

export function getUnsavedChanges() {
  return hasUnsavedChanges;
}

export function getActiveDesign() {
  return currentActiveDesign;
}

export function cleanDataForFirestore(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanDataForFirestore(item));
  }
  const cleaned = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = cleanDataForFirestore(val);
    }
  }
  return cleaned;
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
      e.target.closest('#unsaved-warning-modal-overlay') ||
      e.target.closest('#save-choice-modal-overlay')
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
    if (target.closest('.auth-modal-overlay') || target.closest('#unsaved-warning-modal-overlay') || target.closest('#save-choice-modal-overlay')) return;

    if (
      target.closest('.habit-day-dot') || 
      target.closest('.day-check-indicator') || 
      target.closest('.btn-block-action') || 
      target.closest('.td-day-cell') || 
      target.closest('.btn-shape') ||
      target.closest('.pill-toggle') ||
      (target.closest('.btn-toggle-item') && !target.closest('#pageToggleGroup') && !target.closest('#sideToggleGroup')) ||
      target.closest('#btnRegenerate') ||
      target.closest('.btn-preset') ||
      target.closest('.btn-custom-apply') ||
      target.closest('.btn-topic-gen') ||
      target.closest('.game-toggle-card') ||
      target.closest('.cover-style-card') ||
      target.closest('.cover-color-swatch')
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

function updateActiveDesignUI() {
  if (!currentSaveBtn) return;
  const parent = currentSaveBtn.parentElement;
  if (!parent) return;

  // 1. Badge indicando qué diseño se está editando actualmente
  let pill = document.getElementById('mr-active-design-pill');
  if (currentActiveDesign) {
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'mr-active-design-pill';
      pill.className = 'active-design-status-pill';
      parent.insertBefore(pill, currentSaveBtn);
    }
    pill.style.display = 'inline-flex';
    pill.innerHTML = `
      <span class="pill-dot"></span>
      <span style="font-size: 0.78rem; opacity: 0.85;">Editando:</span>
      <span class="pill-name" title="${escapeHtml(currentActiveDesign.name)}">${escapeHtml(currentActiveDesign.name)}</span>
    `;
    currentSaveBtn.innerHTML = '<span>💾</span> Guardar cambios';
    currentSaveBtn.title = `Guardar cambios directamente en "${currentActiveDesign.name}"`;
  } else {
    if (pill) pill.style.display = 'none';
    currentSaveBtn.innerHTML = '<span>💾</span> Guardar en Mi Espacio';
    currentSaveBtn.title = 'Guardar diseño en Mi Espacio';
  }

  // 2. Botón secundario para guardar una copia o nuevo archivo
  let copyBtn = document.getElementById('btn-save-as-copy');
  if (currentActiveDesign) {
    if (!copyBtn) {
      copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.id = 'btn-save-as-copy';
      copyBtn.className = 'btn-save-as-copy';
      copyBtn.innerHTML = '<span>➕</span> Guardar como nuevo...';
      copyBtn.title = 'Crear un nuevo archivo independiente a partir de este diseño';
      if (currentSaveBtn.nextSibling) {
        parent.insertBefore(copyBtn, currentSaveBtn.nextSibling);
      } else {
        parent.appendChild(copyBtn);
      }
      copyBtn.addEventListener('click', async () => {
        let user = auth.currentUser;
        if (!user && typeof auth.authStateReady === 'function') {
          try {
            await auth.authStateReady();
            user = auth.currentUser;
          } catch (e) {}
        }
        if (!user) {
          openAuthModal({
            title: 'Guardar como nuevo diseño',
            subtitle: 'Accede a tu cuenta para crear y guardar un nuevo archivo independiente.',
            badge: 'Nuevo diseño',
            actionContext: 'save',
            onSuccess: async (loggedUser) => {
              if (currentGeneratorGetter) {
                await triggerSaveFlow(copyBtn, currentGeneratorGetter(), loggedUser);
              }
            }
          });
          return;
        }
        if (currentGeneratorGetter) {
          await triggerSaveFlow(copyBtn, currentGeneratorGetter(), user);
        }
      });
    }
    copyBtn.style.display = 'inline-flex';
  } else {
    if (copyBtn) copyBtn.style.display = 'none';
  }
}

function openUnsavedWarningModal(targetUrl) {
  let modalOverlay = document.getElementById('unsaved-warning-modal-overlay');
  if (modalOverlay) modalOverlay.remove();

  let fallbackName = '';
  if (!currentActiveDesign && typeof currentGeneratorGetter === 'function') {
    try {
      const draft = currentGeneratorGetter();
      if (draft && draft.name) fallbackName = draft.name;
    } catch (e) {}
  }
  const displayName = currentActiveDesign ? currentActiveDesign.name : fallbackName;
  const activeNameText = displayName 
    ? ` en <strong>${escapeHtml(displayName)}</strong>` 
    : '';

  const html = `
    <div id="unsaved-warning-modal-overlay" class="auth-modal-overlay" style="display: flex; z-index: 999999;">
      <div class="auth-modal-card" style="max-width: 460px; text-align: center; padding: 28px 24px;">
        <button type="button" class="auth-modal-close" id="btn-close-unsaved-warning" style="font-size: 1.4rem;">×</button>
        
        <div class="auth-modal-header" style="margin-bottom: 14px;">
          <span class="auth-modal-brand" style="font-size: 0.72rem; letter-spacing: 1.5px; text-transform: uppercase; color: #87553b; font-weight: 700;">Menos Ruido</span>
          <h2 class="auth-modal-title" style="font-family: 'Playfair Display', Georgia, serif; font-size: 1.35rem; margin: 8px 0 6px; color: #1a1816;">¿Deseas salir sin guardar?</h2>
          <p class="auth-modal-subtitle" style="font-size: 0.88rem; color: #5a524b; line-height: 1.5; margin: 0 auto; max-width: 380px;">
            Has realizado modificaciones${activeNameText}. Elige qué deseas hacer antes de abandonar la página:
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 22px;">
          <button type="button" id="btn-save-and-leave" style="background: var(--color-accent, #87553b); color: #ffffff; padding: 11px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 0.9rem; transition: background 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>💾</span> Guardar cambios y salir
          </button>
          <div style="display: flex; gap: 10px;">
            <button type="button" id="btn-stay-editing" style="flex: 1; background: #2f2a26; color: #ffffff; padding: 10px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 0.86rem; transition: background 0.15s;">
              Continuar editando
            </button>
            <button type="button" id="btn-leave-page" style="flex: 1; background: #fdf2f2; color: #991b1b; padding: 10px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid #fecaca; font-size: 0.86rem; transition: background 0.15s;">
              Salir sin guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  modalOverlay = document.getElementById('unsaved-warning-modal-overlay');

  const closeBtn = document.getElementById('btn-close-unsaved-warning');
  const stayBtn = document.getElementById('btn-stay-editing');
  const leaveBtn = document.getElementById('btn-leave-page');
  const saveAndLeaveBtn = document.getElementById('btn-save-and-leave');

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

  saveAndLeaveBtn?.addEventListener('click', async () => {
    closeModal();

    let user = auth.currentUser;
    if (!user && typeof auth.authStateReady === 'function') {
      try {
        await auth.authStateReady();
        user = auth.currentUser;
      } catch (e) {}
    }

    const currentDraft = currentGeneratorGetter ? currentGeneratorGetter() : {};

    if (!user) {
      try {
        window.localStorage.setItem('mr_pending_save_design', JSON.stringify(currentDraft));
        window.localStorage.setItem('mr_auth_return_url', targetUrl);
      } catch (e) {}
      openAuthModal({
        title: 'Guarda tus cambios antes de salir',
        subtitle: 'Accede a tu cuenta para no perder las modificaciones que acabas de realizar.',
        badge: 'Guardar y salir',
        actionContext: 'save',
        onSuccess: async (loggedUser) => {
          await triggerSaveFlow(null, currentDraft, loggedUser, targetUrl);
        }
      });
      return;
    }

    await triggerSaveFlow(null, currentDraft, user, targetUrl);
  });
}

export function checkAndLoadSavedDesign(applyDataFn) {
  initUnsavedTracking();
  const params = new URLSearchParams(window.location.search);
  const designId = params.get('load');
  if (!designId) return;

  let loaded = false;

  // 1. Carga inmediata (0 ms) si está en localStorage
  try {
    const rawLocal = localStorage.getItem('mr_local_designs');
    const localDesigns = rawLocal ? JSON.parse(rawLocal) : [];
    const item = localDesigns.find(d => d.id === designId);
    if (item && item.data && typeof applyDataFn === 'function') {
      currentActiveDesign = {
        id: item.id,
        name: item.name || 'Mi Planificador',
        type: item.type || ''
      };
      updateActiveDesignUI();
      applyDataFn(item.data);
      setTimeout(() => { hasUnsavedChanges = false; }, 400);
      notifyToast(`✓ Editando "${item.name || 'Guardado'}"`);
      loaded = true;
    }
  } catch (e) {}

  // 2. Si hay sesión iniciada en Firebase, comprobar en Firestore
  const runLoad = async (user) => {
    if (!user) return;
    try {
      const designDocRef = doc(db, 'users', user.uid, 'designs', designId);
      const snap = await getDoc(designDocRef);
      if (snap.exists()) {
        const item = snap.data();
        currentActiveDesign = {
          id: designId,
          name: item.name || 'Mi Planificador',
          type: item.type || ''
        };
        updateActiveDesignUI();

        if (item.data && typeof applyDataFn === 'function' && !loaded) {
          applyDataFn(item.data);
          setTimeout(() => { hasUnsavedChanges = false; }, 400);
          notifyToast(`✓ Editando "${item.name || 'Guardado'}"`);
          loaded = true;
        }
      }
    } catch (err) {
      console.warn('Aviso al consultar diseño en Firestore:', err);
    }
  };

  onAuthStateChanged(auth, runLoad);
}

function prefillEmailInputs(user) {
  if (!user) return;
  const email = (user.email || '').trim();
  if (!email) return;

  const modalEmail = document.getElementById('modal-email-input');
  if (modalEmail && !modalEmail.value) {
    modalEmail.value = email;
  }
  const coverEmail = document.getElementById('inpCoverEmail');
  if (coverEmail && !coverEmail.value) {
    coverEmail.value = email;
  }
}

async function executeSaveAction(btn, getGeneratorDataFn, user, options = {}) {
  const currentDesign = getGeneratorDataFn();
  const cleanData = cleanDataForFirestore(currentDesign.data || {});
  const nowSecs = Math.floor(Date.now() / 1000);

  let docId = currentActiveDesign ? currentActiveDesign.id : null;
  if (!docId) {
    docId = 'des_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }
  const finalName = (currentActiveDesign ? currentActiveDesign.name : currentDesign.name) || (currentDesign.type ? `${currentDesign.type} Personalizado` : 'Mi Planificador');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Guardando...';
  }

  // 1. Guardar en localStorage como caché y respaldo seguro
  try {
    let localDesigns = JSON.parse(localStorage.getItem('mr_local_designs') || '[]');
    const existingIdx = localDesigns.findIndex(d => d.id === docId);
    const savedItem = {
      id: docId,
      name: finalName,
      type: currentDesign.type || 'Planificador',
      summary: currentDesign.summary || '',
      editUrl: window.location.pathname,
      data: cleanData,
      updatedAt: { seconds: nowSecs },
      createdAt: existingIdx >= 0 && localDesigns[existingIdx].createdAt ? localDesigns[existingIdx].createdAt : { seconds: nowSecs }
    };

    if (existingIdx >= 0) {
      localDesigns[existingIdx] = { ...localDesigns[existingIdx], ...savedItem };
    } else {
      localDesigns.unshift(savedItem);
    }

    localStorage.setItem('mr_local_designs', JSON.stringify(localDesigns));
    localStorage.setItem('mr_cached_designs', JSON.stringify(localDesigns));
  } catch (localErr) {
    console.warn('Aviso guardando en localStorage:', localErr);
  }

  // 2. Guardar en Firestore del usuario autenticado
  if (user) {
    try {
      const designDocRef = doc(db, 'users', user.uid, 'designs', docId);
      await setDoc(designDocRef, {
        name: finalName,
        type: currentDesign.type || 'Planificador',
        summary: currentDesign.summary || '',
        editUrl: window.location.pathname,
        data: cleanData,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (cloudErr) {
      console.warn('Aviso sincronizando en Firestore:', cloudErr);
    }
  }

  currentActiveDesign = {
    id: docId,
    name: finalName,
    type: currentDesign.type || 'Planificador'
  };
  hasUnsavedChanges = false;

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<span>✓</span> ¡Guardado!';
    setTimeout(() => {
      updateActiveDesignUI();
    }, 1200);
  }

  notifyToast(`✓ "${finalName}" guardado en Mi Espacio`);
}

function interceptDownloadActions(options, getGeneratorDataFn) {
  // 1. Interceptar función global openDownloadModal
  const wrapOpenDownloadModal = () => {
    if (typeof window.openDownloadModal === 'function' && !window.openDownloadModal.__mrWrapped) {
      const originalModal = window.openDownloadModal;
      const wrapped = function(...args) {
        let user = auth.currentUser;
        if (!user) {
          try {
            const currentDesign = getGeneratorDataFn ? getGeneratorDataFn() : null;
            if (currentDesign) {
              sessionStorage.setItem('mr_temp_generator_draft', JSON.stringify(currentDesign));
            }
          } catch (e) {}

          openAuthModal({
            title: options?.isPremium ? 'Descarga tu diseño en PDF' : 'Descarga o imprime en PDF',
            subtitle: options?.isPremium 
              ? 'Accede a tu cuenta para generar y descargar tu archivo listo para imprenta.'
              : 'Inicia sesión o crea tu cuenta gratuita para descargar e imprimir tu plantilla en PDF de alta resolución.',
            badge: options?.isPremium ? 'Edición Completa' : 'Descarga en PDF',
            actionContext: 'download',
            isPremium: !!options?.isPremium,
            onSuccess: (loggedUser) => {
              prefillEmailInputs(loggedUser);
              originalModal.apply(this, args);
            }
          });
          return;
        }

        prefillEmailInputs(user);
        return originalModal.apply(this, args);
      };
      wrapped.__mrWrapped = true;
      window.openDownloadModal = wrapped;
    }
  };

  // 2. Interceptar función global generatePdf
  const wrapGeneratePdf = () => {
    if (typeof window.generatePdf === 'function' && !window.generatePdf.__mrWrapped) {
      const origPdf = window.generatePdf;
      const wrappedPdf = function(...args) {
        let user = auth.currentUser;
        if (!user) {
          if (typeof window.closeDownloadModal === 'function') window.closeDownloadModal();
          openAuthModal({
            title: 'Descarga o imprime en PDF',
            subtitle: 'Inicia sesión o crea tu cuenta gratuita para generar y descargar tu plantilla en PDF.',
            badge: 'Descarga en PDF',
            actionContext: 'download',
            onSuccess: () => {
              origPdf.apply(this, args);
            }
          });
          return;
        }
        return origPdf.apply(this, args);
      };
      wrappedPdf.__mrWrapped = true;
      window.generatePdf = wrappedPdf;
    }
  };

  // 3. Interceptar función global openCompileModal (Libro Completo)
  const wrapOpenCompileModal = () => {
    if (typeof window.openCompileModal === 'function' && !window.openCompileModal.__mrWrapped) {
      const originalCompile = window.openCompileModal;
      const wrapped = function(...args) {
        let user = auth.currentUser;
        if (!user) {
          try {
            const currentDesign = getGeneratorDataFn ? getGeneratorDataFn() : null;
            if (currentDesign) {
              sessionStorage.setItem('mr_temp_generator_draft', JSON.stringify(currentDesign));
            }
          } catch (e) {}

          openAuthModal({
            title: 'Descarga tu Cuaderno Completo en PDF',
            subtitle: 'Accede a tu cuenta para compilar y descargar tu libro completo listo para imprimir.',
            badge: 'Cuaderno Completo',
            actionContext: 'download',
            isPremium: true,
            onSuccess: (loggedUser) => {
              prefillEmailInputs(loggedUser);
              originalCompile.apply(this, args);
            }
          });
          return;
        }

        prefillEmailInputs(user);
        return originalCompile.apply(this, args);
      };
      wrapped.__mrWrapped = true;
      window.openCompileModal = wrapped;
    }
  };

  wrapOpenDownloadModal();
  wrapGeneratePdf();
  wrapOpenCompileModal();

  setTimeout(() => {
    wrapOpenDownloadModal();
    wrapGeneratePdf();
    wrapOpenCompileModal();
  }, 100);

  setInterval(() => {
    wrapOpenDownloadModal();
    wrapGeneratePdf();
    wrapOpenCompileModal();
  }, 500);

  // 4. Captura defensiva de clics en botones de descarga, impresión o envío
  document.addEventListener('click', (e) => {
    const target = e.target && e.target.closest && e.target.closest('.btn-download-primary, .btn-download-send, .btn-compile-pdf, .btn-modal-primary, .btn-modal-secondary, #btn-modal-send-email');
    if (!target) return;
    if (target.id === 'btn-save-generator-design' || target.id === 'btn-save-as-copy' || target.getAttribute('href')) return;

    let user = auth.currentUser;
    if (!user) {
      e.preventDefault();
      e.stopPropagation();

      try {
        const currentDesign = getGeneratorDataFn ? getGeneratorDataFn() : null;
        if (currentDesign) {
          sessionStorage.setItem('mr_temp_generator_draft', JSON.stringify(currentDesign));
        }
      } catch (err) {}

      if (typeof window.closeDownloadModal === 'function') {
        window.closeDownloadModal();
      }

      openAuthModal({
        title: options?.isPremium ? 'Descarga tu diseño en PDF' : 'Descarga o imprime en PDF',
        subtitle: options?.isPremium 
          ? 'Accede a tu cuenta para generar y descargar tu archivo listo para imprenta.'
          : 'Inicia sesión o crea tu cuenta gratuita para descargar e imprimir tu plantilla en PDF de alta resolución.',
        badge: options?.isPremium ? 'Edición Completa' : 'Descarga en PDF',
        actionContext: 'download',
        isPremium: !!options?.isPremium,
        onSuccess: (loggedUser) => {
          prefillEmailInputs(loggedUser);
          if (typeof window.openDownloadModal === 'function') {
            window.openDownloadModal();
          } else if (typeof window.openCompileModal === 'function') {
            window.openCompileModal();
          }
        }
      });
    }
  }, true);
}

export function setupGeneratorSave(btnId, getGeneratorDataFn, options = {}) {
  initUnsavedTracking();
  const btn = document.getElementById(btnId);
  if (!btn) return;

  currentSaveBtn = btn;
  currentGeneratorGetter = getGeneratorDataFn;
  updateActiveDesignUI();

  // Interceptar descargas en PDF para exigir login antes de abrir el modal de descarga
  interceptDownloadActions(options, getGeneratorDataFn);

  // Si el usuario acaba de iniciar sesión tras haber guardado localmente, sincronizar el diseño activo
  window.addEventListener('mr-auth-success', async (e) => {
    if (currentActiveDesign && e.detail) {
      try {
        const currentDesign = getGeneratorDataFn();
        const cleanData = cleanDataForFirestore(currentDesign.data || {});
        const designDocRef = doc(db, 'users', e.detail.uid, 'designs', currentActiveDesign.id);
        await setDoc(designDocRef, {
          name: currentActiveDesign.name,
          type: currentDesign.type || 'Planificador',
          summary: currentDesign.summary || '',
          editUrl: window.location.pathname,
          data: cleanData,
          updatedAt: serverTimestamp()
        }, { merge: true });
        notifyToast(`✓ Sincronizado en la nube con tu cuenta`);
      } catch (err) {
        console.warn('Aviso sincronizando diseño activo tras login:', err);
      }
    }
  });

  btn.addEventListener('click', async () => {
    let user = auth.currentUser;
    if (!user && typeof auth.authStateReady === 'function') {
      try {
        await auth.authStateReady();
        user = auth.currentUser;
      } catch (e) {}
    }

    // EXIGENCIA: Para guardar se requiere estar registrado/logueado
    if (!user) {
      try {
        const currentDesign = getGeneratorDataFn();
        sessionStorage.setItem('mr_temp_generator_draft', JSON.stringify(currentDesign));
      } catch (e) {}

      openAuthModal({
        title: 'Guarda tu diseño en Mi Espacio',
        subtitle: 'Para guardar tus plantillas personalizadas y tenerlas siempre disponibles, accede o crea tu cuenta gratuita.',
        badge: 'Guardar diseño',
        actionContext: 'save',
        isPremium: !!options?.isPremium,
        onSuccess: async (loggedUser) => {
          await executeSaveAction(btn, getGeneratorDataFn, loggedUser, options);
        }
      });
      return;
    }

    await executeSaveAction(btn, getGeneratorDataFn, user, options);
  });
}

async function triggerSaveFlow(btn, currentDesign, user, redirectAfterUrl = null) {
  let originalText = btn ? btn.innerHTML : '';
  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Consultando...';
    }

    const currentType = currentDesign.type || 'Planificador Semanal';

    // Consultar diseños del usuario en Firestore
    const designsRef = collection(db, 'users', user.uid, 'designs');
    let snap = null;
    try {
      snap = await getDocs(designsRef);
    } catch (firestoreErr) {
      console.warn('Aviso al consultar diseños existentes:', firestoreErr);
    }
    
    const existingDesigns = [];
    if (snap) {
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
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }

    // Abrir modal de selección
    openSaveChoiceModal(currentDesign, existingDesigns, user, redirectAfterUrl);

  } catch (err) {
    console.error('Error al preparar guardado:', err);
    notifyToast('No se pudieron cargar tus diseños. Inténtalo de nuevo.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText || '<span>💾</span> Guardar en Mi Espacio';
    }
  }
}

function openSaveChoiceModal(currentDesign, existingDesigns, user, redirectAfterUrl = null) {
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
      const cleanData = cleanDataForFirestore(currentDesign.data || {});
      const docRef = await addDoc(designsRef, {
        name: finalName,
        type: currentDesign.type || 'Planificador',
        summary: currentDesign.summary || '',
        editUrl: window.location.pathname,
        data: cleanData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Guardar copia local de seguridad en el navegador
      try {
        let localDesigns = JSON.parse(localStorage.getItem('mr_local_designs') || '[]');
        localDesigns = localDesigns.filter(d => d.id !== docRef.id);
        localDesigns.unshift({
          id: docRef.id,
          name: finalName,
          type: currentDesign.type || 'Planificador',
          summary: currentDesign.summary || '',
          editUrl: window.location.pathname,
          data: cleanData,
          createdAt: { seconds: Math.floor(Date.now() / 1000) },
          updatedAt: { seconds: Math.floor(Date.now() / 1000) }
        });
        localStorage.setItem('mr_local_designs', JSON.stringify(localDesigns));
        localStorage.setItem('mr_cached_designs', JSON.stringify(localDesigns));
      } catch (e) {}

      currentActiveDesign = {
        id: docRef.id,
        name: finalName,
        type: currentDesign.type || 'Planificador'
      };
      updateActiveDesignUI();

      hasUnsavedChanges = false;
      modalOverlay.remove();
      notifyToast(`✓ "${finalName}" guardado en Mi Espacio`);
      if (redirectAfterUrl) {
        setTimeout(() => {
          window.location.href = redirectAfterUrl;
        }, 400);
      }
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
        const cleanData = cleanDataForFirestore(currentDesign.data || {});
        await updateDoc(designDocRef, {
          summary: currentDesign.summary || '',
          editUrl: window.location.pathname,
          data: cleanData,
          updatedAt: serverTimestamp()
        });

        // Actualizar copia local de seguridad en el navegador
        try {
          let localDesigns = JSON.parse(localStorage.getItem('mr_local_designs') || '[]');
          const idx = localDesigns.findIndex(d => d.id === docId);
          const updatedItem = {
            id: docId,
            name: targetName,
            type: currentDesign.type || 'Planificador',
            summary: currentDesign.summary || '',
            editUrl: window.location.pathname,
            data: currentDesign.data || {},
            updatedAt: { seconds: Math.floor(Date.now() / 1000) }
          };
          if (idx >= 0) {
            localDesigns[idx] = { ...localDesigns[idx], ...updatedItem };
          } else {
            localDesigns.unshift(updatedItem);
          }
          localStorage.setItem('mr_local_designs', JSON.stringify(localDesigns));
          localStorage.setItem('mr_cached_designs', JSON.stringify(localDesigns));
        } catch (e) {}

        currentActiveDesign = {
          id: docId,
          name: targetName,
          type: currentDesign.type || 'Planificador'
        };
        updateActiveDesignUI();

        hasUnsavedChanges = false;
        modalOverlay.remove();
        notifyToast(`✓ "${targetName}" sobrescrito y actualizado`);
        if (redirectAfterUrl) {
          setTimeout(() => {
            window.location.href = redirectAfterUrl;
          }, 400);
        }
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
