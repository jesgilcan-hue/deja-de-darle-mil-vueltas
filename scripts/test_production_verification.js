import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'https://editorialmenosruido.com';

async function testProduction() {
  console.log(`=== AUDITORÍA Y VERIFICACIÓN EN PRODUCCIÓN (${BASE_URL}) ===\n`);
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  const alerts = [];
  page.on('dialog', async dialog => {
    alerts.push(dialog.message());
    console.log('  [DIALOG ALERT]:', dialog.message().substring(0, 100) + '...');
    await dialog.accept();
  });

  const report = {};

  try {
    // -------------------------------------------------------------
    // 1. GENERADOR DE PORTADAS
    // -------------------------------------------------------------
    console.log('1. Comprobando generador-portadas.html en producción...');
    await page.goto(`${BASE_URL}/generador-portadas.html`, { waitUntil: 'networkidle0', timeout: 30000 });

    const portadasDrawer = await page.$('#mr-cart-drawer');
    const portadasFab = await page.$('#mrDevCartFab');
    const portadasBuy = await page.$('#mrBtnFloatingBuy');

    // Verificar tooltips de encuadernación
    const bindingTooltips = await page.evaluate(() => {
      if (typeof window.updateBindingAvailability === 'function' && window.coverState) {
        window.coverState.pageCount = 20;
        window.updateBindingAvailability();
        return {
          hasCoverState: true,
          coilTip: document.getElementById('btnBindCoil')?.title,
          softTip: document.getElementById('btnBindPerfect')?.title,
          hardTip: document.getElementById('btnBindHardcover')?.title
        };
      }
      return { hasCoverState: false };
    });

    report.generadorPortadas = {
      cartDrawerEliminado: !portadasDrawer,
      fabEliminado: !portadasFab,
      buyEliminado: !portadasBuy,
      bindingTooltips
    };

    // Captura de portadas
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prod_test_portadas.png') });

    // -------------------------------------------------------------
    // 2. GENERADOR LIBRO COMPLETO
    // -------------------------------------------------------------
    console.log('\n2. Comprobando generador-libro-completo.html en producción...');
    await page.goto(`${BASE_URL}/generador-libro-completo.html`, { waitUntil: 'networkidle0', timeout: 30000 });

    const completoDrawer = await page.$('#mr-cart-drawer');
    const completoFab = await page.$('#mrDevCartFab');
    const saveModal = await page.$('#modalSaveAndValidateBook');
    const hasOpenSaveFn = await page.evaluate(() => typeof window.openSaveAndValidateModal === 'function');

    report.generadorLibroCompleto = {
      cartDrawerEliminado: !completoDrawer,
      fabEliminado: !completoFab,
      modalSaveAndValidateExistente: !!saveModal,
      funcionOpenSaveDisponible: hasOpenSaveFn
    };

    // Captura de libro completo
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prod_test_libro_completo.png') });

    // -------------------------------------------------------------
    // 3. MI ESPACIO (CESTA Y PEDIDOS)
    // -------------------------------------------------------------
    console.log('\n3. Comprobando mi-espacio.html en producción...');
    await page.goto(`${BASE_URL}/mi-espacio.html?tab=pedidos`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const miEspacioDrawer = await page.$('#mr-cart-drawer');
    const miEspacioFab = await page.$('#mrDevCartFab');
    const miEspacioFloatingBuy = await page.$('#mrBtnFloatingBuy');
    const checkoutBar = await page.$('#client-basket-checkout-bar');
    const btnBasketCheckout = await page.$('#btn-basket-checkout');
    const checkoutModal = await page.$('#modal-checkout-order');
    const btnConfirmOrder = await page.$('#btn-confirm-checkout-order');

    report.miEspacio = {
      cartDrawerEliminado: !miEspacioDrawer,
      fabEliminado: !miEspacioFab,
      floatingBuyEliminado: !miEspacioFloatingBuy,
      checkoutBarExistente: !!checkoutBar,
      btnBasketCheckoutExistente: !!btnBasketCheckout,
      modalCheckoutExistente: !!checkoutModal,
      btnConfirmOrderExistente: !!btnConfirmOrder
    };

    // Captura de mi-espacio
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prod_test_mi_espacio.png') });

    console.log('\n=== REPORTE DE PRODUCCIÓN ===');
    console.log(JSON.stringify(report, null, 2));

  } catch (err) {
    console.error('Error durante la verificación en producción:', err);
  } finally {
    await browser.close();
  }
}

testProduction();
