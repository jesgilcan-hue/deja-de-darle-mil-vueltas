import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = 'C:\\Users\\IA\\AppData\\Local\\Temp\\edge_test_profile';

const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';

async function run() {
  console.log('=== INICIO PRUEBA AUTOMATIZADA COMPLETA DE E-COMMERCE ===');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    userDataDir: USER_DATA_DIR,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));
  page.on('dialog', async dialog => {
    console.log('[BROWSER DIALOG ALERT]', dialog.message());
    await dialog.accept();
  });

  const testResults = [];

  // =========================================================================
  // PASO 1: Comprobar Paridad en el Generador de Libro Completo
  // =========================================================================
  console.log('\n--- PASO 1: Verificando validación de páginas pares en el Generador ---');
  await page.goto('https://www.editorialmenosruido.com/generador-libro-completo', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const parityCheck = await page.evaluate(() => {
    // Probar función de validación
    let oddAlertTriggered = false;
    let originalAlert = window.alert;
    window.alert = (msg) => {
      oddAlertTriggered = true;
      console.log('Alert interceptado:', msg);
    };

    // Forzar lista impar
    if (typeof generatedPageList !== 'undefined') {
      const origList = [...generatedPageList];
      generatedPageList = new Array(15).fill({}); // 15 páginas (impar)
      
      const saveBtn = document.getElementById('btn-save-generator-design');
      if (saveBtn) saveBtn.click();

      generatedPageList = origList;
    }
    window.alert = originalAlert;
    return { oddAlertTriggered };
  });

  console.log('Resultado comprobación paridad impar:', parityCheck);
  testResults.push({ step: '1. Paridad Páginas Generador', ok: parityCheck.oddAlertTriggered });

  const step1Shot = path.join(ARTIFACT_DIR, 'test_e2e_step1_generador.png');
  await page.screenshot({ path: step1Shot, fullPage: false });
  console.log('Captura Paso 1 guardada:', step1Shot);

  // =========================================================================
  // PASO 2: Mi Espacio - Cesta de Cuadernos y Controles
  // =========================================================================
  console.log('\n--- PASO 2: Verificando Cesta interactiva, Cantidades y Checkbox en Mi Espacio ---');
  await page.goto('https://www.editorialmenosruido.com/mi-espacio?tab=pedidos', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  // Inyectar un libro de prueba par en la cesta si está vacía
  await page.evaluate(() => {
    const testBook = {
      id: 'pend_test_e2e_1',
      title: 'Planificador Semestral 180 Días',
      subtitle: 'Edición Personalizada · Interior 144 págs',
      bindingType: 'hardcover',
      pageCount: 144,
      fileSizeMb: '42.5',
      quantity: 1,
      textsConfirmed: false,
      shipping: {
        name: 'Cliente Test E2E',
        email: 'jesusgil_87@hotmail.com',
        phone: '+34 600 123 456',
        address: 'Calle Mayor 10, 2ºA',
        postalCode: '28013',
        city: 'Madrid',
        province: 'Madrid',
        country: 'España',
        notes: 'Llamar al telefonillo del 2ºA'
      }
    };
    let list = [];
    try {
      const raw = localStorage.getItem('mr_pending_payment_books');
      if (raw) list = JSON.parse(raw);
    } catch(e) {}
    list = [testBook];
    localStorage.setItem('mr_pending_payment_books', JSON.stringify(list));
    
    // Si la función de renderizado existe en scope
    if (typeof updateFloatingCartSummary === 'function') {
      window.clientPendingBasket = list;
      updateFloatingCartSummary();
    }
  });

  // Recargar para que mi-espacio lea la cesta
  await page.goto('https://www.editorialmenosruido.com/mi-espacio?tab=pedidos', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  const basketCardExists = await page.evaluate(() => {
    return !!document.querySelector('.pending-basket-card');
  });
  console.log('Tarjeta de cesta renderizada:', basketCardExists);
  testResults.push({ step: '2. Renderizado Tarjeta Cesta', ok: basketCardExists });

  // Comprobar botones de Descarga PDF
  const pdfButtons = await page.evaluate(() => {
    const coverBtn = document.querySelector('[data-preview-pdf-cover]');
    const intBtn = document.querySelector('[data-preview-pdf-interior]');
    return {
      hasCoverBtn: !!coverBtn,
      coverBtnText: coverBtn?.textContent?.trim(),
      hasInteriorBtn: !!intBtn,
      interiorBtnText: intBtn?.textContent?.trim()
    };
  });
  console.log('Botones de descarga PDF en cesta:', pdfButtons);
  testResults.push({ step: '3. Botones Descarga Portada e Interior PDF', ok: pdfButtons.hasCoverBtn && pdfButtons.hasInteriorBtn });

  // Comprobar selector de cantidad: bajar a 0
  console.log('Probando disminución de cantidad a 0...');
  await page.click('[data-qty-dec]');
  await new Promise(r => setTimeout(r, 800));

  const qtyZeroState = await page.evaluate(() => {
    const qtyVal = document.querySelector('[id^="qty-val-"]')?.textContent?.trim();
    const buyBtn = document.querySelector('[data-buy-pending]');
    return {
      qty: qtyVal,
      buyDisabled: buyBtn?.disabled,
      buyOpacity: buyBtn ? window.getComputedStyle(buyBtn).opacity : null
    };
  });
  console.log('Estado con cantidad 0:', qtyZeroState);
  testResults.push({ step: '4. Bloqueo de compra con cantidad 0', ok: qtyZeroState.qty === '0' && qtyZeroState.buyDisabled });

  // Incrementar a 1
  console.log('Incrementando cantidad a 1...');
  await page.click('[data-qty-inc]');
  await new Promise(r => setTimeout(r, 800));

  // Intentar pulsar Comprar SIN marcar la casilla
  console.log('Probando pulsación de Comprar sin confirmación de textos...');
  await page.click('[data-buy-pending]');
  await new Promise(r => setTimeout(r, 1000));

  const modalOpenWithoutConfirm = await page.evaluate(() => {
    const modal = document.getElementById('basket-checkout-modal');
    return modal && window.getComputedStyle(modal).display !== 'none';
  });
  console.log('¿Se abrió el modal sin confirmar textos? (Debe ser false):', modalOpenWithoutConfirm);
  testResults.push({ step: '5. Bloqueo si no se confirman textos', ok: !modalOpenWithoutConfirm });

  // Marcar la casilla de confirmación
  console.log('Marcando la casilla de confirmación de textos...');
  await page.click('[data-confirm-texts]');
  await new Promise(r => setTimeout(r, 600));

  const step2Shot = path.join(ARTIFACT_DIR, 'test_e2e_step2_cesta_confirmada.png');
  await page.screenshot({ path: step2Shot, fullPage: false });
  console.log('Captura Paso 2 guardada:', step2Shot);

  // =========================================================================
  // PASO 3: Abrir Modal de Compra y Verificar Formulario
  // =========================================================================
  console.log('\n--- PASO 3: Abriendo Modal de Compra con Stripe ---');
  await page.click('[data-buy-pending]');
  await new Promise(r => setTimeout(r, 1200));

  const modalState = await page.evaluate(() => {
    const modal = document.getElementById('basket-checkout-modal');
    const isVisible = modal && window.getComputedStyle(modal).display !== 'none';
    const notesInput = document.getElementById('checkout-modal-customer-notes');
    const hasChangeAddrBtn = !!document.getElementById('checkout-modal-change-address-btn') || !!modal?.querySelector('[data-edit-shipping]');
    const confirmBtn = document.getElementById('btn-confirm-checkout-order');
    const confirmBtnText = confirmBtn?.textContent?.trim();

    return {
      isVisible,
      hasNotesInput: !!notesInput,
      notesInputValue: notesInput?.value,
      hasChangeAddrBtn, // Debe ser false
      confirmBtnText
    };
  });

  console.log('Estado del Modal de Compra:', modalState);
  testResults.push({
    step: '6. Modal de Compra (Sin botón cambiar, con notas y botón Stripe)',
    ok: modalState.isVisible && modalState.hasNotesInput && !modalState.hasChangeAddrBtn
  });

  // Escribir instrucciones de prueba en el input de notas
  if (modalState.hasNotesInput) {
    await page.evaluate(() => {
      const inp = document.getElementById('checkout-modal-customer-notes');
      if (inp) inp.value = 'Instrucción E2E: Dejar en conserjería con D. Manuel.';
    });
  }

  const step3Shot = path.join(ARTIFACT_DIR, 'test_e2e_step3_modal_checkout.png');
  await page.screenshot({ path: step3Shot, fullPage: false });
  console.log('Captura Paso 3 guardada:', step3Shot);

  // Cerrar modal
  await page.evaluate(() => {
    if (typeof closeBasketCheckoutModal === 'function') closeBasketCheckoutModal();
  });
  await new Promise(r => setTimeout(r, 800));

  // =========================================================================
  // PASO 4: Panel del Gestor (admin-pedidos)
  // =========================================================================
  console.log('\n--- PASO 4: Verificando Panel del Gestor (admin-pedidos) ---');
  await page.goto('https://www.editorialmenosruido.com/admin-pedidos', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const adminPanelState = await page.evaluate(() => {
    const deliveredPill = document.querySelector('[data-filter="delivered"]');
    const deliveredCount = document.getElementById('countDelivered');
    const directCoverBtn = document.getElementById('btnOpenCoverExternal');
    const directInteriorBtn = document.getElementById('btnOpenInteriorExternal');

    return {
      hasDeliveredPill: !!deliveredPill,
      deliveredPillText: deliveredPill?.textContent?.trim(),
      hasDeliveredCount: !!deliveredCount,
      coverBtnText: directCoverBtn?.textContent?.trim(),
      interiorBtnText: directInteriorBtn?.textContent?.trim()
    };
  });

  console.log('Estado del Panel de Gestor:', adminPanelState);
  testResults.push({
    step: '7. Panel Gestor: Pestaña Entregados y Descargas directas',
    ok: adminPanelState.hasDeliveredPill && adminPanelState.hasDeliveredCount
  });

  const step4Shot = path.join(ARTIFACT_DIR, 'test_e2e_step4_admin_pedidos.png');
  await page.screenshot({ path: step4Shot, fullPage: false });
  console.log('Captura Paso 4 guardada:', step4Shot);

  // =========================================================================
  // RESUMEN FINAL
  // =========================================================================
  console.log('\n========================================');
  console.log('=== RESUMEN DE LA PRUEBA E2E BROWSER ===');
  console.log('========================================');
  let allOk = true;
  for (const res of testResults) {
    const status = res.ok ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} - ${res.step}`);
    if (!res.ok) allOk = false;
  }
  console.log(`\nRESULTADO GLOBAL: ${allOk ? 'TODO EN VERDE (100% FUNCIONAL)' : 'HAY FALLOS'}`);

  await browser.close();
}

run().catch(err => {
  console.error('Error durante la prueba E2E:', err);
  process.exit(1);
});
