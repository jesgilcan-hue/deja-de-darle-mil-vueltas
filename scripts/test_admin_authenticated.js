import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'https://editorialmenosruido.com';

async function testAdminAuth() {
  console.log('=== TEST DE RENDERIZADO EN ADMIN-PEDIDOS CON MOCK DE SESIÓN ===');

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
    console.log('  ❌ [ERROR DE JS EN ADMIN]:', err.message);
  });

  await page.goto(`${BASE_URL}/admin-pedidos.html`, { waitUntil: 'networkidle0' });

  // Forzar visualización de panel de administración y renderizado con mock de pedidos
  const result = await page.evaluate(() => {
    // 1. Mostrar el panel principal
    const loginCard = document.getElementById('admin-login-card');
    const mainView = document.getElementById('admin-main-view');
    if (loginCard) loginCard.style.display = 'none';
    if (mainView) mainView.style.display = 'block';

    // 2. Crear pedidos mock incluyendo uno con items: [...] (el nuevo formato unificado)
    const mockOrders = [
      {
        id: 'ord_mock_1',
        orderNumber: 'MR-2026-001',
        status: 'pending_review',
        createdAt: new Date().toISOString(),
        customer: {
          name: 'Cliente Prueba 1',
          email: 'cliente1@ejemplo.com',
          phone: '612345678',
          address: 'Calle Mayor 10, 2º B',
          postalCode: '28001',
          city: 'Madrid',
          province: 'Madrid',
          country: 'España'
        },
        pricing: { totalPaid: 24.90, luluCostEstimate: 10.50 },
        items: [
          {
            title: 'Planificador Anual 2026',
            subtitle: '52 semanas y hábitos claros',
            bindingType: 'coil',
            pageCount: 144,
            quantity: 1
          },
          {
            title: 'Cuaderno Semanal Simple',
            subtitle: 'Enfoque directo',
            bindingType: 'perfect',
            pageCount: 86,
            quantity: 2
          }
        ]
      },
      {
        id: 'ord_mock_2',
        orderNumber: 'MR-2026-002',
        status: 'printing',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        customer: {
          name: 'Cliente Prueba 2',
          email: 'cliente2@ejemplo.com',
          phone: '698765432',
          address: 'Gran Vía 45, 4º',
          postalCode: '08001',
          city: 'Barcelona',
          province: 'Barcelona',
          country: 'España'
        },
        pricing: { totalPaid: 29.90, luluCostEstimate: 12.00 },
        book: {
          title: 'Planificador 180 Días',
          subtitle: 'Tapa dura Casewrap',
          bindingType: 'hardcover',
          pageCount: 180
        }
      }
    ];

    try {
      // Asignar al array global y ejecutar ordenación y renderizado
      window.allOrders = mockOrders;
      if (typeof window.sortAndRenderOrders === 'function') {
        window.sortAndRenderOrders();
      } else if (typeof window.renderOrdersGrid === 'function') {
        window.renderOrdersGrid();
      }

      const cards = document.querySelectorAll('.order-card-box');
      return {
        cardsRendered: cards.length,
        firstCardHtmlSnippet: cards[0] ? cards[0].innerText.substring(0, 150) : null
      };
    } catch (err) {
      return {
        error: err.message,
        stack: err.stack
      };
    }
  });

  console.log('Resultado del renderizado:', JSON.stringify(result, null, 2));

  // Captura de pantalla de las tarjetas renderizadas
  const shotPath = path.join(ARTIFACT_DIR, 'prod_fixed_admin_cards_verified.png');
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log('Captura guardada en:', shotPath);

  await browser.close();
}

testAdminAuth().catch(console.error);
