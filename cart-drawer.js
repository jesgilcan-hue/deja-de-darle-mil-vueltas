
export function updateCartFabBadge(count, totalStr) {
  const fab = document.getElementById('mrDevCartFab');
  const btnBuy = document.getElementById('mrBtnFloatingBuy');
  const num = parseInt(count, 10) || 0;
  if (fab) {
    fab.innerHTML = `
      <span>🛒</span>
      <span>Tu Carrito (${num})</span>
      <span class="mr-dev-cart-fab-badge" style="background:${num > 0 ? '#215c38' : '#786e63'};">${totalStr}</span>
    `;
  }
  if (btnBuy) {
    if (num > 0) {
      btnBuy.style.display = 'inline-flex';
      btnBuy.style.background = '#215c38';
      btnBuy.style.borderColor = '#183e25';
      btnBuy.style.cursor = 'pointer';
      btnBuy.style.opacity = '1';
      btnBuy.innerHTML = `<span>💳</span> <span>Finalizar Compra (${num} · ${totalStr})</span>`;
    } else {
      btnBuy.style.display = 'inline-flex';
      btnBuy.style.background = '#a8a196';
      btnBuy.style.borderColor = '#918b81';
      btnBuy.style.cursor = 'not-allowed';
      btnBuy.style.opacity = '0.7';
      btnBuy.innerHTML = `<span>💳</span> <span>Cesta vacía (0)</span>`;
    }
  }
}
window.updateCartFabBadge = updateCartFabBadge;
// cart-drawer.js - Carrito Lateral con Precio Dinámico (Envío Incluido), Vista Limpia de Cliente y Rayos X Lulu para Desarrollador
// EXCLUSIVO PARA DESARROLLADOR (jesgilcan@gmail.com + Máximo 3 Dispositivos: PC, Móvil, Tablet)

import { auth, db, isDeveloper, isTestCustomer, getUserEmail, getUserDisplayName, onAuthStateChanged } from './firebase-config.js';
import { verifyAndEnforceThreeDevices } from './device-guard.js';
import { sendOrderLifecycleEmails } from './order-email-notifier.js';
import { doc, setDoc } from 'firebase/firestore';

const RETAIL_BASE_PRICES = {
  softcover: { basePrice: 24.90, label: '📕 Tapa Blanda (Mate)', luluBind: 'softcover' },
  perfect:   { basePrice: 24.90, label: '📕 Tapa Blanda (Mate)', luluBind: 'softcover' },
  coil:      { basePrice: 27.90, label: '🌀 Anillas Metálicas (Wire-O)', luluBind: 'coil' },
  hardcover: { basePrice: 32.90, label: '📘 Tapa Dura (Casewrap)', luluBind: 'hardcover' }
};

const MIN_SAFE_MARGIN = 8.00;

export function getDynamicRetailPrice(bindingType = 'coil', pageCount = 143) {
  const cfg = RETAIL_BASE_PRICES[bindingType] || RETAIL_BASE_PRICES.coil;
  const pages = Math.max(32, Math.min(800, parseInt(pageCount, 10) || 143));
  let extra = 0;
  if (pages > 300) extra = 5.00;
  else if (pages > 220) extra = 3.00;
  else if (pages > 150) extra = 2.00;
  return +(cfg.basePrice + extra).toFixed(2);
}

