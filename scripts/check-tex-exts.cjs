const fs = require('fs');

const slugs = [
    'habla-claro',
    'deja-de-darle-mil-vueltas',
    'planificador-90-dias',
    'planificador-180-dias',
    'planificador-semanal-simple',
    'planificador-semanal-reversible'
];

for (const s of slugs) {
    const dir = `C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/public/books/${s}/3d`;
    console.log(`${s}:`, fs.readdirSync(dir));
}
