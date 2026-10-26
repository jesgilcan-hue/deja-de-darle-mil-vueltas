window.closeBasketCheckoutModalAndGoToAjustes = function() {
  closeBasketCheckoutModal();
  const tabBtn = document.querySelector('button[data-tab="tab-ajustes"]');
  if (tabBtn) tabBtn.click();
  const addressCard = document.getElementById('ajustes-address-card');
  if (addressCard) {
    addressCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const inp = document.getElementById('ajustes-shipping-address') || document.getElementById('ajustes-shipping-name');
    if (inp) inp.focus();
  }
};

// mi-espacio.js - Lógica completa del panel de usuario y desarrollador
import { 
  auth, 
  db, 
  isDeveloper, 
  isTestCustomer,
  DEVELOPER_PIN,
  getUserEmail,
  getUserDisplayName,
  DEVELOPER_EMAILS,
  clearUserLocalCache
} from './firebase-config.js';
import {
  verifyAndEnforceThreeDevices,
  approveAndReplaceAuthorizedDevice,
  rejectPendingDeviceRequest,
  resendPendingDeviceVerificationEmail,
  MAX_AUTHORIZED_DEVICES
} from './device-guard.js';
import { sendOrderLifecycleEmails } from './order-email-notifier.js';
import { 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  deleteUser
} from 'firebase/auth';
import {
  doc,
  where, 
  getDoc, 
  setDoc,
  updateDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { openAuthModal, setupNavbarAuth } from './auth-modal.js';

// --- Validadores de integridad postal y de contacto ---
function isValidSpanishPostalCode(zip) {
  if (!zip) return false;
  const cleaned = String(zip).trim();
  if (!/^\d{5}$/.test(cleaned)) return false;
  const prefix = parseInt(cleaned.substring(0, 2), 10);
  return prefix >= 1 && prefix <= 52;
}

function isValidPhoneNumber(phone) {
  if (!phone) return false;
  const cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '');
  let national = cleaned;
  if (national.startsWith('+34')) {
    national = national.substring(3);
  } else if (national.startsWith('0034')) {
    national = national.substring(4);
  } else if (national.startsWith('+')) {
    return /^\d{8,14}$/.test(national.substring(1));
  }
  return /^[6789]\d{8}$/.test(national);
}

function isValidEmailAddress(email) {
  if (!email) return false;
  const cleaned = String(email).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned);
}

function isValidDeliveryAddress(address) {
  if (!address) return false;
  const cleaned = String(address).trim();
  return cleaned.length >= 5 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(cleaned);
}

function isValidRecipientName(name) {
  if (!name) return false;
  const cleaned = String(name).trim();
  return cleaned.length >= 3 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(cleaned);
}

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
const countPasatiempos = document.getElementById('count-pasatiempos');
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

