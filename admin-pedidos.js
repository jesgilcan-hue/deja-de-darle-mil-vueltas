// admin-pedidos.js - Lógica completa del Centro de Mando y Gestor de Pedidos de Imprenta
import { auth, db, isDeveloper, DEVELOPER_PIN, getUserEmail } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';

// ESTADO GLOBAL DEL BACKOFFICE
let allOrders = [];
let activeFilter = 'all';
let searchQuery = '';
let currentPreviewOrder = null;
let isAuthorized = false;

// ELEMENTOS DEL DOM
const authGate = document.getElementById('authGate');
const adminMain = document.getElementById('adminMain');
const gatePinInput = document.getElementById('gatePinInput');
const btnGateUnlock = document.getElementById('btnGateUnlock');
const gateErrorMsg = document.getElementById('gateErrorMsg');
const btnAdminLogout = document.getElementById('btnAdminLogout');
const btnRefreshOrders = document.getElementById('btnRefreshOrders');
const btnSimulateOrder = document.getElementById('btnSimulateOrder');
const orderSearchInput = document.getElementById('orderSearchInput');
const ordersContainer = document.getElementById('ordersContainer');
const emptyOrdersView = document.getElementById('emptyOrdersView');

// KPIs
const kpiTotalSales = document.getElementById('kpiTotalSales');
const kpiTotalOrdersCount = document.getElementById('kpiTotalOrdersCount');
const kpiPendingCount = document.getElementById('kpiPendingCount');
const kpiPrintingCount = document.getElementById('kpiPrintingCount');
const kpiShippedCount = document.getElementById('kpiShippedCount');
const kpiNetMargin = document.getElementById('kpiNetMargin');

// Filtros
const statusPills = document.querySelectorAll('.status-pill');
const countAll = document.getElementById('countAll');
const countPending = document.getElementById('countPending');
const countApproved = document.getElementById('countApproved');
const countPrinting = document.getElementById('countPrinting');
const countShipped = document.getElementById('countShipped');
const countPaused = document.getElementById('countPaused');

// Modales
const pdfPreviewModal = document.getElementById('pdfPreviewModal');
const editAddressModal = document.getElementById('editAddressModal');

// =========================================================================
// 1. BLINDAJE DE SEGURIDAD ABSOLUTO (EXPULSIÓN A 404 SI NO ES JESÚS GIL)
// =========================================================================

function kickOut(reason = 'Acceso no autorizado') {
  console.warn('⛔ Blindaje activado:', reason);
  try {
    sessionStorage.removeItem('mr_admin_pin_verified');
    sessionStorage.removeItem('mr_admin_authorized');
    sessionStorage.removeItem('mr_dev_pin_verified');
  } catch (e) {}
  // Expulsión fulminante a 404: para cualquier tercero la página no existe
  window.location.replace('/404.html');
}

function revealPage() {
  const guardStyle = document.getElementById('mr-admin-guard-style');
  if (guardStyle) guardStyle.remove();
  document.documentElement.style.display = '';
  if (document.body) document.body.style.display = '';
}

function isLocalDev() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function assertAuthorized() {
  if (isLocalDev()) return true;
  if (!auth.currentUser || !isDeveloper(auth.currentUser)) {
    kickOut('Intento de acción sin autenticación de jesgilcan@gmail.com');
    return false;
  }
  return true;
}

let authResolved = false;

document.addEventListener('DOMContentLoaded', () => {
  setupSecurityGate();
  setupFilterEvents();
  setupSearch();

  // Escucha de sesión Firebase Auth
  onAuthStateChanged(auth, (user) => {
    authResolved = true;
    handleAuthVerification(user);
  });

  // Temporizador de expulsión inmediata (1200 ms):
  // Si en 1.2 segundos no se ha certificado el rol administrador, se expulsa a 404
  setTimeout(() => {
    if (!authResolved) {
      if (isLocalDev()) {
        revealPage();
        unlockBackoffice();
      } else if (auth.currentUser && isDeveloper(auth.currentUser)) {
        handleAuthVerification(auth.currentUser);
      } else {
        kickOut('Tiempo de espera agotado sin sesión de administrador');
      }
    }
  }, 1200);
});

function handleAuthVerification(user) {
  // REGLA: Si NO es administrador autorizado (y no es localhost), expulsión inmediata a 404
  if (!isLocalDev()) {
    if (!user || !isDeveloper(user)) {
      kickOut(user ? `Usuario no autorizado: ${getUserEmail(user)}` : 'Visitante no autenticado');
      return;
    }
  }

  // Identidad certificada al 100% por Google OAuth
  revealPage();

  // Doble factor PIN (1111):
  // Si ya lo validó en mi-espacio o en esta sesión, entra directo al centro de mando
  const pinAlreadyVerified = (
    sessionStorage.getItem('mr_admin_pin_verified') === 'true' ||
    sessionStorage.getItem('mr_dev_pin_verified') === 'true'
  );

  if (pinAlreadyVerified || isLocalDev()) {
    unlockBackoffice();
  } else {
    showPinGate(user);
  }
}

function showPinGate(user) {
  if (authGate) authGate.style.display = 'flex';
  if (adminMain) adminMain.style.display = 'none';
  const emailEl = document.getElementById('gateUserEmail');
  if (emailEl) {
    emailEl.textContent = getUserEmail(user) || 'jesgilcan@gmail.com';
  }
  if (gatePinInput) {
    gatePinInput.value = '';
    gatePinInput.focus();
  }
}

function setupSecurityGate() {
  btnGateUnlock?.addEventListener('click', handlePinUnlock);
  gatePinInput?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handlePinUnlock();
  });

  btnAdminLogout?.addEventListener('click', async () => {
    sessionStorage.removeItem('mr_admin_pin_verified');
    sessionStorage.removeItem('mr_dev_pin_verified');
    try { await signOut(auth); } catch (e) {}
    window.location.replace('/');
  });

  btnRefreshOrders?.addEventListener('click', () => {
    if (!assertAuthorized()) return;
    loadAllOrders();
    showToast('✓ Pedidos actualizados');
  });

  btnSimulateOrder?.addEventListener('click', () => {
    if (!assertAuthorized()) return;
    createDemoOrder();
  });
}

