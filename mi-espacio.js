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

  // 1. Carga instantánea (0 ms) si hay datos en caché local
  try {
    const cachedRaw = localStorage.getItem('mr_cached_user');
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      renderCachedView(cached);
    }
    const cachedDesignsRaw = localStorage.getItem('mr_cached_designs');
    if (cachedDesignsRaw) {
      allDesigns = JSON.parse(cachedDesignsRaw);
      updateDesignCounts();
      renderDesignsGrid();
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
      renderUnauthenticatedView();
      // Si entra directamente a Mi Espacio sin sesión iniciada, abrir el modal de acceso para facilitar el inicio
      setTimeout(() => {
        if (!auth.currentUser) {
          openAuthModal();
        }
      }, 350);
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

  const isDevCached = isDeveloper(cached);
  if (isDevCached) {
    if (userRoleBadge) {
      userRoleBadge.textContent = 'DESARROLLADOR';
      userRoleBadge.className = 'role-badge dev';
      userRoleBadge.style.display = 'inline-block';
    }
    if (tabBtnDev) tabBtnDev.style.display = 'inline-flex';
    if (tabBtnFuturas) tabBtnFuturas.style.display = 'inline-flex';
    if (devLockedView) devLockedView.style.display = 'none';
    if (devUnlockedContent) devUnlockedContent.style.display = 'block';
  } else {
    if (userRoleBadge) {
      userRoleBadge.style.display = 'none';
    }
    if (tabBtnDev) tabBtnDev.style.display = 'none';
    if (tabBtnFuturas) tabBtnFuturas.style.display = 'none';
    if (devLockedView) devLockedView.style.display = 'none';
    if (devUnlockedContent) devUnlockedContent.style.display = 'none';
  }
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
    } else {
      p.classList.remove('active');
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
  } else if (tab === 'dev') {
    if (isDev) {
      if (tabBtnDev) tabBtnDev.style.display = 'inline-flex';
      activateTab('tab-dev');
    } else {
      activateTab('tab-disenos');
    }
  } else if (tab === 'disenos') {
    activateTab('tab-disenos');
  } else if (tab === 'futuras') {
    if (isDev) {
      if (tabBtnFuturas) tabBtnFuturas.style.display = 'inline-flex';
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

function unlockDevPanel() {
  const pin = devPinInput.value.trim();
  if (pin === DEVELOPER_PIN) {
    try {
      sessionStorage.setItem('mr_dev_unlocked', 'true');
      localStorage.setItem('mr_dev_unlocked', 'true');
      const cachedRaw = localStorage.getItem('mr_cached_user');
      if (cachedRaw) {
        const c = JSON.parse(cachedRaw);
        c.isDev = true;
        localStorage.setItem('mr_cached_user', JSON.stringify(c));
      }
    } catch (e) {}

    devLockedView.style.display = 'none';
    devUnlockedContent.style.display = 'block';
    devPinError.style.display = 'none';

    if (tabBtnDev) tabBtnDev.style.display = 'inline-flex';
    if (tabBtnFuturas) tabBtnFuturas.style.display = 'inline-flex';
    if (userRoleBadge) {
      userRoleBadge.textContent = 'DESARROLLADOR';
      userRoleBadge.className = 'role-badge dev';
      userRoleBadge.style.display = 'inline-block';
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

  // Comprobar rol de desarrollador
  const isDev = isDeveloper(user);
  if (isDev) {
    if (userRoleBadge) {
      userRoleBadge.textContent = 'DESARROLLADOR';
      userRoleBadge.className = 'role-badge dev';
      userRoleBadge.style.display = 'inline-block';
    }
    if (tabBtnDev) tabBtnDev.style.display = 'inline-flex';
    if (tabBtnFuturas) tabBtnFuturas.style.display = 'inline-flex';
    if (devLockedView) devLockedView.style.display = 'none';
    if (devUnlockedContent) devUnlockedContent.style.display = 'block';
  } else {
    if (userRoleBadge) {
      userRoleBadge.style.display = 'none';
    }
    if (tabBtnDev) tabBtnDev.style.display = 'none';
    if (tabBtnFuturas) tabBtnFuturas.style.display = 'none';
    if (devLockedView) devLockedView.style.display = 'none';
    if (devUnlockedContent) devUnlockedContent.style.display = 'none';

    // Si por alguna razón estaba en la pestaña de dev o futuras y no tiene permisos, volver a disenos
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn && (activeBtn.id === 'tab-btn-dev' || activeBtn.id === 'tab-btn-futuras')) {
      activateTab('tab-disenos');
    }
  }

  // Guardar datos en caché local incluyendo isDev
  try {
    localStorage.setItem('mr_cached_user', JSON.stringify({
      displayName: name,
      email: email,
      photoURL: user.photoURL || '',
      isDev: isDev
    }));
  } catch (e) {}
}

function renderUnauthenticatedView() {
  const cacheStyle = document.getElementById('cache-style');
  if (cacheStyle) cacheStyle.remove();
  if (unauthContainer) unauthContainer.style.display = 'block';
  if (authContainer) authContainer.style.display = 'none';
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
    const q = query(designsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      firestoreList.push({ id: docSnap.id, ...docSnap.data() });
    });
  } catch (err) {
    console.warn('Query con orderBy falló, intentando getDocs directo:', err);
    try {
      const snapshot = await getDocs(designsRef);
      snapshot.forEach(docSnap => {
        firestoreList.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (fallbackErr) {
      console.warn('Fallback designs error:', fallbackErr);
    }
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
    const tA = a.updatedAt?.seconds || a.createdAt?.seconds || a.updatedAt || a.createdAt || 0;
    const tB = b.updatedAt?.seconds || b.createdAt?.seconds || b.updatedAt || b.createdAt || 0;
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
  const semanal = allDesigns.filter(d => (d.type || '').toLowerCase().includes('semanal')).length;
  const diario = allDesigns.filter(d => (d.type || '').toLowerCase().includes('diario')).length;
  const mensual = allDesigns.filter(d => (d.type || '').toLowerCase().includes('mensual')).length;
  const habitos = allDesigns.filter(d => (d.type || '').toLowerCase().includes('habito')).length;
  const horario = allDesigns.filter(d => (d.type || '').toLowerCase().includes('horario')).length;
  const anual = allDesigns.filter(d => (d.type || '').toLowerCase().includes('anual')).length;

  if (countAll) countAll.textContent = total;
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
  if (currentFilter === 'Semanal') {
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

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'design-card';
    
    // Determinar URL de edición
    let rawTargetUrl = item.editUrl;
    const typeLow = (item.type || '').toLowerCase();
    if (!rawTargetUrl) {
      if (typeLow.includes('diario')) rawTargetUrl = '/generador-planificador-diario.html';
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
    if (typeLow.includes('diario')) { badgeClass = 'diario'; typeLabel = 'Planificador Diario'; }
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
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'designs', item.id);
          await updateDoc(docRef, { name: newTitle.trim(), updatedAt: serverTimestamp() });
          item.name = newTitle.trim();
          document.getElementById(`title-display-${item.id}`).textContent = newTitle.trim();
          showToast('✓ Plantilla renombrada');
        } catch (err) {
          console.error('Error al renombrar:', err);
          showToast('No se pudo renombrar la plantilla');
        }
      }
    });

    // 2. Duplicar plantilla
    const duplicateBtn = card.querySelector('.btn-action-duplicate');
    duplicateBtn?.addEventListener('click', async () => {
      if (!currentUser) return;
      duplicateBtn.disabled = true;
      duplicateBtn.textContent = 'Copiando...';

      try {
        const designsRef = collection(db, 'users', currentUser.uid, 'designs');
        const copyName = `Copia de ${item.name || 'Planificador'}`;
        await addDoc(designsRef, {
          name: copyName,
          type: item.type || 'Planificador',
          summary: item.summary || '',
          editUrl: item.editUrl || rawTargetUrl,
          data: item.data || {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        showToast(`✓ Duplicado como "${copyName}"`);
        await loadUserDesigns(currentUser);
      } catch (err) {
        console.error('Error al duplicar diseño:', err);
        showToast('Error al duplicar la plantilla');
        duplicateBtn.disabled = false;
        duplicateBtn.textContent = '📋 Duplicar';
      }
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
          await deleteDoc(doc(db, 'users', currentUser.uid, 'designs', item.id));
          showToast('✓ Plantilla eliminada');
          await loadUserDesigns(currentUser);
        } catch (err) {
          console.error('Error al borrar diseño:', err);
          showToast('Error al eliminar la plantilla');
        }
      }
    });

    designsGrid.appendChild(card);
  });
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