function refreshEspacioHoyStats() {
  try {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    let sudokuSolved = false;
    try {
      const sStats = JSON.parse(localStorage.getItem('menosruido_sudoku_stats_v1') || '{}');
      if (sStats.lastSolvedDate === todayStr) sudokuSolved = true;
      const sState9 = JSON.parse(localStorage.getItem(`menosruido_sudoku_state_v1_classic_${todayStr}`) || '{}');
      if (sState9.isCompleted) sudokuSolved = true;
      const sState4 = JSON.parse(localStorage.getItem(`menosruido_sudoku_state_v1_mini_${todayStr}`) || '{}');
      if (sState4.isCompleted) sudokuSolved = true;
    } catch (e) {}

    let calcudokuSolved = false;
    try {
      const cStats = JSON.parse(localStorage.getItem('mr_calcudoku_stats') || '{}');
      if (cStats.lastDate === todayStr) calcudokuSolved = true;
    } catch (e) {}

    let kakuroSolved = false;
    try {
      const kStats = JSON.parse(localStorage.getItem('mr_kakuro_stats') || '{}');
      if (kStats.lastDate === todayStr) kakuroSolved = true;
    } catch (e) {}

    let cruzadasSolved = false;
    try {
      const crState = JSON.parse(localStorage.getItem(`mr_cruzadas_daily_${todayStr}`) || '{}');
      if (crState.completed) cruzadasSolved = true;
      const crStats = JSON.parse(localStorage.getItem('mr_cruzadas_daily_stats') || localStorage.getItem('mr_cruzadas_stats') || '{}');
      if (crStats.lastSolvedDate === todayStr) cruzadasSolved = true;
    } catch (e) {}

    let sopaSolved = false;
    try {
      if (localStorage.getItem(`mr_sopa_solved_${todayStr}`) === 'true') sopaSolved = true;
    } catch (e) {}

    const setBadge = (id, done) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (done) {
        el.textContent = '✓ Resuelto';
        el.style.background = '#e8f5e9';
        el.style.color = '#215c38';
      } else {
        el.textContent = 'Pendiente';
        el.style.background = '#f3ece0';
        el.style.color = '#87553b';
      }
    };

    setBadge('espacio-badge-sudoku', sudokuSolved);
    setBadge('espacio-badge-calcudoku', calcudokuSolved);
    setBadge('espacio-badge-kakuro', kakuroSolved);
    setBadge('espacio-badge-cruzadas', cruzadasSolved);
    setBadge('espacio-badge-sopa', sopaSolved);

    const solvedCount = [sudokuSolved, calcudokuSolved, kakuroSolved, cruzadasSolved, sopaSolved].filter(Boolean).length;
    const navBadge = document.getElementById('hoy-progress-badge');
    if (navBadge) navBadge.textContent = `${solvedCount}/5`;

    const ratioEl = document.getElementById('espacio-hoy-ratio');
    if (ratioEl) ratioEl.textContent = `${solvedCount} de 5 resueltos`;

    const barEl = document.getElementById('espacio-hoy-bar');
    if (barEl) barEl.style.width = `${(solvedCount / 5) * 100}%`;

    let maxStreak = 0;
    try {
      const s = JSON.parse(localStorage.getItem('menosruido_sudoku_stats_v1') || '{}').streak || 0;
      const c = JSON.parse(localStorage.getItem('mr_calcudoku_stats') || '{}').streak || 0;
      const k = JSON.parse(localStorage.getItem('mr_kakuro_stats') || '{}').streak || 0;
      const cr = JSON.parse(localStorage.getItem('mr_cruzadas_daily_stats') || localStorage.getItem('mr_cruzadas_stats') || '{}').streak || 0;
      const sp = parseInt(localStorage.getItem('mr_sopa_streak') || '0', 10) || 0;
      maxStreak = Math.max(s, c, k, cr, sp, solvedCount > 0 ? 1 : 0);
    } catch (e) {}

    const streakEl = document.getElementById('espacio-hoy-streak');
    if (streakEl) streakEl.textContent = `🔥 ${maxStreak} día${maxStreak === 1 ? '' : 's'}`;
  } catch (e) {}
}

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupEvents();
  setupCreateDropdown();
  setupFilters();
  setupDeleteModal();
  setupDownloadModal();
  setupPostMessageListener();
  refreshEspacioHoyStats();
  window.addEventListener('focus', refreshEspacioHoyStats);

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

  // Cargar inmediatamente pedidos y cesta local
  initClientOrdersAndBasketModule(null);

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
      checkUrlTab(false);
      // Cargar datos de usuario y plantillas EN PARALELO para máxima velocidad
      await Promise.all([loadUserData(user), loadUserDesigns(user)]);
      await initClientOrdersAndBasketModule(user);
    } else {
      try { localStorage.removeItem('mr_cached_user'); } catch (e) {}
      const urlParams = new URLSearchParams(window.location.search);
      const isOrderReturn = urlParams.get('stripe_success') === '1' ||
                            urlParams.get('stripe_test_success') === '1' ||
                            urlParams.get('order') ||
                            urlParams.get('orderId') ||
                            urlParams.get('tab') === 'pedidos' || urlParams.get('tab') === 'ajustes';
      const hasLocalOrders = !!localStorage.getItem('mr_simulated_orders');
      const hasPendingBooks = !!localStorage.getItem('mr_pending_payment_books');

      if (isOrderReturn || hasLocalOrders || hasPendingBooks || allDesigns.length > 0) {
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

  const tabBtnPedidos = document.getElementById('tab-btn-pedidos');
  if (tabBtnPedidos) tabBtnPedidos.style.removeProperty('display');
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

function checkUrlTab(allowDevTabs = false) {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const user = auth.currentUser || currentUser;
  const isOrderReturn = params.get('stripe_success') === '1' || params.get('stripe_test_success') === '1' || !!params.get('order') || !!params.get('orderId');
  const isDevAllowed = isDeveloper(user);
  const isCustomer = isTestCustomer(user);
  const hasPending = !!localStorage.getItem('mr_pending_payment_books');
  const hasOrders = (clientProfileOrders && clientProfileOrders.length > 0) || !!localStorage.getItem('mr_simulated_orders');
  const isOrdersAllowed = isOrderReturn || hasOrders || hasPending || isDevAllowed || isCustomer;

  if (params.get('stripe_success') === '1' || params.get('stripe_test_success') === '1') {
    const ordNum = params.get('order') || '';
    setTimeout(() => {
      showToast('✓ Pago con tarjeta completado · Pedido #' + ordNum + ' confirmado');
    }, 300);
  }

  if (tab === 'pedidos' || isOrderReturn) {
    const btnPed = document.getElementById('tab-btn-pedidos');
    if (btnPed) btnPed.style.setProperty('display', 'inline-flex', 'important');
    activateTab('tab-pedidos');
    return;
  }

  if (tab === 'ajustes') {
    activateTab('tab-ajustes');
  } else if (tab === 'hoy') {
    refreshEspacioHoyStats();
    activateTab('tab-hoy');
  } else if (tab === 'dev') {
    if (isDevAllowed && allowDevTabs) {
      if (tabBtnDev) tabBtnDev.style.setProperty('display', 'inline-flex', 'important');
      activateTab('tab-dev');
    } else {
      activateTab('tab-disenos');
    }
  } else if (tab === 'disenos') {
    activateTab('tab-disenos');
  } else if (tab === 'futuras') {
    if (isDevAllowed && allowDevTabs) {
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

  // Guardar Direcciones de Envío y Facturación en Ajustes
  const btnSaveDirecciones = document.getElementById('btn-save-direcciones');
  const sameBillingCheck = document.getElementById('ajustes-same-billing-check');
  const billingFields = document.getElementById('ajustes-billing-fields');

  // Filtros en vivo en los campos de entrada
  const zipInput = document.getElementById('ajustes-shipping-zip');
  if (zipInput) {
    zipInput.addEventListener('input', (e) => {
      // Solo números y máximo 5 dígitos
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5);
    });
  }

  const phoneInput = document.getElementById('ajustes-shipping-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      // Filtrar caracteres válidos para teléfono y máximo 16 caracteres
      let val = e.target.value;
      const startsWithPlus = val.startsWith('+');
      val = val.replace(/[^\d\s\-]/g, '');
      if (startsWithPlus) val = '+' + val.replace(/\+/g, '');
      e.target.value = val.slice(0, 16);
    });
  }

  const emailInput = document.getElementById('ajustes-shipping-email');
  if (emailInput) {
    emailInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\s/g, '').toLowerCase();
    });
  }

  const billingTaxInput = document.getElementById('ajustes-billing-taxid');
  if (billingTaxInput) {
    billingTaxInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 15);
    });
  }

  sameBillingCheck?.addEventListener('change', () => {
    if (billingFields) {
      billingFields.style.display = sameBillingCheck.checked ? 'none' : 'block';
    }
  });

  async function executeSaveDirecciones(returnToBasket = false) {
    const name = document.getElementById('ajustes-shipping-name')?.value.trim();
    const email = document.getElementById('ajustes-shipping-email')?.value.trim().toLowerCase() || (currentUser ? getUserEmail(currentUser) : '');
    const phone = document.getElementById('ajustes-shipping-phone')?.value.trim();
    const address = document.getElementById('ajustes-shipping-address')?.value.trim();
    const postalCode = document.getElementById('ajustes-shipping-zip')?.value.trim();
    const city = document.getElementById('ajustes-shipping-city')?.value.trim();
    const province = document.getElementById('ajustes-shipping-province')?.value.trim();
    const notes = document.getElementById('ajustes-shipping-notes')?.value.trim() || '';
    const isSameBilling = sameBillingCheck ? sameBillingCheck.checked : true;

    // 1. Filtro Nombre del Destinatario
    if (!isValidRecipientName(name)) {
      alert('⚠️ Por favor, introduce el nombre y dos apellidos del destinatario (mínimo 3 caracteres).');
      document.getElementById('ajustes-shipping-name')?.focus();
      return false;
    }

    // 2. Filtro Email de Confirmación
    if (!isValidEmailAddress(email)) {
      alert('⚠️ Por favor, introduce un correo electrónico válido (ej. tu-nombre@ejemplo.com) para poder enviarte la confirmación y el seguimiento de tu pedido.');
      const inpEmail = document.getElementById('ajustes-shipping-email');
      if (inpEmail) inpEmail.focus();
      return false;
    }

    // 3. Filtro Teléfono de Contacto (al menos 9 dígitos)
    if (!isValidPhoneNumber(phone)) {
      alert('⚠️ Por favor, introduce un teléfono móvil o de contacto válido (mínimo 9 dígitos numéricos, ej. 600 123 456). El repartidor lo necesita para avisar de la entrega física.');
      document.getElementById('ajustes-shipping-phone')?.focus();
      return false;
    }

    // 4. Filtro Dirección de Entrega Física
    if (!isValidDeliveryAddress(address)) {
      alert('⚠️ Por favor, introduce una dirección de entrega completa (calle, número, piso o puerta; mínimo 5 caracteres).');
      document.getElementById('ajustes-shipping-address')?.focus();
      return false;
    }

    // 5. Filtro Código Postal (exactamente 5 dígitos en España)
    if (!isValidSpanishPostalCode(postalCode)) {
      alert('⚠️ El código postal debe tener exactamente 5 dígitos numéricos válidos en España (del 01000 al 52999, ej. 28001).');
      document.getElementById('ajustes-shipping-zip')?.focus();
      return false;
    }

    // 6. Filtro Ciudad / Población
    if (!city || city.length < 2) {
      alert('⚠️ Por favor, indica la ciudad o población de entrega.');
      document.getElementById('ajustes-shipping-city')?.focus();
      return false;
    }

    // 7. Filtro Provincia
    if (!province || province.length < 2) {
      alert('⚠️ Por favor, indica la provincia de entrega.');
      document.getElementById('ajustes-shipping-province')?.focus();
      return false;
    }

    // 8. Filtro Facturación opcional
    if (!isSameBilling) {
      const bName = document.getElementById('ajustes-billing-name')?.value.trim();
      const bTaxId = document.getElementById('ajustes-billing-taxid')?.value.trim();
      const bAddr = document.getElementById('ajustes-billing-address')?.value.trim();
      if (!bName || bName.length < 3) {
        alert('⚠️ Por favor, indica la razón social o nombre completo para la factura.');
        document.getElementById('ajustes-billing-name')?.focus();
        return false;
      }
      if (!bTaxId || bTaxId.length < 7) {
        alert('⚠️ Por favor, indica un NIF / CIF / NIE fiscal válido.');
        document.getElementById('ajustes-billing-taxid')?.focus();
        return false;
      }
      if (!bAddr || bAddr.length < 5) {
        alert('⚠️ Por favor, indica la dirección fiscal completa.');
        document.getElementById('ajustes-billing-address')?.focus();
        return false;
      }
    }

    // Modal popup con estética Menos Ruido para validación en 1 sola línea
    const summaryAddress = `${address}, ${postalCode} ${city}${province ? ' (' + province + ')' : ''}`;
    const confirmMessage = `Por favor, confirma que tu dirección de entrega y correo son exactos:

📍 Dirección de entrega:
${name}
${summaryAddress}

✉️ Correo de confirmación y tracking:
${email}${phone ? `\n📞 Teléfono: ${phone}` : ''}${notes ? `\n📝 Notas repartidor: «${notes}»` : ''}

¿Son correctos estos datos para el envío de tus cuadernos?`;

    const userConfirmed = await (window.mrConfirm ? window.mrConfirm(confirmMessage, {
      title: 'Validación de Dirección y Contacto',
      badge: 'Editorial Menos Ruido · Envío Físico',
      confirmText: '✓ Confirmar y Guardar',
      cancelText: 'Modificar datos'
    }) : confirm(confirmMessage));

    if (!userConfirmed) return false;

    const shippingData = {
      name,
      nombre: name,
      email,
      phone,
      telefono: phone,
      address,
      direccion: address,
      postalCode,
      cp: postalCode,
      city,
      ciudad: city,
      province,
      provincia: province,
      notes,
      notas: notes,
      pais: 'España',
      updatedAt: new Date().toISOString()
    };
    try { localStorage.setItem('mr_customer_contact_email', email); } catch(e) {}

    const billingData = {
      isSame: isSameBilling,
      name: isSameBilling ? name : (document.getElementById('ajustes-billing-name')?.value.trim() || name),
      taxId: isSameBilling ? '' : (document.getElementById('ajustes-billing-taxid')?.value.trim() || ''),
      address: isSameBilling ? address : (document.getElementById('ajustes-billing-address')?.value.trim() || address)
    };

    // 1. Guardar en localStorage siempre (para todos los libros de la cesta)
    try {
      localStorage.setItem('mr_customer_shipping_address', JSON.stringify(shippingData));
    } catch(e) {}

    // 2. Actualizar la dirección de TODOS los libros en la cesta
    clientPendingBasket.forEach(it => {
      it.shipping = { ...shippingData };
    });
    saveClientOrdersAndBasketState(currentUser);

    // 3. Guardar en Firestore si hay usuario
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { shipping: shippingData, billing: billingData }, { merge: true });
      } catch(e) {}
    }

    showToast('✓ Dirección de entrega actualizada para todos tus libros');
    renderClientOrdersAndBasketViews(currentUser || auth.currentUser);

    if (returnToBasket) {
      activateTab('tab-pedidos');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return true;
  }

  document.getElementById('btn-save-and-return-basket')?.addEventListener('click', () => {
    executeSaveDirecciones(true);
  });

  btnSaveDirecciones?.addEventListener('click', async () => {
    executeSaveDirecciones(false);
  });

  // Desbloqueo por PIN en panel de desarrollador
  btnUnlockDev?.addEventListener('click', unlockDevPanel);
  devPinInput?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') unlockDevPanel();
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
      dlModalBadge.innerHTML = '<span>🎨</span> Cubierta Exterior';
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
        // MODO SILENCIOSO TOTAL: Si es un 4.º dispositivo no autorizado, la web NO dice nada y se comporta como cuenta de cliente normal.
        if (userRoleBadge) userRoleBadge.style.setProperty('display', 'none', 'important');
        if (tabBtnDev) tabBtnDev.style.setProperty('display', 'none', 'important');
        if (tabDevPane) tabDevPane.style.setProperty('display', 'none', 'important');
        if (tabBtnFuturas) tabBtnFuturas.style.setProperty('display', 'none', 'important');
        if (tabFuturasPane) tabFuturasPane.style.setProperty('display', 'none', 'important');
        const tabBtnPedidos = document.getElementById('tab-btn-pedidos');
        if (tabBtnPedidos) { tabBtnPedidos.style.removeProperty('display'); tabBtnPedidos.style.setProperty('display', 'inline-flex', 'important'); }
        const activeBtn = document.querySelector('.tab-btn.active');
        if (activeBtn && (activeBtn.id === 'tab-btn-dev' || activeBtn.id === 'tab-btn-futuras' || activeBtn.id === 'tab-btn-pedidos')) {
          activateTab('tab-disenos');
        }
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

      checkUrlTab(true);

      renderAuthorizedDevicesUI(
        user,
        deviceResult.devices || [],
        deviceResult.currentToken,
        deviceResult.pendingDevices || []
      );
      initClientOrdersAndBasketModule(user);

      // Si acaba de pulsar el enlace de verificación del email desde este dispositivo autorizado:
      if (deviceResult.emailJustVerified) {
        activateTab('tab-dev');
        setTimeout(() => {
          const pendingEl = document.getElementById('devPendingDevicesContainer');
          if (pendingEl) pendingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
        showToast(`✅ Paso 1/2 (Email en Gmail) validado para «${deviceResult.verifiedDeviceName}». Ahora elige qué dispositivo sustituir abajo (Paso 2/2).`);
      }

      // Escucha en tiempo real de cambios en dispositivos autorizados y solicitudes silenciosas pendientes
      if (!window.__mrDevDevicesSnapshotUnsub) {
        window.__mrDevDevicesSnapshotUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          if (!snap.exists()) return;
          const d = snap.data() || {};
          renderAuthorizedDevicesUI(
            user,
            Array.isArray(d.authorizedDevices) ? d.authorizedDevices : [],
            deviceResult.currentToken,
            Array.isArray(d.pendingDevices) ? d.pendingDevices : []
          );
        });
      }
    });
  } else {
    // USUARIO CLIENTE (CUALQUIER CORREO DISTINTO DE jesgilcan@gmail.com):
    // Se oculta tajantemente el Panel Desarrollador y Futuras Ideas con display: none !important
    if (userRoleBadge) userRoleBadge.style.setProperty('display', 'none', 'important');
    if (tabBtnDev) tabBtnDev.style.setProperty('display', 'none', 'important');
    if (tabDevPane) tabDevPane.style.setProperty('display', 'none', 'important');
    if (tabBtnFuturas) tabBtnFuturas.style.setProperty('display', 'none', 'important');
    if (tabFuturasPane) tabFuturasPane.style.setProperty('display', 'none', 'important');

    const tabBtnPedidos = document.getElementById('tab-btn-pedidos');
    if (tabBtnPedidos) {
      tabBtnPedidos.style.removeProperty('display');
      tabBtnPedidos.style.setProperty('display', 'inline-flex', 'important');
    }
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn && (activeBtn.id === 'tab-btn-dev' || activeBtn.id === 'tab-btn-futuras')) {
      activateTab('tab-disenos');
    }
    checkUrlTab(false);
    initClientOrdersAndBasketModule(user);
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

  const tabBtnPedidos = document.getElementById('tab-btn-pedidos');
  if (tabBtnPedidos) tabBtnPedidos.style.setProperty('display', 'inline-flex', 'important');

  if (userNameDisplay) {
    const titleText = userNameDisplay.querySelector('.user-name-text');
    if (titleText) titleText.textContent = 'Mi Espacio';
    else if (userNameDisplay.firstChild) userNameDisplay.firstChild.textContent = 'Mi Espacio ';
  }
  if (userEmailDisplay) {
    const savedAddr = JSON.parse(localStorage.getItem('mr_customer_shipping_address') || '{}');
    userEmailDisplay.textContent = savedAddr.email || 'Modo Cliente';
  }
  if (userRoleBadge) userRoleBadge.style.setProperty('display', 'none', 'important');
  if (tabBtnDev) tabBtnDev.style.setProperty('display', 'none', 'important');
  if (tabBtnFuturas) tabBtnFuturas.style.setProperty('display', 'none', 'important');

  const params = new URLSearchParams(window.location.search);
  const targetTab = params.get('tab') || (params.get('stripe_success') === '1' || params.get('order') || params.get('orderId') ? 'pedidos' : 'disenos');

  if (targetTab === 'pedidos') {
    activateTab('tab-pedidos');
  } else if (targetTab === 'ajustes') {
    activateTab('tab-ajustes');
  } else {
    activateTab('tab-disenos');
  }
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

        // Datos de envío y facturación
        if (data.shipping || data.billing) {
          populateShippingFields(data.shipping, data.billing);
        }

        // Guardar en caché local para próximas cargas instantáneas
        try {
          localStorage.setItem('mr_user_extra_data', JSON.stringify({
            preferences: data.preferences || {},
            shipping: data.shipping || null,
            billing: data.billing || null
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

function populateShippingFields(shipping, billing = null) {
  if (!shipping && !billing) return;
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  if (shipping) {
    setVal('ajustes-shipping-name', shipping.nombre || shipping.name);
    setVal('ajustes-shipping-email', shipping.email || getUserEmail(user));
    setVal('ajustes-shipping-phone', shipping.telefono || shipping.phone);
    setVal('ajustes-shipping-address', shipping.direccion || shipping.address);
    setVal('ajustes-shipping-zip', shipping.cp || shipping.postalCode);
    setVal('ajustes-shipping-city', shipping.ciudad || shipping.city);
    setVal('ajustes-shipping-province', shipping.provincia || shipping.province);
    setVal('ajustes-shipping-notes', shipping.notas || shipping.notes || '');
  }

  if (billing) {
    const sameCheck = document.getElementById('ajustes-same-billing-check');
    const billFields = document.getElementById('ajustes-billing-fields');
    const isSame = billing.isSame !== false;
    if (sameCheck) sameCheck.checked = isSame;
    if (billFields) billFields.style.display = isSame ? 'none' : 'block';
    setVal('ajustes-billing-name', billing.name || '');
    setVal('ajustes-billing-taxid', billing.taxId || billing.cif || '');
    setVal('ajustes-billing-address', billing.address || '');
  }
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

function isPasatiempoDesign(d) {
  const t = ((d.type || '') + ' ' + (d.name || '') + ' ' + (d.editUrl || '')).toLowerCase();
  return t.includes('sudoku') || t.includes('calcudoku') || t.includes('kakuro') || t.includes('sopa') || t.includes('cruzada') || t.includes('pasatiempo');
}

function updateDesignCounts() {
  const total = allDesigns.length;
  const pasatiempos = allDesigns.filter(d => isPasatiempoDesign(d)).length;
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
  if (countPasatiempos) countPasatiempos.textContent = pasatiempos;
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
  if (currentFilter === 'Pasatiempos') {
    filtered = allDesigns.filter(d => isPasatiempoDesign(d));
  } else if (currentFilter === 'Completo') {
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
      else if (typeLow.includes('pasatiempo')) rawTargetUrl = '/generador-libro-pasatiempos.html';
      else if (typeLow.includes('sudoku')) rawTargetUrl = '/generador-sudokus.html';
      else if (typeLow.includes('calcudoku')) rawTargetUrl = '/generador-calcudoku.html';
      else if (typeLow.includes('kakuro')) rawTargetUrl = '/generador-kakuro.html';
      else if (typeLow.includes('sopa')) rawTargetUrl = '/generador-sopas.html';
      else if (typeLow.includes('cruzada')) rawTargetUrl = '/generador-cruzadas.html';
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
    else if (typeLow.includes('pasatiempo')) { badgeClass = 'completo'; typeLabel = 'Libro de Pasatiempos'; }
    else if (typeLow.includes('sudoku')) { badgeClass = 'completo'; typeLabel = 'Sudoku Imprimible'; }
    else if (typeLow.includes('calcudoku')) { badgeClass = 'completo'; typeLabel = 'Calcudoku Imprimible'; }
    else if (typeLow.includes('kakuro')) { badgeClass = 'completo'; typeLabel = 'Kakuro Imprimible'; }
    else if (typeLow.includes('sopa')) { badgeClass = 'completo'; typeLabel = 'Sopa de Letras'; }
    else if (typeLow.includes('cruzada')) { badgeClass = 'completo'; typeLabel = 'Cruzadas de Palabras'; }
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

function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

function renderAuthorizedDevicesUI(user, devices, currentToken, pendingDevices = []) {
  const container = document.getElementById('devAuthorizedDevicesContainer');
  const pendingContainer = document.getElementById('devPendingDevicesContainer');
  const badge = document.getElementById('devDevicesCountBadge');
  if (!container) return;

  const list = Array.isArray(devices) ? devices : [];
  const pendingList = Array.isArray(pendingDevices) ? pendingDevices : [];

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
          <div style="font-size:0.69rem; color:#a7c4b0; background:rgba(0,0,0,0.22); border-radius:6px; padding:5px 8px; border:1px solid rgba(74,222,128,0.18);">
            🔒 Sellado · Sustituible solo mediante Doble Llave (1.º Email Gmail + 2.º Aprobación aquí)
          </div>
        </div>
      `;
    } else {
      return `
        <div style="background:rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.2); border-radius:10px; padding:12px 14px; display:flex; flex-direction:column; justify-content:center; gap:4px;">
          <div style="font-size:0.72rem; font-weight:800; color:#9ca3af; text-transform:uppercase;">Dispositivo ${idx + 1}/${MAX_AUTHORIZED_DEVICES} · Libre</div>
          <div style="font-size:0.88rem; font-weight:700; color:#d1d5db;">${hint.defaultIcon} ${hint.defaultLabel}</div>
          <div style="font-size:0.73rem; color:#9ca3af;">Entra con tu Gmail desde ese dispositivo para sellarlo en este hueco.</div>
        </div>
      `;
    }
  }).join('');

  if (!pendingContainer) return;

  if (pendingList.length === 0) {
    pendingContainer.innerHTML = `
      <div style="background:rgba(0,0,0,0.24); border:1px solid rgba(255,255,255,0.09); border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="font-size:0.8rem; color:#d1d5db;">
          🛡️ <strong>Modo Silencioso Activo:</strong> No hay ningún 4.º dispositivo pendiente de autorización ahora mismo. Si inicias sesión con <code style="color:#fff;">jesgilcan@gmail.com</code> en un navegador o aparato nuevo, la web no mostrará nada en él y te enviará un email automático para iniciar el cambio.
        </div>
      </div>
    `;
    return;
  }

  pendingContainer.innerHTML = `
    <div style="margin-bottom:10px; font-size:0.84rem; font-weight:800; color:#fde68a; display:flex; align-items:center; gap:8px;">
      <span>🔔 Solicitudes Silenciosas de Nuevos Dispositivos Detectados (${pendingList.length})</span>
    </div>
    <div style="display:flex; flex-direction:column; gap:12px;">
      ${pendingList.map((p) => {
        const isEmailOk = !!p.emailVerified;
        const slotOptionsHtml = list.map((d, sIdx) => {
          return `<option value="${sIdx}">Sustituir Dispositivo ${sIdx + 1}: ${escapeHtml(d.name || 'Equipo ' + (sIdx + 1))}</option>`;
        }).join('');

        return `
          <div style="background:${isEmailOk ? 'rgba(22, 101, 52, 0.28)' : 'rgba(120, 53, 15, 0.28)'}; border:1.5px solid ${isEmailOk ? '#4ade80' : '#f59e0b'}; border-radius:10px; padding:14px 16px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
              <div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <span style="font-size:0.95rem; font-weight:800; color:#ffffff;">${p.icon || '💻'} ${escapeHtml(p.name || 'Dispositivo Nuevo')}</span>
                  <span style="font-size:0.72rem; color:#d1d5db;">Pantalla: ${escapeHtml(p.screen || 'N/A')} · Detectado: ${formatDate(p.lastAttemptAt || p.detectedAt)}</span>
                </div>
                <div style="font-size:0.76rem; color:#cbd5e1; margin-top:4px;">
                  En este dispositivo nuevo la web permanece en <strong>silencio total</strong> (vista normal de cliente, cero avisos) hasta completar las 2 llaves:
                </div>
              </div>
              <button type="button" data-reject-pending="${escapeHtml(p.token)}" style="background:rgba(239,68,68,0.18); border:1px solid rgba(239,68,68,0.4); color:#fca5a5; border-radius:6px; padding:5px 10px; font-size:0.73rem; font-weight:700; cursor:pointer;">
                🗑️ Rechazar / Ignorar
              </button>
            </div>

            <!-- Estado de las 2 llaves -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:10px;">
              <!-- Llave 1: Email -->
              <div style="background:rgba(0,0,0,0.3); border:1px solid ${isEmailOk ? '#4ade80' : 'rgba(245,158,11,0.5)'}; border-radius:8px; padding:10px 12px;">
                <div style="font-size:0.72rem; font-weight:800; text-transform:uppercase; color:${isEmailOk ? '#86efac' : '#fde68a'};">
                  ${isEmailOk ? '✅ LLAVE 1/2 COMPLETADA (EMAIL GMAIL)' : '⏳ LLAVE 1/2 PENDIENTE (EMAIL GMAIL)'}
                </div>
                <div style="font-size:0.77rem; color:#e5e7eb; margin-top:4px;">
                  ${isEmailOk
                    ? 'Ya has pulsado el enlace de autorización enviado a jesgilcan@gmail.com.'
                    : 'Abre el correo enviado a jesgilcan@gmail.com y pulsa el botón «Paso 1/2: Validar este nuevo dispositivo».'}
                </div>
                ${!isEmailOk ? `
                  <button type="button" data-resend-pending-email="${escapeHtml(p.token)}" style="margin-top:8px; background:#3f3b37; border:1px solid rgba(255,255,255,0.22); color:#fde68a; border-radius:6px; padding:5px 10px; font-size:0.73rem; font-weight:700; cursor:pointer;">
                    📨 Reenviar enlace a mi Gmail
                  </button>
                ` : ''}
              </div>

              <!-- Llave 2: Confirmación desde este dispositivo ya autorizado -->
              <div style="background:rgba(0,0,0,0.3); border:1px solid ${isEmailOk ? '#4ade80' : 'rgba(255,255,255,0.12)'}; border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
                <div>
                  <div style="font-size:0.72rem; font-weight:800; text-transform:uppercase; color:${isEmailOk ? '#86efac' : '#9ca3af'};">
                    ${isEmailOk ? '🔓 LLAVE 2/2 LISTA PARA CONFIRMAR AQUÍ' : '🔒 LLAVE 2/2 BLOQUEADA HASTA VALIDAR EMAIL'}
                  </div>
                  <div style="font-size:0.76rem; color:#d1d5db; margin-top:3px;">
                    Elige a cuál de tus 3 equipos actuales sustituye desde este dispositivo ya autorizado:
                  </div>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                  <select data-slot-select="${escapeHtml(p.token)}" ${!isEmailOk ? 'disabled' : ''} style="flex:1; min-width:170px; background:#191c1a; color:#ffffff; border:1px solid rgba(255,255,255,0.25); border-radius:6px; padding:6px 8px; font-size:0.76rem;">
                    ${slotOptionsHtml}
                  </select>
                  <button type="button" data-approve-pending="${escapeHtml(p.token)}" ${!isEmailOk ? 'disabled' : ''} style="background:${isEmailOk ? '#16a34a' : '#374151'}; color:#ffffff; border:none; border-radius:6px; padding:7px 12px; font-size:0.76rem; font-weight:800; cursor:${isEmailOk ? 'pointer' : 'not-allowed'}; opacity:${isEmailOk ? '1' : '0.55'};">
                    ${isEmailOk ? '✅ Paso 2/2: Autorizar y Sustituir' : '🔒 Valida primero el Email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  pendingContainer.querySelectorAll('[data-resend-pending-email]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tok = btn.getAttribute('data-resend-pending-email');
      if (!tok) return;
      btn.disabled = true;
      btn.textContent = '⏳ Enviando a jesgilcan@gmail.com...';
      const ok = await resendPendingDeviceVerificationEmail(user, tok);
      btn.disabled = false;
      btn.textContent = ok ? '✓ Correo enviado a tu Gmail' : '📨 Reenviar enlace a mi Gmail';
      showToast(ok ? '📨 Enlace de validación (Paso 1/2) enviado a jesgilcan@gmail.com' : 'No se pudo reenviar el correo en este momento');
    });
  });

  pendingContainer.querySelectorAll('[data-reject-pending]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tok = btn.getAttribute('data-reject-pending');
      if (!tok) return;
      const res = await rejectPendingDeviceRequest(user, tok);
      renderAuthorizedDevicesUI(user, res.devices, currentToken, res.pendingDevices);
      showToast('🗑️ Solicitud de dispositivo descartada');
    });
  });

  pendingContainer.querySelectorAll('[data-approve-pending]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tok = btn.getAttribute('data-approve-pending');
      if (!tok) return;
      const selectEl = pendingContainer.querySelector(`[data-slot-select="${tok}"]`);
      const slotIndex = selectEl ? Number(selectEl.value) : 0;
      try {
        btn.disabled = true;
        btn.textContent = '⏳ Sustituyendo equipo...';
        const res = await approveAndReplaceAuthorizedDevice(user, tok, slotIndex);
        renderAuthorizedDevicesUI(user, res.devices, currentToken, res.pendingDevices);
        showToast(`✅ Nuevo dispositivo autorizado en el Hueco ${slotIndex + 1}/3`);
      } catch (err) {
        alert(err.message || 'No se pudo completar el reemplazo.');
        btn.disabled = false;
        btn.textContent = '✅ Paso 2/2: Autorizar y Sustituir';
      }
    });
  });
}

// =========================================================================
// MÓDULO DE PERFIL DE PEDIDOS, CESTA PENDIENTE DE PAGO Y ESPEJO DEV
// =========================================================================

let clientProfileOrders = [];
let clientPendingBasket = [];
let ordersModuleInitialized = false;

function calcDynamicPriceForProfile(bindingType = 'coil', pageCount = 143, paperThicknessOrType = 0.0635) {
  let base = 27.90;
  if (bindingType === 'perfect' || bindingType === 'softcover') base = 24.90;
  if (bindingType === 'hardcover') base = 32.90;

  // Suplemento por papel Premium 105g (+2,50 €)
  let paperExtra = 0;
  if (typeof paperThicknessOrType === 'string' && (paperThicknessOrType === 'premium_105' || parseFloat(paperThicknessOrType) >= 0.0700)) {
    paperExtra = 2.50;
  } else if (typeof paperThicknessOrType === 'number' && paperThicknessOrType >= 0.0700) {
    paperExtra = 2.50;
  }

  const pages = parseInt(pageCount, 10) || 143;
  let extra = 0;
  if (pages > 300) extra = 5.00;
  else if (pages > 220) extra = 3.00;
  else if (pages > 150) extra = 2.00;
  return +(base + paperExtra + extra).toFixed(2);
}

async function initClientOrdersAndBasketModule(user) {
  // Inicializar siempre para escuchar pedidos y cesta del usuario
  const tabBtnPedidos = document.getElementById('tab-btn-pedidos');
  if (tabBtnPedidos) {
    tabBtnPedidos.style.removeProperty('display');
    tabBtnPedidos.style.setProperty('display', 'inline-flex', 'important');
  }

  await loadClientOrdersAndBasketData(user);
  await checkAndHandleStripeCheckoutReturn();

  if (!ordersModuleInitialized) {
    ordersModuleInitialized = true;

    document.getElementById('btn-dev-open-client-orders-tab')?.addEventListener('click', () => {
      activateTab('tab-pedidos');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Escucha en tiempo real compatible 100% con Reglas de Seguridad de Firestore
  const safeUserEmail = (getUserEmail(user) || '').toLowerCase().trim();

  // 1. Escucha por consulta filtrada de email (Permitida por reglas de Firestore)
  if (safeUserEmail && !window.__mrUserOrdersQueryUnsub) {
    try {
      const qOrders = query(collection(db, 'orders'), where('customer.email', '==', safeUserEmail));
      window.__mrUserOrdersQueryUnsub = onSnapshot(qOrders, (snap) => {
        const remote = [];
        snap.forEach(d => remote.push({ id: d.id, ...d.data() }));
        if (remote.length > 0) {
          const map = new Map();
          clientProfileOrders.forEach(o => { const key = o.orderNumber || o.id; map.set(key, o); });
          remote.forEach(o => {
            const key = o.orderNumber || o.id;
            const prev = map.get(key);
            const merged = mergeOrderRecords(prev, o);
            map.set(key, merged);
            if (prev && prev.status !== o.status) {
              const labels = { pending_review: '1. Revisión Técnica', approved_printing: '2. En Imprenta', printing: '2. En Imprenta', shipped: '3. En Reparto (Correos Express)', delivered: '4. Entregado' };
              showToast(`⚡ Pedido #${o.orderNumber}: Estado actualizado a «${labels[o.status] || o.status}»`);
            }
          });
          clientProfileOrders = Array.from(map.values());
          clientProfileOrders.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
          try { localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders)); } catch (e) {}
          renderClientOrdersAndBasketViews(auth.currentUser || user);
        }
      }, (err) => { console.warn('Aviso en onSnapshot query orders:', err); });
    } catch (e) {}
  }

  // 2. Escucha subcolección privada del usuario: users/{uid}/orders
  if (user && user.uid && !window.__mrUserOrdersSnapshotUnsub) {
    try {
      window.__mrUserOrdersSnapshotUnsub = onSnapshot(collection(db, 'users', user.uid, 'orders'), (snap) => {
        const remote = [];
        snap.forEach(d => remote.push({ id: d.id, ...d.data() }));
        if (remote.length > 0) {
          const map = new Map();
          clientProfileOrders.forEach(o => { const key = o.orderNumber || o.id; map.set(key, o); });
          remote.forEach(o => {
            const key = o.orderNumber || o.id;
            const prev = map.get(key);
            const merged = mergeOrderRecords(prev, o);
            map.set(key, merged);
            if (prev && prev.status !== o.status) {
              const labels = { pending_review: '1. Revisión Técnica', approved_printing: '2. En Imprenta', printing: '2. En Imprenta', shipped: '3. En Reparto (Correos Express)', delivered: '4. Entregado' };
              showToast(`⚡ Pedido #${o.orderNumber}: Estado actualizado a «${labels[o.status] || o.status}»`);
            }
          });
          clientProfileOrders = Array.from(map.values());
          clientProfileOrders.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
          try { localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders)); } catch (e) {}
          renderClientOrdersAndBasketViews(auth.currentUser || user);
        }
      }, (err) => { console.warn('Aviso en onSnapshot users/orders:', err); });
    } catch (e) {}
  }

  // 3. Si el usuario es administrador/desarrollador, también escucha la colección global completa
  if (user && isDeveloper(user) && !window.__mrOrdersAdminGlobalSnapshotUnsub) {
    try {
      window.__mrOrdersAdminGlobalSnapshotUnsub = onSnapshot(collection(db, 'orders'), (snap) => {
        const remote = [];
        snap.forEach(d => remote.push({ id: d.id, ...d.data() }));
        if (remote.length > 0) {
          const map = new Map();
          clientProfileOrders.forEach(o => { const key = o.orderNumber || o.id; map.set(key, o); });
          remote.forEach(o => {
            const key = o.orderNumber || o.id;
            map.set(key, mergeOrderRecords(map.get(key), o));
          });
          clientProfileOrders = Array.from(map.values());
          clientProfileOrders.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
          try { localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders)); } catch (e) {}
          renderClientOrdersAndBasketViews(auth.currentUser || user);
        }
      }, (err) => { console.warn('Aviso admin orders onSnapshot:', err); });
    } catch (e) {}
  }

  renderClientOrdersAndBasketViews(user);
}