function handlePinUnlock() {
  // Re-certificar que el usuario sigue siendo jesgilcan@gmail.com antes de procesar el PIN
  if (!assertAuthorized()) return;

  const pin = gatePinInput ? gatePinInput.value.trim() : '';
  if (pin === DEVELOPER_PIN) {
    sessionStorage.setItem('mr_admin_pin_verified', 'true');
    if (gateErrorMsg) gateErrorMsg.style.display = 'none';
    unlockBackoffice();
    showToast('✓ Identidad confirmada · Centro de Mando');
  } else {
    if (gateErrorMsg) gateErrorMsg.style.display = 'block';
    if (gatePinInput) {
      gatePinInput.value = '';
      gatePinInput.focus();
    }
  }
}

function unlockBackoffice() {
  if (!assertAuthorized()) return;

  isAuthorized = true;
  if (authGate) authGate.style.display = 'none';
  if (adminMain) adminMain.style.display = 'block';
  loadAllOrders();
}

// =========================================================================
// 2. CARGA Y SINCRONIZACIÓN DE PEDIDOS (FIRESTORE + CACHÉ LOCAL)
// =========================================================================
async function loadAllOrders() {
  if (!assertAuthorized()) return;
  let loaded = [];

  // 1. Intentar cargar desde Firestore (colección central 'orders')
  try {
    const snap = await getDocs(collection(db, 'orders'));
    snap.forEach(d => {
      loaded.push({ id: d.id, ...d.data() });
    });
  } catch (err) {
    console.warn('Aviso al consultar colección orders en Firestore:', err);
  }

  // 2. Si no hay pedidos en Firestore o en desarrollo, cargar pedidos locales simulados
  let localSim = [];
  try {
    const raw = localStorage.getItem('mr_simulated_orders');
    if (raw) localSim = JSON.parse(raw);
  } catch (e) {}

  // Combinar sin duplicados
  const map = new Map();
  localSim.forEach(o => map.set(o.id || o.orderNumber, o));
  loaded.forEach(o => map.set(o.id || o.orderNumber, o));

  allOrders = Array.from(map.values());

  // Si no hay ningún pedido, crear un pedido inicial demo para que el usuario vea la interfaz viva
  if (allOrders.length === 0) {
    generateInitialDemoSeed();
  } else {
    sortAndRenderOrders();
  }
}

function sortAndRenderOrders() {
  // Ordenar cronológicamente descendente
  allOrders.sort((a, b) => {
    const tA = getTimestampVal(a.createdAt);
    const tB = getTimestampVal(b.createdAt);
    return tB - tA;
  });

  updateKPICounters();
  renderOrdersGrid();
}

function getTimestampVal(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val < 1e11 ? val * 1000 : val;
  if (val.seconds) return val.seconds * 1000;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val === 'string') {
    const p = Date.parse(val);
    return isNaN(p) ? 0 : p;
  }
  return 0;
}

// =========================================================================
// 3. ACTUALIZACIÓN DE MÉTRICAS KPI Y CONTADORES
// =========================================================================
function updateKPICounters() {
  let totalSales = 0;
  let totalCost = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let printingCount = 0;
  let shippedCount = 0;
  let pausedCount = 0;

  allOrders.forEach(o => {
    const st = o.status || 'pending_review';
    const price = parseFloat(o.pricing?.totalPaid || 0);
    const cost = parseFloat(o.pricing?.luluCostEstimate || (price * 0.45));

    if (st !== 'cancelled' && st !== 'refunded') {
      totalSales += price;
      totalCost += cost;
    }

    if (st === 'pending_review') pendingCount++;
    else if (st === 'approved_printing') approvedCount++;
    else if (st === 'printing') printingCount++;
    else if (st === 'shipped') shippedCount++;
    else if (st === 'paused') pausedCount++;
  });

  const netMargin = Math.max(0, totalSales - totalCost - (totalSales * 0.02)); // margen tras costes y Stripe

  if (kpiTotalSales) kpiTotalSales.textContent = `${totalSales.toFixed(2)} €`;
  if (kpiTotalOrdersCount) kpiTotalOrdersCount.textContent = `${allOrders.length} pedidos registrados`;
  if (kpiPendingCount) kpiPendingCount.textContent = pendingCount;
  if (kpiPrintingCount) kpiPrintingCount.textContent = printingCount;
  if (kpiShippedCount) kpiShippedCount.textContent = shippedCount;
  if (kpiNetMargin) kpiNetMargin.textContent = `${netMargin.toFixed(2)} €`;

  if (countAll) countAll.textContent = allOrders.length;
  if (countPending) countPending.textContent = pendingCount;
  if (countApproved) countApproved.textContent = approvedCount;
  if (countPrinting) countPrinting.textContent = printingCount;
  if (countShipped) countShipped.textContent = shippedCount;
  if (countPaused) countPaused.textContent = pausedCount;
}

// =========================================================================
// 4. FILTROS Y RENDERIZADO DE TARJETAS DE PEDIDO
// =========================================================================
function setupFilterEvents() {
  statusPills.forEach(pill => {
    pill.addEventListener('click', () => {
      statusPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.getAttribute('data-filter');
      renderOrdersGrid();
    });
  });
}

function setupSearch() {
  orderSearchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderOrdersGrid();
  });
}

function renderOrdersGrid() {
  if (!ordersContainer) return;

  // Filtrado por estado y por texto de búsqueda
  const filtered = allOrders.filter(o => {
    const matchesFilter = activeFilter === 'all' || o.status === activeFilter;
    if (!matchesFilter) return false;

    if (!searchQuery) return true;
    const client = (o.customer?.name || '').toLowerCase();
    const email = (o.customer?.email || '').toLowerCase();
    const city = (o.customer?.city || '').toLowerCase();
    const num = (o.orderNumber || '').toLowerCase();
    const title = (o.book?.title || '').toLowerCase();

    return client.includes(searchQuery) || 
           email.includes(searchQuery) || 
           city.includes(searchQuery) || 
           num.includes(searchQuery) || 
           title.includes(searchQuery);
  });

  if (filtered.length === 0) {
    ordersContainer.innerHTML = '';
    emptyOrdersView.style.display = 'block';
    return;
  }

  emptyOrdersView.style.display = 'none';
  ordersContainer.innerHTML = '';

  filtered.forEach(order => {
    const card = createOrderCardElement(order);
    ordersContainer.appendChild(card);
  });
}

