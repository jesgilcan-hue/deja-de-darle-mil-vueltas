// mi-espacio.js - Lógica completa del panel de usuario y desarrollador
import { 
  auth, 
  db, 
  isDeveloper, 
  DEVELOPER_PIN,
  getUserEmail,
  getUserDisplayName,
  DEVELOPER_EMAILS,
  clearUserLocalCache
} from './firebase-config.js';
import {
  verifyAndEnforceThreeDevices,
  revokeAuthorizedDevice,
  MAX_AUTHORIZED_DEVICES
} from './device-guard.js';
import { 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  deleteUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { openAuthModal, setupNavbarAuth } from './auth-modal.js';

let currentUser = null;
let allDesigns = [];
let currentFilter = 'all';

// Modal de Descarga en Mi Espacio
const downloadModal = document.getElementById('download-modal');
const btnCloseDlModal = document.getElementById('btn-close-dl-modal');
const dlModalTitle = document.getElementById('dl-modal-title');
const dlModalBadge = document.getElementById('dl-modal-badge');
const btnDlWritten = document.getElementById('btn-dl-written');
const btnDlBlank = document.getElementById('btn-dl-blank');
const modalEmailInput = document.getElementById('modal-email-input');
const btnModalSendEmail = document.getElementById('btn-modal-send-email');
const modalEmailIsBlank = document.getElementById('modal-email-is-blank');
const modalEmailFeedback = document.getElementById('modal-email-feedback');
const headlessPdfFrame = document.getElementById('headless-pdf-frame');
let activeDownloadItem = null;


// Elementos del DOM
const unauthContainer = document.getElementById('unauth-container');
const authContainer = document.getElementById('auth-container');
const btnLoginPrompt = document.getElementById('btn-login-prompt');
const btnSignout = document.getElementById('btn-signout');

const userAvatarDisplay = document.getElementById('user-avatar-display');
const userNameDisplay = document.getElementById('user-name-display');
const userEmailDisplay = document.getElementById('user-email-display');
const userRoleBadge = document.getElementById('user-role-badge');
const tabBtnDev = document.getElementById('tab-btn-dev');
const tabBtnFuturas = document.getElementById('tab-btn-futuras');

// Pestañas
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Diseños
const emptyDesignsView = document.getElementById('empty-designs-view');
const designsGrid = document.getElementById('designs-grid');
const countAll = document.getElementById('count-all');
const countCompleto = document.getElementById('count-completo');
const countPortada = document.getElementById('count-portada');
const countSemanal = document.getElementById('count-semanal');
const countDiario = document.getElementById('count-diario');
const countMensual = document.getElementById('count-mensual');
const countHabitos = document.getElementById('count-habitos');
const countHorario = document.getElementById('count-horario');
const countAnual = document.getElementById('count-anual');
const filterPills = document.querySelectorAll('.filter-pill');
const btnCreateDesignToggle = document.getElementById('btn-create-design-toggle');
const createDesignMenu = document.getElementById('create-design-menu');

// Ajustes & Perfil
const formPerfil = document.getElementById('ajustes-perfil-form');
const inputDisplayName = document.getElementById('ajustes-display-name');
const inputEmail = document.getElementById('ajustes-email');
const providerDisplay = document.getElementById('ajustes-provider-display');
const createdDisplay = document.getElementById('ajustes-created-display');
const prefNewsletter = document.getElementById('pref-newsletter');
const btnSavePref = document.getElementById('btn-save-pref');
const btnExportData = document.getElementById('btn-export-data');

// Modal Eliminar Cuenta
const btnDeleteAccountTrigger = document.getElementById('btn-delete-account-trigger');
const deleteAccountModal = document.getElementById('delete-account-modal');
const deleteConfirmInput = document.getElementById('delete-confirm-input');
const btnCancelDelete = document.getElementById('btn-cancel-delete-account');
const btnConfirmDelete = document.getElementById('btn-confirm-delete-account');

// Panel Dev
const devLockedView = document.getElementById('dev-locked-view');
const devUnlockedContent = document.getElementById('dev-unlocked-content');
const devPinInput = document.getElementById('dev-pin-input');
const btnUnlockDev = document.getElementById('btn-unlock-dev');
const devPinError = document.getElementById('dev-pin-error');
const envioForm = document.getElementById('envio-form');
const btnSaveEnvio = document.getElementById('btn-save-envio');
const btnSimulateOrder = document.getElementById('btn-simulate-order');
const simOrderResult = document.getElementById('sim-order-result');

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupEvents();
  setupCreateDropdown();
  setupFilters();
  setupDeleteModal();
  setupDownloadModal();
  setupPostMessageListener();

  // 1. Carga instantánea (0 ms) si hay datos en caché local o localStorage
  try {
    const cachedRaw = localStorage.getItem('mr_cached_user');
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      renderCachedView(cached);
    }
    const cachedDesignsRaw = localStorage.getItem('mr_cached_designs');
    const localDesignsRaw = localStorage.getItem('mr_local_designs');
    let mergedLocal = [];
    if (localDesignsRaw) {
      try { mergedLocal = JSON.parse(localDesignsRaw); } catch (e) {}
    }
    if (cachedDesignsRaw) {
      try {
        const cachedList = JSON.parse(cachedDesignsRaw);
        cachedList.forEach(c => {
          if (!mergedLocal.some(l => l.id === c.id)) mergedLocal.push(c);
        });
      } catch (e) {}
    }
    if (mergedLocal.length > 0) {
      allDesigns = mergedLocal;
      allDesigns.sort((a, b) => {
        const tA = getTimestampValue(a.updatedAt || a.createdAt);
        const tB = getTimestampValue(b.updatedAt || b.createdAt);
        return tB - tA;
      });
      updateDesignCounts();
      renderDesignsGrid();
      if (unauthContainer) unauthContainer.style.display = 'none';
      if (authContainer) authContainer.style.display = 'block';
    }
    const cachedExtraRaw = localStorage.getItem('mr_user_extra_data');
    if (cachedExtraRaw) {
      const extra = JSON.parse(cachedExtraRaw);
      if (extra.preferences && typeof extra.preferences.newsletter !== 'undefined' && prefNewsletter) {
        prefNewsletter.checked = !!extra.preferences.newsletter;
      }
      if (extra.shipping) {
        populateShippingFields(extra.shipping);
      }
    }
  } catch (e) {}

  // 2. Comprobación en segundo plano con Firebase
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      // Guardar email para prefills automáticos
      const email = getUserEmail(user);
      if (email) {
        try { localStorage.setItem('mr_user_pdf_email', email); } catch (e) {}
      }
      renderAuthenticatedView(user);
      checkUrlTab();
      // Cargar datos de usuario y plantillas EN PARALELO para máxima velocidad
      await Promise.all([loadUserData(user), loadUserDesigns(user)]);
    } else {
      try { localStorage.removeItem('mr_cached_user'); } catch (e) {}
      // Si el usuario no ha iniciado sesión pero tiene diseños guardados localmente, mostrarlos
      if (allDesigns.length > 0) {
        renderGuestLocalView();
      } else {
        renderUnauthenticatedView();
      }
    }
  });
});

function renderCachedView(cached) {
  unauthContainer.style.display = 'none';
  authContainer.style.display = 'block';

  if (cached.photoURL) {
    userAvatarDisplay.innerHTML = `<img src="${cached.photoURL}" alt="" />`;
  } else {
    userAvatarDisplay.textContent = (cached.displayName || cached.email || 'U').charAt(0).toUpperCase();
  }

  const titleText = userNameDisplay ? userNameDisplay.querySelector('.user-name-text') : null;
  if (titleText) {
    titleText.textContent = cached.displayName || 'Mi Espacio';
  } else if (userNameDisplay && userNameDisplay.firstChild) {
    userNameDisplay.firstChild.textContent = (cached.displayName || 'Mi Espacio') + ' ';
  }
  if (userEmailDisplay) {
    userEmailDisplay.textContent = cached.email || '';
  }

  // En vista previa de caché NUNCA se activa el panel dev por seguridad.
  // Solo la autenticación real en tiempo real de Firebase evalúa permisos.
  if (userRoleBadge) userRoleBadge.style.display = 'none';
  if (tabBtnDev) tabBtnDev.style.display = 'none';
  if (tabBtnFuturas) tabBtnFuturas.style.display = 'none';
  if (devLockedView) devLockedView.style.display = 'none';
  if (devUnlockedContent) devUnlockedContent.style.display = 'none';
}

// Soporte de navegación por pestañas y lectura de query params (?tab=disenos, ?tab=ajustes, ?tab=dev)
function setupTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      activateTab(targetId);
    });
  });
}

function activateTab(tabId) {
  tabButtons.forEach(b => {
    if (b.getAttribute('data-tab') === tabId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  tabPanes.forEach(p => {
    if (p.id === tabId) {
      p.classList.add('active');
      if (tabId === 'tab-dev' || tabId === 'tab-futuras') {
        p.style.removeProperty('display');
        p.style.setProperty('display', 'block', 'important');
      }
    } else {
      p.classList.remove('active');
      if (p.id === 'tab-dev' || p.id === 'tab-futuras') {
        p.style.setProperty('display', 'none', 'important');
      }
    }
  });

  // Reflejar en URL sin recargar
  const urlParam = tabId.replace('tab-', '');
  const cleanUrl = window.location.pathname + '?tab=' + urlParam;
  window.history.replaceState({}, document.title, cleanUrl);
}

function checkUrlTab() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const user = auth.currentUser;
  const isDev = isDeveloper(user);

  if (tab === 'ajustes') {
    activateTab('tab-ajustes');
  } else if (tab === 'pedidos') {
    if (isDev) {
      const btnPed = document.getElementById('tab-btn-pedidos');
      if (btnPed) btnPed.style.setProperty('display', 'inline-flex', 'important');
      activateTab('tab-pedidos');
    } else {
      activateTab('tab-disenos');
    }
  } else if (tab === 'dev') {
    if (isDev) {
      if (tabBtnDev) tabBtnDev.style.setProperty('display', 'inline-flex', 'important');
      activateTab('tab-dev');
    } else {
      activateTab('tab-disenos');
    }
  } else if (tab === 'disenos') {
    activateTab('tab-disenos');
  } else if (tab === 'futuras') {
    if (isDev) {
      if (tabBtnFuturas) tabBtnFuturas.style.setProperty('display', 'inline-flex', 'important');
      activateTab('tab-futuras');
    } else {
      activateTab('tab-disenos');
    }
  }
}

// Menú desplegable "+ Crear nuevo diseño"
function setupCreateDropdown() {
  btnCreateDesignToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = createDesignMenu.style.display === 'block';
    createDesignMenu.style.display = isVisible ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (createDesignMenu && !createDesignMenu.contains(e.target) && e.target !== btnCreateDesignToggle) {
      createDesignMenu.style.display = 'none';
    }
  });
}

