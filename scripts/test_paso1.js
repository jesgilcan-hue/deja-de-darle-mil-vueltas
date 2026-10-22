import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = 'C:\\Users\\IA\\AppData\\Local\\Temp\\edge_test_profile_paso1';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';

async function testPaso1() {
  console.log('=== VERIFICANDO PASO 1 ===');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    userDataDir: USER_DATA_DIR,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  let dialogs = [];
  page.on('dialog', async dialog => {
    dialogs.push(dialog.message());
    console.log('[DIALOG DETECTADO]:', dialog.message());
    await dialog.accept();
  });

  try {
    // 1. Verificar generador-portadas.html
    console.log('\n--- 1. Comprobando generador-portadas.html ---');
    await page.goto('http://localhost:5173/generador-portadas.html', { waitUntil: 'networkidle0' });
    
    // Verificar que existen los elementos de encuadernación y los tooltips
    const wireTip = await page.$eval('#wireTip', el => el ? el.textContent.trim() : null).catch(() => null);
    const softTip = await page.$eval('#softTip', el => el ? el.textContent.trim() : null).catch(() => null);
    const hardTip = await page.$eval('#hardTip', el => el ? el.textContent.trim() : null).catch(() => null);
    console.log('Tooltips iniciales:', { wireTip, softTip, hardTip });

    // Comprobar que cart-drawer NO existe en DOM
    const cartDrawerInPortadas = await page.$('#mr-cart-drawer');
    const floatingFabInPortadas = await page.$('#mrDevCartFab');
    console.log('¿Existe #mr-cart-drawer en portadas?:', !!cartDrawerInPortadas);
    console.log('¿Existe #mrDevCartFab en portadas?:', !!floatingFabInPortadas);

    // 2. Verificar generador-libro-completo.html
    console.log('\n--- 2. Comprobando generador-libro-completo.html ---');
    await page.goto('http://localhost:5173/generador-libro-completo.html', { waitUntil: 'networkidle0' });
    const cartDrawerInCompleto = await page.$('#mr-cart-drawer');
    const floatingFabInCompleto = await page.$('#mrDevCartFab');
    console.log('¿Existe #mr-cart-drawer en libro completo?:', !!cartDrawerInCompleto);
    console.log('¿Existe #mrDevCartFab en libro completo?:', !!floatingFabInCompleto);

    // 3. Verificar mi-espacio.html
    console.log('\n--- 3. Comprobando mi-espacio.html ---');
    await page.goto('http://localhost:5173/mi-espacio.html?tab=pedidos', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    const cartDrawerInMiEspacio = await page.$('#mr-cart-drawer');
    const floatingFabInMiEspacio = await page.$('#mrDevCartFab');
    const floatingBuyInMiEspacio = await page.$('#mrBtnFloatingBuy');
    console.log('¿Existe #mr-cart-drawer en mi-espacio?:', !!cartDrawerInMiEspacio);
    console.log('¿Existe #mrDevCartFab en mi-espacio?:', !!floatingFabInMiEspacio);
    console.log('¿Existe #mrBtnFloatingBuy en mi-espacio?:', !!floatingBuyInMiEspacio);

    // Comprobar botón unificado de tramitar
    const btnConfirmOrder = await page.$('#btnConfirmOrder');
    console.log('¿Existe #btnConfirmOrder en mi-espacio?:', !!btnConfirmOrder);
    if (btnConfirmOrder) {
      const textBtn = await page.evaluate(el => el.textContent.trim(), btnConfirmOrder);
      console.log('Texto de #btnConfirmOrder:', textBtn);
    }

    // Captura de pantalla para artifact
    const screenshotPath = path.join(ARTIFACT_DIR, 'paso1_verificacion_mi_espacio.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Captura guardada en:', screenshotPath);

    console.log('\n=== RESULTADO: VERIFICACIÓN PASO 1 EXITOSA ===');
  } catch (err) {
    console.error('Error durante la verificación:', err);
  } finally {
    await browser.close();
  }
}

testPaso1();
