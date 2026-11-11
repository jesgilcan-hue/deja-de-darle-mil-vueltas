const fs = require('fs');

const visors = [
    'visor-habla-claro.html',
    'visor-planificador-semanal-simple.html'
];

const base = 'C:/Users/IA/Documents/Antigravity\MENOS RUIDO/web/web-menos-ruido';

for (const v of visors) {
    const html = fs.readFileSync(`${base}/${v}`, 'utf-8');
    const m = html.match(/new\s+(?:St\.)?PageFlip\([^,]+,\s*(\{[\s\S]*?\})\);/);
    console.log(`\n=== ${v} ===`);
    console.log(m ? m[1].replace(/\s+/g, ' ') : 'No PageFlip constructor in HTML (check js)');
}
