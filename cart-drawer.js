// cart-drawer.js - Carrito Lateral Privado con Cotizador Lulu en Tiempo Real, Cortacircuitos de Margen y Stripe Test (0€)
// EXCLUSIVO PARA DESARROLLADOR: 100% oculto e inerte para cualquier usuario que no sea jesgilcan@gmail.com

import { auth, db, isDeveloper, getUserEmail, onAuthStateChanged } from './firebase-config.js';
import { doc, setDoc } from 'firebase/firestore';

const RETAIL_PRICES = {
  softcover: { price: 24.90, label: '📕 Tapa Blanda (Mate)', luluBind: 'softcover' },
  perfect:   { price: 24.90, label: '📕 Tapa Blanda (Mate)', luluBind: 'softcover' },
  coil:      { price: 27.90, label: '🌀 Anillas Metálicas (Wire-O)', luluBind: 'coil' },
  hardcover: { price: 32.90, label: '📘 Tapa Dura (Casewrap)', luluBind: 'hardcover' }
};

const MIN_SAFE_MARGIN = 8.00;

let devCartState = {
  isOpen: false,
  title: 'Planificador Anual 2026',
  subtitle: 'Edición Personalizada · 210 × 152 mm',
  bindingType: 'coil',
  pageCount: 143,
  customerName: 'Cliente Prueba',
  customerEmail: 'jesgilcan@gmail.com',
  customerPhone: '+34 600 000 000',
  address: 'Calle de Alcalá 42, 3º B',
  postalCode: '28014',
  city: 'Madrid',
  province: 'M',
  country: 'ES',
  simulateSpike: false,
  quoteLoading: false,
  lastQuote: null
};

let drawerInitialized = false;
let quoteDebounceTimer = null;

function loadSavedCartItem() {
  try {
    const raw = localStorage.getItem('mr_cart_cover_item');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.title) devCartState.title = parsed.title;
      if (parsed.bindingType) {
        devCartState.bindingType = parsed.bindingType === 'perfect' ? 'softcover' : parsed.bindingType;
      }
      if (parsed.pageCount) devCartState.pageCount = parseInt(parsed.pageCount, 10) || 143;
      if (parsed.syncedBookName) devCartState.subtitle = parsed.syncedBookName;
    }
  } catch (e) {}
}