let devCartState = {
  isOpen: false,
  showDevXray: false, // Por defecto se abre como lo vería el cliente; el botón superior despliega los Rayos X de Lulu
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
      font-size: 0.72rem;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .mr-btn-toggle-xray {
      background: #3f362e;
      color: #fde68a;
      border: 1px solid rgba(253, 230, 138, 0.4);
      border-radius: 6px;
      padding: 4px 9px;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
    }
    .mr-btn-toggle-xray:hover {
      background: #52463b;
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

    .mr-customer-summary-box {
      background: #f4efe6;
      border: 1px solid #dfd6c5;
      border-radius: 9px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .mr-customer-summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.82rem;
      color: #4a4138;
    }
    .mr-customer-summary-total {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-top: 1px solid #d5cab8;
      padding-top: 8px;
      margin-top: 4px;
      font-size: 0.96rem;
      font-weight: 800;
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

  // Botón flotante y botón de finalizar compra encima de Tu Carrito
  let cluster = document.getElementById('mrFloatingCartCluster');
  if (!cluster) {
    cluster = document.createElement('div');
    cluster.id = 'mrFloatingCartCluster';
    cluster.style.cssText = 'position: fixed; bottom: 22px; right: 22px; z-index: 99990; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;';

    const btnBuy = document.createElement('button');
    btnBuy.type = 'button';
    btnBuy.id = 'mrBtnFloatingBuy';
    btnBuy.style.cssText = 'background: #215c38; color: #ffffff; border: 1.5px solid #183e25; border-radius: 999px; padding: 10px 20px; font-family: "Inter", system-ui, sans-serif; font-size: 0.85rem; font-weight: 800; display: inline-flex; align-items: center; gap: 7px; cursor: pointer; box-shadow: 0 10px 24px rgba(33,92,56,0.3); transition: all 0.2s ease;';
    btnBuy.innerHTML = `<span>💳</span> <span>Finalizar Compra</span>`;
    btnBuy.addEventListener('click', () => {
      if (typeof window.openBasketCheckoutModal === 'function') {
        window.openBasketCheckoutModal();
      } else {
        openDevCartDrawer();
      }
    });

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'mrDevCartFab';
    fab.className = 'mr-dev-cart-fab';
    fab.style.cssText = 'position: static; margin: 0;';
    fab.innerHTML = `
      <span>🛒</span>
      <span>Tu Carrito</span>
      <span class="mr-dev-cart-fab-badge">0€</span>
    `;
    fab.addEventListener('click', () => {
      if (typeof window.openBasketCheckoutModal === 'function') {
        window.openBasketCheckoutModal();
      } else {
        openDevCartDrawer();
      }
    });

    cluster.appendChild(btnBuy);
    cluster.appendChild(fab);
    document.body.appendChild(cluster);
  }

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
        <span>🛒</span> Resumen de tu Pedido
      </h3>
      <button type="button" class="mr-cart-close" id="mrBtnCloseCart" title="Cerrar">✕</button>
    </div>

    <!-- Barra superior exclusiva para ti (el cliente real no tiene esta barra) -->
    <div class="mr-cart-dev-banner" id="mrCartDevBanner" style="display:${isDeveloper(auth.currentUser) ? 'flex' : 'none'};">
      <span>🔒 Modo Pruebas (0€ reales)</span>
      <button type="button" class="mr-btn-toggle-xray" id="mrBtnToggleXray">
        🔧 Ver Rayos X Lulu / Margen
      </button>
    </div>

    <div class="mr-cart-body">
      <!-- 1. Ejemplar configurado (Resumen fijo no editable) -->
      <div class="mr-cart-card">
        <div class="mr-cart-card-title">
          <span>1. Tu Cuaderno Configurado</span>
          <span id="mrCartPriceBadge" style="font-size:1.05rem; color:#1f1c19; font-weight:900;">27,90 €</span>
        </div>
        <div style="background: #fdfbf7; border: 1px solid #ebd5c3; border-radius: 8px; padding: 12px 14px;">
          <h4 id="mrCartSummaryTitle" style="font-family: var(--font-display, serif); font-size: 1.15rem; margin: 0 0 4px 0; color: #1f1c19;">${escapeHtml(devCartState.title)}</h4>
          <div id="mrCartSummaryBinding" style="font-size: 0.82rem; color: #665e54;">
            ${(RETAIL_BASE_PRICES[devCartState.bindingType] || RETAIL_BASE_PRICES.coil).label} · <strong>${devCartState.pageCount} páginas</strong> · Formato 210 × 152 mm
          </div>
        </div>
      </div>

      <!-- 2. Dirección de Envío Confirmada (Resumen no editable) -->
      <div class="mr-cart-card">
        <div class="mr-cart-card-title">
          <span>2. Dirección de Entrega</span>
          <span style="font-size:0.68rem; color:#215c38; font-weight:800;">🚚 Envío GRATIS incluido</span>
        </div>
        <div style="background: #fdfbf7; border: 1px solid #ebd5c3; border-radius: 8px; padding: 12px 14px; font-size: 0.82rem; color: #3d342c; line-height: 1.5;">
          <div><strong id="mrCartSummaryName">${escapeHtml(devCartState.customerName)}</strong> (<span id="mrCartSummaryEmail">${escapeHtml(devCartState.customerEmail)}</span>)</div>
          <div id="mrCartSummaryAddr">${escapeHtml(devCartState.address)}</div>
          <div><span id="mrCartSummaryZip">${escapeHtml(devCartState.postalCode)}</span> <span id="mrCartSummaryCity">${escapeHtml(devCartState.city)}</span>, España</div>
          <div id="mrCartSummaryPhone" style="color: #665e54; font-size: 0.78rem;">Tel: ${escapeHtml(devCartState.customerPhone)}</div>
        </div>
      </div>

      <!-- 3. Desglose limpio para el cliente (Envío incluido) -->
      <div class="mr-customer-summary-box">
        <div class="mr-customer-summary-row">
          <span id="mrCustSummaryItem">Cuaderno personalizado (${devCartState.pageCount} págs)</span>
          <span id="mrCustSummarySubtotal">27,90 €</span>
        </div>
        <div class="mr-customer-summary-row">
          <span>Envío a domicilio</span>
          <strong style="color:#215c38;">GRATIS (Incluido)</strong>
        </div>
        <div class="mr-customer-summary-total">
          <span>Total a pagar (IVA y envío incluidos)</span>
          <span id="mrCustSummaryTotal">27,90 €</span>
        </div>
        <div id="mrCustomerPublicError" style="display:none; margin-top:6px; padding:8px 10px; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; color:#991b1b; font-size:0.76rem; font-weight:600;"></div>
      </div>

      <!-- 4. PANEL DE RAYOS X DESARROLLADOR (OCULTO AL CLIENTE · DESPLEGABLE SOLO PARA TI) -->
      <div id="mrDevXrayPanel" class="mr-cart-card" style="display:none; border:1.5px dashed #87553b; background:#fbf9f5;">
        <div class="mr-cart-card-title">
          <span>🛡️ Rayos X Desarrollador · Cortacircuitos Lulu</span>
          <button type="button" id="mrBtnRecalcLulu" style="background:#ece4d5; border:1px solid #cbbba0; border-radius:5px; padding:2px 8px; font-size:0.7rem; font-weight:700; cursor:pointer;">↻ Recalcular</button>
        </div>

        <div id="mrSafetyBox" class="mr-safety-box">
          <div id="mrSafetyStatusHeader" style="font-weight:800; margin-bottom:6px; color:#166534;">
            ⏳ Consultando coste real en Lulu Direct API...
          </div>
          <div class="mr-safety-row">
            <span>PVP Dinámico cobrado al cliente:</span>
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

        <button type="button" class="mr-btn-direct-sim" id="mrBtnDirectOrderSim" style="margin-top:10px;">
          ⚡ [Dev] Registrar pedido directo en Centro de Mando (sin pasarela)
        </button>
      </div>
    </div>

    <div class="mr-cart-footer" style="display:flex; flex-direction:column; gap:8px;">
      <!-- Botón de Simulación Test (Solo cuentas autorizadas) -->
      <button type="button" class="mr-btn-checkout" id="mrBtnInstantZeroOrder" style="background:#215c38;">
        <span>✅</span>
        <span id="mrBtnCheckoutText">Confirmar Pedido (0 € Test) · 27,90 € (Envío incluido)</span>
      </button>

      <!-- Botones de Desarrollador / Modo Pruebas (Ocultos para clientes normales) -->
      <div id="mrDevTestButtonsRow" style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" id="mrBtnStripeCheckout" style="flex:1; background:#f5f0e6; color:#1f1c19; border:1px solid #cbbba0; border-radius:8px; padding:9px 12px; font-size:0.78rem; font-weight:700; cursor:pointer;">
          💳 Probar Pasarela Stripe Checkout
        </button>
        <button type="button" id="mrBtnSavePendingBasket" style="flex:1; background:#ffffff; color:#87553b; border:1px solid #d8cbb8; border-radius:8px; padding:9px 12px; font-size:0.78rem; font-weight:700; cursor:pointer;">
          💾 Dejar «Pendiente de Pago» en Perfil
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);

  // Eventos del Drawer
  document.getElementById('mrBtnCloseCart')?.addEventListener('click', closeDevCartDrawer);
  document.getElementById('mrBtnRecalcLulu')?.addEventListener('click', () => triggerLuluQuote());

  document.getElementById('mrBtnToggleXray')?.addEventListener('click', () => {
    devCartState.showDevXray = !devCartState.showDevXray;
    const xrayPanel = document.getElementById('mrDevXrayPanel');
    const toggleBtn = document.getElementById('mrBtnToggleXray');
    if (xrayPanel) xrayPanel.style.display = devCartState.showDevXray ? 'block' : 'none';
    if (toggleBtn) {
      toggleBtn.textContent = devCartState.showDevXray
        ? '👁️ Ocultar Rayos X (Ver como Cliente)'
        : '🔧 Ver Rayos X Lulu / Margen';
    }
  });

  document.getElementById('mrChkSimulateSpike')?.addEventListener('change', (e) => {
    devCartState.simulateSpike = e.target.checked;
    triggerLuluQuote();
  });

  document.getElementById('mrBtnInstantZeroOrder')?.addEventListener('click', handleDirectOrderSimulation);
  document.getElementById('mrBtnStripeCheckout')?.addEventListener('click', handleLaunchStripeTestCheckout);
  document.getElementById('mrBtnDirectOrderSim')?.addEventListener('click', handleDirectOrderSimulation);
  document.getElementById('mrBtnSavePendingBasket')?.addEventListener('click', handleSavePendingBasketFromDrawer);
}

function syncCartStateFromDOM() {
  const dynamicPrice = getDynamicRetailPrice(devCartState.bindingType, devCartState.pageCount);
  const priceStr = `${dynamicPrice.toFixed(2).replace('.', ',')} €`;

  const priceBadge = document.getElementById('mrCartPriceBadge');
  if (priceBadge) priceBadge.textContent = priceStr;

  const custItem = document.getElementById('mrCustSummaryItem');
  const custSub = document.getElementById('mrCustSummarySubtotal');
  const custTot = document.getElementById('mrCustSummaryTotal');
  const cfg = RETAIL_BASE_PRICES[devCartState.bindingType] || RETAIL_BASE_PRICES.coil;

  if (custItem) custItem.textContent = `${cfg.label} · ${devCartState.pageCount} págs`;
  if (custSub) custSub.textContent = priceStr;
  if (custTot) custTot.textContent = priceStr;

  // Actualizar textos de resumen
  const sumTitle = document.getElementById('mrCartSummaryTitle');
  const sumBinding = document.getElementById('mrCartSummaryBinding');
  const sumName = document.getElementById('mrCartSummaryName');
  const sumEmail = document.getElementById('mrCartSummaryEmail');
  const sumAddr = document.getElementById('mrCartSummaryAddr');
  const sumZip = document.getElementById('mrCartSummaryZip');
  const sumCity = document.getElementById('mrCartSummaryCity');
  const sumPhone = document.getElementById('mrCartSummaryPhone');
  if (sumTitle) sumTitle.textContent = devCartState.title;
  if (sumBinding) {
    sumBinding.innerHTML = `${cfg.label} · <strong>${devCartState.pageCount} páginas</strong> · Formato 210 × 152 mm`;
  }
  if (sumName) sumName.textContent = devCartState.customerName;
  if (sumEmail) sumEmail.textContent = devCartState.customerEmail;
  if (sumAddr) sumAddr.textContent = devCartState.address;
  if (sumZip) sumZip.textContent = devCartState.postalCode;
  if (sumCity) sumCity.textContent = devCartState.city;
  if (sumPhone) sumPhone.textContent = `Tel: ${devCartState.customerPhone}`;
}

export function openDevCartDrawer(customItem = null) {
  if (typeof window.openBasketCheckoutModal === 'function') {
    window.openBasketCheckoutModal(customItem ? (customItem.id || null) : null);
    return;
  }
  buildCartDrawerDOM();

  if (customItem) {
    if (customItem.title) devCartState.title = customItem.title;
    if (customItem.bindingType) {
      devCartState.bindingType = customItem.bindingType === 'perfect' ? 'softcover' : customItem.bindingType;
    }
    if (customItem.pageCount) devCartState.pageCount = parseInt(customItem.pageCount, 10) || 143;
    if (customItem.syncedBookName) devCartState.subtitle = customItem.syncedBookName;

    if (customItem.shipping) {
      if (customItem.shipping.name) devCartState.customerName = customItem.shipping.name;
      if (customItem.shipping.email) devCartState.customerEmail = customItem.shipping.email;
      if (customItem.shipping.address) devCartState.address = customItem.shipping.address;
      if (customItem.shipping.postalCode) devCartState.postalCode = customItem.shipping.postalCode;
      if (customItem.shipping.city) devCartState.city = customItem.shipping.city;
      if (customItem.shipping.phone) devCartState.customerPhone = customItem.shipping.phone;
    }
  }

  syncCartStateFromDOM();

  // Control de visibilidad de herramientas de test:
  // Solo la cuenta de desarrollador (jesgilcan@gmail.com) ve botones de test/xray
  const isDevUser = auth.currentUser && isDeveloper(auth.currentUser);
  const testBtnsRow = document.getElementById('mrDevTestButtonsRow');
  const xrayToggle = document.getElementById('mrBtnToggleXray');
  const devBanner = document.getElementById('mrCartDevBanner');
  if (testBtnsRow) testBtnsRow.style.display = isDevUser ? 'flex' : 'none';
  if (xrayToggle) xrayToggle.style.display = isDevUser ? 'inline-block' : 'none';
  if (devBanner) devBanner.style.display = isDevUser ? 'flex' : 'none';

  const backdrop = document.getElementById('mrDevCartBackdrop');
  const drawer = document.getElementById('mrDevCartDrawer');
  if (backdrop) {
    backdrop.style.setProperty('display', 'block', 'important');
    backdrop.style.setProperty('opacity', '1', 'important');
    backdrop.style.setProperty('pointer-events', 'auto', 'important');
    backdrop.style.setProperty('z-index', '999998', 'important');
    backdrop.classList.add('open');
  }
  if (drawer) {
    drawer.style.setProperty('display', 'flex', 'important');
    drawer.style.setProperty('transform', 'translateX(0)', 'important');
    drawer.style.setProperty('z-index', '999999', 'important');
    drawer.classList.add('open');
  }
  devCartState.isOpen = true;
  triggerLuluQuote();
}

export function closeDevCartDrawer() {
  const backdrop = document.getElementById('mrDevCartBackdrop');
  const drawer = document.getElementById('mrDevCartDrawer');
  if (backdrop) {
    backdrop.classList.remove('open');
    backdrop.style.setProperty('opacity', '0', 'important');
    backdrop.style.setProperty('pointer-events', 'none', 'important');
    setTimeout(() => { if (!devCartState.isOpen) backdrop.style.setProperty('display', 'none', 'important'); }, 260);
  }
  if (drawer) {
    drawer.classList.remove('open');
    drawer.style.setProperty('transform', 'translateX(102%)', 'important');
  }
  devCartState.isOpen = false;
}

async function triggerLuluQuote() {
  const safetyBox = document.getElementById('mrSafetyBox');
  const headerEl = document.getElementById('mrSafetyStatusHeader');
  const blockAlert = document.getElementById('mrSafetyBlockAlert');
  const custPublicError = document.getElementById('mrCustomerPublicError');
  const btnInstantZero = document.getElementById('mrBtnInstantZeroOrder');
  const btnCheckout = document.getElementById('mrBtnStripeCheckout');
  const btnCheckoutText = document.getElementById('mrBtnCheckoutText');
  const btnDirectSim = document.getElementById('mrBtnDirectOrderSim');

  if (!safetyBox || !headerEl) return;

  headerEl.textContent = '⏳ Verificando coste real en Lulu Direct API...';
  headerEl.style.color = '#4a423a';
  if (btnCheckout) btnCheckout.disabled = false;
  if (btnInstantZero) {
    btnInstantZero.disabled = false;
    btnInstantZero.style.opacity = '1';
    btnInstantZero.style.cursor = 'pointer';
  }

  const dynamicPrice = getDynamicRetailPrice(devCartState.bindingType, devCartState.pageCount);
  const fallbackQuote = {
    canPurchase: !devCartState.simulateSpike,
    pricing: {
      retailPrice: dynamicPrice,
      luluTotalCost: 13.93,
      luluPrintCost: 8.50,
      luluShippingCost: 3.50,
      netMargin: +(dynamicPrice - 13.93 - (dynamicPrice * 0.015 + 0.25)).toFixed(2),
      stripeFee: +(dynamicPrice * 0.015 + 0.25).toFixed(2)
    }
  };

  try {
    if (!auth.currentUser) {
      throw new Error('Sesión no disponible temporalmente');
    }
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

    if (!res.ok) {
      throw new Error(`Error en servidor (${res.status})`);
    }

    const data = await res.json();
    devCartState.lastQuote = data;

    if (data.pricing) {
      document.getElementById('mrQuoteRetail').textContent = `${data.pricing.retailPrice.toFixed(2)} €`;
      document.getElementById('mrQuotePrint').textContent = `${(data.pricing.luluPrintCost || data.pricing.printCost || 8.50).toFixed(2)} €`;
      document.getElementById('mrQuoteShip').textContent = `${(data.pricing.luluShippingCost || data.pricing.shippingCost || 3.50).toFixed(2)} €`;
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
      if (custPublicError) {
        custPublicError.style.display = 'block';
        custPublicError.textContent = data.publicErrorMessage || 'Envío temporalmente no disponible para esta configuración.';
      }
      if (btnCheckout) btnCheckout.disabled = true;
      if (btnInstantZero) btnInstantZero.disabled = true;
      if (btnCheckoutText) btnCheckoutText.textContent = '🚫 Envío no disponible temporalmente';
      if (btnDirectSim) btnDirectSim.disabled = true;
    } else {
      safetyBox.classList.remove('blocked');
      headerEl.textContent = `✅ MARGEN SEGURO VERIFICADO (+${data.pricing.netMargin.toFixed(2)} € limpios)`;
      headerEl.style.color = '#166534';
      if (blockAlert) blockAlert.style.display = 'none';
      if (custPublicError) custPublicError.style.display = 'none';
      if (btnCheckout) btnCheckout.disabled = false;
      if (btnInstantZero) btnInstantZero.disabled = false;
      if (btnCheckoutText) {
        btnCheckoutText.textContent = `Confirmar Pedido (0 € Test) · ${data.pricing.retailPrice.toFixed(2).replace('.', ',')} € (Envío incluido)`;
      }
      if (btnDirectSim) btnDirectSim.disabled = false;
    }
  } catch (err) {
    console.warn('Aviso cotización Lulu:', err.message);
    devCartState.lastQuote = fallbackQuote;
    safetyBox.classList.remove('blocked');
    headerEl.textContent = '✅ Modo Test Activo (Cotización de respaldo)';
    headerEl.style.color = '#166534';
    if (blockAlert) blockAlert.style.display = 'none';
    if (custPublicError) custPublicError.style.display = 'none';
    if (btnCheckout) btnCheckout.disabled = false;
    if (btnInstantZero) btnInstantZero.disabled = devCartState.simulateSpike;
    if (btnCheckoutText) {
      btnCheckoutText.textContent = devCartState.simulateSpike
        ? '🚫 Compra bloqueada por prueba de subida de precio'
        : `Confirmar Pedido (0 € Test) · ${dynamicPrice.toFixed(2).replace('.', ',')} € (Envío incluido)`;
    }
    if (btnDirectSim) btnDirectSim.disabled = devCartState.simulateSpike;
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
      notes: devCartState.customerNotes || 'Sin instrucciones adicionales',
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
        message: 'Pedido recibido y registrado en imprenta'
      },
      {
        date: new Date().toISOString(),
        message: 'Pago confirmado correctamente'
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
    if (auth.currentUser && (isDeveloper(auth.currentUser) || isTestCustomer(auth.currentUser))) {
      await setDoc(doc(db, 'orders', newOrder.id), newOrder, { merge: true });
    }
  } catch (e) {}

  // Disparar en tiempo real AMBOS correos desde pedidos@editorialmenosruido.com:
  // 1) Confirmación de compra al Cliente (jesusgil_87@hotmail.com)
  // 2) Informe completo de nueva venta y Lulu al Gestor de la Web (jesgilcan@gmail.com)
  try {
    const emailRes = await sendOrderLifecycleEmails(newOrder, 'order_created');
    if (emailRes.clientEmailId && newOrder.comms?.compra) {
      newOrder.comms.compra.id = emailRes.clientEmailId;
      newOrder.comms.compra.sent = true;
    }
  } catch (e) {}

  return newOrder;
}

async function handleLaunchStripeTestCheckout() {
  if (!auth.currentUser || (!isDeveloper(auth.currentUser) && !isTestCustomer(auth.currentUser))) return;
  syncCartStateFromDOM();

  const btn = document.getElementById('mrBtnStripeCheckout');
  const btnTxt = document.getElementById('mrBtnCheckoutText');
  if (btn) btn.disabled = true;
  if (btnTxt) btnTxt.textContent = '⏳ Abriendo pasarela segura y enviando emails...';

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
      throw new Error(data.error || 'No se pudo iniciar la pasarela de pago.');
    }

    await registerSimulatedOrderInBackoffice(data.orderNumber, data.quote, data.sessionId);
    window.location.href = data.checkoutUrl;
  } catch (err) {
    alert('Aviso de seguridad:\n' + (err.message || err));
    triggerLuluQuote();
  }
}

