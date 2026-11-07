import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\chrome_client_profile';
const BASE_URL = 'https://www.editorialmenosruido.com';

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: TEMP_PROFILE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Capturar errores de consola
  page.on('console', msg => console.log('  [BROWSER CONSOLE]:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('  [BROWSER ERROR]:', err.message));

  console.log('Abriendo generador-libro-completo...');
  await page.goto(`${BASE_URL}/generador-libro-completo.html`, { waitUntil: 'networkidle2' });
  
  // Seleccionar preset Mes a Mes (alterno)
  await page.evaluate(() => {
    document.querySelector('button[data-preset="alterno"]').click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const draftInLibro = await page.evaluate(() => {
    return {
      pageCount: generatedPageList.length,
      storageDraft: localStorage.getItem('mr_complete_book_config')
    };
  });
  console.log('Libro completo state:', {
    pageCount: draftInLibro.pageCount,
    hasDraft: !!draftInLibro.storageDraft
  });

  console.log('Navegando a generador-portadas?from=interior...');
  await page.goto(`${BASE_URL}/generador-portadas.html?from=interior`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  const portadasState = await page.evaluate(() => {
    const cs = window.coverState || {};
    const btnCoil = document.getElementById('btnBindCoil');
    const btnPerfect = document.getElementById('btnBindPerfect');
    const btnHard = document.getElementById('btnBindHardcover');
    return {
      pageCount: cs.pageCount,
      bindingType: cs.bindingType,
      syncedBookName: cs.syncedBookName,
      inpPageCountVal: document.getElementById('inpPageCount')?.value,
      coilDisabled: btnCoil ? btnCoil.hasAttribute('disabled') : false,
      perfectDisabled: btnPerfect ? btnPerfect.hasAttribute('disabled') : false,
      hardDisabled: btnHard ? btnHard.hasAttribute('disabled') : false,
      coilClasses: btnCoil ? btnCoil.className : '',
      perfectClasses: btnPerfect ? btnPerfect.className : ''
    };
  });

  console.log('Portadas state after navigating from=interior:', portadasState);
  await browser.close();
}

inspect().catch(console.error);