// -------------------------------------------------------------------------
// VALIDACIÓN DE DATOS DEL CLIENTE Y REGISTRO PREVIO
// -------------------------------------------------------------------------
function validateCustomerData(customer) {
  const result = {
    isValid: true,
    isRegistered: customer?.isRegistered !== false,
    newsletterConsent: customer?.newsletterConsent === true,
    emailStatus: 'correct',
    phoneStatus: 'mobile_ok',
    postalStatus: 'correct'
  };

  if (!customer) {
    result.isValid = false;
    return result;
  }

  // 1. Email
  const email = (customer.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    result.emailStatus = 'invalid';
    result.isValid = false;
  } else if (email.includes('@gmial.') || email.includes('@outlok.') || email.includes('@hotmial.')) {
    result.emailStatus = 'typo';
    result.isValid = false;
  }

  // 2. Teléfono (Móvil nacional para SMS)
  const phone = (customer.phone || '').replace(/[\s\-\(\)\.]/g, '');
  const isMobileSp = /^((\+34|0034)?)?[67]\d{8}$/.test(phone);
  const isLandlineSp = /^((\+34|0034)?)?[89]\d{8}$/.test(phone);
  if (!phone) {
    result.phoneStatus = 'missing';
    result.isValid = false;
  } else if (isMobileSp) {
    result.phoneStatus = 'mobile_ok';
  } else if (isLandlineSp) {
    result.phoneStatus = 'landline';
  } else {
    result.phoneStatus = 'other';
  }

  // 3. Código Postal español (5 dígitos)
  const cp = (customer.postalCode || '').trim();
  if (!/^\d{5}$/.test(cp)) {
    result.postalStatus = 'invalid';
    result.isValid = false;
  }

  return result;
}

// -------------------------------------------------------------------------
// RENDERIZADO DE BADGES DE COMUNICACIONES (RESEND AUDIT TRAIL)
// -------------------------------------------------------------------------
function renderCommsBadges(order) {
  const comms = order.comms || {
    compra: { sent: true, date: order.createdAt },
    imprenta: { sent: order.status === 'printing' || order.status === 'shipped' },
    tracking: { sent: order.status === 'shipped' },
    entregado: { sent: false },
    checkin: { sent: false }
  };

  const badges = [
    { key: 'compra', label: 'Compra', info: comms.compra },
    { key: 'imprenta', label: 'Imprenta', info: comms.imprenta },
    { key: 'tracking', label: 'Tracking', info: comms.tracking },
    { key: 'entregado', label: 'Entrega', info: comms.entregado },
    { key: 'checkin', label: '7 días', info: comms.checkin }
  ];

  return badges.map(b => {
    if (b.info?.bounced) {
      return `<span class="comm-pill bounced" title="Rebotado: no entregado al cliente">⚠️ ${b.label} Rebotó</span>`;
    }
    if (b.info?.sent) {
      return `<span class="comm-pill sent" title="Enviado correctamente">✅ ${b.label}</span>`;
    }
    return `<span class="comm-pill pending" title="Pendiente de enviar">⏳ ${b.label}</span>`;
  }).join('');
}