// Filtros de Diseños (Todas, Semanal, Diario)
function setupFilters() {
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter');
      renderDesignsGrid();
    });
  });
}

// Eventos generales
function setupEvents() {
  btnLoginPrompt?.addEventListener('click', openAuthModal);

  btnSignout?.addEventListener('click', async () => {
    try {
      clearUserLocalCache();
      await signOut(auth);
      showToast('Sesión cerrada correctamente');
      setTimeout(() => window.location.href = '/', 500);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  });

  // Guardar cambios en el perfil (Nombre para mostrar)
  formPerfil?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
      currentUser = auth.currentUser;
      if (!currentUser) {
        showToast('Debes iniciar sesión para guardar cambios');
        return;
      }
    }

    const newName = inputDisplayName.value.trim();
    if (!newName) return;

    const btnSubmit = document.getElementById('btn-save-perfil');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Guardando...';
    }

    try {
      // 1. Actualizar Firebase Auth
      await updateProfile(currentUser, { displayName: newName });

      // 2. Actualizar Firestore de forma segura con setDoc merge: true
      const userRef = doc(db, 'users', currentUser.uid);
      const email = getUserEmail(currentUser);
      await setDoc(userRef, { 
        displayName: newName,
        email: email,
        updatedAt: serverTimestamp() 
      }, { merge: true });

      // 3. Actualizar caché local
      try {
        const cachedRaw = localStorage.getItem('mr_cached_user');
        const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
        cached.displayName = newName;
        localStorage.setItem('mr_cached_user', JSON.stringify(cached));
      } catch (e) {}

      // 4. Actualizar vista
      const titleText = userNameDisplay ? userNameDisplay.querySelector('.user-name-text') : null;
      if (titleText) {
        titleText.textContent = newName;
      } else if (userNameDisplay && userNameDisplay.firstChild) {
        userNameDisplay.firstChild.textContent = newName + ' ';
      }
      showToast('✓ Nombre de perfil actualizado');
    } catch (err) {
      console.error('Error actualizando perfil:', err);
      showToast('No se pudo actualizar el nombre: ' + (err.message || ''));
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Guardar cambios en perfil';
      }
    }
  });

  // Guardar preferencias de comunicación
  btnSavePref?.addEventListener('click', async () => {
    if (!currentUser) return;
    btnSavePref.disabled = true;
    btnSavePref.textContent = 'Guardando...';

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        'preferences.newsletter': prefNewsletter.checked,
        'preferences.updatedAt': serverTimestamp()
      });
      showToast('✓ Preferencias guardadas');
    } catch (err) {
      console.error('Error guardando preferencias:', err);
      showToast('Error al guardar preferencias');
    } finally {
      btnSavePref.disabled = false;
      btnSavePref.textContent = 'Guardar preferencias';
    }
  });

  // Exportar datos (RGPD) en formato JSON
  btnExportData?.addEventListener('click', async () => {
    if (!currentUser) return;
    btnExportData.disabled = true;
    btnExportData.textContent = 'Preparando archivo...';

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      const designsRef = collection(db, 'users', currentUser.uid, 'designs');
      const designsSnap = await getDocs(designsRef);
      const designsData = [];
      designsSnap.forEach(d => designsData.push({ id: d.id, ...d.data() }));

      const exportPayload = {
        editorial: "Menos Ruido",
        exportedAt: new Date().toISOString(),
        usuario: {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          metadata: userData
        },
        plantillasGuardadas: designsData
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mis_datos_menos_ruido_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('✓ Archivo de datos descargado');
    } catch (err) {
      console.error('Error exportando datos:', err);
      showToast('Error al exportar los datos');
    } finally {
      btnExportData.disabled = false;
      btnExportData.textContent = '📥 Descargar mis datos (.json)';
    }
  });

  // Guardar datos de envío en Panel Desarrollador (para Lulu)
  envioForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    btnSaveEnvio.disabled = true;
    btnSaveEnvio.textContent = 'Guardando...';

    const shippingData = {
      nombre: document.getElementById('envio-nombre').value.trim(),
      telefono: document.getElementById('envio-telefono').value.trim(),
      dni: document.getElementById('envio-dni').value.trim(),
      direccion: document.getElementById('envio-direccion').value.trim(),
      cp: document.getElementById('envio-cp').value.trim(),
      ciudad: document.getElementById('envio-ciudad').value.trim(),
      provincia: document.getElementById('envio-provincia').value.trim(),
      pais: document.getElementById('envio-pais').value.trim(),
      notas: document.getElementById('envio-notas').value.trim(),
      updatedAt: serverTimestamp()
    };

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { shipping: shippingData });
      showToast('✓ Datos de envío guardados (Lulu Ready)');
    } catch (err) {
      console.error('Error al guardar datos de envío:', err);
      showToast('Hubo un error al guardar los datos');
    } finally {
      btnSaveEnvio.disabled = false;
      btnSaveEnvio.textContent = 'Guardar datos de envío';
    }
  });

  // Desbloqueo por PIN en panel de desarrollador
  btnUnlockDev?.addEventListener('click', unlockDevPanel);
  devPinInput?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') unlockDevPanel();
  });

  // Simulador de pedido de prueba en Panel Desarrollador
  btnSimulateOrder?.addEventListener('click', async () => {
    if (!currentUser) return;
    try {
      btnSimulateOrder.disabled = true;
      btnSimulateOrder.textContent = 'Generando pedido simulado...';

      const ordersRef = collection(db, 'users', currentUser.uid, 'orders_simulated');
      const docRef = await addDoc(ordersRef, {
        orderNumber: 'TEST-' + Math.floor(100000 + Math.random() * 900000),
        items: [
          { title: 'Planificador Semanal Atemporal', format: 'A5 Tapa Blanda', qty: 1 }
        ],
        status: 'simulated_success',
        createdAt: serverTimestamp()
      });

      simOrderResult.textContent = `✓ Pedido simulado creado: ID ${docRef.id}`;
      simOrderResult.style.display = 'block';
    } catch (err) {
      console.error('Error simulando pedido:', err);
      simOrderResult.textContent = 'Error al simular pedido: ' + err.message;
      simOrderResult.style.color = '#f87171';
      simOrderResult.style.display = 'block';
    } finally {
      btnSimulateOrder.disabled = false;
      btnSimulateOrder.textContent = 'Simular Pedido de Prueba';
    }
  });
}

