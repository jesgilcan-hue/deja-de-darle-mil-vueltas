const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\chrome_client_profile';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'https://editorialmenosruido.com';

async function testCleanCheckoutFlow() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: TEMP_PROFILE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  page.on('dialog', async d => {
    try {
      console.log('  [DIALOG]:', d.message().substring(0, 100));
      await d.accept();
    } catch(e) {}
  });

  // Paso 0: Asegurar que hay al menos 1 cuaderno en la cesta
  console.log('0. Comprobando cesta o añadiendo cuaderno nuevo...');
  await page.goto(`${BASE_URL}/generador-libro-completo.html`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-preset="alterno"]');
    if (btn) btn.click();
    window.openSaveAndValidateModal();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    const chk = document.getElementById('save-modal-confirm-check');
    if (chk) chk.checked = true;
    window.executeValidateAndSave();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => {
    window.openValidateInteriorTextsModal();
  });
  await new Promise(r => setTimeout(r, 600));

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.evaluate(() => {
      window.confirmInteriorTextsAndGoCover();
    })
  ]);
  await new Promise(r => setTimeout(r, 2500));

  await page.evaluate(() => {
    window.openSaveAndValidateCoverModal();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    const chk = document.getElementById('save-cover-modal-confirm-check');
    if (chk) chk.checked = true;
    window.executeValidateAndSaveCover();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    window.openValidateCoverTextsModal();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const chk = document.getElementById('val-cov-confirmed-check');
    if (chk) chk.checked = true;
    window.confirmCoverTextsAndAddToCart();
  });
  await new Promise(r => setTimeout(r, 2500));
  console.log('Cuaderno añadido a la cesta con éxito.');

  // 1. Ir a Mi Espacio -> Pestaña Ajustes y Mis Datos
  console.log('1. Abriendo Mi Espacio en la pestaña de Ajustes...');
  await page.goto(`${BASE_URL}/mi-espacio.html?tab=ajustes`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3500));

  // Rellenar la dirección postal en "Ajustes y Mis Datos"
  console.log('2. Rellenando formulario de entrega en Ajustes y Mis Datos...');
  await page.evaluate(() => {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    setVal('ajustes-shipping-name', 'Carlos Mendoza');
    setVal('ajustes-shipping-email', 'cliente@ejemplo.com');
    setVal('ajustes-shipping-phone', '+34 611 223 344');
    setVal('ajustes-shipping-address', 'Paseo de la Castellana 120, 5º A');
    setVal('ajustes-shipping-zip', '28046');
    setVal('ajustes-shipping-city', 'Madrid');
    setVal('ajustes-shipping-province', 'Madrid');
    setVal('ajustes-shipping-notes', 'Dejar en conserjería o avisar por telefonillo');

    // Pulsar botón guardar
    const saveBtn = document.getElementById('btn-save-direcciones');
    if (saveBtn) saveBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const shotAjustes = path.join(ARTIFACT_DIR, 'flujo5_paso1_ajustes_formulario_guardado.png');
  await page.screenshot({ path: shotAjustes, fullPage: false });
  console.log('Captura de Ajustes guardada:', shotAjustes);

  // 3. Cambiar a la pestaña de Pedidos / Cesta
  console.log('3. Cambiando a la pestaña de Pedidos / Cesta...');
  await page.evaluate(() => {
    const tabPedidos = document.querySelector('button[data-tab="tab-pedidos"]');
    if (tabPedidos) tabPedidos.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Marcar casilla de revisión de textos
  await page.evaluate(() => {
    const chks = document.querySelectorAll('input[data-confirm-texts]');
    chks.forEach(c => {
      c.checked = true;
      c.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await new Promise(r => setTimeout(r, 800));

  // 4. Abrir modal de checkout
  console.log('4. Pulsando "Tramitar pedido"...');
  await page.evaluate(() => {
    const btn = document.getElementById('btn-basket-checkout');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Verificar la línea única generada en el modal limpio
  const modalInfo = await page.evaluate(() => {
    const lineEl = document.getElementById('checkout-shipping-single-line-text');
    const chk = document.getElementById('checkout-ship-confirm-check');
    const modifyLink = document.querySelector('button[onclick*="closeBasketCheckoutModalAndGoToAjustes"]');
    return {
      lineText: lineEl ? lineEl.textContent.trim() : null,
      hasCheck: !!chk,
      hasModifyLink: !!modifyLink
    };
  });
  console.log('Información del modal de Checkout:', modalInfo);

  // Captura del modal limpio con la línea única y sin campos de texto
  const shotModalLimpio = path.join(ARTIFACT_DIR, 'flujo5_paso2_modal_checkout_limpio_1_linea.png');
  await page.screenshot({ path: shotModalLimpio, fullPage: false });
  console.log('Captura Modal Limpio guardada:', shotModalLimpio);

  // 5. Probar el enlace "Modificar en Ajustes y Mis Datos"
  console.log('5. Probando botón "Modificar en Ajustes y Mis Datos"...');
  await page.evaluate(() => {
    const modifyBtn = document.querySelector('button[onclick*="closeBasketCheckoutModalAndGoToAjustes"]');
    if (modifyBtn) modifyBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const shotRedireccion = path.join(ARTIFACT_DIR, 'flujo5_paso3_redireccion_a_ajustes.png');
  await page.screenshot({ path: shotRedireccion, fullPage: false });
  console.log('Captura Redirección a Ajustes guardada:', shotRedireccion);

  // 6. Volver a Pedidos y completar la tramitación
  console.log('6. Volviendo a Pedidos para tramitar...');
  await page.evaluate(() => {
    const tabPedidos = document.querySelector('button[data-tab="tab-pedidos"]');
    if (tabPedidos) tabPedidos.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    const btn = document.getElementById('btn-basket-checkout');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Marcar casilla de confirmación
  console.log('7. Marcando casilla de confirmación de dirección en el modal...');
  await page.evaluate(() => {
    const chk = document.getElementById('checkout-ship-confirm-check');
    if (chk) {
      chk.checked = true;
      chk.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 800));

  const shotChecked = path.join(ARTIFACT_DIR, 'flujo5_paso4_modal_check_confirmado.png');
  await page.screenshot({ path: shotChecked, fullPage: false });
  console.log('Captura Check Confirmado guardada:', shotChecked);

  // Confirmar pedido
  console.log('8. Confirmando pedido...');
  await page.evaluate(() => {
    const btn = document.getElementById('btn-confirm-checkout-order');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 4500));

  const shotFinal = path.join(ARTIFACT_DIR, 'flujo5_paso5_pedido_tramitado_exito.png');
  await page.screenshot({ path: shotFinal, fullPage: false });
  console.log('Captura Pedido Tramitado guardada:', shotFinal);

  await browser.close();
  console.log('=== TEST COMPLETADO CON ÉXITO ===');
}

testCleanCheckoutFlow().catch(err => {
  console.error('Error durante la prueba:', err);
  process.exit(1);
});