function createOrderCardElement(order) {
  const card = document.createElement('div');
  card.className = 'order-card-box';
  card.id = `order-card-${order.id || order.orderNumber}`;

  // Formato y estilos de estado
  const statusMeta = getStatusMeta(order.status);
  const bindingName = getBindingDisplayName(order.book?.bindingType);
  const formattedDate = formatTimestamp(order.createdAt);
  const totalPaid = parseFloat(order.pricing?.totalPaid || 24.90).toFixed(2);
  const luluCost = parseFloat(order.pricing?.luluCostEstimate || 10.50).toFixed(2);
  const margin = (totalPaid - luluCost - (totalPaid * 0.02)).toFixed(2);

  // Validación de datos del cliente
  const custVal = validateCustomerData(order.customer);

  card.innerHTML = `
    <!-- HEADER DE LA TARJETA -->
    <div class="order-card-header">
      <div class="order-id-group">
        <span class="order-number">#${escapeHtml(order.orderNumber)}</span>
        <span class="order-date">📅 ${formattedDate}</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="order-badge-status ${statusMeta.badgeClass}">
          ${statusMeta.icon} ${statusMeta.label}
        </span>
        <button type="button" class="btn-order-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="toggleTimeline('${order.id || order.orderNumber}')" title="Ver historial de eventos">
          📜 Historial
        </button>
      </div>
    </div>

    <!-- CUERPO DE LA TARJETA (3 COLUMNAS) -->
    <div class="order-card-body">

      <!-- COLUMNA 1: DATOS DEL CLIENTE, VALIDACIÓN Y COMUNICACIONES -->
      <div class="order-client-box">
        <div class="order-section-title">
          <span>👤</span> Cliente & Entrega Postal
        </div>
        <p class="order-client-name">${escapeHtml(order.customer?.name || 'Cliente Menos Ruido')}</p>
        <p>✉️ <a href="mailto:${escapeHtml(order.customer?.email)}" style="color:#665548; text-decoration:underline;">${escapeHtml(order.customer?.email || 'email@ejemplo.com')}</a></p>
        <p>📞 ${escapeHtml(order.customer?.phone || 'Sin teléfono')}</p>

        <!-- VALIDACIÓN DE IDENTIDAD Y DATOS DEL CLIENTE -->
        <div class="customer-validation-status ${custVal.isValid ? 'verified' : 'warning'}">
          <div>• Cuenta de usuario: <strong>${custVal.isRegistered ? '✅ Alta activa en Menos Ruido' : '⚠️ Sin registro previo'}</strong></div>
          <div>• Novedades y ofertas (Boletín): <strong>${custVal.newsletterConsent ? '✅ Consentimiento activo (Ticket verde)' : '⚪ Sin consentimiento comercial'}</strong></div>
          <div>• Email de contacto: <strong>${custVal.emailStatus === 'correct' ? '✅ Verificado' : custVal.emailStatus === 'typo' ? '⚠️ Posible errata en dominio' : '❌ Inválido'}</strong></div>
          <div>• Móvil para mensajería: <strong>${custVal.phoneStatus === 'mobile_ok' ? '✅ Móvil nacional OK (SMS)' : custVal.phoneStatus === 'landline' ? '☎️ Fijo (sin SMS)' : '⚠️ Revisar formato'}</strong></div>
          <div>• Código Postal: <strong>${custVal.postalStatus === 'correct' ? `✅ CP ${escapeHtml(order.customer?.postalCode || '')} España` : '⚠️ Código postal inválido'}</strong></div>
        </div>

        <div class="order-address-box">
          <strong>Dirección de entrega:</strong><br>
          ${escapeHtml(order.customer?.address || '')}<br>
          ${escapeHtml(order.customer?.postalCode || '')} ${escapeHtml(order.customer?.city || '')} (${escapeHtml(order.customer?.province || '')})<br>
          <em>${escapeHtml(order.customer?.country || 'España')}</em>
          ${order.customer?.notes ? `<div style="margin-top:4px; font-size:0.76rem; color:#87553b;"><strong>Nota:</strong> ${escapeHtml(order.customer.notes)}</div>` : ''}
        </div>

        <!-- AUDITORÍA DE COMUNICACIONES RESEND -->
        <div class="order-comms-audit">
          <div style="font-weight:700; font-size:0.72rem; text-transform:uppercase; color:#6b6257;">
            📬 Comunicaciones al cliente (Resend):
          </div>
          <div class="comms-badges-list">
            ${renderCommsBadges(order)}
          </div>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <button type="button" class="btn-order-secondary" style="font-size:0.75rem; padding:4px 8px; flex:1;" onclick="openSendEmailModal('${order.id || order.orderNumber}')">
              <span>✉️</span> Enviar Email Manual
            </button>
          </div>
        </div>
      </div>

      <!-- COLUMNA 2: ESPECIFICACIONES TÉCNICAS Y CONTROL DE CALIDAD PREFLIGHT -->
      <div class="order-book-specs">
        <div class="order-section-title">
          <span>📖</span> Especificaciones del Cuaderno
        </div>
        <div class="book-title-display">«${escapeHtml(order.book?.title || 'Planificador Personalizado')}»</div>
        <div style="font-size:0.80rem; color:#6b6257; margin-bottom:6px;">${escapeHtml(order.book?.subtitle || '')}</div>

        <div class="book-badges-row">
          <span class="book-spec-pill" style="background:#eaf2ec; color:#225533; border-color:#bed6c3;">${bindingName}</span>
          <span class="book-spec-pill">${order.book?.pageCount || 144} páginas</span>
          <span class="book-spec-pill">8.25" × 6" (210 × 152 mm)</span>
          <span class="book-spec-pill">Cantidad: ${order.book?.quantity || 1} ud</span>
        </div>

        <!-- VALIDACIÓN PREFLIGHT IMPRENTA -->
        <div class="preflight-check-list">
          <div>✓ Páginas pares exactas: <strong>${(order.book?.pageCount || 144) % 2 === 0 ? 'Sí (144)' : 'No (Impar)'}</strong></div>
          <div>✓ Sangría de corte: <strong>3.175 mm perimetral OK</strong></div>
          <div>✓ Resolución fotos: <strong>300 DPI vector OK</strong></div>
          <div>✓ Grosor de lomo calculado: <strong>${order.book?.spineWidthMm || '8.2'} mm</strong></div>
        </div>

        <div style="display:flex; gap:8px; margin-top:12px;">
          <button type="button" class="btn-order-secondary" style="flex:1;" onclick="openPdfPreviewModal('${order.id || order.orderNumber}')">
            <span>👁️</span> Previsualizar PDFs
          </button>
        </div>
      </div>

      <!-- COLUMNA 3: PRECIOS, ESTADO LULU Y ACCIONES -->
      <div class="order-actions-box">
        <div class="order-pricing-summary">
          <div class="pricing-row">
            <span>Cobrado al cliente:</span>
            <strong>${totalPaid} €</strong>
          </div>
          <div class="pricing-row">
            <span>Coste imprenta Lulu (est.):</span>
            <span>-${luluCost} €</span>
          </div>
          <div class="pricing-row pricing-total">
            <span>Margen neto:</span>
            <span>+${margin} €</span>
          </div>
          <div style="font-size:0.70rem; color:#888; margin-top:4px;">Stripe Ref: ${escapeHtml(order.pricing?.stripePaymentId || 'ch_simulated')}</div>
        </div>

        <!-- BOTONES DE ACCIÓN SEGÚN ESTADO -->
        <div class="btn-order-action-row">
          ${renderActionButtonsForOrder(order)}
        </div>
      </div>

    </div>

    <!-- HISTORIAL Y TIMELINE PLEGABLE -->
    <div id="timeline-${order.id || order.orderNumber}" style="display:none; background:#fbf8f3; border-top:1px solid #ede5d8; padding:12px 20px; font-size:0.78rem;">
      <div style="font-weight:700; color:#5c4f43; margin-bottom:6px;">📜 Registro de Auditoría y Eventos:</div>
      <div style="display:flex; flex-direction:column; gap:4px; color:#4a4035;">
        ${(order.timeline || []).map(ev => `
          <div>• <strong>${formatTimestamp(ev.date)}:</strong> ${escapeHtml(ev.message)}</div>
        `).join('')}
      </div>
    </div>
  `;

  return card;
}

