// mi-espacio.js - Lógica completa del panel de usuario y desarrollador
import { 
  auth, 
  db, 
  isDeveloper, 
  DEVELOPER_PIN 
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
  setupNavbarAuth();
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
  } catch (e) {}

  // 2. Comprobación en segundo plano con Firebase
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      // Guardar email para prefills automáticos
      if (user.email) {
        try { localStorage.setItem('mr_user_pdf_email', user.email); } catch (e) {}
      }
      renderAuthenticatedView(user);
      checkUrlTab();
      // Cargar datos de usuario y plantillas EN PARALELO para máxima velocidad
      await Promise.all([loadUserData(user), loadUserDesigns(user)]);
    } else {
      try { localStorage.removeItem('mr_cached_user'); } catch (e) {}
      renderUnauthenticatedView();
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

  userNameDisplay.firstChild.textContent = (cached.displayName || 'Mi Espacio') + ' ';
  userEmailDisplay.textContent = cached.email || '';

  if (cached.isDev) {
    userRoleBadge.textContent = 'DESARROLLADOR';
    userRoleBadge.className = 'role-badge dev';
    tabBtnDev.style.display = 'inline-flex';
    if (tabBtnFuturas) tabBtnFuturas.style.display = 'inline-flex';
  } else {
    userRoleBadge.textContent = 'CLIENTE';
    userRoleBadge.className = 'role-badge client';
    tabBtnDev.style.display = 'none';
    if (tabBtnFuturas) tabBtnFuturas.style.display = 'none';
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
  if (tab === 'ajustes') {
    activateTab('tab-ajustes');
  } else if (tab === 'dev') {
    activateTab('tab-dev');
  } else if (tab === 'disenos') {
    activateTab('tab-disenos');
  } else if (tab === 'futuras') {
    activateTab('tab-futuras');
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
    if (!currentUser) return;

    const newName = inputDisplayName.value.trim();
    if (!newName) return;

    const btnSubmit = document.getElementById('btn-save-perfil');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';

    try {
      // 1. Actualizar Firebase Auth
      await updateProfile(currentUser, { displayName: newName });

      // 2. Actualizar Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { displayName: newName });

      // 3. Actualizar vista
      userNameDisplay.firstChild.textContent = newName + ' ';
      showToast('✓ Nombre de perfil actualizado');
    } catch (err) {
      console.error('Error actualizando perfil:', err);
      showToast('No se pudo actualizar el nombre');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Guardar cambios en perfil';
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
    devLockedView.style.display = 'none';
    devUnlockedContent.style.display = 'block';
    devPinError.style.display = 'none';
    showToast('⚡ Panel de desarrollador desbloqueado');
  } else {
    devPinError.style.display = 'block';
    devPinInput.value = '';
    devPinInput.focus();
  }
}

function renderAuthenticatedView(user) {
  unauthContainer.style.display = 'none';
  authContainer.style.display = 'block';

  // Avatar
  if (user.photoURL) {
    userAvatarDisplay.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName || 'Avatar'}" />`;
  } else {
    const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
    userAvatarDisplay.textContent = initial;
  }

  // Nombre y correo
  const name = user.displayName || user.email.split('@')[0];
  userNameDisplay.firstChild.textContent = name + ' ';
  userEmailDisplay.textContent = user.email;

  // Comprobar rol de desarrollador
  const isDev = isDeveloper(user);
  if (isDev) {
    userRoleBadge.textContent = 'DESARROLLADOR';
    userRoleBadge.className = 'role-badge dev';
    tabBtnDev.style.display = 'inline-flex';
    if (tabBtnFuturas) tabBtnFuturas.style.display = 'inline-flex';
  } else {
    userRoleBadge.textContent = 'CLIENTE';
    userRoleBadge.className = 'role-badge client';
    tabBtnDev.style.display = 'none';
    if (tabBtnFuturas) tabBtnFuturas.style.display = 'none';
  }
}

function renderUnauthenticatedView() {
  unauthContainer.style.display = 'block';
  authContainer.style.display = 'none';
}

async function loadUserData(user) {
  try {
    inputDisplayName.value = user.displayName || '';
    inputEmail.value = user.email || '';
    
    // Proveedor
    const isGoogle = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
    providerDisplay.textContent = isGoogle ? 'Google' : 'Enlace seguro por correo';

    // Fecha de creación
    if (user.metadata && user.metadata.creationTime) {
      createdDisplay.textContent = new Date(user.metadata.creationTime).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      
      // Preferencias
      if (data.preferences && typeof data.preferences.newsletter !== 'undefined') {
        prefNewsletter.checked = !!data.preferences.newsletter;
      }

      // Datos de envío en Dev
      if (data.shipping) {
        document.getElementById('envio-nombre').value = data.shipping.nombre || '';
        document.getElementById('envio-telefono').value = data.shipping.telefono || '';
        document.getElementById('envio-dni').value = data.shipping.dni || '';
        document.getElementById('envio-direccion').value = data.shipping.direccion || '';
        document.getElementById('envio-cp').value = data.shipping.cp || '';
        document.getElementById('envio-ciudad').value = data.shipping.ciudad || '';
        document.getElementById('envio-provincia').value = data.shipping.provincia || '';
        document.getElementById('envio-pais').value = data.shipping.pais || 'España';
        document.getElementById('envio-notas').value = data.shipping.notas || '';
      }
    }
  } catch (err) {
    console.error('Error cargando datos de usuario:', err);
  }
}

async function loadUserDesigns(user) {
  try {
    const designsRef = collection(db, 'users', user.uid, 'designs');
    const q = query(designsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    allDesigns = [];
    snapshot.forEach(docSnap => {
      allDesigns.push({ id: docSnap.id, ...docSnap.data() });
    });

    updateDesignCounts();
    renderDesignsGrid();
  } catch (err) {
    console.warn('Colección de diseños vacía o en inicialización:', err);
    allDesigns = [];
    updateDesignCounts();
    renderDesignsGrid();
  }
}

function updateDesignCounts() {
  const total = allDesigns.length;
  const semanal = allDesigns.filter(d => (d.type || '').toLowerCase().includes('semanal')).length;
  const diario = allDesigns.filter(d => (d.type || '').toLowerCase().includes('diario')).length;

  if (countAll) countAll.textContent = total;
  if (countSemanal) countSemanal.textContent = semanal;
  if (countDiario) countDiario.textContent = diario;
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
    if (!rawTargetUrl) {
      rawTargetUrl = (item.type || '').toLowerCase().includes('diario')
        ? '/generador-planificador-diario.html'
        : '/generador-planificador-semanal.html';
    }

    const loadUrl = rawTargetUrl.includes('?') 
      ? `${rawTargetUrl}&load=${item.id}` 
      : `${rawTargetUrl}?load=${item.id}`;

    const downloadUrl = `${loadUrl}&autodownload=1`;

    const isDiario = (item.type || '').toLowerCase().includes('diario');
    const badgeClass = isDiario ? 'diario' : 'semanal';
    const typeLabel = isDiario ? 'Planificador Diario' : 'Planificador Semanal';

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
