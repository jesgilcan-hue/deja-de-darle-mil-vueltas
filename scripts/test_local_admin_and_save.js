import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';
const BASE_URL = 'http://localhost:5173';

async function testLocalAudit() {
  console.log('=== AUDITORÍA RIGUROSA EN LOCALDEV (AUTOPASS DE ADMIN) ===\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  const jsErrors = [];
  page.on('pageerror', err => {
    jsErrors.push(err.message);
    console.log('  ❌ [ERROR JS]:', err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('  ⚠️ [CONSOLE ERROR]:', msg.text());
    }
  });

  // -------------------------------------------------------------
  // TEST 1: admin-pedidos.html
  // -------------------------------------------------------------
  console.log('1. Abriendo admin-pedidos.html en local...');
  await page.goto(`${BASE_URL}/admin-pedidos.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));

  const adminResult = await page.evaluate(() => {
    const cards = document.querySelectorAll('.order-card-box');
    const kpiCount = document.getElementById('kpiTotalOrdersCount')?.textContent.trim();
    const kpiSales = document.getElementById('kpiTotalSales')?.textContent.trim();
    const cardHeaders = Array.from(cards).slice(0, 5).map(c => {
      const num = c.querySelector('.order-number')?.textContent.trim();
      const client = c.querySelector('.order-client-name')?.textContent.trim();
      const spec = c.querySelector('.book-title-display')?.textContent.trim();
      const badge = c.querySelector('.book-spec-pill')?.textContent.trim();
      return { num, client, spec, badge };
    });

    return {
      cardsTotal: cards.length,
      kpiCount,
      kpiSales,
      cardHeaders
    };
  });

  console.log('Resultado en admin-pedidos:', JSON.stringify(adminResult, null, 2));
  console.log(`Errores JS en admin-pedidos: ${jsErrors.length}`);

  const shotAdmin = path.join(ARTIFACT_DIR, 'local_admin_pedidos_cards_ok.png');
  await page.screenshot({ path: shotAdmin, fullPage: false });
  console.log('Captura guardada en:', shotAdmin);

  // -------------------------------------------------------------
  // TEST 2: generador-libro-completo.html
  // -------------------------------------------------------------
  console.log('\n2. Abriendo generador-libro-completo.html en local...');
  await page.goto(`${BASE_URL}/generador-libro-completo.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Haciendo clic en #btn-save-generator-design...');
  await page.click('#btn-save-generator-design');
  await new Promise(r => setTimeout(r, 1000));

  const modalResult = await page.evaluate(() => {
    const modal = document.getElementById('modalSaveAndValidateBook');
    const isVisible = modal && modal.style.display !== 'none';
    const pagesText = document.getElementById('saveModalPagesCountDisplay')?.textContent.trim();
    const titleVal = document.getElementById('save-modal-book-title')?.value;
    const chk = document.getElementById('save-modal-confirm-check');
    const btnDraft = document.querySelector('button[onclick*="executeSaveDraftOnly"]');
    const btnValidate = document.querySelector('button[onclick*="executeValidateAndSave"]');

    return {
      isVisible,
      pagesText,
      titleVal,
      hasCheckbox: !!chk,
      hasBtnDraft: !!btnDraft,
      hasBtnValidate: !!btnValidate
    };
  });

  console.log('Resultado en generador-libro-completo:', JSON.stringify(modalResult, null, 2));

  const shotLibro = path.join(ARTIFACT_DIR, 'local_modal_save_libro_ok.png');
  await page.screenshot({ path: shotLibro });
  console.log('Captura guardada en:', shotLibro);

  await browser.close();
}

testLocalAudit().catch(console.error);