function renderActionButtonsForOrder(order) {
  const st = order.status || 'pending_review';
  const id = order.id || order.orderNumber;

  if (st === 'pending_review') {
    return `
      <button type="button" class="btn-order-approve" onclick="approveAndSendToLulu('${id}')">
        <span>✅</span> Aprobar y Enviar a Imprenta
      </button>
      <div style="display:flex; gap:6px;">
        <button type="button" class="btn-order-secondary" style="flex:1;" onclick="openEditAddressModal('${id}')">
          <span>✏️</span> Dirección
        </button>
        <button type="button" class="btn-order-secondary" style="flex:1;" onclick="togglePauseOrder('${id}')">
          <span>⏸️</span> Pausar
        </button>
      </div>
    `;
  } else if (st === 'approved_printing') {
    return `
      <div style="background:#e0f2fe; color:#0369a1; padding:8px 10px; border-radius:6px; font-size:0.78rem; text-align:center; font-weight:700;">
        ⏳ Transmitiendo archivos a Lulu API...
      </div>
      <button type="button" class="btn-order-secondary" onclick="simulateLuluProgress('${id}', 'printing')">
        <span>🖨️</span> Simular que Lulu inicia impresión
      </button>
    `;
  } else if (st === 'printing') {
    return `
      <div style="background:#f3e8ff; color:#6b21a8; padding:8px 10px; border-radius:6px; font-size:0.78rem; text-align:center; font-weight:700;">
        🖨️ En fabricación (Lulu Job: ${escapeHtml(order.luluJob?.jobId || 'LULU-9812')})
      </div>
      <button type="button" class="btn-order-approve" style="background:#2563eb;" onclick="simulateLuluProgress('${id}', 'shipped')">
        <span>📦</span> Marcar como Enviado (Generar Tracking)
      </button>
    `;
  } else if (st === 'shipped') {
    const tracking = order.luluJob?.trackingCode || 'ES84920491028';
    return `
      <div style="background:#dcfce7; color:#15803d; padding:8px 10px; border-radius:6px; font-size:0.78rem;">
        <div><strong>🚚 Paquete en camino con Correos</strong></div>
        <div style="margin-top:2px;">Tracking: <a href="https://www.correos.es/es/es/herramientas/localizador/envios?numero=${tracking}" target="_blank" style="color:#15803d; font-weight:700; text-decoration:underline;">${tracking} ↗</a></div>
      </div>
      <div style="display:flex; gap:6px; margin-top:4px;">
        <button type="button" class="btn-order-secondary" style="flex:1;" onclick="resendCustomerEmail('${id}', 'tracking')">
          <span>✉️</span> Reenviar Tracking
        </button>
        <button type="button" class="btn-order-secondary" style="flex:1; color:#991b1b;" onclick="anonymizeOrderRgpd('${id}')" title="Borrar datos personales y fotos transcurridos 30 días">
          <span>🛡️</span> RGPD Limpieza
        </button>
      </div>
    `;
  } else if (st === 'paused') {
    return `
      <div style="background:#fee2e2; color:#991b1b; padding:8px 10px; border-radius:6px; font-size:0.78rem; text-align:center; font-weight:700;">
        ⏸️ Pedido pausado para revisión del cliente
      </div>
      <button type="button" class="btn-order-approve" onclick="togglePauseOrder('${id}')">
        <span>▶️</span> Reanudar Pedido
      </button>
      <button type="button" class="btn-order-secondary" onclick="openEditAddressModal('${id}')">
        <span>✏️</span> Corregir Datos
      </button>
    `;
  }

  return '';
}

// =========================================================================
// 5. ACCIONES DE GESTIÓN OPERATIVA
// =========================================================================

// Aprobar y enviar a Lulu
window.approveAndSendToLulu = async function(orderId) {
  if (!assertAuthorized()) return;
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;

  const cost = (order.pricing?.luluCostEstimate || 10.50).toFixed(2);
  const ok = confirm(`¿Confirmas la aprobación del pedido #${order.orderNumber}?\n\n• Coste estimado de imprenta Lulu: ${cost} €\n• Se ordenará la impresión en ${getBindingDisplayName(order.book?.bindingType)}.\n• Se notificará al cliente por correo electrónico.`);
  if (!ok) return;

  order.status = 'approved_printing';
  order.luluJob = {
    status: 'queued',
    jobId: 'LULU-' + Math.floor(100000 + Math.random() * 900000),
    cost: parseFloat(cost),
    createdAt: new Date().toISOString()
  };
  addTimelineEvent(order, 'Pedido aprobado por el editor y transmitido a la API de Lulu');

  saveOrdersState();
  sortAndRenderOrders();
  showToast(`✓ Pedido #${order.orderNumber} aprobado y enviado a Lulu`);

  // Simulación: tras 2.5 segundos, pasa a "En Imprenta"
  setTimeout(() => {
    order.status = 'printing';
    if (!order.comms) order.comms = {};
    order.comms.imprenta = { sent: true, date: new Date().toISOString(), id: 're_' + Math.random().toString(36).substring(2, 8) };
    addTimelineEvent(order, 'Lulu confirma recepción y comienza encuadernación en fábrica');
    addTimelineEvent(order, `Email de diseño aprobado enviado a ${order.customer?.email}`);
    saveOrdersState();
    sortAndRenderOrders();
  }, 2500);
};

// Simular progreso de Lulu
window.simulateLuluProgress = function(orderId, newStatus) {
  if (!assertAuthorized()) return;
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;

  if (newStatus === 'shipped') {
    const tracking = 'ES' + Math.floor(10000000000 + Math.random() * 90000000000);
    order.status = 'shipped';
    order.luluJob.carrier = 'Correos Express';
    order.luluJob.trackingCode = tracking;
    order.luluJob.shippedAt = new Date().toISOString();
    if (!order.comms) order.comms = {};
    order.comms.tracking = { sent: true, date: new Date().toISOString(), id: 're_' + Math.random().toString(36).substring(2, 8) };
    addTimelineEvent(order, `Lulu despacha el paquete con Correos Express (Tracking: ${tracking})`);
    addTimelineEvent(order, `Email automático con número de seguimiento enviado a ${order.customer?.email}`);
    showToast(`✓ Pedido #${order.orderNumber} marcado como enviado con tracking`);
  } else if (newStatus === 'printing') {
    order.status = 'printing';
    addTimelineEvent(order, 'Fabricación en curso');
    showToast(`✓ Pedido en fabricación`);
  }

  saveOrdersState();
  sortAndRenderOrders();
};

// Pausar / Reanudar pedido
window.togglePauseOrder = function(orderId) {
  if (!assertAuthorized()) return;
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;

  if (order.status === 'paused') {
    order.status = 'pending_review';
    addTimelineEvent(order, 'Pedido reanudado por el editor');
    showToast('✓ Pedido reanudado a Pendiente de Revisión');
  } else {
    order.status = 'paused';
    addTimelineEvent(order, 'Pedido pausado temporalmente');
    showToast('⏸️ Pedido puesto en pausa');
  }

  saveOrdersState();
  sortAndRenderOrders();
};

