import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\chrome_client_profile';
const BASE_URL = 'https://www.editorialmenosruido.com';

async function checkStorage() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: TEMP_PROFILE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/generador-portadas.html?from=interior`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const items = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const res = {};
    keys.forEach(k => {
      res[k] = localStorage.getItem(k)?.substring(0, 200);
    });
    return res;
  });

  console.log('LocalStorage keys on www.editorialmenosruido.com:', items);
  await browser.close();
}

checkStorage().catch(console.error);
