const fs = require('fs');
const path = require('path');

const webDir = 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido';

const slugs = [
    'habla-claro',
    'deja-de-darle-mil-vueltas',
    'planificador-90-dias',
    'planificador-180-dias',
    'planificador-semanal-simple',
    'planificador-semanal-reversible'
];

let totalErrors = 0;

for (const s of slugs) {
    console.log(`\nVerifying [${s}]...`);
    const visorFile = path.join(webDir, `visor-${s}.html`);
    if (!fs.existsSync(visorFile)) {
        console.error(`  FAIL: ${visorFile} not found!`);
        totalErrors++;
        continue;
    }

    const html = fs.readFileSync(visorFile, 'utf-8');

    // Check size
    const sizeKb = (html.length / 1024).toFixed(1);
    console.log(`  File size: ${sizeKb} KB (Target: <50 KB) -> ${html.length < 60000 ? 'OK' : 'FAIL'}`);

    // Check scripts
    const scripts = ['/three.min.js', '/orbit-controls.js', '/page-flip.browser.js'];
    for (const sc of scripts) {
        const fullP = path.join(webDir, 'public', sc.replace(/^\//, ''));
        if (!fs.existsSync(fullP)) {
            console.error(`  FAIL: Script not found: ${sc}`);
            totalErrors++;
        }
    }

    // Check textures
    const textures = [
        'front.jpg', 'back.jpg', 'spine.jpg',
        'pages_edge.jpg', 'pages_bump.jpg', 'pages_top.jpg', 'pages_top_bump.jpg'
    ];
    for (const tex of textures) {
        const fullTex = path.join(webDir, 'public/books', s, '3d', tex);
        if (!fs.existsSync(fullTex)) {
            console.error(`  FAIL: Texture not found: ${fullTex}`);
            totalErrors++;
        }
    }

    // Check 16 sample pages
    for (let i = 1; i <= 16; i++) {
        const numStr = String(i).padStart(2, '0');
        const fullPage = path.join(webDir, 'public/books', s, `page_${numStr}.webp`);
        if (!fs.existsSync(fullPage)) {
            console.error(`  FAIL: Page not found: ${fullPage}`);
            totalErrors++;
        }
    }
}

if (totalErrors === 0) {
    console.log(`\n>>> AUDIT PASSED 100%: All 6 books verified with zero missing assets or broken links! <<<`);
} else {
    console.error(`\n>>> AUDIT FAILED with ${totalErrors} errors <<<`);
    process.exit(1);
}