// Modal de confirmación para eliminar cuenta permanentemente (RGPD)
function setupDeleteModal() {
  btnDeleteAccountTrigger?.addEventListener('click', () => {
    deleteConfirmInput.value = '';
    btnConfirmDelete.disabled = true;
    deleteAccountModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  btnCancelDelete?.addEventListener('click', () => {
    deleteAccountModal.style.display = 'none';
    document.body.style.overflow = '';
  });

  deleteConfirmInput?.addEventListener('input', () => {
    const isMatch = deleteConfirmInput.value.trim().toUpperCase() === 'ELIMINAR';
    btnConfirmDelete.disabled = !isMatch;
  });

  btnConfirmDelete?.addEventListener('click', async () => {
    if (!currentUser) return;
    btnConfirmDelete.disabled = true;
    btnConfirmDelete.textContent = 'Eliminando cuenta...';

    try {
      // 1. Borrar todas las plantillas guardadas
      const designsRef = collection(db, 'users', currentUser.uid, 'designs');
      const snap = await getDocs(designsRef);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }

      // 2. Borrar documento del usuario en Firestore
      await deleteDoc(doc(db, 'users', currentUser.uid));

      // 3. Borrar usuario en Firebase Auth
      await deleteUser(currentUser);
      clearUserLocalCache();

      deleteAccountModal.style.display = 'none';
      document.body.style.overflow = '';
      showToast('Tu cuenta y tus datos han sido eliminados.');
      setTimeout(() => window.location.href = '/', 1200);

    } catch (err) {
      console.error('Error eliminando cuenta:', err);
      if (err.code === 'auth/requires-recent-login') {
        alert('Por motivos de seguridad, para eliminar tu cuenta debes haber iniciado sesión recientemente. Por favor, cierra sesión, vuelve a entrar e inténtalo de nuevo.');
      } else {
        alert('No se pudo eliminar la cuenta: ' + (err.message || 'Error desconocido'));
      }
      btnConfirmDelete.disabled = false;
      btnConfirmDelete.textContent = 'Eliminar todo';
    }
  });
}

function setupDownloadModal() {
  btnCloseDlModal?.addEventListener('click', closeDownloadModal);
  downloadModal?.addEventListener('click', (e) => {
    if (e.target === downloadModal) closeDownloadModal();
  });
  btnDlWritten?.addEventListener('click', () => triggerHeadlessDownload(false));
  btnDlBlank?.addEventListener('click', () => triggerHeadlessDownload(true));
  btnModalSendEmail?.addEventListener('click', handleModalSendEmail);
}

function closeDownloadModal() {
  if (downloadModal) downloadModal.style.display = 'none';
  document.body.style.overflow = '';
}

function openDownloadModal(item) {
  activeDownloadItem = item;
  if (dlModalTitle) {
    dlModalTitle.textContent = item && item.name ? `Descargar ${item.name}` : 'Descargar Planificador';
  }
  if (dlModalBadge) {
    const t = (item && item.type ? item.type : '').toLowerCase();
    if (t.includes('portada')) {
      dlModalBadge.innerHTML = '<span>🎨</span> Cubierta Exterior 300 DPI';
    } else if (t.includes('completo') || t.includes('libro')) {
      dlModalBadge.innerHTML = '<span>📐</span> Formato Libro 8.25" × 6" (210 × 152 mm)';
    } else {
      dlModalBadge.innerHTML = '<span>📐</span> Formato Libro 8.25" × 6" (210 × 152 mm)';
    }
  }
  if (modalEmailInput) {
    modalEmailInput.value = localStorage.getItem('mr_user_pdf_email') || (currentUser ? getUserEmail(currentUser) : '');
  }
  if (modalEmailFeedback) {
    modalEmailFeedback.style.display = 'none';
    modalEmailFeedback.textContent = '';
  }
  if (downloadModal) {
    downloadModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function triggerHeadlessDownload(isBlank) {
  if (!activeDownloadItem) return;
  const rawUrl = activeDownloadItem.editUrl || '/generador-planificador-semanal.html';
  const sep = rawUrl.includes('?') ? '&' : '?';
  const downloadUrl = `${rawUrl}${sep}load=${encodeURIComponent(activeDownloadItem.id)}&autodownload=1${isBlank ? '&blank=1' : ''}`;
  showToast('Preparando y descargando PDF...');
  window.open(downloadUrl, '_blank');
  closeDownloadModal();
}

async function handleModalSendEmail() {
  const email = modalEmailInput ? modalEmailInput.value.trim() : '';
  if (!email || !email.includes('@')) {
    if (modalEmailFeedback) {
      modalEmailFeedback.textContent = 'Por favor, introduce un correo electrónico válido.';
      modalEmailFeedback.style.display = 'block';
      modalEmailFeedback.style.color = '#b91c1c';
    }
    return;
  }
  try {
    localStorage.setItem('mr_user_pdf_email', email);
  } catch (e) {}

  if (btnModalSendEmail) {
    btnModalSendEmail.disabled = true;
    btnModalSendEmail.innerHTML = '<span>⏳</span> Enviando...';
  }

  try {
    const isBlank = modalEmailIsBlank ? modalEmailIsBlank.checked : false;
    if (activeDownloadItem) {
      const rawUrl = activeDownloadItem.editUrl || '/generador-planificador-semanal.html';
      const sep = rawUrl.includes('?') ? '&' : '?';
      const sendUrl = `${rawUrl}${sep}load=${encodeURIComponent(activeDownloadItem.id)}&email=${encodeURIComponent(email)}${isBlank ? '&blank=1' : ''}`;
      if (headlessPdfFrame) headlessPdfFrame.src = sendUrl;
    }
    if (modalEmailFeedback) {
      modalEmailFeedback.textContent = `✓ PDF enviado a ${email}. Revisa tu bandeja de entrada o spam.`;
      modalEmailFeedback.style.display = 'block';
      modalEmailFeedback.style.color = '#15803d';
    }
    showToast(`✓ Enviando PDF a ${email}`);
  } catch (err) {
    if (modalEmailFeedback) {
      modalEmailFeedback.textContent = 'Error al enviar por email. Inténtalo de nuevo.';
      modalEmailFeedback.style.display = 'block';
      modalEmailFeedback.style.color = '#b91c1c';
    }
  } finally {
    if (btnModalSendEmail) {
      btnModalSendEmail.disabled = false;
      btnModalSendEmail.innerHTML = '<span>Enviar a mi email</span>';
    }
  }
}

function setupPostMessageListener() {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'mr-pdf-generated') {
      showToast('✓ PDF generado con éxito');
    }
  });
}

function unlockDevPanel() {
  const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (!isLocalhost && (!currentUser || !isDeveloper(currentUser))) {
    showToast('Acceso denegado: solo disponible para jesgilcan@gmail.com');
    if (devPinError) {
      devPinError.textContent = 'Acceso denegado. Exclusivo para jesgilcan@gmail.com';
      devPinError.style.display = 'block';
    }
    return;
  }

  const pin = devPinInput.value.trim();
  if (pin === DEVELOPER_PIN) {
    try { sessionStorage.setItem('mr_dev_pin_verified', 'true'); } catch (e) {}
    devLockedView.style.display = 'none';
    devUnlockedContent.style.display = 'block';
    devPinError.style.display = 'none';

    if (tabBtnDev) tabBtnDev.style.setProperty('display', 'inline-flex', 'important');
    if (tabBtnFuturas) tabBtnFuturas.style.setProperty('display', 'inline-flex', 'important');
    if (userRoleBadge) {
      userRoleBadge.textContent = 'DESARROLLADOR';
      userRoleBadge.className = 'role-badge dev';
      userRoleBadge.style.setProperty('display', 'inline-block', 'important');
    }
    showToast('⚡ Panel de desarrollador desbloqueado');
  } else {
    devPinError.style.display = 'block';
    devPinInput.value = '';
    devPinInput.focus();
  }
}

function renderAuthenticatedView(user) {
  const cacheStyle = document.getElementById('cache-style');
  if (cacheStyle) cacheStyle.remove();
  if (unauthContainer) unauthContainer.style.display = 'none';
  if (authContainer) authContainer.style.display = 'block';

  const email = getUserEmail(user);
  const name = getUserDisplayName(user);

  // Avatar
  if (user.photoURL) {
    userAvatarDisplay.innerHTML = `<img src="${user.photoURL}" alt="${escapeHtml(name)}" />`;
  } else {
    const initial = (name || email || 'U').charAt(0).toUpperCase();
    userAvatarDisplay.textContent = initial;
  }

  // Nombre y correo
  const titleText = userNameDisplay ? userNameDisplay.querySelector('.user-name-text') : null;
  if (titleText) {
    titleText.textContent = name;
  } else if (userNameDisplay && userNameDisplay.firstChild) {
    userNameDisplay.firstChild.textContent = name + ' ';
  }
  if (userEmailDisplay) {
    userEmailDisplay.textContent = email || '';
  }

  // Comprobar rol de desarrollador ESTRICTO (jesgilcan@gmail.com)
  const isDev = isDeveloper(user);
  const tabDevPane = document.getElementById('tab-dev');
  const tabFuturasPane = document.getElementById('tab-futuras');

  if (isDev) {
    verifyAndEnforceThreeDevices(user).then((deviceResult) => {
      if (!deviceResult.allowed) {
        // Si ya hay 3 dispositivos autorizados y este es un 4º aparato desconocido: ocultar panel de desarrollador
        if (userRoleBadge) userRoleBadge.style.setProperty('display', 'none', 'important');
        if (tabBtnDev) tabBtnDev.style.setProperty('display', 'none', 'important');
        if (tabDevPane) tabDevPane.style.setProperty('display', 'none', 'important');
        if (tabBtnFuturas) tabBtnFuturas.style.setProperty('display', 'none', 'important');
        if (tabFuturasPane) tabFuturasPane.style.setProperty('display', 'none', 'important');
        return;
      }

      try { sessionStorage.setItem('mr_dev_pin_verified', 'true'); } catch (e) {}
      if (userRoleBadge) {
        userRoleBadge.textContent = `DESARROLLADOR (${deviceResult.slotNumber || 1}/${MAX_AUTHORIZED_DEVICES})`;
        userRoleBadge.className = 'role-badge dev';
        userRoleBadge.style.setProperty('display', 'inline-block', 'important');
      }
      if (tabBtnDev) {
        tabBtnDev.style.removeProperty('display');
        tabBtnDev.style.setProperty('display', 'inline-flex', 'important');
      }
      if (tabDevPane) {
        tabDevPane.style.removeProperty('display');
      }
      if (tabBtnFuturas) {
        tabBtnFuturas.style.removeProperty('display');
        tabBtnFuturas.style.setProperty('display', 'inline-flex', 'important');
      }
      const tabBtnPedidos = document.getElementById('tab-btn-pedidos');
      if (tabBtnPedidos) {
        tabBtnPedidos.style.removeProperty('display');
        tabBtnPedidos.style.setProperty('display', 'inline-flex', 'important');
      }
      if (devLockedView) devLockedView.style.display = 'none';
      if (devUnlockedContent) devUnlockedContent.style.display = 'block';

      renderAuthorizedDevicesUI(user, deviceResult.devices || [], deviceResult.currentToken);
      initClientOrdersAndBasketModule(user);
    });
  } else {
    // USUARIO CLIENTE (CUALQUIER CORREO DISTINTO DE jesgilcan@gmail.com):
    // Se oculta tajantemente con display: none !important sin romper el DOM con .remove()
    if (userRoleBadge) userRoleBadge.style.setProperty('display', 'none', 'important');
    if (tabBtnDev) tabBtnDev.style.setProperty('display', 'none', 'important');
    if (tabDevPane) tabDevPane.style.setProperty('display', 'none', 'important');
    if (tabBtnFuturas) tabBtnFuturas.style.setProperty('display', 'none', 'important');
    if (tabFuturasPane) tabFuturasPane.style.setProperty('display', 'none', 'important');
    const tabBtnPedidos = document.getElementById('tab-btn-pedidos');
    if (tabBtnPedidos) tabBtnPedidos.style.setProperty('display', 'none', 'important');

    // Si por alguna razón estaba en la pestaña de dev, forzar a disenos
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn && (activeBtn.id === 'tab-btn-dev' || activeBtn.id === 'tab-btn-futuras')) {
      activateTab('tab-disenos');
    }
  }

  // Guardar datos básicos en caché local (NUNCA guardar flags de desarrollador)
  try {
    localStorage.setItem('mr_cached_user', JSON.stringify({
      displayName: name,
      email: email,
      photoURL: user.photoURL || ''
    }));
  } catch (e) {}
}

