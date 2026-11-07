import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\chrome_client_profile';
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';

async function testUserSession() {
  console.log('--- Probando sesión en Chrome clonado ---');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: TEMP_PROFILE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  console.log('Navegando a mi-espacio.html...');
  await page.goto('https://editorialmenosruido.com/mi-espacio.html', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4500));

  const authData = await page.evaluate(() => {
    const unauth = document.getElementById('unauthenticated-view');
    const auth = document.getElementById('authenticated-view');
    const emailHeader = document.querySelector('.user-email, #userEmailDisplay, .profile-email');
    return {
      unauthDisplay: unauth ? window.getComputedStyle(unauth).display : 'null',
      authDisplay: auth ? window.getComputedStyle(auth).display : 'null',
      emailHeader: emailHeader ? emailHeader.innerText : null,
      cachedUser: localStorage.getItem('mr_cached_user'),
      bodySnippet: document.body.innerText.substring(0, 400)
    };
  });

  console.log('Estado de autenticación detectado:', authData);

  const shotPath = path.join(ARTIFACT_DIR, 'test_user_session_chrome.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Captura guardada en:', shotPath);

  await browser.close();
}

testUserSession().catch(err => console.error('Error:', err));