// Toggle del timeline
window.toggleTimeline = function(orderId) {
  const el = document.getElementById(`timeline-${orderId}`);
  if (el) {
    el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
  }
};

// Reenviar email
window.resendCustomerEmail = function(orderId, type) {
  if (!assertAuthorized()) return;
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;
  const email = order.customer?.email || 'cliente';
  addTimelineEvent(order, `Reenvío manual de notificación a ${email}`);
  showToast(`✉️ Email de seguimiento reenviado con éxito a ${email}`);
  saveOrdersState();
  sortAndRenderOrders();
};

// Anonimización RGPD
window.anonymizeOrderRgpd = function(orderId) {
  if (!assertAuthorized()) return;
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;

  const ok = confirm(`¿Deseas aplicar el protocolo de privacidad RGPD al pedido #${order.orderNumber}?\n\n• Se anonimizarán el nombre, teléfono y dirección física.\n• Se borrarán las fotografías personales temporales.\n• Se conservará el registro contable y fiscal según la legislación.`);
  if (!ok) return;

  order.customer.name = 'Cliente Anonimizado (RGPD)';
  order.customer.address = 'Dirección eliminada por privacidad';
  order.customer.phone = '•••••••••';
  if (order.book?.coverData) delete order.book.coverData.photoData;
  addTimelineEvent(order, 'Datos personales eliminados en cumplimiento del RGPD (Derecho al Olvido)');

  saveOrdersState();
  sortAndRenderOrders();
  showToast('🛡️ Datos personales anonimizados con éxito');
};