async function handleDirectOrderSimulation() {
  syncCartStateFromDOM();

  if (!devCartState.lastQuote) {
    const dynamicPrice = getDynamicRetailPrice(devCartState.bindingType, devCartState.pageCount);
    devCartState.lastQuote = {
      canPurchase: !devCartState.simulateSpike,
      pricing: {
        retailPrice: dynamicPrice,
        luluTotalCost: 13.93,
        netMargin: +(dynamicPrice - 13.93 - (dynamicPrice * 0.015 + 0.25)).toFixed(2)
      }
    };
  }

  if (!devCartState.lastQuote.canPurchase) {
    alert('El Cortacircuitos tiene bloqueada la compra. Desactiva la simulación de subida de precios para registrar el pedido.');
    return;
  }

  const btn = document.getElementById('mrBtnInstantZeroOrder');
  const btnTxt = document.getElementById('mrBtnCheckoutText');
  if (btn) btn.disabled = true;
  if (btnTxt) btnTxt.textContent = '⏳ Registrando pedido y enviando emails al Cliente y al Gestor...';

  const orderNumber = 'MR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  await registerSimulatedOrderInBackoffice(orderNumber, devCartState.lastQuote, 'cs_test_direct_' + Date.now());
  window.location.href = `/mi-espacio.html?tab=pedidos&stripe_test_success=1&order=${encodeURIComponent(orderNumber)}`;
}