function subscribeToIndividualOrders(ordersList) {
  if (!ordersList || !ordersList.length) return;
  if (!window.__mrIndividualOrderUnsubs) window.__mrIndividualOrderUnsubs = new Map();

  ordersList.forEach(ord => {
    const key = ord.orderNumber || ord.id;
    if (!key || window.__mrIndividualOrderUnsubs.has(key)) return;

    try {
      const unsub = onSnapshot(doc(db, 'orders', key), (docSnap) => {
        if (!docSnap.exists()) return;
        const incoming = { id: docSnap.id, ...docSnap.data() };
        const idx = clientProfileOrders.findIndex(o => (
          (o.orderNumber && incoming.orderNumber && o.orderNumber === incoming.orderNumber) ||
          (o.id && incoming.id && o.id === incoming.id) ||
          o.id === key || o.orderNumber === key
        ));
        if (idx >= 0) {
          const prev = clientProfileOrders[idx];
          const merged = mergeOrderRecords(prev, incoming);
          clientProfileOrders[idx] = merged;
          if (prev && prev.status !== incoming.status) {
            const labels = {
              pending_review: '1. Revisión Técnica',
              approved_printing: '2. En Imprenta',
              printing: '2. En Imprenta',
              shipped: '3. En Reparto (Correos Express)',
              delivered: '4. Entregado'
            };
            showToast('⚡ Pedido #' + (incoming.orderNumber || key) + ': Estado actualizado a «' + (labels[incoming.status] || incoming.status) + '»');
          }
        } else {
          clientProfileOrders.unshift(incoming);
        }
        clientProfileOrders.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
        try { localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders)); } catch (e) {}
        renderClientOrdersAndBasketViews(auth.currentUser || currentUser);
      }, (err) => {
        console.warn('Aviso en onSnapshot doc orders ' + key + ':', err);
      });
      window.__mrIndividualOrderUnsubs.set(key, unsub);
    } catch (e) {
      console.warn('Error suscribiendo doc orders ' + key + ':', e);
    }
  });
}

