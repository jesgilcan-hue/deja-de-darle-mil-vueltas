import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'https://editorialmenosruido.com';

async function testAdminPin() {
  console.log('=== TEST DE ENTRADA CON PIN EN ADMIN-PEDIDOS (PRODUCCIÓN) ===\n');

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
    console.log('  ❌ [ERROR JS]:', err.message);
  });

  page.on('dialog', async dialog => {
    console.log('  [DIALOG]:', dialog.message());
    await dialog.accept();
  });

  // 1. Abrir admin-pedidos.html en producción
  console.log('1. Cargando admin-pedidos.html...');
  await page.goto(`${BASE_URL}/admin-pedidos.html`, { waitUntil: 'networkidle0' });

  // 2. Comprobar si está el gate de PIN
  const pinGateVisible = await page.$eval('#admin-auth-gate', el => el && el.style.display !== 'none').catch(() => false);
  console.log(`   -> ¿Gate de PIN visible?: ${pinGateVisible}`);

  // 3. Introducir PIN 1111 y verificar
  console.log('2. Introduciendo PIN 1111...');
  await page.evaluate(() => {
    const pinInp = document.getElementById('admin-pin-input');
    const pinBtn = document.getElementById('btn-verify-admin-pin');
    if (pinInp && pinBtn) {
      pinInp.value = '1111';
      pinBtn.click();
    } else {
      // Si ya está desbloqueado o en otra pantalla
      sessionStorage.setItem('mr_admin_pin_verified', 'true');
    }
  });

  await new Promise(r => setTimeout(r, 2000));

  // 4. Comprobar estado de la vista principal y tarjetas
  const viewStatus = await page.evaluate(() => {
    const mainView = document.getElementById('admin-main-view');
    const cards = document.querySelectorAll('.order-card-box');
    const kpiCount = document.getElementById('kpiTotalOrdersCount')?.textContent.trim();
    const kpiSales = document.getElementById('kpiTotalSales')?.textContent.trim();

    return {
      mainViewDisplay: mainView ? window.getComputedStyle(mainView).display : null,
      cardsCount: cards.length,
      kpiCount,
      kpiSales
    };
  });

  console.log('Resultado de vista principal:', JSON.stringify(viewStatus, null, 2));
  console.log(`Errores JS capturados: ${errors.length}`);

  // Captura final
  const shot = path.join(ARTIFACT_DIR, 'prod_admin_unlocked_view.png');
  await page.screenshot({ path: shot, fullPage: true });
  console.log('Captura guardada en:', shot);

  await browser.close();
}

testAdminPin().catch(console.error);
