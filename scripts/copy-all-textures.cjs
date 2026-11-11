const fs = require('fs');
const path = require('path');

const books = [
    {
        id: 'habla-claro',
        sourceTextures: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Habla_Claro/output/3D/textures',
        targetWeb: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/public/books/habla-claro/3d'
    },
    {
        id: 'deja-de-darle-mil-vueltas',
        sourceTextures: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/deja-de-darle-mil-vueltas/output/3D/textures',
        targetWeb: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/public/books/deja-de-darle-mil-vueltas/3d'
    },
    {
        id: 'planificador-90-dias',
        sourceTextures: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador/output/3D-90/textures',
        targetWeb: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/public/books/planificador-90-dias/3d'
    },
    {
        id: 'planificador-180-dias',
        sourceTextures: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador/output/3D-180/textures',
        targetWeb: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/public/books/planificador-180-dias/3d'
    },
    {
        id: 'planificador-semanal-simple',
        sourceTextures: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador_Semanal_Simple/output/3D/textures',
        targetWeb: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/public/books/planificador-semanal-simple/3d'
    },
    {
        id: 'planificador-semanal-reversible',
        sourceTextures: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador_Semanal/output/3D/textures',
        targetWeb: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/public/books/planificador-semanal-reversible/3d'
    }
];

for (const b of books) {
    if (!fs.existsSync(b.targetWeb)) {
        fs.mkdirSync(b.targetWeb, { recursive: true });
    }
    const files = fs.readdirSync(b.sourceTextures);
    for (const f of files) {
        fs.copyFileSync(path.join(b.sourceTextures, f), path.join(b.targetWeb, f));
    }
    console.log(`Copied ${files.length} textures for ${b.id}`);
}