async function loadClientOrdersAndBasketData(user) {
  // 1. Cargar Cesta / Libros Completos Pendientes de Pago
  let pending = [];
  try {
    const rawPending = localStorage.getItem('mr_pending_payment_books');
    if (rawPending) pending = JSON.parse(rawPending);
  } catch (e) {}

  // Si no hay cuadernos pendientes (por haber sido comprados o eliminados), se respeta la cesta vacía
  clientPendingBasket = pending;

  // 2. Cargar Pedidos Impresos del Perfil (Firestore + Local)
  let loadedOrders = [];
  const safeUserSearchEmail = (getUserEmail(user) || '').toLowerCase().trim();
  if (user && (isDeveloper(user) || isTestCustomer(user))) {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      snap.forEach(d => loadedOrders.push({ id: d.id, ...d.data() }));
    } catch (e) {}
  } else if (safeUserSearchEmail) {
    try {
      const q = query(collection(db, 'orders'), where('customer.email', '==', safeUserSearchEmail));
      const snap = await getDocs(q);
      snap.forEach(d => loadedOrders.push({ id: d.id, ...d.data() }));
    } catch (e) {}
  }

  const urlParams = new URLSearchParams(window.location.search);
  const targetUrlOrderId = urlParams.get('order') || urlParams.get('orderId');
  if (targetUrlOrderId) {
    try {
      const dSnap = await getDoc(doc(db, 'orders', targetUrlOrderId));
      if (dSnap.exists()) {
        loadedOrders.push({ id: dSnap.id, ...dSnap.data() });
      }
    } catch (e) {}
  }

  let localSim = [];
  try {
    const rawSim = localStorage.getItem('mr_simulated_orders');
    if (rawSim) localSim = JSON.parse(rawSim);
  } catch (e) {}

  const map = new Map();
  localSim.forEach(o => {
    const key = o.orderNumber || o.id;
    map.set(key, mergeOrderRecords(map.get(key), o));
  });
  loadedOrders.forEach(o => {
    const key = o.orderNumber || o.id;
    map.set(key, mergeOrderRecords(map.get(key), o));
  });

  clientProfileOrders = Array.from(map.values());

  clientProfileOrders.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
  subscribeToIndividualOrders(clientProfileOrders);
}

function saveClientOrdersAndBasketState(user) {
  try {
    localStorage.setItem('mr_pending_payment_books', JSON.stringify(clientPendingBasket));
    localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders));
  } catch (e) {}

  if (user && (isDeveloper(user) || isTestCustomer(user))) {
    clientProfileOrders.forEach(async (ord) => {
      try {
        if (ord.orderNumber) {
          await setDoc(doc(db, 'orders', ord.orderNumber), ord, { merge: true });
        }
        if (ord.id && ord.id !== ord.orderNumber) {
          await setDoc(doc(db, 'orders', ord.id), ord, { merge: true });
        }
        if (user.uid) {
          await setDoc(doc(db, 'users', user.uid, 'orders', ord.orderNumber || ord.id), ord, { merge: true });
        }
      } catch (e) {}
    });
  }
}

function getBindingLabelForProfile(type) {
  if (type === 'perfect' || type === 'softcover') return '📕 Tapa Blanda (Mate)';
  if (type === 'hardcover') return '📘 Tapa Dura (Casewrap)';
  return '🌀 Anillas Metálicas (Wire-O)';
}


// CANAL DE COMUNICACIÓN EN TIEMPO REAL ENTRE PESTAÑAS (CLIENTE <-> GESTOR)
const orderSyncChannel = (typeof window !== 'undefined' && 'BroadcastChannel' in window)
  ? new BroadcastChannel('mr_order_sync_channel')
  : null;

function mergeOrderRecords(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const statusPriority = {
    'pending_review': 1,
    'approved_printing': 2,
    'printing': 2,
    'shipped': 3,
    'delivered': 4,
    'paused': 1
  };

  const priorityExisting = statusPriority[existing.status] || 1;
  const priorityIncoming = statusPriority[incoming.status] || 1;

  const winner = (priorityIncoming >= priorityExisting) ? incoming : existing;
  const loser = (priorityIncoming >= priorityExisting) ? existing : incoming;

  const merged = {
    ...loser,
    ...winner,
    customer: { ...(loser.customer || {}), ...(winner.customer || {}) },
    book: { ...(loser.book || {}), ...(winner.book || {}) },
    pricing: { ...(loser.pricing || {}), ...(winner.pricing || {}) },
    shipping: { ...(loser.shipping || {}), ...(winner.shipping || {}) },
    luluJob: { ...(loser.luluJob || {}), ...(winner.luluJob || {}) },
    comms: { ...(loser.comms || {}), ...(winner.comms || {}) }
  };

  const tlMap = new Map();
  (loser.timeline || []).forEach(ev => {
    if (ev && ev.message) tlMap.set(ev.message, ev);
  });
  (winner.timeline || []).forEach(ev => {
    if (ev && ev.message) tlMap.set(ev.message, ev);
  });
  merged.timeline = Array.from(tlMap.values()).sort((a, b) => {
    const tA = new Date(a.date || 0).getTime();
    const tB = new Date(b.date || 0).getTime();
    return tA - tB;
  });

  return merged;
}

if (orderSyncChannel) {
  orderSyncChannel.onmessage = (event) => {
    const data = event.data;
    if (data && (data.type === 'ORDER_UPDATED' || data.type === 'ORDER_CREATED') && data.order) {
      const incoming = data.order;
      const idx = clientProfileOrders.findIndex(o => (
        (o.orderNumber && incoming.orderNumber && o.orderNumber === incoming.orderNumber) ||
        (o.id && incoming.id && o.id === incoming.id)
      ));
      if (idx >= 0) {
        clientProfileOrders[idx] = mergeOrderRecords(clientProfileOrders[idx], incoming);
      } else {
        clientProfileOrders.unshift(incoming);
      }
      try {
        localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders));
      } catch (e) {}
      renderClientOrdersAndBasketViews(auth.currentUser || currentUser);

      const stepLabels = {
        1: '1. Revisión Técnica',
        2: '2. En Imprenta',
        3: '3. En Reparto (Correos Express)',
        4: '4. Entregado'
      };
      const stIdx = getStepIndexFromStatus(incoming.status);
      showToast(`⚡ Pedido #${incoming.orderNumber}: Estado actualizado a «${stepLabels[stIdx] || incoming.status}»`);
    }
  };
}

function getStepIndexFromStatus(status) {
  if (status === 'pending_review') return 1;
  if (status === 'approved_printing' || status === 'printing') return 2;
  if (status === 'shipped') return 3;
  if (status === 'delivered') return 4;
  return 1;
}

let currentPreviewModalUrl = '';
let itemPendingDeleteId = null;