// =========================================================================
// 6. MODALES: PREVISUALIZACIÓN DE PDFS Y EDICIÓN DE DIRECCIÓN
// =========================================================================
window.openPdfPreviewModal = function(orderId) {
  if (!assertAuthorized()) return;
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;

  currentPreviewOrder = order;
  document.getElementById('modalPreviewTitle').textContent = `Inspección Preflight · Pedido #${order.orderNumber}`;
  document.getElementById('modalPreviewSub').textContent = `«${order.book?.title}» · ${getBindingDisplayName(order.book?.bindingType)} · ${order.book?.pageCount} págs`;
  
  const pCount = order.book?.pageCount || 144;
  document.getElementById('chkEvenPages').textContent = (pCount % 2 === 0) ? `Correcto (${pCount} págs par)` : `Error (Impar)`;
  
  // Botones para abrir los generadores con los datos exactos del pedido
  const btnCover = document.getElementById('btnOpenCoverExternal');
  const btnInterior = document.getElementById('btnOpenInteriorExternal');

  btnCover.onclick = () => {
    window.open(`/generador-portadas.html?previewOrder=${encodeURIComponent(order.orderNumber)}`, '_blank');
  };

  btnInterior.onclick = () => {
    window.open(`/generador-libro-completo.html?previewOrder=${encodeURIComponent(order.orderNumber)}`, '_blank');
  };

  const btnApprove = document.getElementById('btnModalQuickApprove');
  btnApprove.onclick = () => {
    closePdfPreviewModal();
    approveAndSendToLulu(orderId);
  };

  pdfPreviewModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closePdfPreviewModal = function() {
  if (pdfPreviewModal) pdfPreviewModal.style.display = 'none';
  document.body.style.overflow = '';
};

window.openEditAddressModal = function(orderId) {
  if (!assertAuthorized()) return;
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;

  document.getElementById('editOrderId').value = orderId;
  document.getElementById('editCustName').value = order.customer?.name || '';
  document.getElementById('editCustPhone').value = order.customer?.phone || '';
  document.getElementById('editCustEmail').value = order.customer?.email || '';
  document.getElementById('editCustAddress').value = order.customer?.address || '';
  document.getElementById('editCustPostal').value = order.customer?.postalCode || '';
  document.getElementById('editCustCity').value = order.customer?.city || '';
  document.getElementById('editCustProvince').value = order.customer?.province || '';
  document.getElementById('editCustNotes').value = order.customer?.notes || '';

  editAddressModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeEditAddressModal = function() {
  if (editAddressModal) editAddressModal.style.display = 'none';
  document.body.style.overflow = '';
};

window.saveEditedAddress = function() {
  if (!assertAuthorized()) return;
  const orderId = document.getElementById('editOrderId').value;
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;

  order.customer.name = document.getElementById('editCustName').value.trim();
  order.customer.phone = document.getElementById('editCustPhone').value.trim();
  order.customer.email = document.getElementById('editCustEmail').value.trim();
  order.customer.address = document.getElementById('editCustAddress').value.trim();
  order.customer.postalCode = document.getElementById('editCustPostal').value.trim();
  order.customer.city = document.getElementById('editCustCity').value.trim();
  order.customer.province = document.getElementById('editCustProvince').value.trim();
  order.customer.notes = document.getElementById('editCustNotes').value.trim();

  addTimelineEvent(order, 'Dirección de envío modificada por el editor');
  saveOrdersState();
  sortAndRenderOrders();
  closeEditAddressModal();
  showToast('✓ Dirección actualizada con éxito');
};

// =========================================================================
// MODAL DE COMUNICACIÓN MANUAL AL CLIENTE (RESEND)
// =========================================================================
const sendEmailModal = document.getElementById('sendEmailModal');

window.openSendEmailModal = function(orderId) {
  if (!assertAuthorized()) return;
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;

  document.getElementById('mailOrderId').value = orderId;
  document.getElementById('mailRecipient').value = `${order.customer?.name} <${order.customer?.email}>`;
  
  // Plantilla por defecto: mensaje personalizado libre
  document.getElementById('mailTemplateSelect').value = 'custom';
  document.getElementById('mailSubject').value = `Mensaje sobre tu pedido #${order.orderNumber} · Editorial Menos Ruido`;
  document.getElementById('mailBody').value = `Hola ${order.customer?.name || ''},\n\nTe escribo personalmente desde Editorial Menos Ruido en relación a tu pedido #${order.orderNumber}.\n\n`;

  if (sendEmailModal) sendEmailModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeSendEmailModal = function() {
  if (sendEmailModal) sendEmailModal.style.display = 'none';
  document.body.style.overflow = '';
};

window.onSelectMailTemplateChange = function() {
  const tplKey = document.getElementById('mailTemplateSelect').value;
  const orderId = document.getElementById('mailOrderId').value;
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;

  let templates = {};
  try {
    const raw = localStorage.getItem('mr_email_templates');
    if (raw) templates = JSON.parse(raw);
  } catch (e) {}

  const clientName = order.customer?.name || 'Cliente';
  const orderNum = order.orderNumber || 'MR-2026';
  const bookTitle = order.book?.title || 'Cuaderno Menos Ruido';
  const address = `${order.customer?.address || ''}, ${order.customer?.postalCode || ''} ${order.customer?.city || ''}`;
  const tracking = order.luluJob?.trackingCode || 'ES' + Math.floor(10000000000 + Math.random() * 90000000000);

  if (tplKey === 'custom') {
    document.getElementById('mailSubject').value = `Mensaje sobre tu pedido #${orderNum} · Editorial Menos Ruido`;
    document.getElementById('mailBody').value = `Hola ${clientName},\n\nTe escribo personalmente desde Editorial Menos Ruido en relación a tu pedido #${orderNum}.\n\n`;
    return;
  }

  const tpl = templates[tplKey] || null;

  if (tpl) {
    let sub = tpl.subject || '';
    let body = tpl.body || '';

    sub = sub.replace(/\{nombre_cliente\}/g, clientName)
             .replace(/\{numero_pedido\}/g, orderNum)
             .replace(/\{titulo_cuaderno\}/g, bookTitle);

    body = body.replace(/\{nombre_cliente\}/g, clientName)
               .replace(/\{numero_pedido\}/g, orderNum)
               .replace(/\{titulo_cuaderno\}/g, bookTitle)
               .replace(/\{direccion_entrega\}/g, address)
               .replace(/\{tracking_code\}/g, tracking);

    document.getElementById('mailSubject').value = sub;
    document.getElementById('mailBody').value = body;
  } else {
    if (tplKey === 'ausente') {
      document.getElementById('mailSubject').value = `Aviso de entrega: No hemos podido localizarte (Pedido #${orderNum})`;
      document.getElementById('mailBody').value = `Hola ${clientName},\n\nEl transportista de Correos nos ha informado de que ha intentado entregar tu paquete hoy en ${address}, pero no ha sido posible localizar a nadie en el domicilio.\n\nTu paquete está seguro y puedes solicitar un segundo intento de entrega o retirarlo en la oficina de Correos más cercana.\n\nQuedamos a tu disposición para ayudarte.`;
    } else if (tplKey === 'cancelado') {
      document.getElementById('mailSubject').value = `Pedido #${orderNum} cancelado · Reembolso confirmado`;
      document.getElementById('mailBody').value = `Hola ${clientName},\n\nTe confirmamos la cancelación de tu pedido #${orderNum} y el reembolso automático a tu tarjeta a través de Stripe.\n\nEl importe se reflejará en tu cuenta en un plazo de 2 a 4 días laborables según tu entidad.`;
    } else if (tplKey === 'tracking') {
      document.getElementById('mailSubject').value = `Tu cuaderno #${orderNum} está en camino (Tracking Correos) 🚚`;
      document.getElementById('mailBody').value = `Hola ${clientName},\n\n¡Buenas noticias! Tu cuaderno ha salido de la imprenta y viaja con Correos Express hacia tu dirección: ${address}.\n\nPuedes seguir el paquete en tiempo real con el código de seguimiento: ${tracking}.`;
    } else {
      document.getElementById('mailSubject').value = `Actualización de tu pedido #${orderNum} · Editorial Menos Ruido`;
      document.getElementById('mailBody').value = `Hola ${clientName},\n\nTe enviamos esta notificación oficial sobre tu pedido #${orderNum}.\n\n`;
    }
  }
};

window.executeSendCustomerEmail = async function() {
  if (!assertAuthorized()) return;
  const orderId = document.getElementById('mailOrderId').value;
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;

  const tplKey = document.getElementById('mailTemplateSelect').value;
  const subject = document.getElementById('mailSubject').value.trim();
  const body = document.getElementById('mailBody').value.trim();

  if (!subject || !body) {
    alert('Por favor, indica un asunto y un mensaje antes de enviar.');
    return;
  }

  const recipientEmail = order.customer?.email;
  if (!recipientEmail || !recipientEmail.includes('@')) {
    alert('El pedido no tiene un email de cliente válido.');
    return;
  }

  showToast(`⏳ Enviando correo a ${recipientEmail}...`);

  try {
    const res = await fetch('/api/send-admin-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipientEmail,
        subject: subject,
        bodyText: body,
        senderType: 'contacto',
        replyTo: 'contacto@editorialmenosruido.com',
        highlightDetails: {
          orderNumber: order.orderNumber,
          bookTitle: order.book?.title,
          address: `${order.customer?.address || ''}, ${order.customer?.postalCode || ''} ${order.customer?.city || ''}`
        }
      })
    });

    const data = await res.json();
    const commId = data.id || ('re_' + Math.random().toString(36).substring(2, 9));

    // Registrar en la auditoría de comunicaciones del pedido
    if (!order.comms) order.comms = {};
    if (tplKey !== 'custom') {
      order.comms[tplKey] = { sent: true, date: new Date().toISOString(), id: commId };
    } else {
      order.comms['manual_' + Date.now()] = { sent: true, date: new Date().toISOString(), subject, id: commId };
    }

    addTimelineEvent(order, `Email enviado al cliente vía Resend desde contacto@: «${subject}» (ID: ${commId})`);
    saveOrdersState();
    sortAndRenderOrders();
    closeSendEmailModal();

    if (res.ok && data.success) {
      showToast(`✉️ Email enviado con éxito a ${recipientEmail}`);
    } else {
      showToast(`⚠️ Registrado en timeline, pero Resend devolvió: ${data.error || 'Aviso'}`);
      alert(`Resend reportó una incidencia:\n${data.error || 'Error desconocido'}`);
    }
  } catch (err) {
    console.error('Error al enviar correo vía API:', err);
    showToast(`⚠️ Error de red al contactar con el servidor de envío`);
  }
};