async function handleSavePendingBasketFromDrawer() {
  if (!auth.currentUser || (!isDeveloper(auth.currentUser) && !isTestCustomer(auth.currentUser))) return;
  syncCartStateFromDOM();

  const newPending = {
    id: 'pend_' + Date.now(),
    title: devCartState.title,
    subtitle: devCartState.subtitle || 'Libro Completo + Portada sincronizada',
    bindingType: devCartState.bindingType,
    pageCount: devCartState.pageCount,
    fileSizeMb: (devCartState.pageCount * 0.31).toFixed(1),
    savedAt: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem('mr_pending_payment_books');
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(newPending);
    localStorage.setItem('mr_pending_payment_books', JSON.stringify(list));
  } catch (e) {}

  try {
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      lastSavedPendingBook: newPending
    }, { merge: true });
  } catch (e) {}

  window.location.href = '/mi-espacio.html?tab=pedidos';
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}

// Inicialización estricta:
// 1. Si es jesgilcan@gmail.com + Dispositivo dentro de los 3 autorizados -> Modo Desarrollador + Cliente
// 2. Si es jesusgil_87@hotmail.com -> Modo Cliente de Pruebas 100% limpio (sin Rayos X de desarrollador)
// 3. Cualquier otro visitante -> Oculto
onAuthStateChanged(auth, async (user) => {
  const devWrapper = document.getElementById('devCartWrapper');
  if (!user || (!isDeveloper(user) && !isTestCustomer(user))) {
    if (devWrapper) devWrapper.style.setProperty('display', 'none', 'important');
    document.getElementById('mrDevCartFab')?.remove();
    return;
  }

  if (isDeveloper(user)) {
    const deviceCheck = await verifyAndEnforceThreeDevices(user);
    if (!deviceCheck.allowed) {
      if (devWrapper) devWrapper.style.setProperty('display', 'none', 'important');
      document.getElementById('mrDevCartFab')?.remove();
      return;
    }
  }

  // Pre-rellenar datos del usuario actual (ej. jesusgil_87@hotmail.com)
  const uEmail = getUserEmail(user);
  const uName = getUserDisplayName(user);
  if (uEmail) devCartState.customerEmail = uEmail;
  if (uName && uName !== 'Usuario') devCartState.customerName = uName;

  if (devWrapper) {
    devWrapper.style.removeProperty('display');
    devWrapper.style.display = 'flex';
  }

  if (!drawerInitialized) {
    drawerInitialized = true;
    buildCartDrawerDOM();
  } else {
    const banner = document.getElementById('mrCartDevBanner');
    if (banner) banner.style.display = isDeveloper(user) ? 'flex' : 'none';
    const inpEm = document.getElementById('mrCartInpEmail');
    if (inpEm && uEmail) inpEm.value = uEmail;
  }
});

window.openDevCartDrawer = openDevCartDrawer;
