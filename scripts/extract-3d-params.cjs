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
    
    // Extract title, subtitle, specs
    const titleMatch = html.match(/<div class="title">([^<]+)<\/div>/i);
    const specsMatch = html.match(/<div class="specs">([\s\S]*?)<\/div>/i);
    
    // Extract dimensions
    const wMatch = html.match(/const\s+w\s*=\s*([0-9.]+);/);
    const hMatch = html.match(/const\s+h\s*=\s*([0-9.]+);/);
    const tMatch = html.match(/const\s+t\s*=\s*([0-9.]+);/);

    console.log(`\n--- ${b.id} ---`);
    console.log(`Title:`, titleMatch ? titleMatch[1].trim() : 'N/A');
    console.log(`Dimensions: w=${wMatch ? wMatch[1] : '?'}, h=${hMatch ? hMatch[1] : '?'}, t=${tMatch ? tMatch[1] : '?'}`);
    console.log(`Specs raw:`, specsMatch ? specsMatch[1].replace(/\s+/g, ' ').trim() : 'N/A');
}