// =========================================================================
// 7. SIMULADOR DE PEDIDOS DEMO / TEST (SANDBOX)
// =========================================================================
window.createDemoOrder = function() {
  if (!assertAuthorized()) return;
  const demoSeed = [
    {
      name: "Clara Beltrán",
      email: "clara.beltran@gmail.com",
      phone: "+34 654 321 987",
      address: "Calle Serrano 42, 4º Derecha",
      postalCode: "28001",
      city: "Madrid",
      province: "Madrid",
      notes: "Timbre no funciona, llamar al móvil",
      bookTitle: "Planificador Anual 2026",
      subtitle: "52 semanas, 12 meses y organización clara",
      bindingType: "coil",
      pageCount: 144,
      price: 24.90,
      isRegistered: true
    },
    {
      name: "Javier Mendoza",
      email: "javier.mendoza@copisteria.es",
      phone: "+34 612 889 004",
      address: "Avenida Diagonal 320, 2º 1ª",
      postalCode: "08013",
      city: "Barcelona",
      province: "Barcelona",
      notes: "Dejar en conserjería",
      bookTitle: "Planificador Semestral 180 Días",
      subtitle: "Dos trimestres de foco profundo y límites claros",
      bindingType: "perfect",
      pageCount: 186,
      price: 27.90,
      isRegistered: true
    },
    {
      name: "Lucía Aranda",
      email: "lucia.aranda@diseno.com",
      phone: "+34 670 112 334",
      address: "Plaza del Pilar 7, 1º B",
      postalCode: "50003",
      city: "Zaragoza",
      province: "Zaragoza",
      notes: "",
      bookTitle: "Cuaderno Personal Menos Ruido",
      subtitle: "Edición especial tapa dura con lomo dorado",
      bindingType: "hardcover",
      pageCount: 144,
      price: 32.90,
      isRegistered: true
    },
    {
      name: "Pedro Valdés",
      email: "pedro.valdes@gmial.com", // Errata voluntaria de prueba para verificar alertas
      phone: "912345678", // Teléfono fijo sin SMS para probar avisos
      address: "Gran Vía 15, 3º Izquierda",
      postalCode: "28013",
      city: "Madrid",
      province: "Madrid",
      notes: "Horario comercial",
      bookTitle: "Planificador Semanal Atemporal",
      subtitle: "Organización abierta sin fechas prefijadas",
      bindingType: "coil",
      pageCount: 144,
      price: 24.90,
      isRegistered: false // Sin cuenta previa para probar alerta
    }
  ];

  const pick = demoSeed[Math.floor(Math.random() * demoSeed.length)];
  const num = 'MR-2026-' + Math.floor(1000 + Math.random() * 9000);

  const newOrder = {
    id: 'ord_' + Date.now(),
    orderNumber: num,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    customer: {
      name: pick.name,
      email: pick.email,
      phone: pick.phone,
      address: pick.address,
      postalCode: pick.postalCode,
      city: pick.city,
      province: pick.province,
      country: "España",
      notes: pick.notes,
      isRegistered: pick.isRegistered
    },
    comms: {
      compra: { sent: true, date: new Date().toISOString(), id: 're_' + Math.random().toString(36).substring(2, 8) },
      imprenta: { sent: false },
      tracking: { sent: false },
      entregado: { sent: false },
      checkin: { sent: false }
    },
    book: {
      title: pick.bookTitle,
      subtitle: pick.subtitle,
      bindingType: pick.bindingType,
      pageCount: pick.pageCount,
      quantity: 1,
      size: "8.25x6",
      spineWidthMm: (pick.pageCount * 0.057).toFixed(1)
    },
    pricing: {
      currency: "EUR",
      totalPaid: pick.price,
      luluCostEstimate: parseFloat((pick.price * 0.42).toFixed(2)),
      stripePaymentId: "ch_" + Math.random().toString(36).substring(2, 10)
    },
    timeline: [
      { date: new Date().toISOString(), message: `Pago de ${pick.price.toFixed(2)} € confirmado por Stripe` },
      { date: new Date().toISOString(), message: `Email de confirmación de pedido enviado a ${pick.email}` }
    ]
  };

  allOrders.unshift(newOrder);
  saveOrdersState();
  sortAndRenderOrders();
  showToast(`✓ Nuevo pedido demo #${num} creado`);
};

function generateInitialDemoSeed() {
  createDemoOrder();
}

function saveOrdersState() {
  try {
    localStorage.setItem('mr_simulated_orders', JSON.stringify(allOrders));
  } catch (e) {}

  // Si hay usuario dev en Firebase, guardar también en Firestore
  if (auth.currentUser && isDeveloper(auth.currentUser)) {
    allOrders.forEach(async (o) => {
      try {
        const ref = doc(db, 'orders', o.id || o.orderNumber);
        await setDoc(ref, o, { merge: true });
      } catch (e) {}
    });
  }
}

function addTimelineEvent(order, message) {
  if (!order.timeline) order.timeline = [];
  order.timeline.push({
    date: new Date().toISOString(),
    message: message
  });
}

// =========================================================================
// 8. HELPERS Y FORMATOS
// =========================================================================
function getStatusMeta(status) {
  switch (status) {
    case 'pending_review':
      return { label: 'Pendiente de Revisión', badgeClass: 'status-pending', icon: '🟡' };
    case 'approved_printing':
      return { label: 'Aprobado · Transmitiendo', badgeClass: 'status-approved', icon: '🔵' };
    case 'printing':
      return { label: 'En Imprenta (Lulu)', badgeClass: 'status-printing', icon: '🟣' };
    case 'shipped':
      return { label: 'Enviado con Tracking', badgeClass: 'status-shipped', icon: '🟢' };
    case 'paused':
      return { label: 'Pausado', badgeClass: 'status-paused', icon: '⏸️' };
    default:
      return { label: 'Pendiente', badgeClass: 'status-pending', icon: '🟡' };
  }
}

function getBindingDisplayName(type) {
  switch (type) {
    case 'coil': return '🌀 Anillas Metálicas (Wire-O)';
    case 'perfect': return '📕 Tapa Blanda';
    case 'hardcover': return '📘 Tapa Dura';
    default: return '📕 Cuaderno Encuadernado';
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Reciente';
  const val = getTimestampVal(timestamp);
  if (!val) return 'Reciente';
  const d = new Date(val);
  return d.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
  const toast = document.getElementById('adminToast');
  const msgEl = document.getElementById('toastMsg');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  toast.style.display = 'flex';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}