function renderUnauthenticatedView() {
  const cacheStyle = document.getElementById('cache-style');
  if (cacheStyle) cacheStyle.remove();
  if (allDesigns.length > 0) {
    renderGuestLocalView();
  } else {
    if (unauthContainer) unauthContainer.style.display = 'block';
    if (authContainer) authContainer.style.display = 'none';
  }
}

function renderGuestLocalView() {
  const cacheStyle = document.getElementById('cache-style');
  if (cacheStyle) cacheStyle.remove();
  if (unauthContainer) unauthContainer.style.display = 'none';
  if (authContainer) authContainer.style.display = 'block';

  if (userNameDisplay) {
    const titleText = userNameDisplay.querySelector('.user-name-text');
    if (titleText) titleText.textContent = 'Mi Espacio (Local)';
    else if (userNameDisplay.firstChild) userNameDisplay.firstChild.textContent = 'Mi Espacio (Local) ';
  }
  if (userEmailDisplay) {
    userEmailDisplay.textContent = 'Diseños guardados en este navegador';
  }
  if (userRoleBadge) userRoleBadge.style.setProperty('display', 'none', 'important');
  if (tabBtnDev) tabBtnDev.style.setProperty('display', 'none', 'important');
  if (tabBtnFuturas) tabBtnFuturas.style.setProperty('display', 'none', 'important');

  activateTab('tab-disenos');
  updateDesignCounts();
  renderDesignsGrid();
}

async function loadUserData(user) {
  try {
    let email = getUserEmail(user);
    let displayName = getUserDisplayName(user);

    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (!email && data.email) {
          email = data.email;
        }
        if (data.displayName && (!user.displayName || user.displayName === 'Usuario')) {
          displayName = data.displayName;
        }
        
        // Preferencias
        if (data.preferences && typeof data.preferences.newsletter !== 'undefined' && prefNewsletter) {
          prefNewsletter.checked = !!data.preferences.newsletter;
        }

        // Datos de envío en Dev
        if (data.shipping) {
          populateShippingFields(data.shipping);
        }

        // Guardar en caché local para próximas cargas instantáneas
        try {
          localStorage.setItem('mr_user_extra_data', JSON.stringify({
            preferences: data.preferences || {},
            shipping: data.shipping || null
          }));
        } catch (e) {}
      }
    } catch (dbErr) {
      console.warn('Firestore loadUserData warning:', dbErr);
    }

    if (inputDisplayName) inputDisplayName.value = displayName;
    if (inputEmail) inputEmail.value = email;
    if (userEmailDisplay && email) userEmailDisplay.textContent = email;
    
    // Proveedor
    const isGoogle = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
    if (providerDisplay) providerDisplay.textContent = isGoogle ? 'Google' : 'Enlace seguro por correo';

    // Fecha de creación
    if (user.metadata && user.metadata.creationTime && createdDisplay) {
      createdDisplay.textContent = new Date(user.metadata.creationTime).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  } catch (err) {
    console.error('Error cargando datos de usuario:', err);
  }
}

function populateShippingFields(shipping) {
  if (!shipping) return;
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('envio-nombre', shipping.nombre);
  setVal('envio-telefono', shipping.telefono);
  setVal('envio-dni', shipping.dni);
  setVal('envio-direccion', shipping.direccion);
  setVal('envio-cp', shipping.cp);
  setVal('envio-ciudad', shipping.ciudad);
  setVal('envio-provincia', shipping.provincia);
  setVal('envio-pais', shipping.pais || 'España');
  setVal('envio-notas', shipping.notas);
}

async function loadUserDesigns(user) {
  const designsRef = collection(db, 'users', user.uid, 'designs');
  let firestoreList = [];

  try {
    const snapshot = await getDocs(designsRef);
    snapshot.forEach(docSnap => {
      firestoreList.push({ id: docSnap.id, ...docSnap.data() });
    });
  } catch (err) {
    console.warn('Error al consultar diseños en Firestore:', err);
  }

  // Leer diseños guardados localmente en este navegador para que nunca se pierda nada
  let localList = [];
  try {
    const rawLocal = localStorage.getItem('mr_local_designs');
    if (rawLocal) localList = JSON.parse(rawLocal);
  } catch (e) {}
  try {
    const rawCached = localStorage.getItem('mr_cached_designs');
    if (rawCached) {
      const cachedList = JSON.parse(rawCached);
      cachedList.forEach(c => {
        if (!localList.some(l => l.id === c.id || (l.name === c.name && l.type === c.type))) {
          localList.push(c);
        }
      });
    }
  } catch (e) {}

  // Sincronizar hacia Firestore cualquier diseño local que no esté aún en la nube
  for (const item of localList) {
    if (item && item.id && !firestoreList.some(f => f.id === item.id)) {
      try {
        const docRef = doc(db, 'users', user.uid, 'designs', item.id);
        await setDoc(docRef, {
          name: item.name || 'Mi Planificador',
          type: item.type || 'Planificador',
          summary: item.summary || '',
          editUrl: item.editUrl || '',
          data: item.data || {},
          updatedAt: serverTimestamp()
        }, { merge: true });
        firestoreList.push(item);
      } catch (syncErr) {
        console.warn('Aviso sincronizando diseño local a Firestore:', syncErr);
      }
    }
  }

  // Combinar Firestore y Local sin duplicados
  const mergedMap = new Map();
  localList.forEach(item => {
    if (item && item.id) mergedMap.set(item.id, item);
    else if (item && item.name) mergedMap.set(item.name + '_' + item.type, item);
  });
  firestoreList.forEach(item => {
    if (item && item.id) mergedMap.set(item.id, item);
  });

  allDesigns = Array.from(mergedMap.values());

  // Ordenar por fecha descendente
  allDesigns.sort((a, b) => {
    const tA = getTimestampValue(a.updatedAt || a.createdAt);
    const tB = getTimestampValue(b.updatedAt || b.createdAt);
    return tB - tA;
  });

  try {
    localStorage.setItem('mr_cached_designs', JSON.stringify(allDesigns));
    localStorage.setItem('mr_local_designs', JSON.stringify(allDesigns));
  } catch (e) {}

  updateDesignCounts();
  renderDesignsGrid();
}

function updateDesignCounts() {
  const total = allDesigns.length;
  const completo = allDesigns.filter(d => {
    const t = (d.type || '').toLowerCase();
    return (t.includes('completo') || t.includes('libro')) && !t.includes('portada');
  }).length;
  const portada = allDesigns.filter(d => (d.type || '').toLowerCase().includes('portada')).length;
  const semanal = allDesigns.filter(d => (d.type || '').toLowerCase().includes('semanal')).length;
  const diario = allDesigns.filter(d => (d.type || '').toLowerCase().includes('diario')).length;
  const mensual = allDesigns.filter(d => (d.type || '').toLowerCase().includes('mensual')).length;
  const habitos = allDesigns.filter(d => (d.type || '').toLowerCase().includes('habito')).length;
  const horario = allDesigns.filter(d => (d.type || '').toLowerCase().includes('horario')).length;
  const anual = allDesigns.filter(d => (d.type || '').toLowerCase().includes('anual')).length;

  if (countAll) countAll.textContent = total;
  if (countCompleto) countCompleto.textContent = completo;
  if (countPortada) countPortada.textContent = portada;
  if (countSemanal) countSemanal.textContent = semanal;
  if (countDiario) countDiario.textContent = diario;
  if (countMensual) countMensual.textContent = mensual;
  if (countHabitos) countHabitos.textContent = habitos;
  if (countHorario) countHorario.textContent = horario;
  if (countAnual) countAnual.textContent = anual;
}

