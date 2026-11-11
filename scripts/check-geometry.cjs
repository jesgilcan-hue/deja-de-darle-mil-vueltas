const fs = require('fs');

const books = [
    { id: 'habla-claro', file: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Habla_Claro/output/3D/index.html' },
    { id: 'deja-de-darle-mil-vueltas', file: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/deja-de-darle-mil-vueltas/output/3D/index.html' },
    { id: 'planificador-90-dias', file: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador/output/3D-90/index.html' },
    { id: 'planificador-180-dias', file: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador/output/3D-180/index.html' },
    { id: 'planificador-semanal-simple', file: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador_Semanal_Simple/output/3D/index.html' },
    { id: 'planificador-semanal-reversible', file: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador_Semanal/output/3D/index.html' }
];

for (const b of books) {
    const html = fs.readFileSync(b.file, 'utf-8');
    const geomMatch = html.match(/new\s+THREE\.BoxGeometry\(([^)]+)\)/i);
    console.log(`${b.id}: BoxGeometry(${geomMatch ? geomMatch[1].trim() : '?'})`);
}
