import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA_DIR = 'C:\\Users\\IA\\AppData\\Local\\Temp\\edge_test_profile';

async function run() {
  console.log('Launching Edge with test profile...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    userDataDir: USER_DATA_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('Navigating to mi-espacio?tab=pedidos...');
  await page.goto('https://www.editorialmenosruido.com/mi-espacio?tab=pedidos', { waitUntil: 'networkidle2' });

  // Wait 3 seconds for Firebase auth state to resolve
  await new Promise(r => setTimeout(r, 3500));

  const authState = await page.evaluate(() => {
    return {
      title: document.title,
      userName: document.getElementById('user-name-display')?.textContent?.trim(),
      userEmail: document.getElementById('user-email-display')?.textContent?.trim(),
      authVisible: document.getElementById('auth-container')?.style?.display,
      unauthVisible: document.getElementById('unauth-container')?.style?.display,
      basketCount: document.getElementById('client-pending-basket-list')?.children?.length || 0,
      ordersCount: document.getElementById('client-orders-history-list')?.children?.length || 0,
      floatingBadge: document.getElementById('mrDevCartFab')?.textContent?.trim()
    };
  });

  console.log('Auth and Page State:', JSON.stringify(authState, null, 2));

  const shot = path.resolve('authenticated-session-test.png');
  await page.screenshot({ path: shot, fullPage: true });
  console.log('Saved screenshot to:', shot);

  await browser.close();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
