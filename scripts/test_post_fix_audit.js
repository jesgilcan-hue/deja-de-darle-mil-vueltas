import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'https://editorialmenosruido.com';

async function runPostFixAudit() {
  console.log('=== AUDITORÍA POST-CORRECCIÓN EN PRODUCCIÓN ===\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  const errors = [];
  page.on('pageerror', err => {
    errors.push(err.message);
    console.log('  ❌ [ERROR DE JS DETECTADO]:', err.message);
  });

  const dialogs = [];
  page.on('dialog', async dialog => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    console.log(`  [POPUP DETECTADO (${dialog.type()})]:`, dialog.message().substring(0, 100));
    await dialog.accept();
  });

  const results = {};

  try {
    // ------------------------------------------------------------------
    // TEST 1: admin-pedidos.html - Verificación de renderizado de tarjetas
    // ------------------------------------------------------------------
    console.log('1. Comprobando admin-pedidos.html en producción...');
    await page.goto(`${BASE_URL}/admin-pedidos.html`, { waitUntil: 'networkidle0', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2500));

    const cardsCount = await page.$$eval('.order-card-box', cards => cards.length);
    const kpiTotal = await page.$eval('#kpiTotalOrders', el => el ? el.textContent.trim() : null).catch(() => null);

    results.adminPedidos = {
      tarjetasRenderizadas: cardsCount,
      kpiTotalRegistrados: kpiTotal,
      hayErroresJS: errors.length > 0,
      errores: [...errors]
    };

    console.log(`   -> Tarjetas visibles en el DOM: ${cardsCount}`);
    console.log(`   -> KPI Total de pedidos: ${kpiTotal}`);
    console.log(`   -> Errores de JS en consola: ${errors.length}`);

    // Captura de pantalla de admin-pedidos
    const adminShot = path.join(ARTIFACT_DIR, 'prod_fixed_admin_pedidos.png');
    await page.screenshot({ path: adminShot, fullPage: false });
    console.log(`   -> Captura guardada en: ${adminShot}`);

    // ------------------------------------------------------------------
    // TEST 2: generador-libro-completo.html - Clic en Guardar y apertura de modal
    // ------------------------------------------------------------------
    console.log('\n2. Comprobando generador-libro-completo.html en producción...');
    await page.goto(`${BASE_URL}/generador-libro-completo.html`, { waitUntil: 'networkidle0', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2000));

    // Clic en el botón Guardar en Mi Espacio
    console.log('   -> Pulsando botón #btn-save-generator-design...');
    await page.click('#btn-save-generator-design');
    await new Promise(r => setTimeout(r, 1000));

    // Verificar si el modal #modalSaveAndValidateBook está visible
    const modalVisible = await page.$eval('#modalSaveAndValidateBook', el => {
      return el && el.style.display !== 'none' && window.getComputedStyle(el).display !== 'none';
    }).catch(() => false);

    const pagesDisplayText = await page.$eval('#saveModalPagesCountDisplay', el => el ? el.textContent.trim() : null).catch(() => null);
    const hasDraftBtn = await page.$eval('button[onclick*="executeSaveDraftOnly"]', el => !!el).catch(() => false);
    const hasValidateBtn = await page.$eval('button[onclick*="executeValidateAndSave"]', el => !!el).catch(() => false);

    results.generadorLibroCompleto = {
      modalSaveAndValidateAbierto: modalVisible,
      textoPrevisionPaginas: pagesDisplayText,
      botonBorradorExiste: hasDraftBtn,
      botonValidarExiste: hasValidateBtn
    };

    console.log(`   -> ¿Modal de Guardado y Validación abierto?: ${modalVisible}`);
    console.log(`   -> Texto de previsión de páginas: "${pagesDisplayText}"`);
    console.log(`   -> ¿Botón "Guardar como Borrador" presente?: ${hasDraftBtn}`);
    console.log(`   -> ¿Botón "Validar y Guardar" presente?: ${hasValidateBtn}`);

    // Captura de pantalla del modal abierto
    const libroShot = path.join(ARTIFACT_DIR, 'prod_fixed_modal_save_libro.png');
    await page.screenshot({ path: libroShot });
    console.log(`   -> Captura guardada en: ${libroShot}`);

    console.log('\n=== REPORTE FINAL DE AUDITORÍA ===');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Error durante la auditoría post-fix:', err);
  } finally {
    await browser.close();
  }
}

runPostFixAudit();
