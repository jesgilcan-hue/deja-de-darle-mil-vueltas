const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\chrome_client_profile';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';

async function snap() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: TEMP_PROFILE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  page.on('dialog', async d => {
    try { await d.accept(); } catch(e) {}
  });

  // Asegurar que hay al menos 1 item en la cesta
  console.log('Añadiendo cuaderno a la cesta...');
  await page.goto('https://editorialmenosruido.com/generador-portadas.html?from=interior', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  await page.evaluate(() => {
    window.openValidateCoverTextsModal();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    const chk = document.getElementById('val-cov-confirmed-check');
    if (chk) chk.checked = true;
    window.confirmCoverTextsAndAddToCart();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Ir a Mi Espacio -> Cesta
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

  const shotPath = path.join(ARTIFACT_DIR, 'flujo3_modal_checkout_con_email_editable.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Captura guardada en:', shotPath);

  const emailVal = await page.evaluate(() => {
    const inp = document.getElementById('checkout-modal-customer-email');
    return inp ? { value: inp.value, visible: inp.offsetParent !== null } : null;
  });
  console.log('Estado del campo de email en pantalla:', emailVal);

  await browser.close();
}

snap().catch(console.error);
