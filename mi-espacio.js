// mi-espacio.js - Lógica del panel de usuario y desarrollador
import { 
  auth, 
  db, 
  isDeveloper, 
  DEVELOPER_PIN 
} from './firebase-config.js';
import { 
  signOut, 
  onAuthStateChanged 
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

// Pestañas
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Formulario de Envío
const envioForm = document.getElementById('envio-form');
const btnSaveEnvio = document.getElementById('btn-save-envio');

// Panel Dev
const devLockedView = document.getElementById('dev-locked-view');
const devUnlockedContent = document.getElementById('dev-unlocked-content');
const devPinInput = document.getElementById('dev-pin-input');
const btnUnlockDev = document.getElementById('btn-unlock-dev');
const devPinError = document.getElementById('dev-pin-error');
const btnSimulateOrder = document.getElementById('btn-simulate-order');
const simOrderResult = document.getElementById('sim-order-result');

// Diseños
const emptyDesignsView = document.getElementById('empty-designs-view');
const designsGrid = document.getElementById('designs-grid');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  setupNavbarAuth();
  setupTabs();
  setupEvents();

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      renderAuthenticatedView(user);
      await loadUserData(user);
      await loadUserDesigns(user);
    } else {
      renderUnauthenticatedView();
    }
  });
});

function setupTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

function setupEvents() {
  btnLoginPrompt?.addEventListener('click', openAuthModal);

  btnSignout?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      showToast('Sesión cerrada correctamente');
      setTimeout(() => window.location.href = '/', 600);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  });

  // Guardar datos de envío
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
      showToast('✓ Datos de envío guardados correctamente');
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

  // Simulador de pedido de prueba
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

  // Mostrar avatar
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
    tabBtnDev.style.display = 'inline-block';
  } else {
    userRoleBadge.textContent = 'CLIENTE';
    userRoleBadge.className = 'role-badge client';
    tabBtnDev.style.display = 'none';
  }
}

function renderUnauthenticatedView() {
  unauthContainer.style.display = 'block';
  authContainer.style.display = 'none';
}

async function loadUserData(user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
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

    if (snapshot.empty) {
      emptyDesignsView.style.display = 'block';
      designsGrid.style.display = 'none';
    } else {
      emptyDesignsView.style.display = 'none';
      designsGrid.style.display = 'grid';
      designsGrid.innerHTML = '';

      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        const card = document.createElement('div');
        card.className = 'design-card';
        card.innerHTML = `
          <div class="design-card-header">
            <h3>${item.name || 'Mi Planificador'}</h3>
            <div class="design-card-meta">
              <span>Tipo: ${item.type || 'Semanal'}</span> • 
              <span>${item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString('es-ES') : 'Reciente'}</span>
            </div>
          </div>
          <div class="design-card-body" style="font-size: 0.9rem; color: #555; margin-bottom: 15px;">
            ${item.summary || 'Configuración personalizada guardada.'}
          </div>
          <div class="design-card-actions">
            <a href="${item.editUrl || '/generador-planificador-semanal.html'}" class="btn-card-action btn-action-open">Abrir</a>
            <button type="button" class="btn-card-action btn-action-delete" data-id="${docSnap.id}">Eliminar</button>
          </div>
        `;

        const deleteBtn = card.querySelector('.btn-action-delete');
        deleteBtn.addEventListener('click', async () => {
          if (!deleteBtn.dataset.confirming) {
            deleteBtn.dataset.confirming = 'true';
            deleteBtn.textContent = '¿Confirmar?';
            deleteBtn.style.background = '#b91c1c';
            deleteBtn.style.color = '#ffffff';
            setTimeout(() => {
              if (deleteBtn.isConnected) {
                deleteBtn.removeAttribute('data-confirming');
                deleteBtn.textContent = 'Eliminar';
                deleteBtn.style.background = '#fdf2f2';
                deleteBtn.style.color = '#b91c1c';
              }
            }, 3000);
          } else {
            deleteBtn.disabled = true;
            deleteBtn.textContent = 'Borrando...';
            await deleteDoc(doc(db, 'users', user.uid, 'designs', docSnap.id));
            showToast('✓ Diseño eliminado');
            loadUserDesigns(user);
          }
        });

        designsGrid.appendChild(card);
      });
    }
  } catch (err) {
    console.warn('Colección de diseños vacía o en inicialización:', err);
    emptyDesignsView.style.display = 'block';
    designsGrid.style.display = 'none';
  }
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
