const fs = require('fs');

const pages = [
    'habla-claro.html',
    'deja-de-darle-mil-vueltas.html',
    'planificador-90-dias.html',
    'planificador-180-dias.html',
    'planificador-semanal-simple.html',
    'planificador-semanal-reversible.html'
];

const base = 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido';

for (const p of pages) {
    const html = fs.readFileSync(`${base}/${p}`, 'utf-8');
    const hasModal = html.includes('id="book-modal"');
    const hasOpenFn = html.includes('function openBookModal');
    const iframeSrc = html.match(/targetSrc\s*=\s*([^;]+);/);
    console.log(`${p}: hasModal=${hasModal}, hasOpenFn=${hasOpenFn}, targetSrc=${iframeSrc ? iframeSrc[1].trim() : 'N/A'}`);
}
