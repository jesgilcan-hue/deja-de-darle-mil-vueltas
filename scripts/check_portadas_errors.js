import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\chrome_client_profile';
const BASE_URL = 'https://www.editorialmenosruido.com';

async function checkErrors() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: TEMP_PROFILE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[CONSOLE ERROR]:', msg.text());
  });
  page.on('pageerror', err => console.log('[PAGE ERROR]:', err.message));

  await page.goto(`${BASE_URL}/generador-portadas.html?from=interior`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const hasFn = await page.evaluate(() => typeof window.openSaveAndValidateCoverModal);
  console.log('typeof window.openSaveAndValidateCoverModal:', hasFn);

  await browser.close();
}

checkErrors().catch(console.error);
