const fs = require('fs');

// 1. Update generador-libro-completo.html
const fileCompleto = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/generador-libro-completo.html';
let contentCompleto = fs.readFileSync(fileCompleto, 'utf8');

const target1 = `        function saveCompleteBookConfigLocally() {
            try {
                localStorage.setItem('mr_complete_book_config', JSON.stringify({
                    title: bookConfig.title,
                    subtitle: bookConfig.subtitle,
                    colophon: bookConfig.colophon,
                    owner: bookConfig.owner,
                    dedication: bookConfig.dedication,
                    layoutMode: bookConfig.layoutMode,
                    dateMode: bookConfig.dateMode,
                    year: bookConfig.year,
                    sections: bookConfig.sections
                }));
            } catch(e) {
                console.warn('No se pudo guardar en localStorage:', e);
            }
        }`;

const replacement1 = `        function saveCompleteBookConfigLocally() {
            try {
                const totalPages = (typeof generatedPageList !== 'undefined' && generatedPageList.length > 0)
                    ? generatedPageList.length
                    : (bookConfig.pageCount || 0);

                localStorage.setItem('mr_complete_book_config', JSON.stringify({
                    title: bookConfig.title,
                    subtitle: bookConfig.subtitle,
                    colophon: bookConfig.colophon,
                    owner: bookConfig.owner,
                    dedication: bookConfig.dedication,
                    layoutMode: bookConfig.layoutMode,
                    dateMode: bookConfig.dateMode,
                    year: bookConfig.year,
                    sections: bookConfig.sections,
                    pageCount: totalPages,
                    validated: !!bookConfig.validated
                }));
            } catch(e) {
                console.warn('No se pudo guardar en localStorage:', e);
            }
        }`;

contentCompleto = contentCompleto.replace(/\r\n/g, '\n');
const normTarget1 = target1.replace(/\r\n/g, '\n');
const normRep1 = replacement1.replace(/\r\n/g, '\n');

if (contentCompleto.includes(normTarget1)) {
    contentCompleto = contentCompleto.replace(normTarget1, normRep1);
    fs.writeFileSync(fileCompleto, contentCompleto, 'utf8');
    console.log('✓ generador-libro-completo.html actualizado con pageCount y validated en saveCompleteBookConfigLocally');
} else {
    console.error('✗ No se encontró target1 en generador-libro-completo.html');
}

// 2. Update calculatePagesFromSections in generador-portadas.html
const filePortadas = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/generador-portadas.html';
let contentPortadas = fs.readFileSync(filePortadas, 'utf8').replace(/\r\n/g, '\n');

const target2 = `        function calculatePagesFromSections(sections) {
            if (!Array.isArray(sections)) return null;
            let totalPages = 0;
            const bullets = [];
            sections.forEach(sec => {
                if (!sec.active) return;
                if (sec.id === 'cover') {
                    totalPages += 3;
                } else if (sec.id === 'calendar') {
                    const calP = (sec.design && sec.design.yearMode === 'both') ? 2 : 1;
                    totalPages += calP;
                    bullets.push('Calendario panorámico de 12 meses');
                } else {
                    const count = parseInt(sec.pages, 10) || 1;
                    totalPages += count;
                    if (sec.id === 'annual') bullets.push(\`Planificador anual por trimestres (\${count} pág.)\`);
                    if (sec.id === 'monthly') bullets.push(\`Planificador mensual estructurado (\${count} meses)\`);
                    if (sec.id === 'habits') bullets.push(\`Rastreador de hábitos de 31 días (\${count} meses)\`);
                    if (sec.id === 'weekly') bullets.push(\`Planificador semanal de foco (\${count} semanas)\`);
                    if (sec.id === 'hourly') bullets.push(\`Planificador horario time-boxing (\${count} págs.)\`);
                    if (sec.id === 'daily') bullets.push(\`Bitácora de enfoque diario (\${count} días)\`);
                    if (sec.id === 'notes') bullets.push(\`Sección de notas libres (\${count} páginas)\`);
                }
            });
            totalPages += 1; // Página de cierre y gratitud
            return { totalPages: totalPages >= 24 ? totalPages : 143, bullets };
        }`;