function openConfirmDeleteBasketModal(itemId) {
  itemPendingDeleteId = itemId;
  const modal = document.getElementById('basket-confirm-delete-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeConfirmDeleteBasketModal() {
  itemPendingDeleteId = null;
  const modal = document.getElementById('basket-confirm-delete-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function openBasketPreviewModal(title, subtitle, iframeSrc) {
  const modal = document.getElementById('basket-pdf-preview-modal');
  const titleEl = document.getElementById('basket-preview-modal-title');
  const subEl = document.getElementById('basket-preview-modal-subtitle');
  const iframe = document.getElementById('basket-preview-iframe');
  const loader = document.getElementById('basket-preview-loading');

  if (!modal || !iframe) return;
  currentPreviewModalUrl = iframeSrc;
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = subtitle;
  if (loader) loader.style.display = 'flex';
  iframe.src = iframeSrc;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBasketPreviewModal() {
  const modal = document.getElementById('basket-pdf-preview-modal');
  const iframe = document.getElementById('basket-preview-iframe');
  if (modal) modal.classList.remove('active');
  if (iframe) iframe.src = 'about:blank';
  document.body.style.overflow = '';
}


// =====================================================================
// =====================================================================
// FUNCIONES Y DELEGACIÓN GLOBAL DE ACCIONES DE CESTA Y CHECKOUT DIRECTO
// =====================================================================

function getBasketItemById(id) {
  let found = clientPendingBasket.find(x => String(x.id) === String(id));
  if (!found && clientPendingBasket.length > 0) {
    found = clientPendingBasket[0];
  }
  return found;
}

function updateBasketCheckoutBar() {
  const bar = document.getElementById('client-basket-checkout-bar');
  if (!bar) return;
  const units = clientPendingBasket.reduce((sum, item) => sum + (typeof item.quantity === 'number' ? item.quantity : 1), 0);
  const total = clientPendingBasket.reduce((sum, item) => {
    const q = (typeof item.quantity === 'number' ? item.quantity : 1);
    return sum + calcDynamicPriceForProfile(item.bindingType, item.pageCount, item.paperThicknessMm || item.paperType) * q;
  }, 0);
  bar.style.display = clientPendingBasket.length > 0 ? 'flex' : 'none';
  const totalEl = document.getElementById('client-basket-total');
  if (totalEl) {
    totalEl.textContent = `${units} ${units === 1 ? 'ejemplar' : 'ejemplares'} · Total ${total.toFixed(2).replace('.', ',')} € (envío incluido)`;
  }
  const btn = document.getElementById('btn-basket-checkout');
  if (btn) {
    btn.disabled = units === 0;
    btn.style.opacity = units === 0 ? '0.55' : '1';
    btn.style.cursor = units === 0 ? 'not-allowed' : 'pointer';
  }
}

window.updateCheckoutShippingSingleLine = function() {
  const name = document.getElementById('checkout-ship-name')?.value.trim() || '';
  const email = document.getElementById('checkout-modal-customer-email')?.value.trim() || '';
  const phone = document.getElementById('checkout-ship-phone')?.value.trim() || '';
  const addr = document.getElementById('checkout-ship-address')?.value.trim() || '';
  const cp = document.getElementById('checkout-ship-postal')?.value.trim() || '';
  const city = document.getElementById('checkout-ship-city')?.value.trim() || '';
  const prov = document.getElementById('checkout-ship-province')?.value.trim() || '';

  const parts = [];
  if (name) parts.push('<strong>' + escapeHtml(name) + '</strong>');
  if (addr) parts.push(escapeHtml(addr));
  if (cp || city) parts.push(escapeHtml((cp + ' ' + city).trim()) + (prov ? ' (' + escapeHtml(prov) + ')' : ''));
  if (phone) parts.push('Tlf: <strong>' + escapeHtml(phone) + '</strong>');
  if (email) parts.push('Email: <strong>' + escapeHtml(email) + '</strong>');

  const lineEl = document.getElementById('checkout-shipping-single-line-text');
  if (lineEl) {
    lineEl.innerHTML = parts.length > 0 ? parts.join(' · ') : '<span style="color:#888;">Introduce los datos arriba para previsualizar la línea completa</span>';
  }
};

function openBasketCheckoutModal(targetItemId = null) {
  const modal = document.getElementById('basket-checkout-modal');
  if (!modal) return;

  // Filtrar estrictamente solo ítems que tengan cantidad > 0
  let selectedItems = clientPendingBasket.filter(x => (x.quantity !== undefined ? x.quantity : 1) > 0);

  if (selectedItems.length === 0) {
    showToast('⚠️ Todos los cuadernos tienen cantidad 0. Pulsa «+» en el cuaderno que quieras comprar.');
    return;
  }

  // Si se abrió para un cuaderno en particular o de forma general, verificar confirmación de textos
  const unconfirmed = selectedItems.find(x => !x.textsConfirmed);
  if (unconfirmed) {
    showToast('⚠️ Debes confirmar la revisión de textos y contenidos marcando la casilla antes de tramitar el pedido.');
    const box = document.getElementById('confirm-box-' + unconfirmed.id);
    if (box) {
      box.style.borderColor = '#dc2626';
      box.style.background = '#fef2f2';
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const chk = box.querySelector('input[type="checkbox"]');
      if (chk) chk.focus();
      setTimeout(() => {
        if (!unconfirmed.textsConfirmed) {
          box.style.borderColor = '#e4d5bc';
          box.style.background = '#fffdf5';
        }
      }, 2200);
    }
    return;
  }

  // 1. Renderizar lista de cuadernos a tramitar
  const itemsContainer = document.getElementById('checkout-modal-items-list');
  let totalAmount = 0;
  let totalUnits = 0;

  if (itemsContainer) {
    itemsContainer.innerHTML = selectedItems.map(item => {
      const q = typeof item.quantity === 'number' ? item.quantity : 1;
      const unitPrice = calcDynamicPriceForProfile(item.bindingType, item.pageCount, item.paperThicknessMm || item.paperType);
      const sub = unitPrice * q;
      totalAmount += sub;
      totalUnits += q;
      const paperTxt = item.paperLabel || (item.paperThicknessMm >= 0.07 ? 'Papel Premium 105g' : 'Papel Crema 90g');
      return `
        <div style="background: #ffffff; border: 1px solid #ebd5c3; border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 0.95rem; color: #1f1c19;">${escapeHtml(item.title)}</div>
            <div style="font-size: 0.8rem; color: #665e54; margin-top: 2px;">
              ${getBindingLabelForProfile(item.bindingType)} · <strong>${item.pageCount} págs</strong> · <strong>${escapeHtml(paperTxt)}</strong> · Cantidad: <strong>${q}</strong> (${unitPrice.toFixed(2).replace('.', ',')} €/ud)
            </div>
          </div>
          <div style="text-align: right; min-width: 90px;">
            <div style="font-weight: 900; font-size: 1.05rem; color: #1f1c19;">
              ${sub.toFixed(2).replace('.', ',')} €
            </div>
            <div style="font-size: 0.7rem; color: #215c38; font-weight: 700;">Envío GRATIS</div>
          </div>
        </div>
      `;
    }).join('');
  }

    // 2. Renderizar resumen limpio de dirección postal en 1 línea y check de validación
  const shipContainer = document.getElementById('checkout-modal-shipping-summary');
  const user = currentUser || auth.currentUser;

  let savedShip = null;
  try {
    const raw = localStorage.getItem('mr_customer_shipping_address');
    if (raw) savedShip = JSON.parse(raw);
  } catch(e) {}

  const shipName = savedShip?.name || savedShip?.nombre || (user ? getUserDisplayName(user) : '') || '';
  const shipEmail = savedShip?.email || localStorage.getItem('mr_customer_contact_email') || (user ? getUserEmail(user) : '') || '';
  const shipPhone = savedShip?.phone || savedShip?.telefono || '';
  const shipAddr = savedShip?.address || savedShip?.direccion || '';
  const shipPostal = savedShip?.postalCode || savedShip?.cp || '';
  const shipCity = savedShip?.city || savedShip?.ciudad || '';
  const shipProv = savedShip?.province || savedShip?.provincia || '';
  const shipNotes = savedShip?.notes || savedShip?.notas || '';

  const hasFullAddress = !!(
    isValidRecipientName(shipName) &&
    isValidDeliveryAddress(shipAddr) &&
    isValidSpanishPostalCode(shipPostal) &&
    isValidPhoneNumber(shipPhone) &&
    isValidEmailAddress(shipEmail) &&
    shipCity && shipCity.length >= 2
  );

  if (shipContainer) {
    if (!hasFullAddress) {
      shipContainer.innerHTML = `
        <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 14px 16px; text-align: center;">
          <div style="font-size: 0.88rem; font-weight: 800; color: #92400e; margin-bottom: 5px;">
            ⚠️ Falta completar o validar tu dirección física de entrega
          </div>
          <p style="font-size: 0.79rem; color: #78350f; margin: 0 0 10px 0; line-height: 1.4;">
            Para imprimir y enviarte el cuaderno por mensajería, necesitamos un código postal de 5 dígitos, un teléfono válido y un email de confirmación.
          </p>
          <button type="button" onclick="closeBasketCheckoutModalAndGoToAjustes()" style="background: #87553b; color: #ffffff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <span>📍</span> Revisar Dirección en «Ajustes y Mis Datos» →
          </button>
        </div>
      `;
    } else {
      const lineHtml = `<strong>${escapeHtml(shipName)}</strong> · ${escapeHtml(shipAddr)}, ${escapeHtml(shipPostal)} ${escapeHtml(shipCity)}${shipProv ? ' (' + escapeHtml(shipProv) + ')' : ''} · Tlf: <strong>${escapeHtml(shipPhone || 'No indicado')}</strong> · Email: <strong>${escapeHtml(shipEmail || 'No indicado')}</strong>`;

      shipContainer.innerHTML = `
        <div style="background: #ffffff; border: 1.5px solid #ded5c6; border-radius: 10px; padding: 13px 15px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
            <span style="font-size: 0.73rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #87553b;">
              📍 Dirección de Entrega Física
            </span>
            <button type="button" onclick="closeBasketCheckoutModalAndGoToAjustes()" style="background: none; border: none; color: #2563eb; font-weight: 700; font-size: 0.78rem; cursor: pointer; text-decoration: underline; padding: 0; display: inline-flex; align-items: center; gap: 4px;">
              ✏️ Modificar en «Ajustes y Mis Datos» →
            </button>
          </div>

          <!-- Línea única limpia -->
          <div style="background: #faf7f2; border: 1px solid #e7dfd1; border-radius: 6px; padding: 10px 12px; font-size: 0.82rem; color: #1f1c19; line-height: 1.55; word-break: break-word;">
            ${lineHtml}
          </div>

          ${shipNotes ? `<div style="font-size: 0.74rem; color: #665e54; margin-top: 6px;">ℹ️ Instrucciones repartidor: <em>${escapeHtml(shipNotes)}</em></div>` : ''}

          <!-- Casilla obligatoria de validación completa -->
          <div id="checkout-shipping-confirm-box" style="margin-top: 12px; background: #fffdf5; border: 1.5px solid #e4d5bc; border-radius: 8px; padding: 11px 13px; transition: all 0.25s;">
            <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 0.82rem; color: #231f1a; line-height: 1.45;">
              <input type="checkbox" id="checkout-ship-confirm-check" onchange="const b = document.getElementById('checkout-shipping-confirm-box'); if(b){ b.style.background = this.checked ? '#f0fdf4' : '#fffdf5'; b.style.borderColor = this.checked ? '#86efac' : '#e4d5bc'; }" style="margin-top: 3px; width: 18px; height: 18px; accent-color: #215c38; cursor: pointer;" />
              <span>
                <strong style="color: #1f1c19;">He comprobado la línea de entrega y valido que la dirección física y el email son exactos y completos.</strong>
                <span style="display: block; font-size: 0.74rem; color: #665b4f; margin-top: 2px;">
                  Entiendo que el cuaderno se imprimirá y enviará físicamente por mensajería a esta dirección exacta.
                </span>
              </span>
            </label>
          </div>
        </div>
      `;
    }
  }

  // 3. Totales
  const subLabel = document.getElementById('checkout-modal-subtotal-label');
  const subVal = document.getElementById('checkout-modal-subtotal-val');
  const totVal = document.getElementById('checkout-modal-total-val');
  if (subLabel) subLabel.textContent = `Subtotal cuadernos (${totalUnits} ${totalUnits === 1 ? 'ejemplar' : 'ejemplares'})`;
  if (subVal) subVal.textContent = totalAmount.toFixed(2).replace('.', ',') + ' €';
  if (totVal) totVal.textContent = totalAmount.toFixed(2).replace('.', ',') + ' €';

  // 4. Restaurar botón
  const confirmBtn = document.getElementById('btn-confirm-checkout-order');
  const confirmTxt = document.getElementById('btn-confirm-checkout-order-text');
  if (confirmBtn) confirmBtn.disabled = false;
  if (confirmTxt) confirmTxt.textContent = `Pagar con Tarjeta · ${totalAmount.toFixed(2).replace('.', ',')} € (Envío incluido)`;

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
  });
  document.body.style.overflow = 'hidden';
}
window.openBasketCheckoutModal = openBasketCheckoutModal;

function closeBasketCheckoutModal() {
  const modal = document.getElementById('basket-checkout-modal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.style.display = 'none';
    }, 240);
  }
  document.body.style.overflow = '';
}
window.closeBasketCheckoutModal = closeBasketCheckoutModal;


async function handleConfirmCheckoutOrder() {
  const selectedItems = clientPendingBasket.filter(x => (x.quantity !== undefined ? x.quantity : 1) > 0);
  if (selectedItems.length === 0) {
    showToast('⚠️ No hay ningún ejemplar con cantidad seleccionada.');
    return;
  }

  const confirmBtn = document.getElementById('btn-confirm-checkout-order');
  const confirmTxt = document.getElementById('btn-confirm-checkout-order-text');
  if (confirmBtn) confirmBtn.disabled = true;
  if (confirmTxt) confirmTxt.textContent = '🔒 Registrando pedido y confirmando...';

  const user = currentUser || auth.currentUser;
    let savedShip = null;
  try {
    const raw = localStorage.getItem('mr_customer_shipping_address');
    if (raw) savedShip = JSON.parse(raw);
  } catch(e) {}

  const shipName = savedShip?.name || savedShip?.nombre || (user ? getUserDisplayName(user) : '') || '';
  const shipEmail = savedShip?.email || localStorage.getItem('mr_customer_contact_email') || (user ? getUserEmail(user) : '') || '';
  const shipPhone = savedShip?.phone || savedShip?.telefono || '';
  const shipAddr = savedShip?.address || savedShip?.direccion || '';
  const shipPostal = savedShip?.postalCode || savedShip?.cp || '';
  const shipCity = savedShip?.city || savedShip?.ciudad || '';
  const shipProv = savedShip?.province || savedShip?.provincia || '';
  const shipNotes = savedShip?.notes || savedShip?.notas || '';

  if (!isValidRecipientName(shipName) || !isValidDeliveryAddress(shipAddr) || !isValidSpanishPostalCode(shipPostal) || !isValidPhoneNumber(shipPhone) || !isValidEmailAddress(shipEmail) || !shipCity) {
    alert('⚠️ Por favor, comprueba tus datos de entrega en «Ajustes y Mis Datos». Asegúrate de que el código postal tenga 5 dígitos (ej. 28001), el teléfono al menos 9 dígitos y el correo un formato válido.');
    closeBasketCheckoutModalAndGoToAjustes();
    if (confirmBtn) confirmBtn.disabled = false;
    return;
  }

  const chkShipConfirm = document.getElementById('checkout-ship-confirm-check');
  if (chkShipConfirm && !chkShipConfirm.checked) {
    alert('⚠️ Por favor, revisa la línea de entrega y marca la casilla confirmando que los datos son exactos.');
    const box = document.getElementById('checkout-shipping-confirm-box');
    if (box) {
      box.style.borderColor = '#dc2626';
      box.style.background = '#fef2f2';
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      chkShipConfirm.focus();
    }
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = 'Confirmar Pedido';
    return;
  }

  const shippingObj = {
    name: shipName,
    email: shipEmail,
    phone: shipPhone,
    address: shipAddr,
    postalCode: shipPostal,
    city: shipCity,
    province: shipProv,
    country: 'España',
    notes: shipNotes || 'Sin instrucciones adicionales'
  };

  const customerPlatformName = shipName;
  const customerPlatformEmail = shipEmail;
  const firstShip = shippingObj;

  // Verificar que todos los libros de la cesta tengan páginas pares
  for (const it of selectedItems) {
    const pCount = it.pageCount || 144;
    if (pCount % 2 !== 0) {
      alert(`⚠️ El cuaderno "${it.title}" tiene un número impar de páginas (${pCount} págs).

Para imprenta el número de páginas debe ser estrictamente par. Ajusta el interior antes de pagar.`);
      if (confirmBtn) confirmBtn.disabled = false;
      if (confirmTxt) confirmTxt.textContent = 'Confirmar Pedido (0 € Test)';
      return;
    }
  }

  // Calcular total acumulado de todos los libros
  let totalAmount = 0;
  selectedItems.forEach(it => {
    const q = typeof it.quantity === 'number' ? it.quantity : 1;
    totalAmount += calcDynamicPriceForProfile(it.bindingType, it.pageCount, it.paperThicknessMm || it.paperType) * q;
  });

  const orderNumber = 'MR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const primaryItem = selectedItems[0];
  const pageCount = primaryItem.pageCount || 144;
  const spineWidth = (pageCount * 0.057).toFixed(1);

  // Guardar datos temporales del pedido para el retorno de la pasarela Stripe
  const activeCheckoutOrder = {
    orderNumber,
    items: selectedItems,
    customer: {
      uid: user?.uid || (auth.currentUser ? auth.currentUser.uid : ''),
      name: customerPlatformName,
      email: customerPlatformEmail.toLowerCase().trim(),
      phone: firstShip.phone || '+34 600 000 000',
      address: firstShip.address,
      postalCode: firstShip.postalCode,
      city: firstShip.city,
      province: firstShip.province,
      country: 'España',
      notes: firstShip.notes || 'Sin instrucciones adicionales'
    },
    deliveryNotes: firstShip.notes || 'Sin instrucciones adicionales',
    totalAmount,
    createdAt: new Date().toISOString()
  };

  try {
    localStorage.setItem('mr_active_checkout_order', JSON.stringify(activeCheckoutOrder));
  } catch(e) {}

  // Comprobación de seguridad: la tienda está en modo privado exclusivo para jesgilcan y jesusgil_87
  const currentEmail = (user ? getUserEmail(user) : '').toLowerCase().trim();
  const currentUsername = currentEmail.split('@')[0];
  const isAuthorizedClient = currentUsername === 'jesgilcan' || 
                             currentUsername.startsWith('jesgilcan') || 
                             currentUsername === 'jesusgil_87' || 
                             currentUsername === 'jesusgil87' || 
                             currentUsername.startsWith('jesusgil_87');

  if (!isAuthorizedClient) {
    alert('🔒 Tienda en Fase Privada de Pruebas\n\nEl trámite de compra con tarjeta está restringido temporalmente a las cuentas de prueba autorizadas (jesgilcan y jesusgil_87).');
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = `Pagar con Tarjeta · ${totalAmount.toFixed(2).replace('.', ',')} € (Envío incluido)`;
    return;
  }

  // Iniciar sesión segura en Stripe Checkout
  try {
    const idToken = user ? await user.getIdToken() : '';
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      },
      body: JSON.stringify({
        items: selectedItems,
        bookTitle: primaryItem.title,
        bookSubtitle: primaryItem.subtitle || 'Edición Personalizada',
        bindingType: primaryItem.bindingType || 'softcover',
        pageCount: pageCount,
        customerName: firstShip.name,
        customerEmail: firstShip.email,
        customerPhone: firstShip.phone,
        address: firstShip.address,
        postalCode: firstShip.postalCode,
        city: firstShip.city,
        province: firstShip.province,
        notes: firstShip.notes || '',
        returnOrigin: window.location.origin
      })
    });

    const data = await res.json();
    if (!res.ok || !data.checkoutUrl) {
      throw new Error(data.error || 'No se pudo iniciar la sesión de pago con tarjeta en Stripe.');
    }

    // Redirigir a la pasarela segura de pago
    window.location.href = data.checkoutUrl;
    return;
  } catch (err) {
    console.error('Error al iniciar pago con Stripe:', err);
    alert('⚠️ No se pudo conectar con la pasarela de pago: ' + (err.message || 'Inténtalo de nuevo en unos instantes.'));
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = `Pagar con Tarjeta · ${totalAmount.toFixed(2).replace('.', ',')} € (Envío incluido)`;
    return;
  }
}


