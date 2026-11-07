import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'https://editorialmenosruido.com';

async function auditRuntime() {
  console.log('=== AUDITORÍA ESTÁTICA Y DE TIEMPO DE EJECUCIÓN (SOLO LECTURA) ===\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => {
    errors.push(err.message);
    console.log('  ❌ [ERROR DE JS DETECTADO]:', err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('  ⚠️ [CONSOLE ERROR]:', msg.text());
    }
  });

  // -------------------------------------------------------------
  // TEST 1: admin-pedidos.html - Verificación de renderizado de tarjetas
  // -------------------------------------------------------------
  console.log('1. Auditando admin-pedidos.html con pedidos mock...');
  await page.goto(`${BASE_URL}/admin-pedidos.html`, { waitUntil: 'networkidle0' });

  // Ejecutamos en el navegador la simulación del renderizado de la tarjeta de un pedido nuevo (con items)
  const renderAuditResult = await page.evaluate(() => {
    const mockOrderMulti = {
      id: 'test_audit_order_1',
      orderNumber: 'TEST-9999',
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      customer: {
        name: 'Cliente Auditoria',
        email: 'test@ejemplo.com',
        phone: '600123456',
        address: 'Calle Mayor 1',
        postalCode: '28001',
        city: 'Madrid',
        province: 'Madrid',
        country: 'España'
      },
      pricing: {
        totalPaid: 24.90,
        luluCostEstimate: 10.50
      },
      items: [
        {
          title: 'Planificador Anual',
          subtitle: 'Un año con dirección clara',
          bindingType: 'coil',
          pageCount: 144,
          quantity: 1
        }
      ]
    };

    try {
      // Intentar crear la tarjeta
      const cardEl = window.createOrderCardElement ? window.createOrderCardElement(mockOrderMulti) : null;
      return {
        success: !!cardEl,
        error: null
      };
    } catch (e) {
      return {
        success: false,
        error: {
          name: e.name,
          message: e.message,
          stack: e.stack
        }
      };
    }
  });

  console.log('Resultado de renderizado mock con items en admin-pedidos:');
  console.log(JSON.stringify(renderAuditResult, null, 2));

  // -------------------------------------------------------------
  // TEST 2: generador-libro-completo.html - Inspección del botón Guardar
  // -------------------------------------------------------------
  console.log('\n2. Auditando generador-libro-completo.html (Botón Guardar)...');
  await page.goto(`${BASE_URL}/generador-libro-completo.html`, { waitUntil: 'networkidle0' });

  const saveBtnAudit = await page.evaluate(() => {
    const btn = document.getElementById('btn-save-generator-design');
    if (!btn) return { exists: false };

    // Inspeccionar modales disponibles en la página
    const modalSaveAndValidate = document.getElementById('modalSaveAndValidateBook');
    const modalOldSave = document.getElementById('generator-save-modal-overlay');

    return {
      exists: true,
      btnId: btn.id,
      btnText: btn.textContent.trim(),
      btnOnclickAttr: btn.getAttribute('onclick'),
      modalSaveAndValidateBookInDom: !!modalSaveAndValidate,
      hasOpenSaveAndValidateFn: typeof window.openSaveAndValidateModal === 'function',
      hasExecuteValidateAndSaveFn: typeof window.executeValidateAndSave === 'function',
      hasExecuteSaveDraftFn: typeof window.executeSaveDraftOnly === 'function'
    };
  });

  console.log('Inspección de botón y modales en generador-libro-completo:');
  console.log(JSON.stringify(saveBtnAudit, null, 2));

  // -------------------------------------------------------------
  // TEST 3: generador-portadas.html - Inspección del botón Guardar
  // -------------------------------------------------------------
  console.log('\n3. Auditando generador-portadas.html (Botón Guardar)...');
  await page.goto(`${BASE_URL}/generador-portadas.html`, { waitUntil: 'networkidle0' });

  const coverSaveBtnAudit = await page.evaluate(() => {
    const btn = document.getElementById('btn-save-generator-design');
    if (!btn) return { exists: false };

    return {
      exists: true,
      btnId: btn.id,
      btnText: btn.textContent.trim(),
      btnOnclickAttr: btn.getAttribute('onclick'),
      hasCoverState: typeof window.coverState !== 'undefined',
      hasUpdateBindingAvailability: typeof window.updateBindingAvailability === 'function'
    };
  });

  console.log('Inspección de botón en generador-portadas:');
  console.log(JSON.stringify(coverSaveBtnAudit, null, 2));

  await browser.close();
}

auditRuntime().catch(console.error);
