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
import { openDevCartDrawer } from './cart-drawer.js';
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
  orderBy,
  onSnapshot
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
      checkUrlTab(false);
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

function checkUrlTab(allowDevTabs = false) {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const user = auth.currentUser;
  const isDevAllowed = isDeveloper(user) && allowDevTabs;
  const isOrdersAllowed = isDevAllowed || isTestCustomer(user);

  if (params.get('stripe_test_success') === '1') {
    const ordNum = params.get('order') || '';
    setTimeout(() => {
      showToast(`✓ Pago Test completado · Pedido #${ordNum} confirmado y emails enviados`);
    }, 300);
  }

  if (tab === 'ajustes') {
    activateTab('tab-ajustes');
  } else if (tab === 'pedidos') {
    if (isOrdersAllowed) {
      const btnPed = document.getElementById('tab-btn-pedidos');
      if (btnPed) btnPed.style.setProperty('display', 'inline-flex', 'important');
      activateTab('tab-pedidos');
    } else {
      activateTab('tab-disenos');
    }
  } else if (tab === 'dev') {
    if (isDevAllowed) {
      if (tabBtnDev) tabBtnDev.style.setProperty('display', 'inline-flex', 'important');
      activateTab('tab-dev');
    } else {
      activateTab('tab-disenos');
    }
  } else if (tab === 'disenos') {
    activateTab('tab-disenos');
  } else if (tab === 'futuras') {
    if (isDevAllowed) {
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

  // Guardar Direcciones de Envío y Facturación en Ajustes
  const btnSaveDirecciones = document.getElementById('btn-save-direcciones');
  const sameBillingCheck = document.getElementById('ajustes-same-billing-check');
  const billingFields = document.getElementById('ajustes-billing-fields');

  sameBillingCheck?.addEventListener('change', () => {
    if (billingFields) {
      billingFields.style.display = sameBillingCheck.checked ? 'none' : 'block';
    }
  });

  btnSaveDirecciones?.addEventListener('click', async () => {
    if (!currentUser) {
      showToast('Inicia sesión para guardar tus direcciones');
      return;
    }
    const name = document.getElementById('ajustes-shipping-name')?.value.trim();
    const phone = document.getElementById('ajustes-shipping-phone')?.value.trim();
    const address = document.getElementById('ajustes-shipping-address')?.value.trim();
    const postalCode = document.getElementById('ajustes-shipping-zip')?.value.trim();
    const city = document.getElementById('ajustes-shipping-city')?.value.trim();
    const province = document.getElementById('ajustes-shipping-province')?.value.trim();
    const isSameBilling = sameBillingCheck ? sameBillingCheck.checked : true;

    if (!name || !address) {
      showToast('Por favor, indica al menos nombre y dirección');
      return;
    }

    const shippingData = {
      name,
      nombre: name,
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
      pais: 'España',
      updatedAt: serverTimestamp()
    };

    const billingData = {
      isSame: isSameBilling,
      name: isSameBilling ? name : (document.getElementById('ajustes-billing-name')?.value.trim() || name),
      taxId: isSameBilling ? '' : (document.getElementById('ajustes-billing-taxid')?.value.trim() || ''),
      address: isSameBilling ? address : (document.getElementById('ajustes-billing-address')?.value.trim() || address)
    };

    btnSaveDirecciones.disabled = true;
    btnSaveDirecciones.textContent = 'Guardando...';

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { shipping: shippingData, billing: billingData }, { merge: true });
      populateShippingFields(shippingData, billingData);
      showToast('✓ Direcciones de entrega y facturación guardadas');
      const fb = document.getElementById('feedback-save-direcciones');
      if (fb) {
        fb.style.display = 'inline';
        setTimeout(() => fb.style.display = 'none', 3000);
      }
    } catch (err) {
      console.error('Error guardando direcciones:', err);
      showToast('No se pudieron guardar las direcciones');
    } finally {
      btnSaveDirecciones.disabled = false;
      btnSaveDirecciones.textContent = 'Guardar direcciones';
    }
  });

  // Eventos del modal para editar dirección de entrega en la cesta
  document.getElementById('btn-close-edit-address-modal')?.addEventListener('click', closeBasketEditAddressModal);
  document.getElementById('btn-cancel-edit-address-modal')?.addEventListener('click', closeBasketEditAddressModal);
  document.getElementById('basket-edit-address-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'basket-edit-address-modal') closeBasketEditAddressModal();
  });

  document.getElementById('btn-save-edit-address-modal')?.addEventListener('click', async () => {
    const itemId = document.getElementById('modal-edit-addr-item-id')?.value;
    if (!itemId) return;
    const name = document.getElementById('modal-addr-name')?.value.trim();
    const phone = document.getElementById('modal-addr-phone')?.value.trim();
    const street = document.getElementById('modal-addr-street')?.value.trim();
    const postalCode = document.getElementById('modal-addr-zip')?.value.trim();
    const city = document.getElementById('modal-addr-city')?.value.trim();
    const province = document.getElementById('modal-addr-province')?.value.trim();
    const notes = document.getElementById('modal-addr-notes')?.value.trim();
    const saveToProfile = document.getElementById('modal-addr-save-profile')?.checked;

    if (!name || !street) {
      showToast('Por favor, indica al menos nombre y calle');
      return;
    }

    const updatedShip = {
      name,
      nombre: name,
      phone,
      telefono: phone,
      address: street,
      direccion: street,
      postalCode,
      cp: postalCode,
      city,
      ciudad: city,
      province: province || city,
      provincia: province || city,
      notes,
      notas: notes,
      pais: 'España'
    };

    const targetItem = clientPendingBasket.find(x => x.id === itemId);
    if (targetItem) {
      targetItem.shipping = updatedShip;
      saveClientOrdersAndBasketState(currentUser);
    }

    if (currentUser) {
      try {
        const basketDocRef = doc(db, 'users', currentUser.uid, 'basket', itemId);
        await setDoc(basketDocRef, { shipping: updatedShip }, { merge: true });
      } catch (err) {
        console.warn('Aviso actualizando shipping en basket doc:', err);
      }

      if (saveToProfile) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(userRef, { shipping: updatedShip }, { merge: true });
          populateShippingFields(updatedShip);
        } catch (err) {
          console.warn('Aviso guardando shipping en perfil:', err);
        }
      }
    }

    closeBasketEditAddressModal();
    renderClientOrdersAndBasketViews(currentUser);
    showToast('✓ Dirección de entrega actualizada para este pedido');
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
      btnSimulateOrder.textContent = '⏳ Creando pedido y enviando emails (Cliente + Gestor)...';

      const createdOrd = await seedFullProfileOrder(currentUser, true);

      if (simOrderResult) {
        simOrderResult.style.color = '#86efac';
        simOrderResult.textContent = `✓ Pedido #${createdOrd?.orderNumber || ''} creado · Emails enviados desde pedidos@editorialmenosruido.com a Cliente (jesusgil_87@hotmail.com) y Gestor (jesgilcan@gmail.com)`;
        simOrderResult.style.display = 'block';
      }
    } catch (err) {
      console.error('Error simulando pedido:', err);
      if (simOrderResult) {
        simOrderResult.textContent = 'Error al simular pedido: ' + err.message;
        simOrderResult.style.color = '#f87171';
        simOrderResult.style.display = 'block';
      }
    } finally {
      btnSimulateOrder.disabled = false;
      btnSimulateOrder.textContent = 'Simular Pedido de Prueba (con envío de emails)';
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
        if (tabBtnPedidos) tabBtnPedidos.style.setProperty('display', 'none', 'important');
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
    if (isTestCustomer(user)) {
      if (tabBtnPedidos) {
        tabBtnPedidos.style.removeProperty('display');
        tabBtnPedidos.style.setProperty('display', 'inline-flex', 'important');
      }
      checkUrlTab(false);
      initClientOrdersAndBasketModule(user);
    } else {
      if (tabBtnPedidos) tabBtnPedidos.style.setProperty('display', 'none', 'important');
      const activeBtn = document.querySelector('.tab-btn.active');
      if (activeBtn && (activeBtn.id === 'tab-btn-dev' || activeBtn.id === 'tab-btn-futuras' || activeBtn.id === 'tab-btn-pedidos')) {
        activateTab('tab-disenos');
      }
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
    setVal('envio-nombre', shipping.nombre || shipping.name);
    setVal('envio-telefono', shipping.telefono || shipping.phone);
    setVal('envio-dni', shipping.dni);
    setVal('envio-direccion', shipping.direccion || shipping.address);
    setVal('envio-cp', shipping.cp || shipping.postalCode);
    setVal('envio-ciudad', shipping.ciudad || shipping.city);
    setVal('envio-provincia', shipping.provincia || shipping.province);
    setVal('envio-pais', shipping.pais || 'España');
    setVal('envio-notas', shipping.notas || shipping.notes);

    setVal('ajustes-shipping-name', shipping.nombre || shipping.name);
    setVal('ajustes-shipping-phone', shipping.telefono || shipping.phone);
    setVal('ajustes-shipping-address', shipping.direccion || shipping.address);
    setVal('ajustes-shipping-zip', shipping.cp || shipping.postalCode);
    setVal('ajustes-shipping-city', shipping.ciudad || shipping.city);
    setVal('ajustes-shipping-province', shipping.provincia || shipping.province);
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
  if (!user || (!isDeveloper(user) && !isTestCustomer(user))) return;

  await loadClientOrdersAndBasketData(user);
  await checkAndHandleStripeCheckoutReturn();

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
      seedFullProfileOrder(user, true);
    });
  }

  // Escucha en tiempo real de la colección 'orders' para sincronizar al instante entre jesusgil_87@hotmail.com y jesgilcan@gmail.com
  if (!window.__mrOrdersCollectionSnapshotUnsub) {
    try {
      window.__mrOrdersCollectionSnapshotUnsub = onSnapshot(collection(db, 'orders'), (snap) => {
        const remote = [];
        snap.forEach(d => remote.push({ id: d.id, ...d.data() }));
        if (remote.length > 0) {
          const map = new Map();
          clientProfileOrders.forEach(o => map.set(o.id || o.orderNumber, o));
          remote.forEach(o => map.set(o.id || o.orderNumber, o));
          clientProfileOrders = Array.from(map.values());
          clientProfileOrders.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
          try {
            localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders));
          } catch (e) {}
          renderClientOrdersAndBasketViews(auth.currentUser || user);
        }
      });
    } catch (e) {}
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

  // Si no hay cuadernos pendientes (por haber sido comprados o eliminados), se respeta la cesta vacía
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

  if (user && (isDeveloper(user) || isTestCustomer(user))) {
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
  const trackingCode = 'CEX-' + Math.floor(10000000 + Math.random() * 90000000);
  const initialStatus = notify ? 'pending_review' : 'shipped';
  const newOrd = {
    id: 'ord_' + Date.now(),
    orderNumber: num,
    status: initialStatus,
    createdAt: new Date().toISOString(),
    customer: {
      name: getUserDisplayName(user) || 'Cliente Menos Ruido',
      email: getUserEmail(user) || 'jesusgil_87@hotmail.com',
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
      trackingNumber: trackingCode,
      trackingUrl: 'https://www.correosexpress.com',
      estimatedDelivery: 'Entrega prevista en 24/48h laborables',
      lastCarrierMessage: notify
        ? 'Pedido recibido en preimpresión. Pendiente de entrega a Correos Express.'
        : 'Correos Express: Paquete clasificado en plataforma logística de destino (Madrid). En reparto próximo día hábil.'
    },
    luluJob: {
      status: notify ? 'queued' : 'shipped',
      jobId: 'LULU-' + Math.floor(100000 + Math.random() * 900000),
      carrier: 'Correos Express',
      trackingCode: trackingCode,
      cost: 17.14
    },
    comms: {
      compra: { sent: true, date: new Date().toISOString() },
      imprenta: { sent: !notify },
      tracking: { sent: !notify },
      entregado: { sent: false },
      checkin: { sent: false }
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
      netMargin: 10.09,
      stripePaymentId: 'ch_test_0eur_' + Math.random().toString(36).substring(2, 8)
    },
    timeline: [
      { date: new Date().toISOString(), message: `Pedido #${num} confirmado (${price.toFixed(2)} € · Envío incluido). Archivos guardados en tu perfil.` }
    ]
  };

  clientProfileOrders.unshift(newOrd);
  saveClientOrdersAndBasketState(user);
  if (notify) {
    renderClientOrdersAndBasketViews(user);
    showToast(`⏳ Pedido #${num} creado · Enviando emails reales a Cliente y Gestor...`);
    await sendOrderLifecycleEmails(newOrd, 'order_created');
    showToast(`✉️ Emails enviados desde pedidos@editorialmenosruido.com a Cliente (jesusgil_87@hotmail.com) y Gestor (jesgilcan@gmail.com)`);
  }
  return newOrd;
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

function updateFloatingCartSummary() {
  const totalUnits = clientPendingBasket.reduce((sum, item) => sum + (typeof item.quantity === 'number' ? item.quantity : 1), 0);
  const totalAmount = clientPendingBasket.reduce((sum, item) => {
    const q = (typeof item.quantity === 'number' ? item.quantity : 1);
    const p = calcDynamicPriceForProfile(item.bindingType, item.pageCount);
    return sum + (p * q);
  }, 0);
  const totalStr = totalAmount.toFixed(2).replace('.', ',') + ' €';

  if (typeof window.updateCartFabBadge === 'function') {
    window.updateCartFabBadge(totalUnits, totalStr);
  } else {
    const fab = document.getElementById('mrDevCartFab');
    if (fab) {
      fab.innerHTML = `
        <span>🛒</span>
        <span>Tu Carrito (${totalUnits})</span>
        <span class="mr-dev-cart-fab-badge" style="background:${totalUnits > 0 ? '#215c38' : '#786e63'};">${totalStr}</span>
      `;
    }
  }
}
window.updateFloatingCartSummary = updateFloatingCartSummary;

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
      const unitPrice = calcDynamicPriceForProfile(item.bindingType, item.pageCount);
      const sub = unitPrice * q;
      totalAmount += sub;
      totalUnits += q;
      return `
        <div style="background: #ffffff; border: 1px solid #ebd5c3; border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 0.95rem; color: #1f1c19;">${escapeHtml(item.title)}</div>
            <div style="font-size: 0.8rem; color: #665e54; margin-top: 2px;">
              ${getBindingLabelForProfile(item.bindingType)} · <strong>${item.pageCount} págs</strong> · Cantidad: <strong>${q}</strong> (${unitPrice.toFixed(2).replace('.', ',')} €/ud)
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

  // 2. Renderizar resumen de dirección de entrega
  const shipContainer = document.getElementById('checkout-modal-shipping-summary');
  const user = currentUser || auth.currentUser;
  const notesInp = document.getElementById('checkout-modal-customer-notes');
  const deliveryNotes = notesInp ? notesInp.value.trim() : '';

  const firstShip = selectedItems[0]?.shipping || {
    name: (user ? getUserDisplayName(user) : '') || 'Cliente Menos Ruido',
    email: (user ? getUserEmail(user) : '') || 'jesusgil_87@hotmail.com',
    phone: '+34 600 000 000',
    address: 'Calle Serrano 42, 4º Derecha',
    postalCode: '28001',
    city: 'Madrid',
    province: 'Madrid',
    notes: deliveryNotes || 'Sin instrucciones adicionales'
  };
  if (deliveryNotes) firstShip.notes = deliveryNotes;

  if (shipContainer) {
    shipContainer.innerHTML = `
      <div style="line-height: 1.55; color: #3d342c;">
        <div><strong style="color: #1f1c19;">${escapeHtml(firstShip.name || 'Cliente')}</strong> (<span style="color: #665e54;">${escapeHtml(firstShip.email || user?.email || '')}</span>)</div>
        <div style="color: #4a4138; margin-top: 3px;">${escapeHtml(firstShip.address || '')}, ${escapeHtml(firstShip.postalCode || '')} ${escapeHtml(firstShip.city || '')} (${escapeHtml(firstShip.province || '')})</div>
        <div style="color: #665e54; font-size: 0.78rem; margin-top: 3px;">Teléfono: <strong>${escapeHtml(firstShip.phone || '+34 600 000 000')}</strong></div>
        <div style="margin-top: 10px; border-top: 1px dashed #ebd5c3; padding-top: 8px;">
          <label style="display:block; font-size: 0.76rem; font-weight: 700; color: #5a5147; margin-bottom: 4px;">Instrucciones para el repartidor (opcional):</label>
          <input type="text" id="checkout-modal-customer-notes" value="${escapeHtml(firstShip.notes || '')}" placeholder="Ej: Dejar en conserjería, llamar al 2ºB..." style="width: 100%; font-size: 0.80rem; padding: 7px 10px; border: 1px solid #dcd3c5; border-radius: 6px; box-sizing: border-box; background: #ffffff;">
        </div>
      </div>
    `;
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
  if (confirmTxt) confirmTxt.textContent = '🔒 Conectando con Stripe Checkout...';

  const user = currentUser || auth.currentUser;
  const notesInp = document.getElementById('checkout-modal-customer-notes');
  const deliveryNotes = notesInp ? notesInp.value.trim() : '';

  const firstShip = selectedItems[0]?.shipping || {
    name: (user ? getUserDisplayName(user) : '') || 'Cliente',
    email: (user ? getUserEmail(user) : '') || 'jesusgil_87@hotmail.com',
    phone: '+34 600 000 000',
    address: 'Calle Serrano 42, 4º Derecha',
    postalCode: '28001',
    city: 'Madrid',
    province: 'Madrid',
    country: 'España',
    notes: deliveryNotes || 'Sin instrucciones adicionales'
  };
  if (deliveryNotes) firstShip.notes = deliveryNotes;

  const primaryItem = selectedItems[0];
  const pageCount = primaryItem.pageCount || 144;
  if (pageCount % 2 !== 0) {
    alert(`⚠️ El cuaderno "${primaryItem.title}" tiene un número impar de páginas (${pageCount} págs).\n\nPara imprenta el número de páginas debe ser estrictamente par. Ajusta el interior antes de pagar.`);
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = 'Pagar con Tarjeta';
    return;
  }

  try {
    const idToken = user ? await user.getIdToken() : '';
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      },
      body: JSON.stringify({
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
        province: firstShip.province || 'Madrid',
        notes: deliveryNotes || firstShip.notes || '',
        returnOrigin: window.location.origin
      })
    });

    const data = await res.json();
    if (!res.ok || !data.checkoutUrl) {
      throw new Error(data.error || 'No se pudo iniciar la pasarela de Stripe Checkout.');
    }

    try {
      localStorage.setItem('mr_active_checkout_order', JSON.stringify({
        orderNumber: data.orderNumber,
        sessionId: data.sessionId,
        item: primaryItem,
        customer: firstShip
      }));
    } catch(e) {}

    // Redirección oficial inmediata a la pasarela real de Stripe
    window.location.href = data.checkoutUrl;
  } catch(err) {
    console.error('Error al iniciar Stripe Checkout:', err);
    alert('Aviso al conectar con la pasarela de pago:\n' + (err.message || err));
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = 'Pagar con Tarjeta';
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
      // Retirar de la cesta pendiente el libro comprado
      try {
        const pendingRaw = localStorage.getItem('mr_pending_payment_books');
        if (pendingRaw) {
          let pList = JSON.parse(pendingRaw);
          if (activeData?.item?.title) {
            pList = pList.filter(x => x.title !== activeData.item.title);
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

      const newOrder = {
        id: 'ord_' + Date.now(),
        orderNumber: orderNumber,
        status: 'pending_review',
        createdAt: new Date().toISOString(),
        customer: {
          name: stripeData?.customerName || activeData?.customer?.name || (user ? getUserDisplayName(user) : 'Cliente'),
          email: stripeData?.customerEmail || activeData?.customer?.email || (user ? getUserEmail(user) : 'jesusgil_87@hotmail.com'),
          phone: activeData?.customer?.phone || '+34 600 000 000',
          address: activeData?.customer?.address || 'Calle Serrano 42',
          postalCode: activeData?.customer?.postalCode || '28001',
          city: activeData?.customer?.city || 'Madrid',
          province: activeData?.customer?.province || 'Madrid',
          country: 'España',
          notes: activeData?.customer?.notes || stripeData?.metadata?.customer_notes || 'Sin instrucciones adicionales',
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

      try {
        await setDoc(doc(db, 'orders', newOrder.id), newOrder, { merge: true });
        await setDoc(doc(db, 'orders', newOrder.orderNumber), newOrder, { merge: true });
      } catch(e) {}

      clientProfileOrders.unshift(newOrder);
      try {
        localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders));
      } catch(e) {}

      try {
        await sendOrderLifecycleEmails(newOrder, 'order_created');
      } catch(e) {}

      showToast(`🎉 ¡Pago completado con éxito en Stripe! Pedido #${orderNumber} registrado.`);
      
      // Limpiar URL
      try {
        window.history.replaceState({}, document.title, `/mi-espacio.html?tab=pedidos&orderId=${encodeURIComponent(orderNumber)}`);
      } catch(e) {}

      renderClientOrdersAndBasketViews(user);
    }
  } catch(err) {
    console.error('Error procesando retorno de Stripe:', err);
  }
}