async function checkAndHandleStripeCheckoutReturn() {
  const urlParams = new URLSearchParams(window.location.search);
  const isStripeSuccess = urlParams.get('stripe_success') === '1' || urlParams.get('stripe_test_success') === '1';
  const sessionId = urlParams.get('session_id');
  const ordNumber = urlParams.get('order');

  if (!isStripeSuccess) return;

  try {
    const rawActive = localStorage.getItem('mr_active_checkout_order');
    let activeData = null;
    if (rawActive) {
      try { activeData = JSON.parse(rawActive); } catch(e) {}
    }

    let stripeVerified = true;
    let stripeData = null;
    if (sessionId) {
      try {
        const vRes = await fetch(`/api/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`);
        if (vRes.ok) {
          stripeData = await vRes.json();
          stripeVerified = stripeData.paid;
        }
      } catch(e) {}
    }

    if (stripeVerified) {
      // Retirar de la cesta pendiente todos los libros comprados
      try {
        const pendingRaw = localStorage.getItem('mr_pending_payment_books');
        if (pendingRaw) {
          let pList = JSON.parse(pendingRaw);
          const itemsList = activeData?.items || (activeData?.item ? [activeData.item] : []);
          const boughtTitles = itemsList.map(x => x.title);
          if (boughtTitles.length > 0) {
            pList = pList.filter(x => !boughtTitles.includes(x.title));
          } else {
            pList = [];
          }
          localStorage.setItem('mr_pending_payment_books', JSON.stringify(pList));
          clientPendingBasket = pList;
        }
        localStorage.removeItem('mr_cart_cover_item');
        localStorage.removeItem('mr_active_checkout_order');
      } catch(e) {}

      const user = auth.currentUser;
      const orderNumber = ordNumber || activeData?.orderNumber || ('MR-2026-' + Math.floor(1000 + Math.random() * 9000));
      const pageCount = parseInt(stripeData?.metadata?.page_count || activeData?.item?.pageCount || 144, 10);
      const spineWidth = (pageCount * 0.057).toFixed(1);

      const itemsList = activeData?.items || (activeData?.item ? [activeData.item] : []);
      const platformCustomerName = (user ? getUserDisplayName(user) : '') || activeData?.customer?.name || stripeData?.customerName || 'Cliente';
      const platformCustomerEmail = (user ? getUserEmail(user) : '') || activeData?.customer?.email || stripeData?.customerEmail || 'jesusgil_87@hotmail.com';
      const consolidatedNotes = activeData?.deliveryNotes || activeData?.customer?.notes || stripeData?.metadata?.customer_notes || 'Sin instrucciones adicionales';

      const newOrder = {
        id: 'ord_' + Date.now(),
        orderNumber: orderNumber,
        status: 'pending_review',
        createdAt: new Date().toISOString(),
        items: itemsList,
        customer: {
          uid: user?.uid || (auth.currentUser ? auth.currentUser.uid : ''),
          name: platformCustomerName,
          email: platformCustomerEmail.toLowerCase().trim(),
          phone: activeData?.customer?.phone || '+34 600 000 000',
          address: activeData?.customer?.address || 'Calle Serrano 42',
          postalCode: activeData?.customer?.postalCode || '28001',
          city: activeData?.customer?.city || 'Madrid',
          province: activeData?.customer?.province || 'Madrid',
          country: 'España',
          notes: consolidatedNotes,
          isRegistered: true
        },
        shipping: {
          carrier: 'Correos Express',
          trackingNumber: 'CEX-' + Math.floor(10000000 + Math.random() * 90000000),
          lastCarrierMessage: 'Pedido recibido. En fase 1: En Revisión Técnica de tripas y maquetación.'
        },
        comms: {
          compra: { sent: true, date: new Date().toISOString(), id: 're_' + Date.now() },
          imprenta: { sent: false },
          tracking: { sent: false },
          entregado: { sent: false }
        },
        book: {
          title: stripeData?.metadata?.book_title || activeData?.item?.title || 'Cuaderno Personalizado',
          subtitle: activeData?.item?.subtitle || 'Edición Personalizada',
          bindingType: stripeData?.metadata?.binding_type || activeData?.item?.bindingType || 'softcover',
          pageCount: pageCount,
          quantity: 1,
          size: '8.25x6',
          spineWidthMm: spineWidth
        },
        pricing: {
          currency: 'EUR',
          totalPaid: stripeData?.amountTotal || 27.90,
          luluCostEstimate: parseFloat(stripeData?.metadata?.lulu_total_cost_eur || 13.93),
          netMargin: parseFloat(stripeData?.metadata?.net_margin_eur || 13.30),
          stripePaymentId: stripeData?.paymentIntentId || sessionId || 'cs_test_direct'
        },
        timeline: [
          {
            date: new Date().toISOString(),
            message: 'Pedido recibido y registrado en imprenta'
          },
          {
            date: new Date().toISOString(),
            message: 'Pago con tarjeta confirmado vía Stripe Checkout'
          }
        ]
      };

      const finalOrder = (stripeData && stripeData.order) ? stripeData.order : newOrder;

      try {
        if (finalOrder.orderNumber) {
          await setDoc(doc(db, 'orders', finalOrder.orderNumber), finalOrder, { merge: true });
        }
        if (user && user.uid) {
          await setDoc(doc(db, 'users', user.uid, 'orders', finalOrder.orderNumber), finalOrder, { merge: true });
        }
      } catch(e) {}

      // Emitir evento instantáneo a la ventana del gestor
      if (orderSyncChannel) {
        orderSyncChannel.postMessage({ type: 'ORDER_CREATED', order: finalOrder });
      }

      const existingIdx = clientProfileOrders.findIndex(o => (o.orderNumber === finalOrder.orderNumber || o.id === finalOrder.id));
      if (existingIdx >= 0) {
        clientProfileOrders[existingIdx] = mergeOrderRecords(clientProfileOrders[existingIdx], finalOrder);
      } else {
        clientProfileOrders.unshift(finalOrder);
      }
      try {
        localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders));
      } catch(e) {}

      subscribeToIndividualOrders([finalOrder]);

      showToast('🎉 ¡Pago completado con éxito en Stripe! Pedido #' + orderNumber + ' registrado.');

      try {
        window.history.replaceState({}, document.title, '/mi-espacio.html?tab=pedidos&orderId=' + encodeURIComponent(orderNumber));
      } catch(e) {}

      renderClientOrdersAndBasketViews(user || auth.currentUser || currentUser);
      activateTab('tab-pedidos');
    }
  } catch(err) {
    console.error('Error procesando retorno de Stripe:', err);
  }
}

function handleBasketCoverPdfClick(id) {
  const item = getBasketItemById(id);
  if (!item) return;
  try {
    localStorage.setItem('mr_cart_cover_item', JSON.stringify({
      title: item.title,
      bindingType: item.bindingType,
      pageCount: item.pageCount,
      syncedBookName: item.subtitle,
      data: item.data || {},
      updatedAt: Date.now()
    }));
  } catch (e) {}

  showToast('⏳ Preparando y descargando Portada en PDF...');
  window.open(`/generador-portadas.html?download_direct=1&ts=${Date.now()}`, '_blank');
}

function handleBasketInteriorPdfClick(id) {
  const item = getBasketItemById(id);
  if (!item) return;
  try {
    localStorage.setItem('mr_complete_book_config', JSON.stringify({
      title: item.title,
      subtitle: item.subtitle,
      pageCount: item.pageCount,
      bindingType: item.bindingType,
      data: item.data || {}
    }));
  } catch (e) {}

  showToast('⏳ Preparando y descargando Interior Completo en PDF...');
  window.open(`/generador-libro-completo.html?download_direct=1&ts=${Date.now()}`, '_blank');
}

