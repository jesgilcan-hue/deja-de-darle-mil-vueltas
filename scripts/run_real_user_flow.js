import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\chrome_client_profile';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'https://editorialmenosruido.com';

async function runRealUserFlow() {
  console.log('================================================================');
  console.log('EJECUTANDO FLUJO COMPLETO EN PRODUCCIÓN (CANONICAL WWW)');
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
      console.log(`  [ALERTA NAVEGADOR]:`, dialog.message().substring(0, 100));
      await dialog.accept();
    } catch (e) {}
  });

  // Limpiar cualquier residuo previo de cover en el almacenamiento antes de iniciar
  await page.goto(`${BASE_URL}/generador-libro-completo.html`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.removeItem('mr_cart_cover_item');
  });

  // 1. Seleccionar 'Mes a Mes' (alterno)
  console.log('Seleccionando preset "Mes a Mes"...');
  await page.evaluate(() => {
    document.querySelector('button[data-preset="alterno"]').click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Abrir modal y validar
  console.log('Abriendo modal de validación de interior...');
  await page.evaluate(() => {
    window.openSaveAndValidateModal();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_step1_libro_validado.png'), fullPage: false });

  await page.evaluate(() => {
    const chk = document.getElementById('save-modal-confirm-check');
    if (chk) chk.checked = true;
    window.executeValidateAndSave();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Navegar a portada
  console.log('Pulsando "Diseñar Portada"...');
  await page.evaluate(() => {
    window.openValidateInteriorTextsModal();
  });
  await new Promise(r => setTimeout(r, 800));

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.evaluate(() => {
      window.confirmInteriorTextsAndGoCover();
    })
  ]);
  console.log('Navegado a:', page.url());
  await new Promise(r => setTimeout(r, 3500));

  // Comprobar estado en portada
  const portadasAudit = await page.evaluate(() => {
    const cs = window.coverState || {};
    const btnCoil = document.getElementById('btnBindCoil');
    const btnPerfect = document.getElementById('btnBindPerfect');
    const btnHard = document.getElementById('btnBindHardcover');
    return {
      pages: cs.pageCount,
      binding: cs.bindingType,
      syncedName: cs.syncedBookName,
      coilAllowed: !btnCoil.hasAttribute('disabled'),
      perfectBlocked: btnPerfect.hasAttribute('disabled'),
      hardBlocked: btnHard.hasAttribute('disabled')
    };
  });
  console.log('Auditoría Portada tras sincronizar:', portadasAudit);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_step2_portada_sincronizada.png'), fullPage: false });

  // Abrir modal guardar portada
  await page.evaluate(() => {
    window.openSaveAndValidateCoverModal();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_step3_modal_portada.png'), fullPage: false });

  // Validar portada y añadir a la cesta
  await page.evaluate(() => {
    const chk = document.getElementById('save-cover-modal-confirm-check');
    if (chk) chk.checked = true;
    window.executeValidateAndSaveCover();
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    window.openValidateCoverTextsModal();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    const chk = document.getElementById('val-cov-confirmed-check');
    if (chk) chk.checked = true;
    window.confirmCoverTextsAndAddToCart();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_step4_anadido_cesta.png'), fullPage: false });

  // Ir a Mi Espacio -> Cesta / Pedidos
  console.log('Abriendo Mi Espacio...');
  await page.goto(`${BASE_URL}/mi-espacio.html?tab=pedidos`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_step5_cesta_autenticada.png'), fullPage: false });
  console.log('Capturas finales guardadas con éxito.');

  await browser.close();
}

runRealUserFlow().catch(console.error);