function renderDesignsGrid() {
  if (allDesigns.length === 0) {
    emptyDesignsView.style.display = 'block';
    designsGrid.style.display = 'none';
    return;
  }

  // Filtrar según píldora activa
  let filtered = allDesigns;
  if (currentFilter === 'Completo') {
    filtered = allDesigns.filter(d => {
      const t = (d.type || '').toLowerCase();
      return (t.includes('completo') || t.includes('libro')) && !t.includes('portada');
    });
  } else if (currentFilter === 'Portada') {
    filtered = allDesigns.filter(d => (d.type || '').toLowerCase().includes('portada'));
  } else if (currentFilter === 'Semanal') {
    filtered = allDesigns.filter(d => (d.type || '').toLowerCase().includes('semanal'));
  } else if (currentFilter === 'Diario') {
    filtered = allDesigns.filter(d => (d.type || '').toLowerCase().includes('diario'));
  } else if (currentFilter === 'Mensual') {
    filtered = allDesigns.filter(d => (d.type || '').toLowerCase().includes('mensual'));
  } else if (currentFilter === 'Habitos') {
    filtered = allDesigns.filter(d => (d.type || '').toLowerCase().includes('habito'));
  } else if (currentFilter === 'Horario') {
    filtered = allDesigns.filter(d => (d.type || '').toLowerCase().includes('horario'));
  } else if (currentFilter === 'Anual') {
    filtered = allDesigns.filter(d => (d.type || '').toLowerCase().includes('anual'));
  }

  if (filtered.length === 0) {
    designsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: white; border-radius: 12px; color: #666;">
        <span style="font-size: 1.8rem; display: block; margin-bottom: 8px;">🔍</span>
        <p>No tienes plantillas guardadas en la categoría <strong>${escapeHtml(currentFilter)}</strong>.</p>
      </div>
    `;
    emptyDesignsView.style.display = 'none';
    designsGrid.style.display = 'grid';
    return;
  }

  emptyDesignsView.style.display = 'none';
  designsGrid.style.display = 'grid';
  designsGrid.innerHTML = '';

  if (!currentUser) {
    const banner = document.createElement('div');
    banner.style.cssText = 'grid-column: 1 / -1; background: #fbf8f3; border: 1px solid #e8decb; border-radius: 10px; padding: 14px 18px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.25rem;">💾</span>
        <span style="font-size: 0.88rem; color: #55483d;">
          <strong>Tus diseños están guardados en este navegador.</strong> Inicia sesión o crea tu cuenta gratuita para sincronizarlos en la nube y acceder en todos tus dispositivos.
        </span>
      </div>
      <button type="button" class="btn-primary" id="btn-login-local-sync" style="font-size: 0.82rem; padding: 6px 14px; cursor: pointer;">Acceder / Sincronizar</button>
    `;
    const btnSync = banner.querySelector('#btn-login-local-sync');
    btnSync?.addEventListener('click', openAuthModal);
    designsGrid.appendChild(banner);
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'design-card';
    
    // Determinar URL de edición
    let rawTargetUrl = item.editUrl;
    const typeLow = (item.type || '').toLowerCase();
    if (!rawTargetUrl) {
      if (typeLow.includes('portada')) rawTargetUrl = '/generador-portadas.html';
      else if (typeLow.includes('libro') || typeLow.includes('completo') || typeLow.includes('cuaderno')) rawTargetUrl = '/generador-libro-completo.html';
      else if (typeLow.includes('diario')) rawTargetUrl = '/generador-planificador-diario.html';
      else if (typeLow.includes('mensual')) rawTargetUrl = '/generador-planificador-mensual.html';
      else if (typeLow.includes('habito')) rawTargetUrl = '/generador-planificador-habitos.html';
      else if (typeLow.includes('horario')) rawTargetUrl = '/generador-planificador-horario.html';
      else if (typeLow.includes('anual')) rawTargetUrl = '/generador-planificador-anual.html';
      else rawTargetUrl = '/generador-planificador-semanal.html';
    }

    const loadUrl = rawTargetUrl.includes('?') 
      ? `${rawTargetUrl}&load=${item.id}` 
      : `${rawTargetUrl}?load=${item.id}`;

    const downloadUrl = `${loadUrl}&autodownload=1`;

    let badgeClass = 'semanal';
    let typeLabel = 'Planificador Semanal';
    if (typeLow.includes('portada')) { badgeClass = 'portada'; typeLabel = 'Portada de Cuaderno'; }
    else if (typeLow.includes('libro') || typeLow.includes('completo') || typeLow.includes('cuaderno')) { badgeClass = 'completo'; typeLabel = 'Cuaderno Completo'; }
    else if (typeLow.includes('diario')) { badgeClass = 'diario'; typeLabel = 'Planificador Diario'; }
    else if (typeLow.includes('mensual')) { badgeClass = 'mensual'; typeLabel = 'Planificador Mensual'; }
    else if (typeLow.includes('habito')) { badgeClass = 'habitos'; typeLabel = 'Planificador de Hábitos'; }
    else if (typeLow.includes('horario')) { badgeClass = 'horario'; typeLabel = 'Planificador Horario'; }
    else if (typeLow.includes('anual')) { badgeClass = 'anual'; typeLabel = 'Planificador Anual'; }

    const fechaStr = item.updatedAt 
      ? formatDate(item.updatedAt) 
      : (item.createdAt ? formatDate(item.createdAt) : 'Reciente');

    card.innerHTML = `
      <div class="design-card-header">
        <div class="design-title-row">
          <h3 id="title-display-${item.id}">${escapeHtml(item.name || 'Mi Planificador')}</h3>
          <button type="button" class="btn-rename-title" title="Renombrar plantilla" data-id="${item.id}" data-name="${escapeHtml(item.name || '')}">✏️</button>
        </div>
        <div class="design-card-meta">
          <span class="badge-design-type ${badgeClass}">${typeLabel}</span>
          <span>Actualizado: ${fechaStr}</span>
        </div>
      </div>
      <div class="design-card-body">
        ${escapeHtml(item.summary || 'Configuración personalizada guardada en Mi Espacio.')}
      </div>
      <div class="design-card-actions">
        <a href="${loadUrl}" class="btn-card-action btn-action-open" title="Abrir y editar en el generador">✏️ Abrir</a>
        <button type="button" class="btn-card-action btn-action-download" data-id="${item.id}" title="Descargar PDF directamente">📥 Descargar PDF</button>
        <button type="button" class="btn-card-action btn-action-duplicate" data-id="${item.id}" title="Crear una copia exacta">📋 Duplicar</button>
        <button type="button" class="btn-card-action btn-action-delete" data-id="${item.id}" title="Eliminar diseño">🗑️ Eliminar</button>
      </div>
    `;

    // 0. Descargar PDF con Modal en la misma página
    const dlCardBtn = card.querySelector('.btn-action-download');
    dlCardBtn?.addEventListener('click', () => {
      openDownloadModal(item);
    });

    // 1. Renombrar plantilla
    const renameBtn = card.querySelector('.btn-rename-title');
    renameBtn?.addEventListener('click', async () => {
      const currentTitle = item.name || 'Mi Planificador';
      const newTitle = prompt('Introduce el nuevo nombre para esta plantilla:', currentTitle);
      if (newTitle && newTitle.trim() && newTitle.trim() !== currentTitle) {
        const finalTitle = newTitle.trim();
        item.name = finalTitle;
        const titleEl = document.getElementById(`title-display-${item.id}`);
        if (titleEl) titleEl.textContent = finalTitle;

        // Actualizar copia local en localStorage
        try {
          let localDesigns = JSON.parse(localStorage.getItem('mr_local_designs') || '[]');
          const idx = localDesigns.findIndex(d => d.id === item.id);
          if (idx >= 0) {
            localDesigns[idx].name = finalTitle;
            localDesigns[idx].updatedAt = { seconds: Math.floor(Date.now() / 1000) };
            localStorage.setItem('mr_local_designs', JSON.stringify(localDesigns));
            localStorage.setItem('mr_cached_designs', JSON.stringify(localDesigns));
          }
        } catch (e) {}

        if (currentUser) {
          try {
            const docRef = doc(db, 'users', currentUser.uid, 'designs', item.id);
            await updateDoc(docRef, { name: finalTitle, updatedAt: serverTimestamp() });
          } catch (err) {
            console.warn('Aviso al renombrar en Firestore:', err);
          }
        }
        showToast('✓ Plantilla renombrada');
      }
    });

    // 2. Duplicar plantilla
    const duplicateBtn = card.querySelector('.btn-action-duplicate');
    duplicateBtn?.addEventListener('click', async () => {
      duplicateBtn.disabled = true;
      duplicateBtn.textContent = 'Copiando...';
      const copyName = `Copia de ${item.name || 'Planificador'}`;
      const newId = 'des_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const nowSecs = Math.floor(Date.now() / 1000);

      const newItem = {
        id: newId,
        name: copyName,
        type: item.type || 'Planificador',
        summary: item.summary || '',
        editUrl: item.editUrl || rawTargetUrl,
        data: item.data || {},
        createdAt: { seconds: nowSecs },
        updatedAt: { seconds: nowSecs }
      };

      try {
        let localDesigns = JSON.parse(localStorage.getItem('mr_local_designs') || '[]');
        localDesigns.unshift(newItem);
        localStorage.setItem('mr_local_designs', JSON.stringify(localDesigns));
        localStorage.setItem('mr_cached_designs', JSON.stringify(localDesigns));
      } catch (e) {}

      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'designs', newId);
          await setDoc(docRef, {
            name: copyName,
            type: item.type || 'Planificador',
            summary: item.summary || '',
            editUrl: item.editUrl || rawTargetUrl,
            data: item.data || {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          await loadUserDesigns(currentUser);
        } catch (err) {
          console.warn('Aviso al duplicar en Firestore:', err);
          allDesigns.unshift(newItem);
          updateDesignCounts();
          renderDesignsGrid();
        }
      } else {
        allDesigns.unshift(newItem);
        updateDesignCounts();
        renderDesignsGrid();
      }
      showToast(`✓ Duplicado como "${copyName}"`);
    });

    // 3. Eliminar plantilla
    const deleteBtn = card.querySelector('.btn-action-delete');
    deleteBtn?.addEventListener('click', async () => {
      if (!deleteBtn.dataset.confirming) {
        deleteBtn.dataset.confirming = 'true';
        deleteBtn.textContent = '¿Confirmar?';
        deleteBtn.style.background = '#b91c1c';
        deleteBtn.style.color = '#ffffff';
        setTimeout(() => {
          if (deleteBtn.isConnected) {
            deleteBtn.removeAttribute('data-confirming');
            deleteBtn.textContent = '🗑️ Eliminar';
            deleteBtn.style.background = '#fdf2f2';
            deleteBtn.style.color = '#b91c1c';
          }
        }, 3500);
      } else {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Borrando...';

        try {
          let localDesigns = JSON.parse(localStorage.getItem('mr_local_designs') || '[]');
          localDesigns = localDesigns.filter(d => d.id !== item.id);
          localStorage.setItem('mr_local_designs', JSON.stringify(localDesigns));
          localStorage.setItem('mr_cached_designs', JSON.stringify(localDesigns));
        } catch (e) {}

        if (currentUser) {
          try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'designs', item.id));
            await loadUserDesigns(currentUser);
          } catch (err) {
            console.warn('Aviso al borrar diseño de Firestore:', err);
            allDesigns = allDesigns.filter(d => d.id !== item.id);
            updateDesignCounts();
            renderDesignsGrid();
          }
        } else {
          allDesigns = allDesigns.filter(d => d.id !== item.id);
          updateDesignCounts();
          renderDesignsGrid();
        }
        showToast('✓ Plantilla eliminada');
      }
    });

    designsGrid.appendChild(card);
  });
}

