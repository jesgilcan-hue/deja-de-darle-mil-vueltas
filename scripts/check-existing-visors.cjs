const fs = require('fs');

const visors = [
    'visor-habla-claro.html',
    'visor-deja-de-darle-mil-vueltas.html',
    'visor-planificador-90-dias.html',
    'visor-planificador-180-dias.html',
    'visor-planificador-semanal-simple.html',
    'visor-planificador-semanal-reversible.html'
];

const base = 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido';

for (const v of visors) {
    const html = fs.readFileSync(`${base}/${v}`, 'utf-8');
    const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["']/g);
    console.log(`\n=== ${v} (${imgMatches ? imgMatches.length : 0} images) ===`);
    if (imgMatches) {
        console.log(imgMatches.slice(0, 3));
        console.log('...');
        console.log(imgMatches.slice(-2));
    }
}
