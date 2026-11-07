const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\chrome_unauth_test_profile_' + Date.now();
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'https://www.editorialmenosruido.com';

async function testNewFeatures() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: TEMP_PROFILE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  console.log('1. Abriendo www.editorialmenosruido.com...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  // Abrir dropdown de Generadores
  console.log('2. Abriendo dropdown de Generadores...');
  await page.evaluate(() => {
    const trigger = Array.from(document.querySelectorAll('.dropdown > a')).find(a => (a.textContent || '').includes('Generadores'));
    if (trigger) {
      trigger.click();
      const parent = trigger.closest('.dropdown');
      if (parent) parent.classList.add('open');
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  const shotHeader = path.join(ARTIFACT_DIR, 'verif_paso1_header_generadores_8.png');
  await page.screenshot({ path: shotHeader, fullPage: false });
  console.log('Captura Header Generadores guardada:', shotHeader);

  // 3. Probar planificador diario SIN estar logueado (sesión anónima)
  console.log('3. Abriendo Generador Planificador Diario sin sesión...');
  await page.goto(`${BASE_URL}/generador-planificador-diario.html`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  // Intentar pulsar "Guardar en Mi Espacio" sin sesión
  console.log('4. Pulsando "Guardar en Mi Espacio" sin login...');
  await page.evaluate(() => {
    const saveBtn = document.getElementById('btn-save-generator-diario') || document.getElementById('btn-save-generator-design');
    if (saveBtn) saveBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const authModalSaveVisible = await page.evaluate(() => {
    const m = document.getElementById('auth-modal-overlay');
    return m && m.style.display !== 'none';
  });
  console.log('¿Modal de login visible al pulsar Guardar?', authModalSaveVisible);

  const shotSaveLogin = path.join(ARTIFACT_DIR, 'verif_paso2_modal_login_al_guardar.png');
  await page.screenshot({ path: shotSaveLogin, fullPage: false });
  console.log('Captura Login al Guardar guardada:', shotSaveLogin);

  // Cerrar modal de login
  await page.evaluate(() => {
    const closeBtn = document.getElementById('auth-modal-close-btn');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // 5. Intentar pulsar "Descargar / Imprimir PDF" sin sesión
  console.log('5. Pulsando "Descargar PDF" sin login...');
  await page.evaluate(() => {
    const dlBtn = document.querySelector('.btn-download-primary');
    if (dlBtn) dlBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const authModalDownloadVisible = await page.evaluate(() => {
    const m = document.getElementById('auth-modal-overlay');
    return m && m.style.display !== 'none';
  });
  console.log('¿Modal de login visible al pulsar Descargar?', authModalDownloadVisible);

  const shotDownloadLogin = path.join(ARTIFACT_DIR, 'verif_paso3_modal_login_al_descargar.png');
  await page.screenshot({ path: shotDownloadLogin, fullPage: false });
  console.log('Captura Login al Descargar guardada:', shotDownloadLogin);

  // 6. Probar el nuevo pop-up unificado con estética Menos Ruido
  console.log('6. Disparando pop-up con estética Menos Ruido...');
  await page.evaluate(() => {
    if (window.mrAlert) {
      window.mrAlert('Esta es una confirmación editorial que sigue la tipografía, tonos y bordes oficiales de Editorial Menos Ruido.', {
        title: 'Estética Menos Ruido',
        badge: 'Editorial Menos Ruido'
      });
    }
  });
  await new Promise(r => setTimeout(r, 800));

  const shotPopupEstetica = path.join(ARTIFACT_DIR, 'verif_paso4_popup_estetica_menos_ruido.png');
  await page.screenshot({ path: shotPopupEstetica, fullPage: false });
  console.log('Captura Pop-up Estética guardada:', shotPopupEstetica);

  await browser.close();
  console.log('=== VERIFICACIÓN COMPLETADA CON ÉXITO ===');
}

testNewFeatures().catch(err => {
  console.error('Error durante la verificación:', err);
  process.exit(1);
});
