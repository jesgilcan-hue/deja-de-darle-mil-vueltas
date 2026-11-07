const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';

(async () => {
  console.log('--- Test E2E: Filtros de Código Postal, Teléfono, Email y Dirección ---');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Navegar a mi-espacio.html?tab=ajustes en servidor local
  await page.goto('http://localhost:8089/mi-espacio.html?tab=ajustes', { waitUntil: 'networkidle2', timeout: 10000 });

  console.log('1. Probando filtro de Código Postal en tiempo real (intentando escribir 10 dígitos y letras)...');
  await page.evaluate(() => {
    const elZip = document.getElementById('ajustes-shipping-zip');
    elZip.value = '28001ABC999';
    elZip.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const zipValue = await page.evaluate(() => document.getElementById('ajustes-shipping-zip').value);
  console.log('Valor resultante en CP tras filtro en vivo:', zipValue);
  if (zipValue === '28001') {
    console.log('✓ Filtro CP en vivo exitoso: solo números y limitado estrictamente a 5 dígitos.');
  } else {
    console.error('❌ Error en filtro CP en vivo:', zipValue);
  }

  console.log('2. Probando intento de guardado con teléfono de 5 dígitos (caso negativo)...');
  await page.evaluate(() => {
    document.getElementById('ajustes-shipping-name').value = 'Cliente Menos Ruido';
    document.getElementById('ajustes-shipping-email').value = 'cliente@ejemplo.com';
    document.getElementById('ajustes-shipping-phone').value = '12345'; // Teléfono de 5 dígitos
    document.getElementById('ajustes-shipping-address').value = 'Calle del Silencio 12';
    document.getElementById('ajustes-shipping-zip').value = '28001';
    document.getElementById('ajustes-shipping-city').value = 'Madrid';
    document.getElementById('ajustes-shipping-province').value = 'Madrid';
  });

  // Interceptar o verificar alert / mr-popup
  let lastAlertText = '';
  page.on('dialog', async dialog => {
    lastAlertText = dialog.message();
    await dialog.dismiss();
  });

  await page.evaluate(() => {
    document.getElementById('btn-save-direcciones').click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Comprobar popup Menos Ruido
  const popupMessage = await page.evaluate(() => {
    const msgEl = document.getElementById('mr-popup-message');
    return msgEl ? msgEl.textContent : '';
  });
  console.log('Aviso capturado:', popupMessage || lastAlertText);
  if ((popupMessage || lastAlertText).includes('teléfono') || (popupMessage || lastAlertText).includes('dígitos')) {
    console.log('✓ Bloqueo correcto de teléfono corto (5 dígitos).');
  }

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verif_filtro_telefono_invalido.png') });

  // Cerrar alerta
  await page.evaluate(() => {
    const closeBtn = document.getElementById('mr-popup-close-btn') || document.getElementById('mr-popup-confirm-btn');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  console.log('3. Probando intento de guardado con email inválido (sin dominio o formato erróneo)...');
  await page.evaluate(() => {
    document.getElementById('ajustes-shipping-phone').value = '+34 600 123 456';
    document.getElementById('ajustes-shipping-email').value = 'correo-invalido-sin-arroba';
    document.getElementById('btn-save-direcciones').click();
  });
  await new Promise(r => setTimeout(r, 600));

  const popupMsgEmail = await page.evaluate(() => {
    const msgEl = document.getElementById('mr-popup-message');
    return msgEl ? msgEl.textContent : '';
  });
  console.log('Aviso email capturado:', popupMsgEmail);
  if (popupMsgEmail.includes('correo') || popupMsgEmail.includes('email')) {
    console.log('✓ Bloqueo correcto de email inválido.');
  }

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verif_filtro_email_invalido.png') });

  // Cerrar alerta
  await page.evaluate(() => {
    const closeBtn = document.getElementById('mr-popup-close-btn') || document.getElementById('mr-popup-confirm-btn');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  console.log('4. Probando caso 100% válido (todos los filtros superados)...');
  await page.evaluate(() => {
    document.getElementById('ajustes-shipping-email').value = 'cliente.correcto@editorialmenosruido.com';
    document.getElementById('ajustes-shipping-phone').value = '+34 612 345 678';
    document.getElementById('ajustes-shipping-zip').value = '28001';
    document.getElementById('ajustes-shipping-address').value = 'Calle del Silencio 42, 3º Izquierda';
    document.getElementById('ajustes-shipping-city').value = 'Madrid';
    document.getElementById('ajustes-shipping-province').value = 'Madrid';
    document.getElementById('btn-save-direcciones').click();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verif_popup_confirmacion_con_filtros_ok.png') });
  console.log('✓ Captura del popup de validación en 1 línea guardada');

  // Confirmar modal
  await page.evaluate(() => {
    const confirmBtn = document.getElementById('mr-popup-confirm-btn');
    if (confirmBtn) confirmBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const saved = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('mr_customer_shipping_address') || '{}');
  });
  console.log('Datos guardados en cliente:', saved);

  await browser.close();
  console.log('--- Test completado con éxito ---');
})();