// Delegación global de clicks (inmune a re-renderizados del contenedor)
document.addEventListener('click', (e) => {
  // 1. Botón único «Tramitar pedido» de la cesta
  if (e.target.closest('#btn-basket-checkout')) {
    e.preventDefault();
    e.stopPropagation();
    openBasketCheckoutModal();
    return;
  }

  // 1b. Botones de Cantidad (+ / -)
  const qtyIncBtn = e.target.closest('[data-qty-inc]');
  if (qtyIncBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = qtyIncBtn.getAttribute('data-qty-inc');
    const target = clientPendingBasket.find(x => String(x.id) === String(id));
    if (target) {
      target.quantity = (typeof target.quantity === 'number' ? target.quantity : 1) + 1;
      saveClientOrdersAndBasketState(currentUser || auth.currentUser);
      renderClientOrdersAndBasketViews(currentUser || auth.currentUser);
    }
    return;
  }

  const qtyDecBtn = e.target.closest('[data-qty-dec]');
  if (qtyDecBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = qtyDecBtn.getAttribute('data-qty-dec');
    const target = clientPendingBasket.find(x => String(x.id) === String(id));
    if (target) {
      const curr = typeof target.quantity === 'number' ? target.quantity : 1;
      target.quantity = Math.max(0, curr - 1);
      saveClientOrdersAndBasketState(currentUser || auth.currentUser);
      renderClientOrdersAndBasketViews(currentUser || auth.currentUser);
    }
    return;
  }

  // 1d. Botón Confirmar Compra en Modal
  if (e.target.id === 'btn-confirm-checkout-order' || e.target.closest('#btn-confirm-checkout-order')) {
    e.preventDefault();
    e.stopPropagation();
    handleConfirmCheckoutOrder();
    return;
  }

  // 1e. Botones de Cierre de Modal Checkout
  if (e.target.id === 'btn-close-checkout-modal' || e.target.id === 'btn-cancel-checkout-modal' || e.target.id === 'basket-checkout-modal') {
    closeBasketCheckoutModal();
    return;
  }

  // 2. Descargar Portada PDF
  const coverBtn = e.target.closest('[data-preview-pdf-cover]');
  if (coverBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = coverBtn.getAttribute('data-preview-pdf-cover');
    handleBasketCoverPdfClick(id);
    return;
  }

  // 3. Descargar Interior PDF
  const intBtn = e.target.closest('[data-preview-pdf-interior]');
  if (intBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = intBtn.getAttribute('data-preview-pdf-interior');
    handleBasketInteriorPdfClick(id);
    return;
  }

  // 4. Botón Eliminar de la Cesta
  const delBtn = e.target.closest('[data-del-pending]');
  if (delBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = delBtn.getAttribute('data-del-pending');
    openConfirmDeleteBasketModal(id);
    return;
  }

  // 5. «Cambiar dirección en Ajustes»: la dirección se edita en un solo sitio y se aplica a toda la cesta
  if (e.target.closest('[data-go-ajustes-shipping]')) {
    e.preventDefault();
    e.stopPropagation();
    activateTab('tab-ajustes');
    const shipCard = document.getElementById('ajustes-shipping-name')?.closest('.ajustes-card');
    if (shipCard) shipCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  // 6. Botones de modales de cesta
  if (e.target.id === 'btn-close-basket-preview' || e.target.id === 'btn-close-basket-preview-foot') {
    closeBasketPreviewModal();
    return;
  }
  if (e.target.id === 'basket-pdf-preview-modal') {
    closeBasketPreviewModal();
    return;
  }
  if (e.target.id === 'btn-cancel-delete-basket-item' || e.target.id === 'basket-confirm-delete-modal') {
    closeConfirmDeleteBasketModal();
    return;
  }
  if (e.target.id === 'btn-confirm-delete-basket-item') {
    if (!itemPendingDeleteId) return;
    clientPendingBasket = clientPendingBasket.filter(x => String(x.id) !== String(itemPendingDeleteId));
    saveClientOrdersAndBasketState(currentUser || auth.currentUser);
    renderClientOrdersAndBasketViews(currentUser || auth.currentUser);
    closeConfirmDeleteBasketModal();
    showToast('🗑️ Ejemplar retirado de la cesta');
    return;
  }
});

// Listener global de cambio en casilla de verificación de textos
document.addEventListener('change', (e) => {
  const chk = e.target.closest('[data-confirm-texts]');
  if (chk) {
    const itemId = chk.getAttribute('data-confirm-texts');
    const found = clientPendingBasket.find(x => String(x.id) === String(itemId));
    if (!found) return;
    found.textsConfirmed = !!chk.checked;
    saveClientOrdersAndBasketState(currentUser || auth.currentUser);
    const box = document.getElementById('confirm-box-' + itemId);
    if (box) {
      box.style.background = found.textsConfirmed ? '#f0fdf4' : '#fffbeb';
      box.style.borderColor = found.textsConfirmed ? '#86efac' : '#fcd34d';
    }
    if (found.textsConfirmed) {
      showToast('✓ Textos confirmados para imprenta.');
    }
  }
});

function renderClientOrdersAndBasketViews(user) {
  const badgeEl = document.getElementById('client-orders-badge');
  if (badgeEl) {
    const totalCount = clientProfileOrders.length + clientPendingBasket.length;
    badgeEl.textContent = String(totalCount);
    badgeEl.style.display = totalCount > 0 ? 'inline-block' : 'none';
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
      pendingContainer.innerHTML = clientPendingBasket.map((item, idx) => {
        if (!item.id) item.id = 'pend_item_' + (idx + 1) + '_' + Date.now();
        if (typeof item.quantity !== 'number') item.quantity = 1;

        const unitPrice = calcDynamicPriceForProfile(item.bindingType, item.pageCount, item.paperThicknessMm || item.paperType);
        const subtotal = unitPrice * item.quantity;
        const subtotalText = subtotal > 0 ? (subtotal.toFixed(2).replace('.', ',') + ' €') : '0,00 €';
        const unitPriceText = unitPrice.toFixed(2).replace('.', ',') + ' €';

        // Asegurar que item.data y item.shipping existen para evitar valores vacíos
        if (!item.data) {
          item.data = {
            title: item.title || 'Planificador Personalizado',
            subtitle: item.subtitle || '',
            author: 'Clara Beltrán',
            spineText: item.title || 'PLANIFICADOR',
            frontDesc: ''
          };
        }
        if (!item.shipping) {
          item.shipping = {
            name: (user ? getUserDisplayName(user) : '') || 'Cliente Menos Ruido',
            email: (user ? getUserEmail(user) : '') || 'jesusgil_87@hotmail.com',
            address: 'Calle Serrano 42, 4º Derecha',
            postalCode: '28001',
            city: 'Madrid',
            country: 'España',
            phone: '+34 600 000 000',
            notes: 'Entregar en conserjería si no estoy en casa.'
          };
        }

        const isChecked = !!item.textsConfirmed;
        const spineWidthMm = (item.pageCount * 0.057).toFixed(1);
        const fileSizeMb = item.fileSizeMb || (item.pageCount * 0.31).toFixed(1);
        const paperBadgeText = item.paperLabel || (item.paperThicknessMm >= 0.07 ? 'Papel Premium 105g' : 'Papel Crema 90g');

        return `
          <div class="pending-basket-card" data-basket-card-id="${escapeHtml(item.id)}" style="background: #ffffff; border: 1.5px solid #dfd6c7; border-radius: 12px; padding: 18px 20px; box-shadow: 0 3px 12px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 14px;">
            
            <!-- Cabecera Principal de la Tarjeta -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
              <div style="flex: 1; min-width: 260px;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
                  <span style="background: #fffbeb; color: #92400e; border: 1px solid #fde68a; font-size: 0.7rem; font-weight: 800; padding: 3px 9px; border-radius: 12px; letter-spacing: 0.3px;">⏳ PENDIENTE DE PAGO</span>
                  <span style="background: #fdf6ec; color: #78350f; border: 1px solid #fed7aa; font-size: 0.7rem; font-weight: 800; padding: 3px 9px; border-radius: 12px; letter-spacing: 0.3px;">📖 ${escapeHtml(paperBadgeText)}</span>
                </div>
                <h4 id="basket-title-display-${escapeHtml(item.id)}" style="font-family: var(--font-display); font-size: 1.22rem; margin: 4px 0 3px 0; color: #1f1c19;">${escapeHtml(item.title)}</h4>
                <div id="basket-subtitle-display-${escapeHtml(item.id)}" style="font-size: 0.84rem; color: #665e54;">
                  ${getBindingLabelForProfile(item.bindingType)} · <strong>${item.pageCount} páginas interiores</strong> · ${escapeHtml(item.subtitle || '')}
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                
                <!-- Selector de Cantidad -->
                <div style="display: flex; align-items: center; gap: 6px; background: #faf7f2; border: 1.5px solid #dcd4c6; border-radius: 8px; padding: 4px 10px;">
                  <span style="font-size: 0.76rem; font-weight: 700; color: #5a5147; margin-right: 2px;">Uds:</span>
                  <button type="button" data-qty-dec="${escapeHtml(item.id)}" style="background: #ffffff; border: 1px solid #cfc5b6; width: 28px; height: 28px; border-radius: 5px; font-weight: 900; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #3a3229;" title="Restar ejemplar">-</button>
                  <span id="qty-val-${escapeHtml(item.id)}" style="font-weight: 800; font-size: 0.96rem; min-width: 24px; text-align: center; color: #1f1c19;">${item.quantity}</span>
                  <button type="button" data-qty-inc="${escapeHtml(item.id)}" style="background: #ffffff; border: 1px solid #cfc5b6; width: 28px; height: 28px; border-radius: 5px; font-weight: 900; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #3a3229;" title="Añadir ejemplar">+</button>
                </div>

                <div style="text-align: right; min-width: 100px;">
                  <div style="font-size: 1.3rem; font-weight: 900; color: ${item.quantity > 0 ? '#1f1c19' : '#991b1b'};">${subtotalText}</div>
                  <div style="font-size: 0.72rem; color: #665e54;">
                    ${item.quantity > 0 ? `(${item.quantity} × ${unitPriceText})` : '(0 seleccionados)'}
                  </div>
                  <div style="font-size: 0.7rem; font-weight: 700; color: #215c38;">🚚 Envío GRATIS</div>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <!-- Botón Descargar Portada PDF -->
                  <button type="button" data-preview-pdf-cover="${escapeHtml(item.id)}" style="background: #22382c; color: #ffffff; border: none; border-radius: 8px; padding: 10px 14px; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Descargar PDF de portada">
                    <span>📥</span> Descargar Portada PDF
                  </button>
                  <!-- Botón Descargar Interior PDF -->
                  <button type="button" data-preview-pdf-interior="${escapeHtml(item.id)}" style="background: #87553b; color: #ffffff; border: none; border-radius: 8px; padding: 10px 14px; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Descargar PDF interior">
                    <span>📥</span> Descargar Interior PDF
                  </button>
                  <!-- Botón Eliminar -->
                  <button type="button" data-del-pending="${escapeHtml(item.id)}" style="background: #fff5f5; color: #991b1b; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; font-size: 0.82rem; cursor: pointer; font-weight: 600;" title="Quitar de la cesta">
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            <!-- Desplegable Acordeón: Ficha Técnica, PDFs y Dirección -->
            <details id="details-pending-${escapeHtml(item.id)}" style="background: #faf7f2; border: 1px solid #e6ded2; border-radius: 9px; padding: 12px 16px; margin-top: 4px;">
              <summary style="cursor: pointer; font-weight: 700; font-size: 0.84rem; color: #443c33; display: flex; align-items: center; justify-content: space-between; user-select: none;">
                <span>🔍 Ver características técnicas, PDFs y dirección de entrega</span>
                <span style="font-size: 0.78rem; color: #87553b; font-weight: 600;">Desplegar ficha ▾</span>
              </summary>

              <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 16px;">
                
                <!-- 1. Características Técnicas -->
                <div style="background: #ffffff; border: 1px solid #e5ded2; border-radius: 8px; padding: 14px 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                    <strong style="font-size: 0.85rem; color: #1f1c19;">📐 Ficha Técnica</strong>
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; font-size: 0.78rem; color: #554d44;">
                    <div style="background: #fdfbf7; padding: 8px 10px; border-radius: 6px; border: 1px solid #eee7dc;">
                      <strong>Encuadernación:</strong><br>${getBindingLabelForProfile(item.bindingType)}
                    </div>
                    <div style="background: #fdfbf7; padding: 8px 10px; border-radius: 6px; border: 1px solid #eee7dc;">
                      <strong>Formato:</strong><br>Apaisado 8.25" × 6" (210 × 152 mm)
                    </div>
                    <div style="background: #fdfbf7; padding: 8px 10px; border-radius: 6px; border: 1px solid #eee7dc;">
                      <strong>Páginas interiores:</strong><br>${item.pageCount} páginas (Papel crema 80g)
                    </div>
                    <div style="background: #fdfbf7; padding: 8px 10px; border-radius: 6px; border: 1px solid #eee7dc;">
                      <strong>Lomo milimétrico:</strong><br>${spineWidthMm} mm de grosor
                    </div>
                    <div style="background: #fdfbf7; padding: 8px 10px; border-radius: 6px; border: 1px solid #eee7dc;">
                      <strong>Margen y Sangrado:</strong><br>3.175 mm perimetral
                    </div>
                  </div>
                </div>

                <!-- 2. Dirección de Envío y Datos Personales -->
                <div style="background: #ffffff; border: 1px solid #e5ded2; border-radius: 8px; padding: 14px 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                    <strong style="font-size: 0.85rem; color: #1f1c19;">🚚 Dirección de Entrega y Datos del Destinatario</strong>
                    <button type="button" data-go-ajustes-shipping="1" style="background: #f2ece1; color: #443c33; border: 1px solid #d4c8b6; border-radius: 6px; padding: 6px 12px; font-size: 0.76rem; font-weight: 700; cursor: pointer;">
                      ✏️ Cambiar dirección en Ajustes y mis datos
                    </button>
                  </div>
                  <div id="shipping-display-${escapeHtml(item.id)}" style="font-size: 0.82rem; color: #475569; line-height: 1.5;">
                    <strong>Destinatario:</strong> ${escapeHtml(item.shipping?.name || user?.displayName || 'Cliente Menos Ruido')} (${escapeHtml(item.shipping?.email || user?.email || 'jesusgil_87@hotmail.com')})<br>
                    <strong>Dirección:</strong> ${escapeHtml(item.shipping?.address || 'Calle Serrano 42, 4º Derecha')}, ${escapeHtml(item.shipping?.postalCode || '28001')} ${escapeHtml(item.shipping?.city || 'Madrid')} (${escapeHtml(item.shipping?.province || 'Madrid')}), ${escapeHtml(item.shipping?.country || 'España')}<br>
                    <strong>Teléfono de contacto:</strong> ${escapeHtml(item.shipping?.phone || '+34 600 000 000')}<br>
                    <strong>Instrucciones al repartidor:</strong> <em>${escapeHtml(item.shipping?.notes || 'Entregar en conserjería si no estoy en casa.')}</em>
                  </div>
                </div>

              </div>
            </details>

            <!-- Casilla de Aceptación y Confirmación de Ortografía y Textos (FUERA DEL DESPLEGABLE) -->
            <div id="confirm-box-${escapeHtml(item.id)}" style="background: ${isChecked ? '#f0fdf4' : '#fffdf5'}; border: 1.5px solid ${isChecked ? '#86efac' : '#e4d5bc'}; border-radius: 8px; padding: 12px 14px; margin-top: 2px; transition: all 0.25s ease;">
              <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 0.84rem; color: #231f1a; line-height: 1.45;">
                <input type="checkbox" data-confirm-texts="${escapeHtml(item.id)}" ${isChecked ? 'checked' : ''} style="margin-top: 3px; width: 18px; height: 18px; accent-color: #215c38; cursor: pointer;" />
                <span>
                  <strong style="color: #1f1c19;">He revisado la previsualización y asumo la responsabilidad sobre los textos y contenidos introducidos.</strong>
                  <span style="display: block; font-size: 0.77rem; color: #665b4f; margin-top: 2px;">
                    Confirmo que todos los datos y nombres propios son correctos para su impresión final en papel.
                  </span>
                </span>
              </label>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Barra inferior de la cesta: total y botón único «Tramitar pedido»
  updateBasketCheckoutBar();

// 2. RENDERIZAR BLOQUE B: HISTORIAL Y SEGUIMIENTO DE PEDIDOS EN EL PERFIL DEL CLIENTE
  const ordersContainer = document.getElementById('client-orders-history-list');
  if (ordersContainer) {
    if (clientProfileOrders.length === 0) {
      ordersContainer.innerHTML = `
        <div style="padding: 28px 20px; text-align: center; color: #786e63; font-size: 0.88rem; background: #ffffff; border-radius: 8px; border: 1px dashed #dcd4c6;">
          <span style="font-size: 2rem; display: block; margin-bottom: 8px;">📦</span>
          <strong style="color: #1f1c19; font-size: 0.98rem; display: block; margin-bottom: 5px;">Aún no tienes pedidos registrados</strong>
          <span style="max-width: 500px; display: inline-block; line-height: 1.5; color: #665e54;">
            Cuando realices un encargo, aquí podrás seguir en tiempo real las 4 etapas de tu pedido (Revisión técnica, En imprenta, En reparto y Entregado) con enlace al localizador oficial de Correos Express.
          </span>
        </div>
      `;
    } else {
      ordersContainer.innerHTML = clientProfileOrders.map(ord => {
      const step = getStepIndexFromStatus(ord.status);
      const totalPaid = parseFloat(ord.pricing?.totalPaid || 27.90).toFixed(2).replace('.', ',');
      const carrier = ord.shipping?.carrier || 'Correos Express';
      const trackingNum = ord.shipping?.trackingNumber || ord.luluJob?.trackingCode || 'Pendiente de asignación en fábrica';
      const carrierMsg = ord.shipping?.lastCarrierMessage || 'Tu ejemplar está siendo procesado antes de entregarse a la empresa repartidora.';
      const fileSizeMb = ord.book?.fileSizeMb || ((ord.book?.pageCount || 143) * 0.32).toFixed(1);

      const stepsHtml = [
        { n: 1, label: '1. Revisión Técnica', sub: 'Comprobación técnica' },
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

      const cleanTimeline = (ord.timeline || []).filter(ev => {
        const m = ev.message || '';
        return !m.includes('Se envían confirmaciones a Cliente y Gestor') &&
               !m.includes('en modo Simulación') &&
               !m.includes('SIMULACIÓN') &&
               !m.includes('Emails de Etapa') &&
               !m.includes('a Cliente y Gestor');
      });
      const timelineHtml = cleanTimeline.slice().reverse().map(ev => `
        <div style="display: flex; gap: 10px; font-size: 0.8rem; color: #38322c; padding: 6px 0; border-bottom: 1px dashed #ebe5da;">
          <span style="color: #87553b; font-weight: 700; white-space: nowrap;">${formatDate(ev.date)}</span>
          <span>${escapeHtml(ev.message)}</span>
        </div>
      `).join('');

      const correosUrl = `https://www.correos.es/es/es/herramientas/localizador/envios?numero=${encodeURIComponent(trackingNum)}`;
      const courierBlockHtml = (step === 4) ? `
          <!-- Bloque de Entrega Completada en Domicilio (Fase 4/4) -->
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 16px 18px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
              <div style="font-size: 0.86rem; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.4px;">
                🎉 Etapa 4/4: Pedido Entregado en tu Domicilio
              </div>
              <a href="${correosUrl}" target="_blank" rel="noopener noreferrer" style="font-family: monospace; font-size: 0.78rem; font-weight: 700; background: #15803d; color: #ffffff; padding: 4px 10px; border-radius: 5px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                Tracking Correos: ${escapeHtml(trackingNum)} ↗
              </a>
            </div>
            <div style="font-size: 0.86rem; color: #14532d; background: #ffffff; border-left: 3px solid #16a34a; padding: 10px 14px; border-radius: 4px; margin-bottom: 10px;">
              <strong>Estado de la entrega:</strong> ${escapeHtml(carrierMsg || 'Entrega completada satisfactoriamente en el domicilio del destinatario.')}
            </div>
            <div style="font-size: 0.80rem; color: #374151;">
              <strong>Dirección de entrega:</strong> ${escapeHtml(ord.customer?.address || '')}, ${escapeHtml(ord.customer?.postalCode || '')} ${escapeHtml(ord.customer?.city || '')}
            </div>
          </div>
      ` : (step === 3) ? `
          <!-- Bloque de Comunicación con la Empresa Repartidora y Dirección -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
              <div style="font-size: 0.8rem; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.4px;">
                🚚 Comunicación con Empresa Repartidora (${escapeHtml(carrier)})
              </div>
              <a href="${correosUrl}" target="_blank" rel="noopener noreferrer" style="font-family: monospace; font-size: 0.78rem; font-weight: 700; background: #0284c7; color: #ffffff; padding: 4px 10px; border-radius: 5px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                Tracking: ${escapeHtml(trackingNum)} ↗
              </a>
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
                <a href="${correosUrl}" target="_blank" rel="noopener noreferrer" style="background: #1e293b; color: #ffffff; border-radius: 6px; padding: 6px 12px; font-size: 0.76rem; font-weight: 700; text-decoration: none;">
                  📍 Seguir envío en Correos Express ↗
                </a>
              </div>
            </div>
          </div>
      ` : `
          <!-- En fases 1 y 2 no se muestra transportista -->
          <div style="background: #fdfbf7; border: 1px dashed #dcd4c7; border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; font-size: 0.82rem; color: #5a5147;">
            ⚙️ <strong>Estado de fabricación:</strong> Tu ejemplar se encuentra en ${step === 1 ? 'revisión técnica de imprenta' : 'imprenta para su impresión y encuadernación'}. Te notificaremos por correo con el enlace directo de Correos Express en cuanto salga del taller.
          </div>
      `;

      return `
        <div id="order-card-${escapeHtml(ord.orderNumber)}" style="background: #ffffff; border: 1.5px solid #e0d8c8; border-radius: 12px; padding: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.04); transition: all 0.3s ease;">
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

          ${courierBlockHtml}

          <!-- Bloque de Archivos Digitales en PDF -->
          <div style="background: #fdfaf5; border: 1px solid #e4dac9; border-radius: 10px; padding: 14px 18px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <div style="font-size: 0.82rem; font-weight: 800; color: #87553b;">
                📖 Archivos en PDF de tu Cuaderno
              </div>
              <div style="font-size: 0.76rem; color: #665e54; margin-top: 2px;">
                Tus archivos listos para imprenta están guardados en tu perfil para que puedas consultarlos o descargarlos en cualquier momento.
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" data-download-pdf-interior="${escapeHtml(ord.id)}" style="background: #87553b; color: #ffffff; border: none; border-radius: 6px; padding: 8px 14px; font-size: 0.80rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <span>📖</span> Interior en PDF
              </button>
              <button type="button" data-download-pdf-cover="${escapeHtml(ord.id)}" style="background: #22382c; color: #ffffff; border: none; border-radius: 6px; padding: 8px 14px; font-size: 0.80rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <span>🎨</span> Portada en PDF
              </button>
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
    }



    ordersContainer.querySelectorAll('[data-download-pdf-interior]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-download-pdf-interior');
        const ord = clientProfileOrders.find(o => o.id === id);
        if (ord) {
          try {
            localStorage.setItem('mr_complete_book_config', JSON.stringify({
              title: ord.book?.title,
              subtitle: ord.book?.subtitle,
              pageCount: ord.book?.pageCount || 143,
              bindingType: ord.book?.bindingType || 'softcover'
            }));
          } catch (e) {}
        }
        showToast('⏳ Preparando y descargando Interior en PDF...');
        const iframe = document.getElementById('headless-pdf-frame');
        if (iframe) {
          iframe.src = `/generador-libro-completo.html?download_direct=1&ts=${Date.now()}`;
        } else {
          window.open(`/generador-libro-completo.html?download_direct=1`, '_blank');
        }
      });
    });

    ordersContainer.querySelectorAll('[data-download-pdf-cover]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-download-pdf-cover');
        const ord = clientProfileOrders.find(o => o.id === id);
        if (ord) {
          try {
            localStorage.setItem('mr_cart_cover_item', JSON.stringify({
              title: ord.book?.title,
              bindingType: ord.book?.bindingType,
              pageCount: ord.book?.pageCount || 143,
              data: {}
            }));
          } catch (e) {}
        }
        showToast('⏳ Preparando y descargando Portada en PDF...');
        const iframe = document.getElementById('headless-pdf-frame');
        if (iframe) {
          iframe.src = `/generador-portadas.html?download_direct=1&ts=${Date.now()}`;
        } else {
          window.open(`/generador-portadas.html?download_direct=1`, '_blank');
        }
      });
    });
  }

  // 3. RENDERIZAR ESPEJO DE CONTROL EN EL PANEL DE DESARROLLADOR (#dev-client-profile-mirror)
  // Resaltado de pedido si viene en URL
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const targetOrder = urlParams.get('orderId') || urlParams.get('order');
    if (targetOrder) {
      setTimeout(() => {
        const card = document.getElementById('order-card-' + targetOrder) || document.querySelector(`[id*="${targetOrder}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.outline = '3px solid #16a34a';
          card.style.boxShadow = '0 0 25px rgba(22, 163, 74, 0.4)';
          setTimeout(() => {
            card.style.outline = 'none';
            card.style.boxShadow = '';
          }, 3500);
        }
      }, 350);
    }
  } catch(e) {}

  const devMirror = document.getElementById('dev-client-profile-mirror');
  if (devMirror) {
    devMirror.innerHTML = clientProfileOrders.slice(0, 6).map(ord => {
      return `
        <div style="background: #2c2824; border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <span style="font-family: monospace; font-weight: 800; color: #fde68a;">#${escapeHtml(ord.orderNumber)}</span>
              <strong style="color: #ffffff; margin-left: 8px;">${escapeHtml(ord.book?.title || 'Cuaderno')}</strong>
              <span style="color: #9ca3af; font-size: 0.78rem; margin-left: 6px;">(${ord.book?.pageCount || 143} págs · Estado actual: <strong style="color:#4ade80;">${escapeHtml(ord.status)}</strong>)</span>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button type="button" data-dev-set-status="${escapeHtml(ord.id)}" data-target-status="pending_review" style="background:#3f3b37; color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:5px; padding:4px 8px; font-size:0.72rem; cursor:pointer;">1. Revisión (+Email)</button>
              <button type="button" data-dev-set-status="${escapeHtml(ord.id)}" data-target-status="printing" style="background:#3f3b37; color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:5px; padding:4px 8px; font-size:0.72rem; cursor:pointer;">2. En Imprenta (+Email)</button>
              <button type="button" data-dev-set-status="${escapeHtml(ord.id)}" data-target-status="shipped" style="background:#1e3a8a; color:#fff; border:1px solid #60a5fa; border-radius:5px; padding:4px 8px; font-size:0.72rem; cursor:pointer;">3. En Reparto (+Email)</button>
              <button type="button" data-dev-set-status="${escapeHtml(ord.id)}" data-target-status="delivered" style="background:#166534; color:#fff; border:1px solid #4ade80; border-radius:5px; padding:4px 8px; font-size:0.72rem; cursor:pointer;">4. Entregado (+Email)</button>
              <button type="button" data-dev-carrier-msg="${escapeHtml(ord.id)}" style="background:#87553b; color:#fff; border:none; border-radius:5px; padding:4px 9px; font-size:0.72rem; font-weight:700; cursor:pointer;">📣 Aviso Repartidora (+Email)</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    devMirror.querySelectorAll('[data-dev-set-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-dev-set-status');
        const st = btn.getAttribute('data-target-status');
        const ord = clientProfileOrders.find(o => o.id === id);
        if (!ord) return;
        ord.status = st;
        if (!ord.shipping) ord.shipping = { carrier: 'Correos Express', trackingNumber: 'CEX-84920144', trackingUrl: 'https://www.correosexpress.com' };
        if (!ord.luluJob) ord.luluJob = { jobId: 'LULU-981204', carrier: 'Correos Express', trackingCode: ord.shipping.trackingNumber };
        if (!ord.comms) ord.comms = { compra: { sent: true }, imprenta: { sent: false }, tracking: { sent: false }, entregado: { sent: false } };

        const labels = {
          pending_review: '1/4 En Revisión Técnica de Imprenta',
          printing: '2/4 En Imprenta (Impresión de tripa y encuadernación en curso)',
          shipped: `3/4 En Reparto con ${ord.shipping.carrier} (Tracking: ${ord.shipping.trackingNumber})`,
          delivered: '4/4 Entregado en el domicilio del cliente'
        };
        if (st === 'printing') {
          ord.comms.imprenta = { sent: true, date: new Date().toISOString() };
          ord.shipping.lastCarrierMessage = 'En fabricación y encuadernación en planta de imprenta.';
        } else if (st === 'shipped') {
          ord.comms.tracking = { sent: true, date: new Date().toISOString() };
          ord.shipping.lastCarrierMessage = `Correos Express: Paquete en reparto hoy. Seguimiento activo ${ord.shipping.trackingNumber}.`;
        } else if (st === 'delivered') {
          ord.comms.entregado = { sent: true, date: new Date().toISOString() };
          ord.shipping.lastCarrierMessage = 'Correos Express: Entrega completada satisfactoriamente en el domicilio.';
        }

        const eventMap = {
          pending_review: 'status_pending_review',
          printing: 'status_printing',
          shipped: 'status_shipped',
          delivered: 'status_delivered'
        };

        if (!ord.timeline) ord.timeline = [];
        ord.timeline.push({
          date: new Date().toISOString(),
          message: `Cambio de estado actualizado: ${labels[st] || st} (Emails enviados a Cliente y Gestor)`
        });
        saveClientOrdersAndBasketState(user);
        renderClientOrdersAndBasketViews(user);
        showToast(`⏳ Estado cambiado a ${labels[st]} · Enviando emails a Cliente y Gestor...`);
        await sendOrderLifecycleEmails(ord, eventMap[st] || 'status_printing');
        showToast(`✉️ Emails de etapa «${labels[st]}» enviados a jesusgil_87@hotmail.com y jesgilcan@gmail.com`);
      });
    });

    devMirror.querySelectorAll('[data-dev-carrier-msg]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-dev-carrier-msg');
        const ord = clientProfileOrders.find(o => o.id === id);
        if (!ord) return;
        const msg = prompt('Escribe el mensaje de actualización de la empresa repartidora que verá el cliente en su perfil y recibirá por email:', 'Correos Express: El repartidor entregará tu paquete hoy entre las 11:00 y las 14:00.');
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
        showToast('⏳ Publicando aviso y enviando emails a Cliente y Gestor...');
        await sendOrderLifecycleEmails(ord, 'carrier_update', { carrierMessage: msg.trim() });
        showToast('✉️ Aviso de la repartidora publicado y enviado por email a ambos correos');
      });
    });
  }
}



window.initClientOrdersAndBasketModule = initClientOrdersAndBasketModule;
window.renderClientOrdersAndBasketViews = renderClientOrdersAndBasketViews;
