import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testBinding() {
  console.log('=== TEST DE VALIDACIÓN Y TOOLTIPS DE ENCUADERNACIÓN ===');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:4173/generador-portadas.html', { waitUntil: 'networkidle0' });

  const result = await page.evaluate(() => {
    const tests = [];

    // Test 1: 20 páginas
    window.coverState.pageCount = 20;
    window.updateBindingAvailability();
    const btnCoil = document.getElementById('btnBindCoil');
    const btnSoft = document.getElementById('btnBindPerfect');
    const btnHard = document.getElementById('btnBindHardcover');
    tests.push({
      pages: 20,
      coil: { disabled: btnCoil.disabled, title: btnCoil.title },
      soft: { disabled: btnSoft.disabled, title: btnSoft.title },
      hard: { disabled: btnHard.disabled, title: btnHard.title }
    });

    // Test 2: 40 páginas
    window.coverState.pageCount = 40;
    window.updateBindingAvailability();
    tests.push({
      pages: 40,
      coil: { disabled: btnCoil.disabled, title: btnCoil.title },
      soft: { disabled: btnSoft.disabled, title: btnSoft.title },
      hard: { disabled: btnHard.disabled, title: btnHard.title }
    });

    // Test 3: 100 páginas
    window.coverState.pageCount = 100;
    window.updateBindingAvailability();
    tests.push({
      pages: 100,
      coil: { disabled: btnCoil.disabled, title: btnCoil.title },
      soft: { disabled: btnSoft.disabled, title: btnSoft.title },
      hard: { disabled: btnHard.disabled, title: btnHard.title }
    });

    // Test 4: 400 páginas
    window.coverState.pageCount = 400;
    window.updateBindingAvailability();
    tests.push({
      pages: 400,
      coil: { disabled: btnCoil.disabled, title: btnCoil.title },
      soft: { disabled: btnSoft.disabled, title: btnSoft.title },
      hard: { disabled: btnHard.disabled, title: btnHard.title }
    });

    return tests;
  });

  console.log('Resultados de los tests de disponibilidad:');
  result.forEach(t => {
    console.log(`\n-- ${t.pages} páginas --`);
    console.log(`  Anillas:     disabled=${t.coil.disabled} | "${t.coil.title}"`);
    console.log(`  Tapa Blanda: disabled=${t.soft.disabled} | "${t.soft.title}"`);
    console.log(`  Tapa Dura:   disabled=${t.hard.disabled} | "${t.hard.title}"`);
  });

  await browser.close();
}

testBinding().catch(console.error);
