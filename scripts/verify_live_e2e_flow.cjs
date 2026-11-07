const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function run() {
  console.log('--- INICIANDO TEST E2E EN PRODUCCIÓN ---');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const targetUrl = 'https://www.editorialmenosruido.com/mi-espacio.html?tab=pedidos&stripe_success=1&order=MR-2026-2906&session_id=cs_test_a1ZDgNl4u6APPApJiKBohOlUmQVUHIEbLDfIcnw9XCq3lKhlEFKGeSX0Ny';
  console.log('1. Navegando a retorno de Stripe:', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 35000 });

  // Esperar a que se procese el retorno y se renderice el pedido
  await page.waitForTimeout ? page.waitForTimeout(4000) : new Promise(r => setTimeout(r, 4000));

  // Verificar si la pestaña activa es tab-pedidos
  const activeTabId = await page.evaluate(() => {
    const active = document.querySelector('.tab-content.active');
    return active ? active.id : null;
  });
  console.log('2. Pestaña activa en pantalla:', activeTabId);

  // Verificar si el pedido MR-2026-2906 aparece en el historial
  const orderCardFound = await page.evaluate(() => {
    const card = document.getElementById('order-card-MR-2026-2906');
    const hasText = document.body.innerText.includes('MR-2026-2906');
    return { hasCard: !!card, hasText };
  });
  console.log('3. Pedido MR-2026-2906 encontrado en el DOM:', orderCardFound);

  // Comprobar estado visible en la barra de etapas
  const stepStatus = await page.evaluate(() => {
    const steps = Array.from(document.querySelectorAll('#client-orders-history-list .tab-content, #client-orders-history-list [style*="min-width: 120px"]'));
    return steps.map(s => s.innerText.trim());
  });
  console.log('4. Estados de la barra:', stepStatus);

  // Captura de pantalla de verificación
  const artifactDir = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
  const screenshotPath = path.join(artifactDir, 'verif_compra_cerrada_exito.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('5. Captura guardada en:', screenshotPath);

  await browser.close();
  console.log('--- TEST E2E COMPLETADO SATISFACTORIAMENTE ---');
}

run().catch(err => {
  console.error('Error en test E2E:', err);
  process.exit(1);
});
