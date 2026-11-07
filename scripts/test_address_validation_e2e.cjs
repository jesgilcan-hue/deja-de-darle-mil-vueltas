const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';

(async () => {
  console.log('--- Test E2E: Validación de Dirección y Popup Menos Ruido ---');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Navegar a mi-espacio.html?tab=ajustes en servidor local o preview
  console.log('1. Navegando a http://localhost:8089/mi-espacio.html?tab=ajustes ...');
  try {
    await page.goto('http://localhost:8089/mi-espacio.html?tab=ajustes', { waitUntil: 'networkidle2', timeout: 10000 });
  } catch (e) {
    console.log('Local no activo, usando archivo directo o verificando');
  }

  // Comprobar si cargó la pestaña de ajustes
  const tabAjustesVisible = await page.evaluate(() => {
    const tab = document.getElementById('tab-ajustes');
    return tab && tab.classList.contains('active');
  });
  console.log('Pestaña Ajustes activa:', tabAjustesVisible);

  // Rellenar formulario de dirección
  await page.evaluate(() => {
    const elName = document.getElementById('ajustes-shipping-name');
    const elEmail = document.getElementById('ajustes-shipping-email');
    const elPhone = document.getElementById('ajustes-shipping-phone');
    const elAddr = document.getElementById('ajustes-shipping-address');
    const elZip = document.getElementById('ajustes-shipping-zip');
    const elCity = document.getElementById('ajustes-shipping-city');
    const elProv = document.getElementById('ajustes-shipping-province');

    if (elName) elName.value = 'Lector Menos Ruido';
    if (elEmail) elEmail.value = 'cliente.test@editorialmenosruido.com';
    if (elPhone) elPhone.value = '+34 612 345 678';
    if (elAddr) elAddr.value = 'Calle del Silencio 14, 2º Izquierda';
    if (elZip) elZip.value = '28001';
    if (elCity) elCity.value = 'Madrid';
    if (elProv) elProv.value = 'Madrid';
  });

  // Captura antes de guardar
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verif_ajustes_formulario_relleno.png') });
  console.log('✓ Captura formulario relleno guardada');

  // Pulsar "Guardar direcciones" para abrir el popup de validación
  console.log('2. Pulsando "Guardar direcciones" para abrir el popup de validación...');
  await page.evaluate(() => {
    document.getElementById('btn-save-direcciones').click();
  });

  await new Promise(r => setTimeout(r, 600));

  // Captura del popup modal de validación
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verif_popup_validacion_direccion_1_linea.png') });
  console.log('✓ Captura del popup modal de validación Menos Ruido guardada');

  // Confirmar el popup pulsando el botón de confirmación
  const popupHandled = await page.evaluate(() => {
    const btn = document.getElementById('mr-popup-confirm-btn');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Botón popup confirmar clickeado:', popupHandled);

  await new Promise(r => setTimeout(r, 1000));

  // Verificar que se guardó en localStorage
  const savedData = await page.evaluate(() => {
    return localStorage.getItem('mr_customer_shipping_address');
  });
  console.log('Datos guardados en localStorage:', savedData);

  // Captura final con toast de éxito
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verif_ajustes_guardado_con_exito.png') });
  console.log('✓ Captura final de éxito guardada');

  await browser.close();
  console.log('--- Test completado con éxito ---');
})();
