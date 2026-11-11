const fs = require('fs');
const path = require('path');

const books = [
    {
        id: 'habla-claro',
        name: 'Habla Claro',
        title: 'Habla Claro (Límites y Conversaciones Difíciles)',
        dir3d: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Habla_Claro/output/3D',
        outCompleto: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Habla_Claro/output/3D-Completo',
        webSlug: 'habla-claro',
        visorWeb: 'visor-habla-claro.html',
        pageWeb: 'habla-claro.html'
    },
    {
        id: 'deja-de-darle-mil-vueltas',
        name: 'Deja de darle mil vueltas',
        title: 'Deja de darle mil vueltas (Toma de Decisiones)',
        dir3d: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/deja-de-darle-mil-vueltas/output/3D',
        outCompleto: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/deja-de-darle-mil-vueltas/output/3D-Completo',
        webSlug: 'deja-de-darle-mil-vueltas',
        visorWeb: 'visor-deja-de-darle-mil-vueltas.html',
        pageWeb: 'deja-de-darle-mil-vueltas.html'
    },
    {
        id: 'planificador-90-dias',
        name: 'Planificador de 90 Días',
        title: 'Planificador de 90 Días (Enfoque Trimestral)',
        dir3d: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador/output/3D-90',
        outCompleto: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador/output/3D-90-Completo',
        webSlug: 'planificador-90-dias',
        visorWeb: 'visor-planificador-90-dias.html',
        pageWeb: 'planificador-90-dias.html'
    },
    {
        id: 'planificador-180-dias',
        name: 'Planificador de 180 Días',
        title: 'Planificador de 180 Días (Hábito Semestral)',
        dir3d: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador/output/3D-180',
        outCompleto: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador/output/3D-180-Completo',
        webSlug: 'planificador-180-dias',
        visorWeb: 'visor-planificador-180-dias.html',
        pageWeb: 'planificador-180-dias.html'
    },
    {
        id: 'planificador-semanal-simple',
        name: 'Planificador Semanal Simple',
        title: 'Planificador Semanal Simple (Formato Apaisado)',
        dir3d: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador_Semanal_Simple/output/3D',
        outCompleto: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador_Semanal_Simple/output/3D-Completo',
        webSlug: 'planificador-semanal-simple',
        visorWeb: 'visor-planificador-semanal-simple.html',
        pageWeb: 'planificador-semanal-simple.html'
    },
    {
        id: 'planificador-semanal-reversible',
        name: 'Planificador Semanal Reversible',
        title: 'Planificador Semanal Reversible (Tête-Bêche)',
        dir3d: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador_Semanal/output/3D',
        outCompleto: 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/Planificador_Semanal/output/3D-Completo',
        webSlug: 'planificador-semanal-reversible',
        visorWeb: 'visor-planificador-semanal-reversible.html',
        pageWeb: 'planificador-semanal-reversible.html'
    }
];

const webBooksDir = 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/public/books';

for (const b of books) {
    console.log(`\n=================== ${b.name} ===================`);
    console.log(`3D dir exists: ${fs.existsSync(b.dir3d)}`);
    if (fs.existsSync(b.dir3d)) {
        const files3d = fs.readdirSync(b.dir3d);
        console.log(`  3D files:`, files3d);
        const texDir = path.join(b.dir3d, 'textures');
        if (fs.existsSync(texDir)) {
            console.log(`  Textures:`, fs.readdirSync(texDir));
        }
    }

    const publicBookDir = path.join(webBooksDir, b.webSlug);
    console.log(`Web public/books exists: ${fs.existsSync(publicBookDir)}`);
    if (fs.existsSync(publicBookDir)) {
        const pFiles = fs.readdirSync(publicBookDir);
        console.log(`  Interior pages (${pFiles.length}):`, pFiles.filter(x => !x.endsWith('.webp') ? true : false).length > 0 ? pFiles : `${pFiles.length} files`);
    }
}
