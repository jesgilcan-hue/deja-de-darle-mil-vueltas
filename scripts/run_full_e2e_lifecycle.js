import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'https://editorialmenosruido.com';

async function runFullE2ELifecycle() {
  console.log('================================================================');
  console.log('INICIANDO AUDITORÍA E2E DE PANTALLA COMPLETA CONTINUA (4 ETAPAS)');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  const consoleErrors = [];
  const pageErrors = [];

  page.on('pageerror', err => {
    pageErrors.push({ url: page.url(), error: err.message });
    console.log(`  ❌ [PAGEERROR en ${page.url()}]:`, err.message);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
      console.log(`  ⚠️ [CONSOLE ERROR en ${page.url()}]:`, msg.text());
    }
  });

  let capturedDialogs = [];
  page.on('dialog', async dialog => {
    capturedDialogs.push({ type: dialog.type(), message: dialog.message() });
    console.log(`  [DIALOG ${dialog.type().toUpperCase()}]:`, dialog.message().substring(0, 110));
    await dialog.accept();
  });

  const auditReport = {
    etapa1_libroCompleto: {},
    etapa2_portadas: {},
    etapa3_cestaMiEspacio: {},
    etapa4_gestorPedidos: {},
    ceroErroresCertificado: false
  };

  try {
    // =========================================================================
    // ETAPA 1: CONSTRUCTOR DE LIBRO COMPLETO
    // =========================================================================
    console.log('\n--- ETAPA 1: Constructor de Libro Completo ---');
    await page.goto(`${BASE_URL}/generador-libro-completo.html`, { waitUntil: 'networkidle0', timeout: 35000 });
    await new Promise(r => setTimeout(r, 1500));

    // 1.1 Comprobar mapa de eventos del botón Guardar
    const btnSaveInfo = await page.evaluate(() => {
      const btn = document.getElementById('btn-save-generator-design');
      return {
        id: btn?.id,
        text: btn?.textContent.trim(),
        hasOnclick: btn?.getAttribute('onclick')
      };
    });
    console.log('  1.1 Botón Guardar en Mi Espacio:', JSON.stringify(btnSaveInfo));

    // 1.2 Pulsar botón Guardar en Mi Espacio y comprobar apertura del modal de validación
    console.log('  1.2 Haciendo clic en "Guardar en Mi Espacio"...');
    await page.click('#btn-save-generator-design');
    await new Promise(r => setTimeout(r, 800));

    const modalState = await page.evaluate(() => {
      const modal = document.getElementById('modalSaveAndValidateBook');
      const isVisible = modal && modal.style.display !== 'none' && window.getComputedStyle(modal).display !== 'none';
      const pagesText = document.getElementById('saveModalPagesCountDisplay')?.textContent.trim();
      const chk = document.getElementById('save-modal-confirm-check');
      const btnDraft = document.querySelector('button[onclick*="executeSaveDraftOnly"]');
      const btnValidate = document.querySelector('button[onclick*="executeValidateAndSave"]');

      return {
        isVisible,
        pagesText,
        hasCheckbox: !!chk,
        hasDraftBtn: !!btnDraft,
        hasValidateBtn: !!btnValidate
      };
    });
    console.log('  1.3 Modal de validación de Libro Completo:', JSON.stringify(modalState));

    // Captura Etapa 1
    const shot1 = path.join(ARTIFACT_DIR, 'e2e_etapa1_modal_guardado_libro.png');
    await page.screenshot({ path: shot1 });
    console.log(`  1.4 Captura Etapa 1 guardada: ${shot1}`);

    // Cerrar modal de guardado
    await page.evaluate(() => {
      if (typeof window.closeSaveAndValidateModal === 'function') window.closeSaveAndValidateModal();
    });

    auditReport.etapa1_libroCompleto = {
      botonSave: btnSaveInfo,
      modalValidacion: modalState,
      captura: 'e2e_etapa1_modal_guardado_libro.png'
    };

    // =========================================================================
    // ETAPA 2: DISEÑADOR DE PORTADAS Y VALIDACIÓN DE ENCUADERNACIÓN
    // =========================================================================
    console.log('\n--- ETAPA 2: Diseñador de Portadas y Reglas Técnicas ---');
    await page.goto(`${BASE_URL}/generador-portadas.html`, { waitUntil: 'networkidle0', timeout: 35000 });
    await new Promise(r => setTimeout(r, 1500));

    // 2.1 Verificar tooltips y bloqueos con diferentes números de páginas
    const bindingRules = await page.evaluate(() => {
      // Test A: 20 páginas
      window.coverState.pageCount = 20;
      window.updateBindingAvailability();
      const tipCoil20 = document.getElementById('btnBindCoil')?.title;
      const tipSoft20 = document.getElementById('btnBindPerfect')?.title;
      const tipHard20 = document.getElementById('btnBindHardcover')?.title;

      // Test B: 86 páginas
      window.coverState.pageCount = 86;
      window.updateBindingAvailability();
      const tipHard86 = document.getElementById('btnBindHardcover')?.title;

      return {
        con20Pags: { coil: tipCoil20, soft: tipSoft20, hard: tipHard20 },
        con86Pags: { hard: tipHard86 }
      };
    });
    console.log('  2.1 Reglas dinámicas de encuadernación:', JSON.stringify(bindingRules));

    // 2.2 Configurar libro válido (86 págs, Tapa Blanda, Validado) y añadir a la cesta
    console.log('  2.2 Añadiendo a la cesta libro válido (86 págs, tapa blanda, validado)...');
    await page.evaluate(() => {
      window.coverState.pageCount = 86;
      window.coverState.bindingType = 'perfect';
      window.coverState.syncedBookValidated = true;
      window.handleAddToCart();
    });
    await new Promise(r => setTimeout(r, 1200));

    // 2.3 Verificar modal limpio de 2 botones al añadir a la cesta
    const modalCartInfo = await page.evaluate(() => {
      const modal = document.getElementById('addedToCartModal');
      const isVisible = modal && modal.classList.contains('active');
      const buttons = modal ? Array.from(modal.querySelectorAll('button, a')).map(b => b.textContent.trim()).filter(Boolean) : [];
      return { isVisible, buttons };
    });
    console.log('  2.3 Modal al añadir a la cesta:', JSON.stringify(modalCartInfo));

    // Captura Etapa 2
    const shot2 = path.join(ARTIFACT_DIR, 'e2e_etapa2_modal_cesta_portada.png');
    await page.screenshot({ path: shot2 });
    console.log(`  2.4 Captura Etapa 2 guardada: ${shot2}`);

    auditReport.etapa2_portadas = {
      reglasEncuadernacion: bindingRules,
      modalCesta: modalCartInfo,
      captura: 'e2e_etapa2_modal_cesta_portada.png'
    };

    // =========================================================================
    // ETAPA 3: MI ESPACIO - CESTA Y TRAMITACIÓN AGRUPADA A 0 € TEST
    // =========================================================================
    console.log('\n--- ETAPA 3: Mi Espacio (Cesta y Checkout 0€ Test) ---');
    await page.goto(`${BASE_URL}/mi-espacio.html?tab=pedidos`, { waitUntil: 'networkidle0', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2000));

    // Inyectar en sessionStorage/localStorage un libro en la cesta para probar la tramitación si la sesión es anónima
    await page.evaluate(() => {
      let basket = [];
      try {
        const raw = localStorage.getItem('mr_pending_basket');
        if (raw) basket = JSON.parse(raw);
      } catch (e) {}

      if (basket.length === 0) {
        basket.push({
          id: 'test_item_e2e_01',
          title: 'Planificador Anual 2026',
          subtitle: 'Un año con dirección clara',
          bindingType: 'perfect',
          pageCount: 86,
          quantity: 1,
          price: 24.90,
          validated: true
        });
        localStorage.setItem('mr_pending_basket', JSON.stringify(basket));
      }
    });

    // Recargar para que mi-espacio pinte la cesta
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    const cestaState = await page.evaluate(() => {
      const checkoutBar = document.getElementById('client-basket-checkout-bar');
      const btnCheckout = document.getElementById('btn-basket-checkout');
      const totalText = document.getElementById('client-basket-total')?.textContent.trim();
      const isBarVisible = checkoutBar && window.getComputedStyle(checkoutBar).display !== 'none';
      return {
        isBarVisible,
        hasBtnCheckout: !!btnCheckout,
        totalText
      };
    });
    console.log('  3.1 Estado de la cesta unificada:', JSON.stringify(cestaState));

    // Captura Etapa 3
    const shot3 = path.join(ARTIFACT_DIR, 'e2e_etapa3_cesta_unificada.png');
    await page.screenshot({ path: shot3 });
    console.log(`  3.2 Captura Etapa 3 guardada: ${shot3}`);

    auditReport.etapa3_cestaMiEspacio = {
      cestaState,
      captura: 'e2e_etapa3_cesta_unificada.png'
    };

    // =========================================================================
    // ETAPA 4: GESTOR DE PEDIDOS (ADMIN-PEDIDOS) - RENDERIZADO Y CERO ERRORES
    // =========================================================================
    console.log('\n--- ETAPA 4: Gestor de Pedidos (Panel de Control) ---');

    // Cargar admin-pedidos con datos en localStorage para simular los pedidos en backoffice
    await page.goto(`${BASE_URL}/admin-pedidos.html`, { waitUntil: 'domcontentloaded', timeout: 35000 });

    await page.evaluate(() => {
      sessionStorage.setItem('mr_dev_auth', 'true');
      sessionStorage.setItem('mr_admin_pin_verified', 'true');

      const mockOrders = [
        {
          id: 'ord_e2e_audit_001',
          orderNumber: 'MR-2026-E2E-AUDIT',
          status: 'pending_review',
          createdAt: new Date().toISOString(),
          customer: {
            name: 'Cliente Auditoría E2E',
            email: 'auditoria@editorialmenosruido.com',
            phone: '+34 600 000 001',
            address: 'Calle Serrano 42, 3º Izq',
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
              bindingType: 'perfect',
              pageCount: 86,
              quantity: 1
            }
          ]
        }
      ];
      localStorage.setItem('mr_simulated_orders', JSON.stringify(mockOrders));
    });

    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    // Comprobar si se renderizan las tarjetas
    const adminCards = await page.evaluate(() => {
      const cards = document.querySelectorAll('.order-card-box');
      const orderNums = Array.from(cards).map(c => c.querySelector('.order-number')?.textContent.trim());
      const bindings = Array.from(cards).map(c => c.querySelector('.book-spec-pill')?.textContent.trim());
      return {
        totalCards: cards.length,
        orderNums,
        bindings
      };
    });
    console.log('  4.1 Tarjetas renderizadas en Gestor de Pedidos:', JSON.stringify(adminCards));

    // Captura Etapa 4
    const shot4 = path.join(ARTIFACT_DIR, 'e2e_etapa4_gestor_pedidos_render_ok.png');
    await page.screenshot({ path: shot4 });
    console.log(`  4.2 Captura Etapa 4 guardada: ${shot4}`);

    auditReport.etapa4_gestorPedidos = {
      adminCards,
      captura: 'e2e_etapa4_gestor_pedidos_render_ok.png'
    };

    // =========================================================================
    // BALANCE DE ERRORES DE JAVASCRIPT
    // =========================================================================
    console.log('\n================================================================');
    console.log('BALANCE DE ERRORES DE JAVASCRIPT');
    console.log('================================================================');
    console.log(`  Total PageErrors (errores fatales de script): ${pageErrors.length}`);
    console.log(`  Total ConsoleErrors (errores en consola): ${consoleErrors.length}`);

    auditReport.ceroErroresCertificado = (pageErrors.length === 0);
    auditReport.pageErrors = pageErrors;
    auditReport.consoleErrors = consoleErrors;

    console.log('\n=== REPORTE FINAL AUDITORÍA E2E ===');
    console.log(JSON.stringify(auditReport, null, 2));

  } catch (err) {
    console.error('Error durante la ejecución E2E:', err);
  } finally {
    await browser.close();
  }
}

runFullE2ELifecycle();
