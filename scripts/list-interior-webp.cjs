const fs = require('fs');
const path = require('path');

const slugs = [
    'habla-claro',
    'deja-de-darle-mil-vueltas',
    'planificador-90-dias',
    'planificador-180-dias',
    'planificador-semanal-simple',
    'planificador-semanal-reversible'
];

const base = 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/public/books';

for (const s of slugs) {
    const dir = path.join(base, s);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.webp')).sort();
    console.log(`\n=== ${s} (${files.length} webp files) ===`);
    console.log(files);
}
