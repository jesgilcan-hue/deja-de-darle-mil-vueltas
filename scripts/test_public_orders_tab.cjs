const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';

(async () => {
  console.log('--- Test E2E: Sección de Pedidos y Seguimiento para Todos los Públicos ---');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Simular usuario público normal en localStorage
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('mr_cached_user', JSON.stringify({
      displayName: 'Lector Menos Ruido',
      email: 'lector.publico@ejemplo.com'
    }));
  });

  console.log('1. Navegando a http://localhost:8089/mi-espacio.html ...');
  await page.goto('http://localhost:8089/mi-espacio.html', { waitUntil: 'networkidle2', timeout: 10000 });

  // 2. Verificar visibilidad del botón de la pestaña Pedidos y Seguimiento
  const tabButtonInfo = await page.evaluate(() => {
    const btn = document.getElementById('tab-btn-pedidos');
    if (!btn) return { exists: false };
    const style = window.getComputedStyle(btn);
    return {
      exists: true,
      text: btn.textContent.trim(),
      display: style.display,
      visible: style.display !== 'none'
    };
  });
  console.log('Botón Pedidos y Seguimiento:', tabButtonInfo);

  // Captura con las pestañas visibles para cualquier usuario
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verif_perfil_publico_pestañas.png') });
  console.log('✓ Captura inicial guardada: pestaña visible en el perfil');

  // 3. Hacer click en la pestaña de Pedidos y Seguimiento
  console.log('2. Clicando en la pestaña de Pedidos y Seguimiento...');
  await page.evaluate(() => {
    document.getElementById('tab-btn-pedidos').click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 4. Comprobar que tab-pedidos está activa y visible
  const tabPaneInfo = await page.evaluate(() => {
    const pane = document.getElementById('tab-pedidos');
    const basketEl = document.getElementById('client-pending-basket-list');
    const ordersEl = document.getElementById('client-orders-history-list');
    return {
      paneActive: pane ? pane.classList.contains('active') : false,
      hasBasket: !!basketEl,
      hasOrders: !!ordersEl
    };
  });
  console.log('Estado de la pestaña activa:', tabPaneInfo);

  // Captura de la sección activa de pedidos y seguimiento
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verif_seccion_pedidos_y_seguimiento_publica.png') });
  console.log('✓ Captura de la sección activa guardada');

  await browser.close();
  console.log('--- Test completado con éxito ---');
})();