const replacement2 = `        function calculatePagesFromSections(sections, layoutMode) {
            if (!Array.isArray(sections)) return null;
            let totalPages = 0;
            const bullets = [];

            if (layoutMode === 'alterno') {
                const secMap = {};
                sections.forEach(s => { secMap[s.id] = s; });
                if (secMap['cover'] && secMap['cover'].active) totalPages += 3;
                if (secMap['calendar'] && secMap['calendar'].active) {
                    const calP = (secMap['calendar'].design && secMap['calendar'].design.yearMode === 'both') ? 2 : 1;
                    totalPages += calP;
                    bullets.push('Calendario anual');
                }
                if (secMap['annual'] && secMap['annual'].active) {
                    const count = parseInt(secMap['annual'].pages, 10) || 1;
                    totalPages += count;
                    bullets.push(\`Planificador anual (\${count} pág.)\`);
                }

                const totalMonths = (secMap['monthly'] && secMap['monthly'].active) ? (parseInt(secMap['monthly'].pages, 10) || 12) : 12;
                for (let m = 0; m < totalMonths; m++) {
                    if (secMap['monthly'] && secMap['monthly'].active) totalPages += 1;
                    if (secMap['habits'] && secMap['habits'].active) totalPages += 1;
                    for (let w = 0; w < 4; w++) {
                        if (secMap['weekly'] && secMap['weekly'].active) totalPages += 1;
                        if (secMap['daily'] && secMap['daily'].active) totalPages += 7;
                    }
                }
                if (secMap['monthly'] && secMap['monthly'].active) bullets.push(\`Planificador mensual intercalado (\${totalMonths} meses)\`);
                if (secMap['habits'] && secMap['habits'].active) bullets.push(\`Rastreador de hábitos intercalado (\${totalMonths} meses)\`);
                if (secMap['weekly'] && secMap['weekly'].active) bullets.push('Planificador semanal integrado');
                if (secMap['daily'] && secMap['daily'].active) bullets.push('Bitácora diaria intercalada');

                if (secMap['hourly'] && secMap['hourly'].active) {
                    const count = parseInt(secMap['hourly'].pages, 10) || 4;
                    totalPages += count;
                    bullets.push(\`Horario semanal (\${count} págs.)\`);
                }
                if (secMap['notes'] && secMap['notes'].active) {
                    const count = parseInt(secMap['notes'].pages, 10) || 8;
                    totalPages += count;
                    bullets.push(\`Notas y reflexiones (\${count} págs.)\`);
                }
                totalPages += 1; // Página de gratitud
            } else {
                sections.forEach(sec => {
                    if (!sec.active) return;
                    if (sec.id === 'cover') {
                        totalPages += 3;
                    } else if (sec.id === 'calendar') {
                        const calP = (sec.design && sec.design.yearMode === 'both') ? 2 : 1;
                        totalPages += calP;
                        bullets.push('Calendario panorámico de 12 meses');
                    } else {
                        const count = parseInt(sec.pages, 10) || 1;
                        totalPages += count;
                        if (sec.id === 'annual') bullets.push(\`Planificador anual por trimestres (\${count} pág.)\`);
                        if (sec.id === 'monthly') bullets.push(\`Planificador mensual estructurado (\${count} meses)\`);
                        if (sec.id === 'habits') bullets.push(\`Rastreador de hábitos de 31 días (\${count} meses)\`);
                        if (sec.id === 'weekly') bullets.push(\`Planificador semanal de foco (\${count} semanas)\`);
                        if (sec.id === 'hourly') bullets.push(\`Planificador horario time-boxing (\${count} págs.)\`);
                        if (sec.id === 'daily') bullets.push(\`Bitácora de enfoque diario (\${count} días)\`);
                        if (sec.id === 'notes') bullets.push(\`Sección de notas libres (\${count} páginas)\`);
                    }
                });
                totalPages += 1; // Página de cierre y gratitud
            }

            // Imprenta física exige paridad estricta obligatoria
            if (totalPages % 2 !== 0) {
                totalPages += 1;
            }

            return { totalPages: totalPages >= 24 ? totalPages : 144, bullets };
        }`;

const normTarget2 = target2.replace(/\r\n/g, '\n');
const normRep2 = replacement2.replace(/\r\n/g, '\n');

if (contentPortadas.includes(normTarget2)) {
    contentPortadas = contentPortadas.replace(normTarget2, normRep2);
    // Also update callers of calculatePagesFromSections to pass layoutMode
    contentPortadas = contentPortadas.replace(
        'const calc = calculatePagesFromSections(saved.sections);',
        'const calc = calculatePagesFromSections(saved.sections, saved.layoutMode);'
    );
    fs.writeFileSync(filePortadas, contentPortadas, 'utf8');
    console.log('✓ generador-portadas.html actualizado con soporte alterno y paridad estricta');
} else {
    console.error('✗ No se encontró target2 en generador-portadas.html');
}
