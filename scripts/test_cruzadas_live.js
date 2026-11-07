import puppeteer from 'puppeteer-core';
import fs from 'fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'https://www.editorialmenosruido.com/hoy.html';

async function runTest() {
  console.log('Opening browser to inspect Cruzadas with dev credentials at:', URL);
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=480,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 480, height: 900 });

  // Set dev authorization before navigation
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('mr_dev_mode', 'true');
    localStorage.setItem('mr_dev_access', 'true');
    localStorage.setItem('mr_developer_mode', 'true');
  });

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.message}`));

  try {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded, current URL:', page.url());

    // Wait for button[data-game="cruzadas"]
    await page.waitForSelector('button[data-game="cruzadas"]', { timeout: 8000 });
    console.log('Clicking Cruzadas tab...');
    await page.click('button[data-game="cruzadas"]');
    await new Promise(r => setTimeout(r, 1200));

    // Inspect Cruzadas state
    const cruzadasState = await page.evaluate(() => {
      const pane = document.getElementById('pane-cruzadas');
      const grid = document.getElementById('cruzadasGrid');
      const dock = document.getElementById('dockCruzadasWords');
      const cells = document.querySelectorAll('.cruzadas-cell');
      const blackCells = document.querySelectorAll('.cruzadas-cell.cell-black');
      const playableCells = Array.from(cells).filter(c => !c.classList.contains('cell-black'));
      const words = Array.from(document.querySelectorAll('#dockCruzadasWords .word-chip')).map(c => c.textContent);
      const qwerty = document.querySelectorAll('.qwerty-key');

      return {
        paneDisplay: window.getComputedStyle(pane).display,
        gridDisplay: window.getComputedStyle(grid).display,
        dockDisplay: window.getComputedStyle(dock).display,
        totalCells: cells.length,
        blackCellsCount: blackCells.length,
        playableCount: playableCells.length,
        playableSample: playableCells.slice(0, 10).map(c => ({
          text: c.textContent,
          r: c.dataset.r,
          c: c.dataset.c,
          classes: c.className
        })),
        wordsCount: words.length,
        wordsList: words,
        qwertyCount: qwerty.length,
        helperLeft: document.getElementById('helperLeftText')?.textContent,
        helperRight: document.getElementById('helperRightText')?.textContent
      };
    });

    console.log('Cruzadas inspection result:', JSON.stringify(cruzadasState, null, 2));

    // Take screenshot of Cruzadas
    const screenshotPath = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/cruzadas_screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);

    console.log('Console logs during test:');
    consoleLogs.forEach(l => console.log(l));

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

runTest();
