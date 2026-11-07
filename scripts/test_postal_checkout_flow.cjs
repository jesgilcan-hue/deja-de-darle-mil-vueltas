const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\chrome_client_profile';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';

async function testPostalFlow() {
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

  console.log('Abriendo Mi Espacio...');
  await page.goto('https://editorialmenosruido.com/mi-espacio.html?tab=pedidos', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 4500));

  // Marcar casilla de revisión de textos
  await page.evaluate(() => {
    const chks = document.querySelectorAll('input[data-confirm-texts]');
    chks.forEach(c => {
      c.checked = true;
      c.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await new Promise(r => setTimeout(r, 800));

  // Abrir modal de checkout
  console.log('Pulsando "Tramitar pedido"...');
  await page.evaluate(() => {
    const btn = document.getElementById('btn-basket-checkout');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Rellenar formulario postal completo
  console.log('Rellenando formulario postal con datos de entrega de prueba...');
  await page.evaluate(() => {
    const nameInp = document.getElementById('checkout-ship-name');
    const phoneInp = document.getElementById('checkout-ship-phone');
    const emailInp = document.getElementById('checkout-modal-customer-email');
    const addrInp = document.getElementById('checkout-ship-address');
    const cpInp = document.getElementById('checkout-ship-postal');
    const cityInp = document.getElementById('checkout-ship-city');
    const provInp = document.getElementById('checkout-ship-province');
    const notesInp = document.getElementById('checkout-modal-customer-notes');

    if (nameInp) { nameInp.value = 'Lucas Molina Gómez'; nameInp.dispatchEvent(new Event('input', { bubbles: true })); }
    if (phoneInp) { phoneInp.value = '+34 612 987 654'; phoneInp.dispatchEvent(new Event('input', { bubbles: true })); }
    if (emailInp) { emailInp.value = 'jesusgil_87@hotmail.com'; emailInp.dispatchEvent(new Event('input', { bubbles: true })); }
    if (addrInp) { addrInp.value = 'Calle Velázquez 48, 3º Izquierda'; addrInp.dispatchEvent(new Event('input', { bubbles: true })); }
    if (cpInp) { cpInp.value = '28001'; cpInp.dispatchEvent(new Event('input', { bubbles: true })); }
    if (cityInp) { cityInp.value = 'Madrid'; cityInp.dispatchEvent(new Event('input', { bubbles: true })); }
    if (provInp) { provInp.value = 'Madrid'; provInp.dispatchEvent(new Event('input', { bubbles: true })); }
    if (notesInp) { notesInp.value = 'Entregar en conserjería en horario de mañana'; notesInp.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 800));

  const singleLineText = await page.evaluate(() => {
    const el = document.getElementById('checkout-shipping-single-line-text');
    return el ? el.textContent.trim() : null;
  });
  console.log('Línea de resumen generada:', singleLineText);

  // Captura 1: Formulario relleno y línea generada ANTES de marcar el check
  const shot1 = path.join(ARTIFACT_DIR, 'flujo4_checkout_formulario_postal_linea.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('Captura 1 guardada:', shot1);

  // Marcar la casilla obligatoria de validación completa de la dirección
  console.log('Marcando casilla de validación completa de la dirección...');
  await page.evaluate(() => {
    const chk = document.getElementById('checkout-ship-confirm-check');
    if (chk) {
      chk.checked = true;
      chk.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // Captura 2: Con la casilla validada y caja en verde
  const shot2 = path.join(ARTIFACT_DIR, 'flujo4_checkout_direccion_validada_check.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log('Captura 2 guardada:', shot2);

  // Confirmar el pedido
  console.log('Pulsando confirmar pedido...');
  await page.evaluate(() => {
    const btn = document.getElementById('btn-confirm-checkout-order');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 4500));

  // Captura 3: Pedido creado en seguimiento con la dirección postal asignada
  const shot3 = path.join(ARTIFACT_DIR, 'flujo4_pedido_creado_con_direccion_postal.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log('Captura 3 guardada:', shot3);

  await browser.close();
  console.log('✓ Prueba del formulario postal y validación finalizada con éxito.');
}

testPostalFlow().catch(console.error);