function getTimestampValue(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val < 1e11 ? val * 1000 : val;
  if (val.seconds) return val.seconds * 1000;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function formatDate(timestamp) {
  if (!timestamp) return 'Reciente';
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (typeof timestamp === 'number') {
      const t = timestamp < 1e11 ? timestamp * 1000 : timestamp;
      return new Date(t).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (typeof timestamp === 'string') {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
  } catch (e) {}
  return 'Reciente';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg) {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

function renderAuthorizedDevicesUI(user, devices, currentToken) {
  const container = document.getElementById('devAuthorizedDevicesContainer');
  const badge = document.getElementById('devDevicesCountBadge');
  if (!container) return;

  const list = Array.isArray(devices) ? devices : [];
  if (badge) {
    badge.textContent = `${list.length} / ${MAX_AUTHORIZED_DEVICES} Dispositivos Sellados`;
  }

  const slotHints = [
    { slot: 1, defaultIcon: '💻', defaultLabel: 'Hueco 1 · Tu PC' },
    { slot: 2, defaultIcon: '📱', defaultLabel: 'Hueco 2 · Tu Móvil' },
    { slot: 3, defaultIcon: '📟', defaultLabel: 'Hueco 3 · Tu Tablet' }
  ];

  container.innerHTML = slotHints.map((hint, idx) => {
    const dev = list[idx];
    if (dev) {
      const isThisDevice = dev.token === currentToken;
      return `
        <div style="background:#262e29; border:1px solid ${isThisDevice ? '#4ade80' : 'rgba(255,255,255,0.14)'}; border-radius:10px; padding:12px 14px; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
              <span style="font-size:0.72rem; font-weight:800; color:#86efac; text-transform:uppercase;">Dispositivo ${idx + 1}/${MAX_AUTHORIZED_DEVICES}</span>
              ${isThisDevice ? '<span style="background:#166534; color:#dcfce7; font-size:0.65rem; font-weight:800; padding:2px 7px; border-radius:10px;">✓ ESTE APARATO</span>' : ''}
            </div>
            <div style="font-size:0.92rem; font-weight:700; color:#ffffff; margin-top:4px;">${dev.icon || hint.defaultIcon} ${escapeHtml(dev.name || 'Dispositivo autorizado')}</div>
            <div style="font-size:0.73rem; color:#9ca3af; margin-top:2px;">Pantalla: ${escapeHtml(dev.screen || 'N/A')} · Activo: ${formatDate(dev.lastSeen || dev.registeredAt)}</div>
          </div>
          <button type="button" data-revoke-token="${escapeHtml(dev.token)}" style="align-self:flex-start; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.35); color:#fca5a5; border-radius:6px; padding:4px 10px; font-size:0.72rem; font-weight:700; cursor:pointer;">
            🗑️ Liberar este hueco
          </button>
        </div>
      `;
    } else {
      return `
        <div style="background:rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.2); border-radius:10px; padding:12px 14px; display:flex; flex-direction:column; justify-content:center; gap:4px;">
          <div style="font-size:0.72rem; font-weight:800; color:#9ca3af; text-transform:uppercase;">Dispositivo ${idx + 1}/${MAX_AUTHORIZED_DEVICES} · Libre</div>
          <div style="font-size:0.88rem; font-weight:700; color:#d1d5db;">${hint.defaultIcon} ${hint.defaultLabel}</div>
          <div style="font-size:0.73rem; color:#9ca3af;">Entra con tu Gmail desde ese dispositivo para sellarlo automáticamente en este hueco.</div>
        </div>
      `;
    }
  }).join('');

  container.querySelectorAll('[data-revoke-token]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tok = btn.getAttribute('data-revoke-token');
      if (!tok) return;
      if (!confirm('¿Liberar este hueco de dispositivo autorizado? Si quieres reemplazarlo por un móvil o tablet nuevo, entra desde él después de liberarlo.')) return;
      const updated = await revokeAuthorizedDevice(user, tok);
      renderAuthorizedDevicesUI(user, updated, currentToken);
      showToast('✓ Hueco de dispositivo liberado');
    });
  });
}

// =========================================================================
// MÓDULO DE PERFIL DE PEDIDOS, CESTA PENDIENTE DE PAGO Y ESPEJO DEV
// =========================================================================

let clientProfileOrders = [];
let clientPendingBasket = [];
let ordersModuleInitialized = false;

function calcDynamicPriceForProfile(bindingType = 'coil', pageCount = 143) {
  let base = 27.90;
  if (bindingType === 'perfect' || bindingType === 'softcover') base = 24.90;
  if (bindingType === 'hardcover') base = 32.90;
  const pages = parseInt(pageCount, 10) || 143;
  let extra = 0;
  if (pages > 300) extra = 5.00;
  else if (pages > 220) extra = 3.00;
  else if (pages > 150) extra = 2.00;
  return +(base + extra).toFixed(2);
}

async function initClientOrdersAndBasketModule(user) {
  if (!user || !isDeveloper(user)) return;

  await loadClientOrdersAndBasketData(user);

  if (!ordersModuleInitialized) {
    ordersModuleInitialized = true;

    document.getElementById('btn-dev-open-client-orders-tab')?.addEventListener('click', () => {
      activateTab('tab-pedidos');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btn-dev-seed-pending-book')?.addEventListener('click', () => {
      seedPendingBasketBook();
    });

    document.getElementById('btn-dev-seed-full-order')?.addEventListener('click', () => {
      seedFullProfileOrder(user);
    });
  }

  renderClientOrdersAndBasketViews(user);
}

async function loadClientOrdersAndBasketData(user) {
  // 1. Cargar Cesta / Libros Completos Pendientes de Pago
  let pending = [];
  try {
    const rawPending = localStorage.getItem('mr_pending_payment_books');
    if (rawPending) pending = JSON.parse(rawPending);
  } catch (e) {}

  try {
    const rawCartItem = localStorage.getItem('mr_cart_cover_item');
    if (rawCartItem) {
      const parsed = JSON.parse(rawCartItem);
      const exists = pending.some(p => p.title === parsed.title && p.bindingType === parsed.bindingType);
      if (!exists && parsed.title) {
        pending.unshift({
          id: 'pend_cart_' + (parsed.updatedAt || Date.now()),
          title: parsed.title,
          subtitle: parsed.syncedBookName || 'Libro Completo + Portada sincronizada',
          bindingType: parsed.bindingType || 'coil',
          pageCount: parsed.pageCount || 143,
          fileSizeMb: ((parsed.pageCount || 143) * 0.31).toFixed(1),
          savedAt: new Date(parsed.updatedAt || Date.now()).toISOString()
        });
      }
    }
  } catch (e) {}

  if (pending.length === 0) {
    pending = [
      {
        id: 'pend_demo_1',
        title: 'Planificador Anual 2026 · Edición Personalizada',
        subtitle: 'Interior completo (143 págs) + Portada Clásico Sobrio sincronizada',
        bindingType: 'coil',
        pageCount: 143,
        fileSizeMb: '44.3',
        savedAt: new Date().toISOString()
      }
    ];
    try { localStorage.setItem('mr_pending_payment_books', JSON.stringify(pending)); } catch (e) {}
  }
  clientPendingBasket = pending;

  // 2. Cargar Pedidos Impresos del Perfil (Firestore + Local)
  let loadedOrders = [];
  try {
    const snap = await getDocs(collection(db, 'orders'));
    snap.forEach(d => loadedOrders.push({ id: d.id, ...d.data() }));
  } catch (e) {}

  let localSim = [];
  try {
    const rawSim = localStorage.getItem('mr_simulated_orders');
    if (rawSim) localSim = JSON.parse(rawSim);
  } catch (e) {}

  const map = new Map();
  localSim.forEach(o => map.set(o.id || o.orderNumber, o));
  loadedOrders.forEach(o => map.set(o.id || o.orderNumber, o));

  clientProfileOrders = Array.from(map.values());

  if (clientProfileOrders.length === 0) {
    await seedFullProfileOrder(user, false);
  }

  clientProfileOrders.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
}

function saveClientOrdersAndBasketState(user) {
  try {
    localStorage.setItem('mr_pending_payment_books', JSON.stringify(clientPendingBasket));
    localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders));
  } catch (e) {}

  if (user && isDeveloper(user)) {
    clientProfileOrders.forEach(async (ord) => {
      try {
        await setDoc(doc(db, 'orders', ord.id || ord.orderNumber), ord, { merge: true });
      } catch (e) {}
    });
  }
}

function seedPendingBasketBook() {
  const presets = [
    { title: 'Planificador Semestral 180 Días', subtitle: 'Interior 238 págs + Portada Doble Contraste', bindingType: 'hardcover', pageCount: 238, fileSizeMb: '68.4' },
    { title: 'Planificador 90 Días · Enfoque Trimestral', subtitle: 'Interior 128 págs + Portada Orgánico & Botánico', bindingType: 'perfect', pageCount: 128, fileSizeMb: '38.2' },
    { title: 'Planificador Anual Intercalado', subtitle: 'Interior 136 págs + Portada con Anillas Wire-O', bindingType: 'coil', pageCount: 136, fileSizeMb: '41.5' }
  ];
  const pick = presets[Math.floor(Math.random() * presets.length)];
  clientPendingBasket.unshift({
    id: 'pend_' + Date.now(),
    title: pick.title,
    subtitle: pick.subtitle,
    bindingType: pick.bindingType,
    pageCount: pick.pageCount,
    fileSizeMb: pick.fileSizeMb,
    savedAt: new Date().toISOString()
  });
  saveClientOrdersAndBasketState(auth.currentUser);
  renderClientOrdersAndBasketViews(auth.currentUser);
  showToast('🛒 Libro completo «Pendiente de Pago» añadido a la cesta del perfil');
}

