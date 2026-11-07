import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'https://editorialmenosruido.com';

async function testInteractive() {
  console.log('=== TEST INTERACTIVO EN VIVO EN PRODUCCIÓN ===');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  let capturedDialogs = [];
  page.on('dialog', async dialog => {
    capturedDialogs.push({ type: dialog.type(), message: dialog.message() });
    console.log(`[ALERT/CONFIRM] [${dialog.type()}]:`, dialog.message().replace(/\n/g, ' '));
    // En confirm rechazamos para no abandonar la página
    if (dialog.type() === 'confirm') {
      await dialog.dismiss();
    } else {
      await dialog.accept();
    }
  });

  // 1. Abrir Diseñador de Portadas
  await page.goto(`${BASE_URL}/generador-portadas.html`, { waitUntil: 'networkidle0' });

  // Forzar páginas a 24 y validar tooltips y alerta de click
  await page.evaluate(() => {
    window.coverState.pageCount = 24;
    window.updateBindingAvailability();
  });

  // Test A: Intentar pulsar Tapa Dura (requiere 60 págs)
  console.log('-> Test A: Clic en Tapa Dura con 24 páginas...');
  await page.evaluate(() => {
    document.getElementById('btnBindHardcover').click();
  });

  // Test B: Intentar añadir a la cesta con libro impar (25 páginas)
  console.log('-> Test B: Intentar añadir a la cesta con libro impar (25 páginas)...');
  await page.evaluate(() => {
    window.coverState.pageCount = 25;
    window.handleAddToCart();
  });

  // Test C: Intentar añadir a la cesta con interior NO validado
  console.log('-> Test C: Intentando añadir a la cesta con syncedBookValidated = false...');
  await page.evaluate(() => {
    window.coverState.pageCount = 86;
    window.coverState.bindingType = 'perfect';
    window.coverState.syncedBookValidated = false;
    window.handleAddToCart();
  });

  // Test D: Añadir a la cesta con libro válido (86 págs, tapa blanda, validado)
  console.log('-> Test D: Añadiendo a la cesta con libro válido (86 págs, tapa blanda, validado)...');
  await page.evaluate(() => {
    window.coverState.pageCount = 86;
    window.coverState.bindingType = 'perfect';
    window.coverState.syncedBookValidated = true;
    window.handleAddToCart();
  });

  // Esperar a que se abra el modal de 2 botones
  await new Promise(r => setTimeout(r, 1200));
  const modalCartVisible = await page.$eval('#addedToCartModal', el => el.classList.contains('active')).catch(() => false);
  console.log('¿Modal de 2 botones abierto (#addedToCartModal.active)?:', modalCartVisible);

  // Comprobar botones del modal: sólo deben ser 2 ("Seguir comprando" e "Ir a Mi Cesta")
  const modalButtons = await page.evaluate(() => {
    const modal = document.getElementById('addedToCartModal');
    if (!modal) return [];
    return Array.from(modal.querySelectorAll('button, a')).map(el => el.textContent.trim()).filter(Boolean);
  });
  console.log('Botones visibles en el modal de cesta:', modalButtons);

  // Capturar pantalla del modal de 2 botones
  const screenshotPath = path.join(ARTIFACT_DIR, 'prod_modal_dos_botones.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Captura guardada:', screenshotPath);

  await browser.close();
}

testInteractive().catch(console.error);
