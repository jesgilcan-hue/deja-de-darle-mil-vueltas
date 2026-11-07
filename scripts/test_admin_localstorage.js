import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'https://editorialmenosruido.com';

async function testWithLocalStorage() {
  console.log('=== TEST DE RENDERIZADO CON mr_simulated_orders (CON ITEMS Y SIN ITEMS) ===');

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
    console.log('  ❌ [ERROR DE JS EN CONSOLA]:', err.message);
  });

  // 1. Navegar para inicializar origen
  await page.goto(`${BASE_URL}/admin-pedidos.html`, { waitUntil: 'domcontentloaded' });

  // 2. Inyectar pedidos en localStorage (uno con items múltiples y uno con formato unitario antiguo)
  await page.evaluate(() => {
    // Marcar como admin logueado
    sessionStorage.setItem('mr_dev_auth', 'true');
    localStorage.setItem('mr_dev_auth', 'true');

    const orders = [
      {
        id: 'ord_unificada_001',
        orderNumber: 'MR-2026-UNIF',
        status: 'pending_review',
        createdAt: new Date().toISOString(),
        customer: {
          name: 'Cliente Cesta Unificada',
          email: 'unificada@editorialmenosruido.com',
          phone: '+34 611 222 333',
          address: 'Calle Alcalá 50, 3º D',
          postalCode: '28014',
          city: 'Madrid',
          province: 'Madrid',
          country: 'España'
        },
        pricing: { totalPaid: 49.80, luluCostEstimate: 21.00 },
        items: [
          {
            title: 'Planificador Anual 2026',
            subtitle: '52 semanas y hábitos',
            bindingType: 'coil',
            pageCount: 144,
            quantity: 1
          },
          {
            title: 'Cuaderno Semanal Simple',
            subtitle: 'Foco directo',
            bindingType: 'perfect',
            pageCount: 64,
            quantity: 2
          }
        ]
      },
      {
        id: 'ord_antigua_002',
        orderNumber: 'MR-2026-ANT',
        status: 'approved_printing',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        customer: {
          name: 'Cliente Antiguo Unitario',
          email: 'unitario@ejemplo.com',
          phone: '+34 677 888 999',
          address: 'Paseo de Gracia 12, 1º',
          postalCode: '08007',
          city: 'Barcelona',
          province: 'Barcelona',
          country: 'España'
        },
        pricing: { totalPaid: 29.90, luluCostEstimate: 12.00 },
        book: {
          title: 'Planificador Semestral 180 Días',
          subtitle: 'Tapa dura casewrap',
          bindingType: 'hardcover',
          pageCount: 180
        }
      }
    ];

    localStorage.setItem('mr_simulated_orders', JSON.stringify(orders));
  });

  // 3. Recargar la página con los datos ya presentes en localStorage
  console.log('Recargando admin-pedidos.html con datos en localStorage...');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // 4. Evaluar cuántas tarjetas se han renderizado
  const check = await page.evaluate(() => {
    const cards = document.querySelectorAll('.order-card-box');
    const orderNumbers = Array.from(cards).map(c => c.querySelector('.order-number')?.textContent.trim());
    return {
      cardsCount: cards.length,
      orderNumbers: orderNumbers,
      containerDisplay: window.getComputedStyle(document.getElementById('ordersContainer'))?.display,
      emptyViewDisplay: window.getComputedStyle(document.getElementById('emptyOrdersView'))?.display
    };
  });

  console.log('Resultado de comprobación en admin-pedidos:');
  console.log(JSON.stringify(check, null, 2));
  console.log(`Errores de JavaScript capturados: ${errors.length}`);

  // 5. Captura de pantalla para artifact
  const shotPath = path.join(ARTIFACT_DIR, 'prod_fixed_admin_cards_live_ok.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Captura guardada en:', shotPath);

  await browser.close();
}

testWithLocalStorage().catch(console.error);