async function seedFullProfileOrder(user, notify = true) {
  const num = 'MR-2026-' + Math.floor(1000 + Math.random() * 9000);
  const price = 27.90;
  const newOrd = {
    id: 'ord_' + Date.now(),
    orderNumber: num,
    status: 'shipped',
    createdAt: new Date().toISOString(),
    customer: {
      name: getUserDisplayName(user) || 'Cliente Menos Ruido',
      email: getUserEmail(user) || 'jesgilcan@gmail.com',
      phone: '+34 600 000 000',
      address: 'Calle Serrano 42, 4º Derecha',
      postalCode: '28001',
      city: 'Madrid',
      province: 'Madrid',
      country: 'España',
      notes: 'Entregar en conserjería si no estoy en casa.'
    },
    shipping: {
      carrier: 'Correos Express',
      trackingNumber: 'CEX-' + Math.floor(10000000 + Math.random() * 90000000),
      trackingUrl: 'https://www.correosexpress.com',
      estimatedDelivery: 'Entrega prevista en 24/48h laborables',
      lastCarrierMessage: 'Correos Express: Paquete clasificado en plataforma logística de destino (Madrid). En reparto próximo día hábil.'
    },
    book: {
      title: 'Planificador Anual 2026',
      subtitle: '52 semanas, 12 meses y hábitos · Edición Personalizada',
      bindingType: 'coil',
      pageCount: 143,
      quantity: 1,
      size: '8.25x6',
      spineWidthMm: '8.2',
      fileSizeMb: '46.8'
    },
    pricing: {
      currency: 'EUR',
      totalPaid: price,
      luluCostEstimate: 17.14,
      netMargin: 10.09
    },
    timeline: [
      { date: new Date(Date.now() - 86400000 * 2).toISOString(), message: `Pedido #${num} confirmado (${price.toFixed(2)} € · Envío incluido). Archivos 300 DPI (46,8 MB) guardados en tu perfil en la nube.` },
      { date: new Date(Date.now() - 86400000 * 1.5).toISOString(), message: 'Revisión técnica de márgenes, sangrado (3.175 mm) y lomo superada al 100%. Enviado a imprenta.' },
      { date: new Date(Date.now() - 3600000 * 6).toISOString(), message: 'Correos Express: Expedición recogida en imprenta. Número de seguimiento asignado.' }
    ]
  };

  clientProfileOrders.unshift(newOrd);
  saveClientOrdersAndBasketState(user);
  if (notify) {
    renderClientOrdersAndBasketViews(user);
    showToast(`📦 Pedido completo #${num} creado en el perfil`);
  }
}

function getBindingLabelForProfile(type) {
  if (type === 'perfect' || type === 'softcover') return '📕 Tapa Blanda (Mate)';
  if (type === 'hardcover') return '📘 Tapa Dura (Casewrap)';
  return '🌀 Anillas Metálicas (Wire-O)';
}

function getStepIndexFromStatus(status) {
  if (status === 'pending_review') return 1;
  if (status === 'approved_printing' || status === 'printing') return 2;
  if (status === 'shipped') return 3;
  if (status === 'delivered') return 4;
  return 1;
}