function injectCartStyles() {
  if (document.getElementById('mr-dev-cart-styles')) return;
  const style = document.createElement('style');
  style.id = 'mr-dev-cart-styles';
  style.textContent = `
    .mr-dev-cart-fab {
      position: fixed;
      bottom: 22px;
      right: 22px;
      z-index: 99990;
      background: #1f1c19;
      color: #f5f0e6;
      border: 1.5px solid #87553b;
      border-radius: 999px;
      padding: 11px 18px;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 0.84rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 9px;
      cursor: pointer;
      box-shadow: 0 10px 28px rgba(0,0,0,0.28);
      transition: all 0.2s ease;
    }
    .mr-dev-cart-fab:hover {
      background: #87553b;
      color: #ffffff;
      transform: translateY(-2px);
    }
    .mr-dev-cart-fab-badge {
      background: #ea580c;
      color: #fff;
      font-size: 0.66rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 20px;
      letter-spacing: 0.4px;
    }

    .mr-cart-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 13, 11, 0.6);
      backdrop-filter: blur(3px);
      z-index: 99998;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }
    .mr-cart-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .mr-cart-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 100%;
      max-width: 480px;
      height: 100vh;
      background: #faf8f5;
      color: #1f1c19;
      z-index: 99999;
      box-shadow: -12px 0 40px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      transform: translateX(102%);
      transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
      font-family: 'Inter', system-ui, sans-serif;
    }
    .mr-cart-drawer.open {
      transform: translateX(0);
    }

    .mr-cart-header {
      background: #1f1c19;
      color: #ffffff;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #87553b;
    }
    .mr-cart-header-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.15rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }
    .mr-cart-close {
      background: rgba(255,255,255,0.1);
      border: none;
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
    }

    .mr-cart-dev-banner {
      background: #2b231d;
      color: #f5d0a9;
      padding: 8px 16px;
      font-size: 0.73rem;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .mr-cart-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .mr-cart-card {
      background: #ffffff;
      border: 1px solid #e4ddd1;
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }
    .mr-cart-card-title {
      font-size: 0.76rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #87553b;
      margin: 0 0 10px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .mr-cart-field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .mr-cart-field {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-bottom: 8px;
    }
    .mr-cart-field label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #574e44;
    }
    .mr-cart-field input,
    .mr-cart-field select {
      padding: 8px 10px;
      border: 1px solid #d6cec0;
      border-radius: 6px;
      font-size: 0.82rem;
      background: #fdfbf8;
      color: #1f1c19;
    }

    .mr-safety-box {
      border-radius: 10px;
      padding: 13px 14px;
      border: 1.5px solid #a7d7b8;
      background: #f0fdf4;
      font-size: 0.8rem;
    }
    .mr-safety-box.blocked {
      border-color: #f87171;
      background: #fef2f2;
    }
    .mr-safety-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 0.79rem;
      color: #38322c;
    }
    .mr-safety-row.total {
      border-top: 1px dashed #cbd5e1;
      margin-top: 6px;
      padding-top: 8px;
      font-weight: 800;
      font-size: 0.86rem;
    }

    .mr-spike-toggle {
      margin-top: 10px;
      padding: 9px 11px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.76rem;
      font-weight: 700;
      color: #92400e;
      cursor: pointer;
    }

    .mr-cart-footer {
      padding: 14px 18px;
      background: #ffffff;
      border-top: 1px solid #e4ddd1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mr-btn-checkout {
      width: 100%;
      padding: 13px 16px;
      border: none;
      border-radius: 8px;
      background: #22382c;
      color: #ffffff;
      font-size: 0.9rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .mr-btn-checkout:hover:not(:disabled) {
      background: #18281f;
    }
    .mr-btn-checkout:disabled {
      background: #991b1b;
      color: #fee2e2;
      cursor: not-allowed;
      opacity: 0.92;
    }

    .mr-btn-direct-sim {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid #d6cec0;
      border-radius: 7px;
      background: #f5f0e6;
      color: #4a3f35;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
    }
    .mr-btn-direct-sim:hover:not(:disabled) {
      background: #ebe2d3;
    }
    .mr-btn-direct-sim:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);
}

function buildCartDrawerDOM() {
  if (document.getElementById('mrDevCartDrawer')) return;
  injectCartStyles();
  loadSavedCartItem();

  // Botón flotante exclusivo para desarrollador
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.id = 'mrDevCartFab';
  fab.className = 'mr-dev-cart-fab';
  fab.innerHTML = `
    <span>🛒</span>
    <span>Carrito Prueba</span>
    <span class="mr-dev-cart-fab-badge">DEV 0€</span>
  `;
  fab.addEventListener('click', () => openDevCartDrawer());
  document.body.appendChild(fab);

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'mrDevCartBackdrop';
  backdrop.className = 'mr-cart-backdrop';
  backdrop.addEventListener('click', () => closeDevCartDrawer());
  document.body.appendChild(backdrop);

  // Drawer
  const drawer = document.createElement('aside');
  drawer.id = 'mrDevCartDrawer';
  drawer.className = 'mr-cart-drawer';
  drawer.innerHTML = `
    <div class="mr-cart-header">
      <h3 class="mr-cart-header-title">
        <span>🛒</span> Carrito & Checkout Imprenta
      </h3>
      <button type="button" class="mr-cart-close" id="mrBtnCloseCart" title="Cerrar">✕</button>
    </div>

    <div class="mr-cart-dev-banner">
      <span>🔒 Visible solo para jesgilcan@gmail.com</span>
      <span style="background:#166534; color:#dcfce7; padding:2px 6px; border-radius:4px;">SANDBOX 0€ REALES</span>
    </div>

    <div class="mr-cart-body">
      <!-- 1. Ejemplar configurado -->
      <div class="mr-cart-card">
        <div class="mr-cart-card-title">
          <span>1. Ejemplar en el Carrito</span>
          <span id="mrCartPriceBadge" style="font-size:0.95rem; color:#1f1c19; font-weight:900;">27,90 €</span>
        </div>
        <div class="mr-cart-field">
          <label>Título del Cuaderno</label>
          <input type="text" id="mrCartInpTitle" value="${escapeAttr(devCartState.title)}" />
        </div>
        <div class="mr-cart-field-grid">
          <div class="mr-cart-field" style="margin-bottom:0;">
            <label>Encuadernación (PVP Fijo)</label>
            <select id="mrCartSelBinding">
              <option value="softcover" ${devCartState.bindingType === 'softcover' ? 'selected' : ''}>Tapa Blanda — 24,90 €</option>
              <option value="coil" ${devCartState.bindingType === 'coil' ? 'selected' : ''}>Anillas Wire-O — 27,90 €</option>
              <option value="hardcover" ${devCartState.bindingType === 'hardcover' ? 'selected' : ''}>Tapa Dura — 32,90 €</option>
            </select>
          </div>
          <div class="mr-cart-field" style="margin-bottom:0;">
            <label>Páginas Interiores</label>
            <input type="number" id="mrCartInpPages" min="32" max="400" value="${devCartState.pageCount}" />
          </div>
        </div>
      </div>

      <!-- 2. Dirección de Envío -->
      <div class="mr-cart-card">
        <div class="mr-cart-card-title">
          <span>2. Datos de Entrega del Cliente</span>
          <span style="font-size:0.68rem; color:#666; font-weight:600;">Envío incluido en PVP</span>
        </div>
        <div class="mr-cart-field-grid">
          <div class="mr-cart-field">
            <label>Nombre completo</label>
            <input type="text" id="mrCartInpName" value="${escapeAttr(devCartState.customerName)}" />
          </div>
          <div class="mr-cart-field">
            <label>Email para recibo</label>
            <input type="email" id="mrCartInpEmail" value="${escapeAttr(devCartState.customerEmail)}" />
          </div>
        </div>
        <div class="mr-cart-field">
          <label>Dirección (Calle, número, piso)</label>
          <input type="text" id="mrCartInpAddress" value="${escapeAttr(devCartState.address)}" />
        </div>
        <div class="mr-cart-field-grid">
          <div class="mr-cart-field" style="margin-bottom:0;">
            <label>Código Postal</label>
            <input type="text" id="mrCartInpZip" value="${escapeAttr(devCartState.postalCode)}" />
          </div>
          <div class="mr-cart-field" style="margin-bottom:0;">
            <label>Ciudad</label>
            <input type="text" id="mrCartInpCity" value="${escapeAttr(devCartState.city)}" />
          </div>
        </div>
      </div>

      <!-- 3. Auditoría Lulu API + Cortacircuitos (Safety Guard) -->
      <div class="mr-cart-card" style="border-color:#d6cec0; background:#fbf9f5;">
        <div class="mr-cart-card-title">
          <span>🛡️ 3. Cortacircuitos Lulu API (Tiempo Real)</span>
          <button type="button" id="mrBtnRecalcLulu" style="background:#ece4d5; border:1px solid #cbbba0; border-radius:5px; padding:2px 8px; font-size:0.7rem; font-weight:700; cursor:pointer;">↻ Recalcular</button>
        </div>

        <div id="mrSafetyBox" class="mr-safety-box">
          <div id="mrSafetyStatusHeader" style="font-weight:800; margin-bottom:6px; color:#166534;">
            ⏳ Consultando coste real en Lulu Direct API...
          </div>
          <div class="mr-safety-row">
            <span>PVP Fijo cobrado al cliente:</span>
            <strong id="mrQuoteRetail">27,90 €</strong>
          </div>
          <div class="mr-safety-row">
            <span>Coste Impresión Lulu (sin IVA):</span>
            <span id="mrQuotePrint">-- €</span>
          </div>
          <div class="mr-safety-row">
            <span>Coste Envío Lulu a destino:</span>
            <span id="mrQuoteShip">-- €</span>
          </div>
          <div class="mr-safety-row">
            <span><strong>Coste Total Lulu (con impuestos):</strong></span>
            <strong id="mrQuoteLuluTotal">-- €</strong>
          </div>
          <div class="mr-safety-row">
            <span>Comisión Stripe (1,5% + 0,25 €):</span>
            <span id="mrQuoteStripeFee">-- €</span>
          </div>
          <div class="mr-safety-row total">
            <span>Margen Neto Limpio (Mín. exigido ${MIN_SAFE_MARGIN.toFixed(2)} €):</span>
            <span id="mrQuoteNetMargin">-- €</span>
          </div>
          <div id="mrSafetyBlockAlert" style="display:none; margin-top:8px; padding:8px; background:#fee2e2; border:1px solid #f87171; border-radius:6px; color:#991b1b; font-size:0.75rem; font-weight:700; line-height:1.4;"></div>
        </div>

        <label class="mr-spike-toggle">
          <input type="checkbox" id="mrChkSimulateSpike" />
          <span>🧪 Simular subida imprevista de precio en Lulu (+14,50 €) para verificar que el botón de compra se bloquea</span>
        </label>
      </div>
    </div>

    <div class="mr-cart-footer">
      <button type="button" class="mr-btn-checkout" id="mrBtnStripeCheckout">
        <span>💳</span>
        <span id="mrBtnCheckoutText">Pagar en Stripe (Modo Test 0€)</span>
      </button>
      <button type="button" class="mr-btn-direct-sim" id="mrBtnDirectOrderSim">
        ⚡ Registrar pedido directo en Centro de Mando (sin abrir pasarela)
      </button>
    </div>
  `;
  document.body.appendChild(drawer);

  // Eventos del Drawer
  document.getElementById('mrBtnCloseCart')?.addEventListener('click', closeDevCartDrawer);
  document.getElementById('mrBtnRecalcLulu')?.addEventListener('click', () => triggerLuluQuote());

  const inputsToWatch = [
    'mrCartInpTitle',
    'mrCartSelBinding',
    'mrCartInpPages',
    'mrCartInpName',
    'mrCartInpEmail',
    'mrCartInpAddress',
    'mrCartInpZip',
    'mrCartInpCity'
  ];

  inputsToWatch.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      syncCartStateFromDOM();
      clearTimeout(quoteDebounceTimer);
      quoteDebounceTimer = setTimeout(() => triggerLuluQuote(), 450);
    });
    el.addEventListener('change', () => {
      syncCartStateFromDOM();
      triggerLuluQuote();
    });
  });

  document.getElementById('mrChkSimulateSpike')?.addEventListener('change', (e) => {
    devCartState.simulateSpike = e.target.checked;
    triggerLuluQuote();
  });

  document.getElementById('mrBtnStripeCheckout')?.addEventListener('click', handleLaunchStripeTestCheckout);
  document.getElementById('mrBtnDirectOrderSim')?.addEventListener('click', handleDirectOrderSimulation);
}

function syncCartStateFromDOM() {
  devCartState.title = document.getElementById('mrCartInpTitle')?.value || 'Planificador Personalizado';
  devCartState.bindingType = document.getElementById('mrCartSelBinding')?.value || 'coil';
  devCartState.pageCount = parseInt(document.getElementById('mrCartInpPages')?.value || '143', 10) || 143;
  devCartState.customerName = document.getElementById('mrCartInpName')?.value || 'Cliente Prueba';
  devCartState.customerEmail = document.getElementById('mrCartInpEmail')?.value || 'jesgilcan@gmail.com';
  devCartState.address = document.getElementById('mrCartInpAddress')?.value || 'Calle de Alcalá 42';
  devCartState.postalCode = document.getElementById('mrCartInpZip')?.value || '28014';
  devCartState.city = document.getElementById('mrCartInpCity')?.value || 'Madrid';

  const cfg = RETAIL_PRICES[devCartState.bindingType] || RETAIL_PRICES.coil;
  const priceBadge = document.getElementById('mrCartPriceBadge');
  if (priceBadge) priceBadge.textContent = `${cfg.price.toFixed(2).replace('.', ',')} €`;
}

export function openDevCartDrawer(customItem = null) {
  if (!auth.currentUser || !isDeveloper(auth.currentUser)) return;
  buildCartDrawerDOM();

  if (customItem) {
    if (customItem.title) devCartState.title = customItem.title;
    if (customItem.bindingType) {
      devCartState.bindingType = customItem.bindingType === 'perfect' ? 'softcover' : customItem.bindingType;
    }
    if (customItem.pageCount) devCartState.pageCount = parseInt(customItem.pageCount, 10) || 143;
    if (customItem.syncedBookName) devCartState.subtitle = customItem.syncedBookName;

    const inpTitle = document.getElementById('mrCartInpTitle');
    const selBind = document.getElementById('mrCartSelBinding');
    const inpPages = document.getElementById('mrCartInpPages');
    if (inpTitle) inpTitle.value = devCartState.title;
    if (selBind) selBind.value = devCartState.bindingType;
    if (inpPages) inpPages.value = devCartState.pageCount;
  }

  syncCartStateFromDOM();
  document.getElementById('mrDevCartBackdrop')?.classList.add('open');
  document.getElementById('mrDevCartDrawer')?.classList.add('open');
  devCartState.isOpen = true;
  triggerLuluQuote();
}

export function closeDevCartDrawer() {
  document.getElementById('mrDevCartBackdrop')?.classList.remove('open');
  document.getElementById('mrDevCartDrawer')?.classList.remove('open');
  devCartState.isOpen = false;
}

async function triggerLuluQuote() {
  if (!auth.currentUser || !isDeveloper(auth.currentUser)) return;
  const safetyBox = document.getElementById('mrSafetyBox');
  const headerEl = document.getElementById('mrSafetyStatusHeader');
  const blockAlert = document.getElementById('mrSafetyBlockAlert');
  const btnCheckout = document.getElementById('mrBtnStripeCheckout');
  const btnCheckoutText = document.getElementById('mrBtnCheckoutText');
  const btnDirectSim = document.getElementById('mrBtnDirectOrderSim');

  if (!safetyBox || !headerEl) return;

  headerEl.textContent = '⏳ Verificando coste real en Lulu Direct API...';
  headerEl.style.color = '#4a423a';
  if (btnCheckout) btnCheckout.disabled = true;

  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch('/api/lulu-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        bindingType: devCartState.bindingType,
        pageCount: devCartState.pageCount,
        postalCode: devCartState.postalCode,
        city: devCartState.city,
        province: devCartState.province,
        country: devCartState.country,
        simulateSpike: devCartState.simulateSpike
      })
    });

    const data = await res.json();
    devCartState.lastQuote = data;

    if (data.pricing) {
      document.getElementById('mrQuoteRetail').textContent = `${data.pricing.retailPrice.toFixed(2)} €`;
      document.getElementById('mrQuotePrint').textContent = `${data.pricing.luluPrintCost.toFixed(2)} €`;
      document.getElementById('mrQuoteShip').textContent = `${data.pricing.luluShippingCost.toFixed(2)} €`;
      document.getElementById('mrQuoteLuluTotal').textContent = `${data.pricing.luluTotalCost.toFixed(2)} €`;
      document.getElementById('mrQuoteStripeFee').textContent = `${data.pricing.stripeFee.toFixed(2)} €`;

      const marginEl = document.getElementById('mrQuoteNetMargin');
      marginEl.textContent = `${data.pricing.netMargin >= 0 ? '+' : ''}${data.pricing.netMargin.toFixed(2)} €`;
      marginEl.style.color = data.canPurchase ? '#166534' : '#991b1b';
    }

    if (!data.canPurchase || data.circuitBreakerTriggered) {
      safetyBox.classList.add('blocked');
      headerEl.textContent = '⛔ CORTACIRCUITOS ACTIVADO · COMPRA BLOQUEADA';
      headerEl.style.color = '#991b1b';
      if (blockAlert) {
        blockAlert.style.display = 'block';
        blockAlert.textContent = data.blockReason || 'Margen por debajo del mínimo de seguridad.';
      }
      if (btnCheckout) {
        btnCheckout.disabled = true;
        btnCheckoutText.textContent = '🚫 Compra bloqueada por seguridad de margen';
      }
      if (btnDirectSim) btnDirectSim.disabled = true;
    } else {
      safetyBox.classList.remove('blocked');
      headerEl.textContent = `✅ MARGEN SEGURO VERIFICADO (+${data.pricing.netMargin.toFixed(2)} € limpios)`;
      headerEl.style.color = '#166534';
      if (blockAlert) blockAlert.style.display = 'none';
      if (btnCheckout) {
        btnCheckout.disabled = false;
        btnCheckoutText.textContent = `Pagar ${data.pricing.retailPrice.toFixed(2)} € en Stripe (Modo Test 0€)`;
      }
      if (btnDirectSim) btnDirectSim.disabled = false;
    }
  } catch (err) {
    safetyBox.classList.add('blocked');
    headerEl.textContent = '⚠️ Error al conectar con /api/lulu-quote';
    headerEl.style.color = '#991b1b';
    if (blockAlert) {
      blockAlert.style.display = 'block';
      blockAlert.textContent = `Por seguridad, si Lulu no responde, el botón de compra se bloquea (${err.message}).`;
    }
    if (btnCheckout) {
      btnCheckout.disabled = true;
      btnCheckoutText.textContent = '🚫 Compra bloqueada por fallo de verificación';
    }
  }
}

async function registerSimulatedOrderInBackoffice(orderNumber, quote, stripeSessionId = 'sim_direct_dev') {
  const bindForAdmin = devCartState.bindingType === 'softcover' ? 'perfect' : devCartState.bindingType;
  const newOrder = {
    id: 'ord_' + Date.now(),
    orderNumber: orderNumber,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    customer: {
      name: devCartState.customerName,
      email: devCartState.customerEmail,
      phone: devCartState.customerPhone || '+34 600 000 000',
      address: devCartState.address,
      postalCode: devCartState.postalCode,
      city: devCartState.city,
      province: devCartState.province || 'Madrid',
      country: 'España',
      notes: 'Pedido de prueba desde Carrito de Desarrollador (Simulación 0€)',
      isRegistered: true
    },
    comms: {
      compra: { sent: true, date: new Date().toISOString(), id: 'sim_test_' + Date.now() },
      imprenta: { sent: false },
      tracking: { sent: false },
      entregado: { sent: false },
      checkin: { sent: false }
    },
    book: {
      title: devCartState.title,
      subtitle: devCartState.subtitle,
      bindingType: bindForAdmin,
      pageCount: devCartState.pageCount,
      quantity: 1,
      size: '8.25x6',
      spineWidthMm: (devCartState.pageCount * 0.057).toFixed(1)
    },
    pricing: {
      currency: 'EUR',
      totalPaid: quote?.pricing?.retailPrice || 27.90,
      luluCostEstimate: quote?.pricing?.luluTotalCost || 13.93,
      netMargin: quote?.pricing?.netMargin || 13.30,
      stripePaymentId: stripeSessionId
    },
    timeline: [
      {
        date: new Date().toISOString(),
        message: `[SIMULACIÓN 0€] Cotización real Lulu verificada: coste ${quote?.pricing?.luluTotalCost?.toFixed(2) || '13.93'} € · Margen limpio +${quote?.pricing?.netMargin?.toFixed(2) || '13.30'} €`
      },
      {
        date: new Date().toISOString(),
        message: `Pago en modo TEST (${(quote?.pricing?.retailPrice || 27.90).toFixed(2)} € simulados) registrado con ID ${stripeSessionId}`
      }
    ]
  };

  try {
    const raw = localStorage.getItem('mr_simulated_orders');
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(newOrder);
    localStorage.setItem('mr_simulated_orders', JSON.stringify(list));
  } catch (e) {}

  try {
    if (auth.currentUser && isDeveloper(auth.currentUser)) {
      await setDoc(doc(db, 'orders', newOrder.id), newOrder, { merge: true });
    }
  } catch (e) {}

  return newOrder;
}

async function handleLaunchStripeTestCheckout() {
  if (!auth.currentUser || !isDeveloper(auth.currentUser)) return;
  syncCartStateFromDOM();

  const btn = document.getElementById('mrBtnStripeCheckout');
  const btnTxt = document.getElementById('mrBtnCheckoutText');
  if (btn) btn.disabled = true;
  if (btnTxt) btnTxt.textContent = '⏳ Creando sesión en Stripe Test...';

  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        bookTitle: devCartState.title,
        bookSubtitle: devCartState.subtitle,
        bindingType: devCartState.bindingType,
        pageCount: devCartState.pageCount,
        customerName: devCartState.customerName,
        customerEmail: devCartState.customerEmail,
        customerPhone: devCartState.customerPhone,
        address: devCartState.address,
        postalCode: devCartState.postalCode,
        city: devCartState.city,
        province: devCartState.province,
        country: devCartState.country,
        simulateSpike: devCartState.simulateSpike,
        returnOrigin: window.location.origin
      })
    });

    const data = await res.json();
    if (!res.ok || !data.checkoutUrl) {
      throw new Error(data.error || 'No se pudo iniciar la pasarela de prueba en Stripe.');
    }

    // Registrar el pedido de prueba antes de redirigir a Stripe Checkout
    await registerSimulatedOrderInBackoffice(data.orderNumber, data.quote, data.sessionId);

    // Redirigir a la pasarela oficial de Stripe Checkout (Modo Prueba)
    window.location.href = data.checkoutUrl;
  } catch (err) {
    alert('Cortacircuitos / Aviso Stripe:\n' + (err.message || err));
    triggerLuluQuote();
  }
}

async function handleDirectOrderSimulation() {
  if (!auth.currentUser || !isDeveloper(auth.currentUser)) return;
  syncCartStateFromDOM();

  if (!devCartState.lastQuote || !devCartState.lastQuote.canPurchase) {
    alert('El Cortacircuitos tiene bloqueada la compra. Desactiva la simulación de subida de precios para registrar el pedido.');
    return;
  }

  const orderNumber = 'MR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  await registerSimulatedOrderInBackoffice(orderNumber, devCartState.lastQuote, 'cs_test_direct_' + Date.now());
  window.location.href = `/admin-pedidos.html?stripe_test_success=1&order=${encodeURIComponent(orderNumber)}`;
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}

// Inicialización estricta: SOLO cuando Firebase Auth confirma que el usuario es jesgilcan@gmail.com
onAuthStateChanged(auth, (user) => {
  const devWrapper = document.getElementById('devCartWrapper');
  if (!user || !isDeveloper(user)) {
    // Visitante normal o usuario no autorizado: ocultar al 100% cualquier rastro del carrito
    if (devWrapper) devWrapper.style.setProperty('display', 'none', 'important');
    const fab = document.getElementById('mrDevCartFab');
    if (fab) fab.remove();
    const drawer = document.getElementById('mrDevCartDrawer');
    if (drawer) drawer.remove();
    return;
  }

  // Usuario autenticado como jesgilcan@gmail.com: activar herramientas de carrito de prueba
  if (devWrapper) {
    devWrapper.style.removeProperty('display');
    devWrapper.style.display = 'flex';
  }

  if (!drawerInitialized) {
    drawerInitialized = true;
    buildCartDrawerDOM();
  }
});

// Exponer para llamadas desde generador-portadas.html y mi-espacio.html
window.openDevCartDrawer = openDevCartDrawer;
