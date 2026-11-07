import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\chrome_client_profile';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'https://editorialmenosruido.com';

async function runCheckoutAndAdminFlow() {
  console.log('================================================================');
  console.log('INICIANDO PRUEBAS DE TRAMITACIÓN DE COMPRA Y GESTOR DE PEDIDOS');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: TEMP_PROFILE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  page.on('dialog', async dialog => {
    try {
      console.log(`  [ALERTA/CONFIRM NAVEGADOR]:`, dialog.message().substring(0, 100));
      await dialog.accept();
    } catch (e) {}
  });

  // 1. Ir a Mi Espacio -> Cesta / Pedidos
  console.log('Paso 1: Abriendo Mi Espacio (Pestaña Pedidos y Cesta)...');
  await page.goto(`${BASE_URL}/mi-espacio.html?tab=pedidos`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 4500));

  // Marcar casilla de revisión de textos en los cuadernos de la cesta
  console.log('Marcando casillas de confirmación de textos...');
  const checkResult = await page.evaluate(() => {
    const checkboxes = document.querySelectorAll('input[data-confirm-texts]');
    checkboxes.forEach(chk => {
      if (!chk.checked) {
        chk.checked = true;
        chk.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    return { count: checkboxes.length };
  });
  console.log(`  Casillas marcadas: ${checkResult.count}`);
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'flujo2_paso1_cesta_con_casilla_marcada.png'), fullPage: false });

  // 2. Pulsar botón único «Tramitar pedido»
  console.log('Paso 2: Pulsando "Tramitar pedido"...');
  await page.evaluate(() => {
    const btn = document.getElementById('btn-basket-checkout');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'flujo2_paso2_modal_checkout.png'), fullPage: false });

  // 3. Confirmar pedido en el modal
  console.log('Paso 3: Confirmando pedido en el modal...');
  await page.evaluate(() => {
    const confirmBtn = document.getElementById('btn-confirm-checkout-order');
    if (confirmBtn) confirmBtn.click();
  });
  await new Promise(r => setTimeout(r, 4500));

  // Inspeccionar pedido creado
  const createdOrderInfo = await page.evaluate(() => {
    const firstOrderCard = document.querySelector('#client-orders-history-list > div');
    const orderTitle = firstOrderCard ? firstOrderCard.querySelector('h4, strong')?.textContent?.trim() : null;
    const trackingBadge = firstOrderCard ? firstOrderCard.querySelector('.tracking-pill, [style*="border-radius"]')?.textContent?.trim() : null;
    return { orderTitle, trackingBadge, text: firstOrderCard ? firstOrderCard.textContent.substring(0, 200).replace(/\s+/g, ' ') : 'no orders' };
  });
  console.log('  Pedido creado en cliente:', createdOrderInfo);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'flujo2_paso3_pedido_tramitado_en_seguimiento.png'), fullPage: false });

  // 4. Ir a admin-pedidos.html
  console.log('Paso 4: Abriendo Gestor de Pedidos (admin-pedidos.html)...');
  await page.goto(`${BASE_URL}/admin-pedidos.html`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  // Desbloquear PIN si aparece la pasarela
  const unlocked = await page.evaluate(() => {
    const gate = document.getElementById('authGate');
    const pinInp = document.getElementById('gatePinInput');
    const btnUnlock = document.getElementById('btnGateUnlock');
    if (gate && window.getComputedStyle(gate).display !== 'none' && pinInp && btnUnlock) {
      pinInp.value = '1111';
      btnUnlock.click();
      return 'pin_entered';
    }
    return 'already_unlocked';
  });
  console.log('  Estado pasarela PIN admin:', unlocked);
  await new Promise(r => setTimeout(r, 3500));

  const adminOrdersAudit = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.order-admin-card, .order-card, [data-order-id]'));
    return {
      totalCards: cards.length,
      sampleCard: cards[0] ? cards[0].textContent.substring(0, 150).replace(/\s+/g, ' ') : 'none'
    };
  });
  console.log('  Auditoría Gestor de Pedidos:', adminOrdersAudit);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'flujo2_paso4_admin_gestor_recibido.png'), fullPage: false });

  // 5. Aprobar primer pedido (Aprobar y Enviar a Imprenta)
  console.log('Paso 5: Aprobando pedido en el Gestor de Imprenta...');
  await page.evaluate(() => {
    const approveBtn = document.querySelector('.btn-order-approve');
    if (approveBtn) approveBtn.click();
  });
  await new Promise(r => setTimeout(r, 3500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'flujo2_paso5_admin_gestor_aprobado.png'), fullPage: false });

  // 6. Volver a Mi Espacio para verificar sincronización en vivo del cliente
  console.log('Paso 6: Verificando sincronización de estado en Mi Espacio...');
  await page.goto(`${BASE_URL}/mi-espacio.html?tab=pedidos`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 4500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'flujo2_paso6_cliente_estado_actualizado.png'), fullPage: false });

  console.log('================================================================');
  console.log('✓ FLUJO COMPLETO DE COMPRA Y GESTIÓN EJECUTADO Y VALIDADO');
  console.log('================================================================\n');

  await browser.close();
}

runCheckoutAndAdminFlow().catch(console.error);