function renderClientOrdersAndBasketViews(user) {
  const badgeEl = document.getElementById('client-orders-badge');
  if (badgeEl) {
    badgeEl.textContent = String(clientProfileOrders.length + clientPendingBasket.length);
  }

  // 1. RENDERIZAR BLOQUE A: CESTA / PENDIENTES DE PAGO EN EL PERFIL DEL CLIENTE
  const pendingContainer = document.getElementById('client-pending-basket-list');
  if (pendingContainer) {
    if (clientPendingBasket.length === 0) {
      pendingContainer.innerHTML = `
        <div style="padding: 18px; text-align: center; color: #786e63; font-size: 0.88rem; background: #ffffff; border-radius: 8px; border: 1px dashed #dcd4c6;">
          No tienes cuadernos pendientes de pago en tu cesta ahora mismo.
        </div>
      `;
    } else {
      pendingContainer.innerHTML = clientPendingBasket.map(item => {
        const price = calcDynamicPriceForProfile(item.bindingType, item.pageCount);
        const priceText = price.toFixed(2).replace('.', ',') + ' €';
        return `
          <div style="background: #ffffff; border: 1px solid #dfd6c7; border-radius: 10px; padding: 16px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
            <div style="flex: 1; min-width: 250px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                <span style="background: #fffbeb; color: #92400e; border: 1px solid #fde68a; font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 12px;">⏳ PENDIENTE DE PAGO</span>
                <span style="background: #eff6ff; color: #1e40af; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 12px;">☁️ Guardado en tu perfil (${escapeHtml(item.fileSizeMb || '42.0')} MB · 300 DPI)</span>
              </div>
              <h4 style="font-family: var(--font-display); font-size: 1.1rem; margin: 4px 0 2px 0; color: #1f1c19;">${escapeHtml(item.title)}</h4>
              <div style="font-size: 0.82rem; color: #665e54;">
                ${getBindingLabelForProfile(item.bindingType)} · <strong>${item.pageCount} páginas interiores</strong> · ${escapeHtml(item.subtitle || '')}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
              <div style="text-align: right;">
                <div style="font-size: 1.2rem; font-weight: 900; color: #1f1c19;">${priceText}</div>
                <div style="font-size: 0.7rem; font-weight: 700; color: #215c38;">🚚 Envío GRATIS incluido</div>
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" data-pay-pending="${escapeHtml(item.id)}" style="background: #22382c; color: #ffffff; border: none; border-radius: 8px; padding: 10px 16px; font-size: 0.84rem; font-weight: 700; cursor: pointer;">
                  💳 Pagar y Enviar a Imprenta
                </button>
                <a href="/generador-portadas.html" style="background: #f5f0e6; color: #4a3f35; border: 1px solid #d6cec0; border-radius: 8px; padding: 10px 12px; font-size: 0.8rem; font-weight: 700; text-decoration: none;">
                  ✏️ Editar
                </a>
                <button type="button" data-del-pending="${escapeHtml(item.id)}" style="background: transparent; color: #991b1b; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 11px; font-size: 0.8rem; cursor: pointer;" title="Quitar de la cesta">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      pendingContainer.querySelectorAll('[data-pay-pending]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-pay-pending');
          const found = clientPendingBasket.find(x => x.id === id);
          if (found && typeof window.openDevCartDrawer === 'function') {
            window.openDevCartDrawer({
              title: found.title,
              bindingType: found.bindingType,
              pageCount: found.pageCount,
              syncedBookName: found.subtitle
            });
          }
        });
      });

      pendingContainer.querySelectorAll('[data-del-pending]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-del-pending');
          clientPendingBasket = clientPendingBasket.filter(x => x.id !== id);
          saveClientOrdersAndBasketState(user);
          renderClientOrdersAndBasketViews(user);
          showToast('🗑️ Ejemplar retirado de pendientes de pago');
        });
      });
    }
  }

  // 2. RENDERIZAR BLOQUE B: HISTORIAL Y SEGUIMIENTO DE PEDIDOS EN EL PERFIL DEL CLIENTE
  const ordersContainer = document.getElementById('client-orders-history-list');
  if (ordersContainer) {
    ordersContainer.innerHTML = clientProfileOrders.map(ord => {
      const step = getStepIndexFromStatus(ord.status);
      const totalPaid = parseFloat(ord.pricing?.totalPaid || 27.90).toFixed(2).replace('.', ',');
      const carrier = ord.shipping?.carrier || 'Correos Express';
      const trackingNum = ord.shipping?.trackingNumber || 'Pendiente de asignación en fábrica';
      const carrierMsg = ord.shipping?.lastCarrierMessage || 'Tu ejemplar está siendo procesado antes de entregarse a la empresa repartidora.';
      const fileSizeMb = ord.book?.fileSizeMb || ((ord.book?.pageCount || 143) * 0.32).toFixed(1);

      const stepsHtml = [
        { n: 1, label: '1. Revisión Técnica', sub: 'Preflight 300 DPI' },
        { n: 2, label: '2. En Imprenta', sub: 'Fabricación y Lomo' },
        { n: 3, label: '3. En Reparto', sub: carrier },
        { n: 4, label: '4. Entregado', sub: 'En tu domicilio' }
      ].map(s => {
        const done = step >= s.n;
        const current = step === s.n;
        return `
          <div style="flex: 1; min-width: 120px; background: ${done ? '#eaf5ee' : '#f5f2ec'}; border: 1.5px solid ${current ? '#215c38' : (done ? '#a7d7b8' : '#e2dcd0')}; border-radius: 8px; padding: 9px 10px; text-align: center;">
            <div style="font-size: 0.78rem; font-weight: 800; color: ${done ? '#166534' : '#786e63'};">${done ? '✓ ' : ''}${s.label}</div>
            <div style="font-size: 0.68rem; color: #665e54; margin-top: 2px;">${s.sub}</div>
          </div>
        `;
      }).join('');

      const timelineHtml = (ord.timeline || []).slice().reverse().map(ev => `
        <div style="display: flex; gap: 10px; font-size: 0.8rem; color: #38322c; padding: 6px 0; border-bottom: 1px dashed #ebe5da;">
          <span style="color: #87553b; font-weight: 700; white-space: nowrap;">${formatDate(ev.date)}</span>
          <span>${escapeHtml(ev.message)}</span>
        </div>
      `).join('');

      return `
        <div style="background: #ffffff; border: 1.5px solid #e0d8c8; border-radius: 12px; padding: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
          <!-- Cabecera del Pedido -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid #eee7dc; padding-bottom: 14px; margin-bottom: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-family: monospace; font-size: 0.92rem; font-weight: 800; background: #1f1c19; color: #ffffff; padding: 3px 9px; border-radius: 6px;">#${escapeHtml(ord.orderNumber)}</span>
                <span style="font-size: 0.78rem; color: #665e54;">Realizado el ${formatDate(ord.createdAt)}</span>
              </div>
              <h4 style="font-family: var(--font-display); font-size: 1.2rem; margin: 8px 0 2px 0; color: #1f1c19;">${escapeHtml(ord.book?.title || 'Cuaderno Personalizado')}</h4>
              <div style="font-size: 0.83rem; color: #5a5147;">
                ${getBindingLabelForProfile(ord.book?.bindingType)} · ${ord.book?.pageCount || 143} páginas interiores · Formato 210 × 152 mm
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.25rem; font-weight: 900; color: #1f1c19;">${totalPaid} €</div>
              <div style="font-size: 0.72rem; font-weight: 700; color: #215c38;">✓ Pagado (Envío incluido)</div>
            </div>
          </div>

          <!-- Barra de 4 Estados en Vivo -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
            ${stepsHtml}
          </div>

          <!-- Bloque de Comunicación con la Empresa Repartidora y Dirección -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
              <div style="font-size: 0.8rem; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.4px;">
                🚚 Comunicación con Empresa Repartidora (${escapeHtml(carrier)})
              </div>
              <span style="font-family: monospace; font-size: 0.78rem; font-weight: 700; background: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 5px;">
                Tracking: ${escapeHtml(trackingNum)}
              </span>
            </div>
            <div style="font-size: 0.84rem; color: #0f172a; background: #ffffff; border-left: 3px solid #2563eb; padding: 8px 12px; border-radius: 4px; margin-bottom: 10px;">
              <strong>Último aviso del transportista:</strong> ${escapeHtml(carrierMsg)}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 0.8rem; color: #475569;">
              <div>
                <strong>Dirección de entrega:</strong> ${escapeHtml(ord.customer?.address || '')}, ${escapeHtml(ord.customer?.postalCode || '')} ${escapeHtml(ord.customer?.city || '')}<br>
                <strong>Instrucciones para el repartidor:</strong> <span id="note-text-${escapeHtml(ord.id)}">${escapeHtml(ord.customer?.notes || 'Sin instrucciones adicionales')}</span>
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" data-edit-carrier-note="${escapeHtml(ord.id)}" style="background: #ffffff; border: 1px solid #94a3b8; color: #1e293b; border-radius: 6px; padding: 6px 11px; font-size: 0.76rem; font-weight: 700; cursor: pointer;">
                  ✏️ Dejar aviso al repartidor
                </button>
                ${ord.status === 'shipped' || ord.status === 'delivered' ? `
                  <a href="${escapeHtml(ord.shipping?.trackingUrl || 'https://www.correosexpress.com')}" target="_blank" rel="noopener noreferrer" style="background: #1e293b; color: #ffffff; border-radius: 6px; padding: 6px 12px; font-size: 0.76rem; font-weight: 700; text-decoration: none;">
                    📍 Seguir envío en web del transportista ↗
                  </a>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Bloque de Archivos Pesados Guardados en el Perfil del Cliente (Nube 300 DPI) -->
          <div style="background: #fdfaf5; border: 1px solid #e4dac9; border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 0.78rem; font-weight: 800; color: #87553b;">
                ☁️ Archivos de tu Cuaderno Alojados en tu Perfil (${escapeHtml(fileSizeMb)} MB · 300 DPI)
              </div>
              <div style="font-size: 0.75rem; color: #665e54;">
                Como el documento de imprenta pesa demasiado para adjuntarse por email, lo tienes disponible siempre aquí para verlo o descargarlo.
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <a href="/generador-libro-completo.html" style="background: #87553b; color: #ffffff; border-radius: 6px; padding: 7px 12px; font-size: 0.76rem; font-weight: 700; text-decoration: none;">
                📖 Ver / Descargar Interior (Nube)
              </a>
              <a href="/generador-portadas.html" style="background: #22382c; color: #ffffff; border-radius: 6px; padding: 7px 12px; font-size: 0.76rem; font-weight: 700; text-decoration: none;">
                🎨 Ver / Descargar Portada (Nube)
              </a>
            </div>
          </div>

          <!-- Historial de Cambios de Estado y Comunicaciones -->
          <details style="font-size: 0.8rem;">
            <summary style="cursor: pointer; font-weight: 700; color: #5a5147;">📋 Ver historial de cambios de estado y notificaciones (${(ord.timeline || []).length})</summary>
            <div style="margin-top: 8px; padding-left: 6px;">
              ${timelineHtml}
            </div>
          </details>
        </div>
      `;
    }).join('');

    ordersContainer.querySelectorAll('[data-edit-carrier-note]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-carrier-note');
        const ord = clientProfileOrders.find(o => o.id === id);
        if (!ord) return;
        const nextNote = prompt('Indica la instrucción para el repartidor (ej. horario, dejar en conserjería, teléfono de contacto):', ord.customer?.notes || '');
        if (nextNote === null) return;
        if (!ord.customer) ord.customer = {};
        ord.customer.notes = nextNote.trim();
        if (!ord.timeline) ord.timeline = [];
        ord.timeline.push({
          date: new Date().toISOString(),
          message: `Aviso del cliente para la empresa repartidora actualizado: «${ord.customer.notes}»`
        });
        saveClientOrdersAndBasketState(user);
        renderClientOrdersAndBasketViews(user);
        showToast('✓ Instrucción para la empresa repartidora guardada en el pedido');
      });
    });
  }

  // 3. RENDERIZAR ESPEJO DE CONTROL EN EL PANEL DE DESARROLLADOR (#dev-client-profile-mirror)
  const devMirror = document.getElementById('dev-client-profile-mirror');
  if (devMirror) {
    devMirror.innerHTML = clientProfileOrders.slice(0, 4).map(ord => {
      return `
        <div style="background: #2c2824; border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <span style="font-family: monospace; font-weight: 800; color: #fde68a;">#${escapeHtml(ord.orderNumber)}</span>
              <strong style="color: #ffffff; margin-left: 8px;">${escapeHtml(ord.book?.title || 'Cuaderno')}</strong>
              <span style="color: #9ca3af; font-size: 0.78rem; margin-left: 6px;">(${ord.book?.pageCount || 143} págs · Estado actual: <strong style="color:#4ade80;">${escapeHtml(ord.status)}</strong>)</span>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button type="button" data-dev-set-status="${escapeHtml(ord.id)}" data-target-status="pending_review" style="background:#3f3b37; color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:5px; padding:4px 8px; font-size:0.72rem; cursor:pointer;">1. Revisión</button>
              <button type="button" data-dev-set-status="${escapeHtml(ord.id)}" data-target-status="printing" style="background:#3f3b37; color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:5px; padding:4px 8px; font-size:0.72rem; cursor:pointer;">2. En Imprenta</button>
              <button type="button" data-dev-set-status="${escapeHtml(ord.id)}" data-target-status="shipped" style="background:#1e3a8a; color:#fff; border:1px solid #60a5fa; border-radius:5px; padding:4px 8px; font-size:0.72rem; cursor:pointer;">3. En Reparto (Tracking)</button>
              <button type="button" data-dev-set-status="${escapeHtml(ord.id)}" data-target-status="delivered" style="background:#166534; color:#fff; border:1px solid #4ade80; border-radius:5px; padding:4px 8px; font-size:0.72rem; cursor:pointer;">4. Entregado</button>
              <button type="button" data-dev-carrier-msg="${escapeHtml(ord.id)}" style="background:#87553b; color:#fff; border:none; border-radius:5px; padding:4px 9px; font-size:0.72rem; font-weight:700; cursor:pointer;">📣 Simular Aviso Repartidora</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    devMirror.querySelectorAll('[data-dev-set-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-dev-set-status');
        const st = btn.getAttribute('data-target-status');
        const ord = clientProfileOrders.find(o => o.id === id);
        if (!ord) return;
        ord.status = st;
        if (!ord.shipping) ord.shipping = { carrier: 'Correos Express', trackingNumber: 'CEX-84920144', trackingUrl: 'https://www.correosexpress.com' };
        const labels = {
          pending_review: 'En Revisión Técnica de Imprenta (300 DPI)',
          printing: 'En Imprenta (Impresión de tripa y encuadernación en curso)',
          shipped: `En Reparto con ${ord.shipping.carrier} (Tracking: ${ord.shipping.trackingNumber})`,
          delivered: 'Entregado en el domicilio del cliente'
        };
        if (st === 'shipped') {
          ord.shipping.lastCarrierMessage = `Correos Express: Paquete en reparto hoy. Seguimiento activo ${ord.shipping.trackingNumber}.`;
        } else if (st === 'delivered') {
          ord.shipping.lastCarrierMessage = 'Correos Express: Entrega completada satisfactoriamente.';
        }
        if (!ord.timeline) ord.timeline = [];
        ord.timeline.push({
          date: new Date().toISOString(),
          message: `Cambio de estado actualizado: ${labels[st] || st}`
        });
        saveClientOrdersAndBasketState(user);
        renderClientOrdersAndBasketViews(user);
        showToast(`✓ Pedido #${ord.orderNumber} cambiado a: ${labels[st]}`);
      });
    });

    devMirror.querySelectorAll('[data-dev-carrier-msg]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-dev-carrier-msg');
        const ord = clientProfileOrders.find(o => o.id === id);
        if (!ord) return;
        const msg = prompt('Escribe el mensaje de actualización de la empresa repartidora que verá el cliente en su perfil:', 'Correos Express: El repartidor entregará tu paquete hoy entre las 11:00 y las 14:00.');
        if (!msg) return;
        if (!ord.shipping) ord.shipping = { carrier: 'Correos Express', trackingNumber: 'CEX-84920144' };
        ord.shipping.lastCarrierMessage = msg.trim();
        if (!ord.timeline) ord.timeline = [];
        ord.timeline.push({
          date: new Date().toISOString(),
          message: `🚚 Aviso de empresa repartidora: ${msg.trim()}`
        });
        saveClientOrdersAndBasketState(user);
        renderClientOrdersAndBasketViews(user);
        showToast('🚚 Aviso de la repartidora publicado en el perfil del cliente');
      });
    });
  }
}

