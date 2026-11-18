// Renderizador vectorial en servidor (Node/PDFKit) para Cuaderno Completo
import { JsPdfCompat } from './jspdf-pdfkit-shim.js';

export async function renderInteriorPdfBuffer(designData = {}) {
  let generatedPageList = [];
          const bookConfig = {
            presetKey: "anual",
            title: "Planificador anual",
            subtitle: "52 semanas, 12 meses y hábitos de perseverancia silenciosa",
            colophon: "Herramientas en papel para pensar con claridad",
            owner: "Clara Beltrán",
            dedication: "Dedica cada jornada a una sola prioridad que de verdad importe. El resto es ruido.",
            year: 2026,
            dateMode: "auto2026", // "auto2026", "auto2027", "blank"
            layoutMode: "blocks", // "blocks" o "alterno"
            sections: [
                { 
                    id: "cover", 
                    name: "Portada Interior & Dedicatoria", 
                    type: "cover", 
                    active: true, 
                    pages: 1,
                    design: {}
                },
                { 
                    id: "calendar", 
                    name: "Calendario Anual (12 Meses)", 
                    type: "calendar", 
                    active: true, 
                    pages: 1, 
                    design: { yearMode: "2026", showWeekNumbers: true } // "2026", "2027", "both" | showWeekNumbers
                },
                { 
                    id: "annual", 
                    name: "Planificador Anual (4 Trimestres)", 
                    type: "annual", 
                    active: false, 
                    pages: 1, 
                    countLabel: "página",
                    design: { quarters: 4 }
                },
                { 
                    id: "monthly", 
                    name: "Planificador Mensual", 
                    type: "monthly", 
                    active: true, 
                    pages: 12, 
                    countLabel: "meses",
                    design: { showGoals: true, showMilestones: true, panelPosition: "top", showWeekNumbers: true }
                },
                { 
                    id: "habits", 
                    name: "Rastreador de Hábitos (31 días)", 
                    type: "habits", 
                    active: true, 
                    pages: 12, 
                    countLabel: "meses",
                    design: { habitCount: 10, markerShape: "circle", showNotes: true } // 6, 8, 10, 12, 15, 18 | circle, square | showNotes
                },
                { 
                    id: "weekly", 
                    name: "Planificador Semanal", 
                    type: "weekly", 
                    active: true, 
                    pages: 52, 
                    countLabel: "semanas",
                    design: { markerShape: "circle", bottomSection: "both" } // markerShape: circle/square | bottomSection: both/habits/notes/none
                },
                { 
                    id: "hourly", 
                    name: "Planificador Horario Semanal", 
                    type: "hourly", 
                    active: false, 
                    pages: 4, 
                    countLabel: "páginas",
                    design: { startHour: "08:00", interval: "1h", rows: 12 } // interval: 1h/2h/3h/4h/6h | rows: max 24h
                },
                { 
                    id: "daily", 
                    name: "Planificador diario", 
                    type: "daily", 
                    active: false, 
                    pages: 30, 
                    countLabel: "días",
                    design: { markerShape: "circle", showPriority: true, showSecondary: true, showHabits: true, showNotes: true, showReflection: true }
                },
                { 
                    id: "notes", 
                    name: "Notas", 
                    type: "notes", 
                    active: true, 
                    pages: 8, 
                    countLabel: "páginas",
                    design: { gridStyle: "dots" } // dots, squares, lines, blank
                }
            ]
        };

  const d = (designData && designData.data) ? designData.data : (designData || {});
  if (d.title) bookConfig.title = d.title;
  if (d.subtitle) bookConfig.subtitle = d.subtitle;
  if (d.colophon !== undefined) bookConfig.colophon = d.colophon;
  if (d.owner !== undefined) bookConfig.owner = d.owner;
  if (d.dedication !== undefined) bookConfig.dedication = d.dedication;
  if (d.layoutMode) bookConfig.layoutMode = d.layoutMode;
  if (d.dateMode) bookConfig.dateMode = d.dateMode;
  if (d.year) bookConfig.year = d.year;
  if (d.presetKey) bookConfig.presetKey = d.presetKey;

  if (Array.isArray(d.sections)) {
    d.sections.forEach(savedSec => {
      const sec = bookConfig.sections.find(s => s.id === savedSec.id);
      if (sec) {
        if (savedSec.active !== undefined) sec.active = savedSec.active;
        if (savedSec.pages !== undefined) sec.pages = savedSec.pages;
        if (savedSec.design && typeof savedSec.design === 'object') {
          sec.design = { ...(sec.design || {}), ...savedSec.design };
        }
      }
    });
  } else if (d.sections && typeof d.sections === 'object') {
    Object.keys(d.sections).forEach(secId => {
      const savedSec = d.sections[secId];
      const sec = bookConfig.sections.find(s => s.id === secId);
      if (sec && savedSec) {
        if (savedSec.active !== undefined) sec.active = savedSec.active;
        if (savedSec.pages !== undefined) sec.pages = savedSec.pages;
        if (savedSec.design && typeof savedSec.design === 'object') {
          sec.design = { ...(sec.design || {}), ...savedSec.design };
        }
      }
    });
  }

        function recalcPages() {
            generatedPageList = [];
            const isBlank = bookConfig.dateMode === 'blank';
            const year = bookConfig.year;

            if (bookConfig.layoutMode === 'alterno') {
                // ========================================================
                // MODO ALTERNO: Organización cronológica por ciclos
                // ========================================================
                // 1. Portada si está activa
                const coverSec = bookConfig.sections.find(s => s.id === 'cover');
                if (coverSec && coverSec.active) {
                    generatedPageList.push({
                        type: 'cover',
                        sectionId: 'cover',
                        sectionName: 'Portada Interior & Dedicatoria',
                        pageIndexInSection: 0,
                        totalPagesInSection: 1,
                        design: coverSec.design || {}
                    });

                    // Páginas institucionales: Editorial (Pág. 2) e Índice (Pág. 3)
                    generatedPageList.push({
                        type: 'editorial',
                        sectionId: 'editorial',
                        sectionName: 'Editorial Menos Ruido',
                        pageIndexInSection: 0,
                        totalPagesInSection: 1,
                        design: {}
                    });
                    generatedPageList.push({
                        type: 'index',
                        sectionId: 'index',
                        sectionName: 'Índice del Planificador',
                        pageIndexInSection: 0,
                        totalPagesInSection: 1,
                        design: {}
                    });
                }

                // 2. Calendario Anual si está activo
                const calSec = bookConfig.sections.find(s => s.id === 'calendar');
                if (calSec && calSec.active) {
                    const calMode = (calSec.design && calSec.design.yearMode) || 'auto';
                    if (calMode === 'both') {
                        generatedPageList.push({
                            type: 'calendar',
                            sectionId: 'calendar',
                            sectionName: 'Calendario Anual 2026',
                            pageIndexInSection: 0,
                            totalPagesInSection: 2,
                            calendarYear: 2026,
                            design: calSec.design || {}
                        });
                        generatedPageList.push({
                            type: 'calendar',
                            sectionId: 'calendar',
                            sectionName: 'Calendario Anual 2027',
                            pageIndexInSection: 1,
                            totalPagesInSection: 2,
                            calendarYear: 2027,
                            design: calSec.design || {}
                        });
                    } else {
                        let calY = year;
                        if (calMode === '2026') calY = 2026;
                        else if (calMode === '2027') calY = 2027;
                        generatedPageList.push({
                            type: 'calendar',
                            sectionId: 'calendar',
                            sectionName: `Calendario Anual (${calY})`,
                            pageIndexInSection: 0,
                            totalPagesInSection: 1,
                            calendarYear: calY,
                            design: calSec.design || {}
                        });
                    }
                }

                // 3. Planificador Anual si está activo
                const annSec = bookConfig.sections.find(s => s.id === 'annual');
                if (annSec && annSec.active) {
                    const count = parseInt(annSec.pages, 10) || 1;
                    for (let i = 0; i < count; i++) {
                        generatedPageList.push({
                            type: 'annual',
                            sectionId: 'annual',
                            sectionName: 'Planificador Anual Estratégico',
                            pageIndexInSection: i,
                            totalPagesInSection: count,
                            design: annSec.design || {}
                        });
                    }
                }

                // 4. Ciclos Mensuales Intercalados: Mes -> Hábitos -> (Semana + 7 Días)
                const monthlySec = bookConfig.sections.find(s => s.id === 'monthly');
                const habitsSec = bookConfig.sections.find(s => s.id === 'habits');
                const weeklySec = bookConfig.sections.find(s => s.id === 'weekly');
                const dailySec = bookConfig.sections.find(s => s.id === 'daily');

                const totalMonths = (monthlySec && monthlySec.active) ? (parseInt(monthlySec.pages, 10) || 12) : 12;
                let globalWeekCount = 0;
                let globalDayCount = 0;

                for (let m = 0; m < totalMonths; m++) {
                    // Mes individual
                    if (monthlySec && monthlySec.active) {
                        generatedPageList.push({
                            type: 'monthly',
                            sectionId: 'monthly',
                            sectionName: `Planificador Mensual (Mes ${m + 1})`,
                            pageIndexInSection: m,
                            monthIndex: m,
                            totalPagesInSection: totalMonths,
                            design: monthlySec.design || {}
                        });
                    }

                    // Hábitos del mes individual
                    if (habitsSec && habitsSec.active) {
                        generatedPageList.push({
                            type: 'habits',
                            sectionId: 'habits',
                            sectionName: `Rastreador de Hábitos (Mes ${m + 1})`,
                            pageIndexInSection: m,
                            monthIndex: m,
                            totalPagesInSection: totalMonths,
                            design: habitsSec.design || {}
                        });
                    }

                    // 4 semanas de este mes (con 7 días diarios intercalados si aplica)
                    const weeksThisMonth = 4;
                    for (let w = 0; w < weeksThisMonth; w++) {
                        if (weeklySec && weeklySec.active && globalWeekCount < 52) {
                            generatedPageList.push({
                                type: 'weekly',
                                sectionId: 'weekly',
                                sectionName: `Planificador Semanal (Semana ${globalWeekCount + 1})`,
                                pageIndexInSection: globalWeekCount,
                                weekNum: globalWeekCount + 1,
                                totalPagesInSection: 52,
                                design: weeklySec.design || {}
                            });
                            globalWeekCount++;
                        }

                        if (dailySec && dailySec.active) {
                            for (let d = 0; d < 7; d++) {
                                globalDayCount++;
                                generatedPageList.push({
                                    type: 'daily',
                                    sectionId: 'daily',
                                    sectionName: `Bitácora Diaria (Día ${globalDayCount})`,
                                    pageIndexInSection: globalDayCount - 1,
                                    dayNum: globalDayCount,
                                    totalPagesInSection: 365,
                                    design: dailySec.design || {}
                                });
                            }
                        }
                    }
                }

                // 5. Horario si está activo
                const hourlySec = bookConfig.sections.find(s => s.id === 'hourly');
                if (hourlySec && hourlySec.active) {
                    const count = parseInt(hourlySec.pages, 10) || 4;
                    for (let i = 0; i < count; i++) {
                        generatedPageList.push({
                            type: 'hourly',
                            sectionId: 'hourly',
                            sectionName: 'Planificador Horario Semanal',
                            pageIndexInSection: i,
                            totalPagesInSection: count,
                            design: hourlySec.design || {}
                        });
                    }
                }

                // 6. Páginas de Notas al final del libro
                const notesSec = bookConfig.sections.find(s => s.id === 'notes');
                if (notesSec && notesSec.active) {
                    const count = parseInt(notesSec.pages, 10) || 8;
                    for (let i = 0; i < count; i++) {
                        generatedPageList.push({
                            type: 'notes',
                            sectionId: 'notes',
                            sectionName: 'Notas',
                            pageIndexInSection: i,
                            totalPagesInSection: count,
                            design: notesSec.design || {}
                        });
                    }
                }

                // Página final institucional de gratitud
                generatedPageList.push({
                    type: 'gratitude',
                    sectionId: 'gratitude',
                    sectionName: 'Cierre & Gratitud · Menos Ruido',
                    pageIndexInSection: 0,
                    totalPagesInSection: 1,
                    design: {}
                });

            } else {
                // ========================================================
                // MODO BLOQUES CONTINUOS (Estándar agrupado)
                // ========================================================
                bookConfig.sections.forEach(sec => {
                    if (!sec.active) return;

                    if (sec.type === 'cover') {
                        generatedPageList.push({
                            type: 'cover',
                            sectionId: 'cover',
                            sectionName: sec.name,
                            pageIndexInSection: 0,
                            totalPagesInSection: 1,
                            design: sec.design || {}
                        });
                        // Páginas institucionales: Editorial (Pág. 2) e Índice (Pág. 3)
                        generatedPageList.push({
                            type: 'editorial',
                            sectionId: 'editorial',
                            sectionName: 'Editorial Menos Ruido',
                            pageIndexInSection: 0,
                            totalPagesInSection: 1,
                            design: {}
                        });
                        generatedPageList.push({
                            type: 'index',
                            sectionId: 'index',
                            sectionName: 'Índice del Planificador',
                            pageIndexInSection: 0,
                            totalPagesInSection: 1,
                            design: {}
                        });
                        return;
                    }

                    if (sec.type === 'calendar' && sec.design && sec.design.yearMode === 'both') {
                        generatedPageList.push({
                            type: 'calendar',
                            sectionId: 'calendar',
                            sectionName: 'Calendario Anual 2026',
                            pageIndexInSection: 0,
                            totalPagesInSection: 2,
                            calendarYear: 2026,
                            design: sec.design || {}
                        });
                        generatedPageList.push({
                            type: 'calendar',
                            sectionId: 'calendar',
                            sectionName: 'Calendario Anual 2027',
                            pageIndexInSection: 1,
                            totalPagesInSection: 2,
                            calendarYear: 2027,
                            design: sec.design || {}
                        });
                        return;
                    }

                    const count = parseInt(sec.pages, 10) || 1;
                    const mNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                    for (let i = 0; i < count; i++) {
                        let secName = sec.name;
                        let extra = {};
                        if (sec.type === 'monthly') {
                            secName = isBlank ? `Planificador Mensual (Mes ${i + 1})` : `Planificador Mensual · ${mNames[i % 12]}`;
                            extra = { monthIndex: i };
                        } else if (sec.type === 'habits') {
                            secName = isBlank ? `Rastreador de Hábitos (Mes ${i + 1})` : `Rastreador Hábitos · ${mNames[i % 12]}`;
                            extra = { monthIndex: i };
                        } else if (sec.type === 'weekly') {
                            secName = `Planificador Semanal · Semana ${i + 1}`;
                            extra = { weekNum: i + 1 };
                        } else if (sec.type === 'daily') {
                            secName = `Bitácora Diaria · Día ${i + 1}`;
                            extra = { dayNum: i + 1 };
                        }

                        generatedPageList.push({
                            type: sec.type,
                            sectionId: sec.id,
                            sectionName: secName,
                            pageIndexInSection: i,
                            totalPagesInSection: count,
                            design: sec.design || {},
                            ...extra
                        });
                    }
                });

                // Página final institucional de gratitud
                generatedPageList.push({
                    type: 'gratitude',
                    sectionId: 'gratitude',
                    sectionName: 'Cierre & Gratitud · Menos Ruido',
                    pageIndexInSection: 0,
                    totalPagesInSection: 1,
                    design: {}
                });
            }

            // Auto-cuadre a páginas pares si la sección de notas está activa
            let total = generatedPageList.length;
            if (total % 2 !== 0) {
                const notesSec = bookConfig.sections.find(s => s.id === 'notes' || s.type === 'notes');
                if (notesSec && notesSec.active) {
                    generatedPageList.push({
                        type: 'notes',
                        sectionId: notesSec.id,
                        sectionName: 'Notas & Reflexiones (Cuadre de Imprenta)',
                        pageIndexInSection: (notesSec.pages || 1),
                        totalPagesInSection: (notesSec.pages || 1) + 1,
                        design: notesSec.design || {}
                    });
                    total = generatedPageList.length;
                }
            }

        }

        function drawPdfDiamond(doc, cx, cy, r, color) {
            doc.setFillColor(color[0], color[1], color[2]);
            doc.setDrawColor(color[0], color[1], color[2]);
            doc.lines([[r, r], [-r, r], [-r, -r], [r, -r]], cx, cy - r, [1, 1], 'FD', true);
        }

        function drawPdfPageExact(doc, page, pageNum, total, W, H, M, forceBlank = false) {
            const isBlank = forceBlank || bookConfig.dateMode === 'blank';
            const year = bookConfig.year;

            // Fondo crema editorial
            doc.setFillColor(255, 254, 251);
            doc.rect(0, 0, W, H, 'F');

            // PIE DE PÁGINA COMÚN
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(140, 131, 120);
            doc.text('MENOS RUIDO · PLANIFICADOR PERSONALIZADO', M, H - 7);
            doc.text(`editorialmenosruido.com · Pág. ${pageNum}`, W - M, H - 7, { align: 'right' });

            // 1. PORTADA INTERIOR (EDICIÓN CLÁSICA DE LUJO CON DOBLE MARCO CALIBRADO)
            if (page.type === 'cover') {
                // Marco exterior calibrado (Y: 9mm a 141mm -> alto 132mm)
                doc.setDrawColor(210, 200, 185);
                doc.setLineWidth(0.6);
                doc.rect(M, 9, W - (M * 2), 132);

                // Marco interior fino (Y: 11mm a 139mm -> alto 128mm)
                doc.setDrawColor(230, 222, 210);
                doc.setLineWidth(0.25);
                doc.rect(M + 2.5, 11, W - (M * 2) - 5, 128);

                // Insignia superior con diamantes vectoriales limpios
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(140, 95, 65);
                doc.text('EDITORIAL MENOS RUIDO', W / 2, 18, { align: 'center' });
                drawPdfDiamond(doc, (W / 2) - 34, 17.2, 0.9, [140, 95, 65]);
                drawPdfDiamond(doc, (W / 2) + 34, 17.2, 0.9, [140, 95, 65]);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(150, 140, 130);
                doc.text('EDICIÓN ANALÓGICA · CUADERNO PERSONALIZADO', W / 2, 22.5, { align: 'center' });

                // Línea divisoria con diamante superior vectorial
                const divW = 90;
                const divX = (W - divW) / 2;
                const div1Y = 27.5;
                doc.setDrawColor(220, 212, 200);
                doc.setLineWidth(0.25);
                doc.line(divX, div1Y, (W / 2) - 4, div1Y);
                drawPdfDiamond(doc, W / 2, div1Y, 1.3, [160, 120, 85]);
                doc.setDrawColor(220, 212, 200);
                doc.setLineWidth(0.25);
                doc.line((W / 2) + 4, div1Y, divX + divW, div1Y);

                // Título
                doc.setFont('times', 'bold');
                doc.setFontSize(18);
                doc.setTextColor(25, 22, 19);
                const titleText = (bookConfig.title || 'MI PLANIFICADOR PERSONAL').substring(0, 50);
                doc.text(titleText, W / 2, 36, { align: 'center' });

                // Subtítulo
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(95, 88, 80);
                const subtitleText = (bookConfig.subtitle || 'Edición Analógica · Enfoque Diario y Claridad Mental').substring(0, 85);
                doc.text(subtitleText, W / 2, 42.5, { align: 'center' });

                // Línea divisoria con diamante inferior vectorial
                const div2Y = 48;
                doc.setDrawColor(220, 212, 200);
                doc.setLineWidth(0.25);
                doc.line(divX, div2Y, (W / 2) - 4, div2Y);
                drawPdfDiamond(doc, W / 2, div2Y, 1.3, [160, 120, 85]);
                doc.setDrawColor(220, 212, 200);
                doc.setLineWidth(0.25);
                doc.line((W / 2) + 4, div2Y, divX + divW, div2Y);

                // Cartela Ex Libris (Ampliada para nombres largos con dos apellidos)
                const cartW = 140;
                const cartH = 26;
                const cartX = (W - cartW) / 2;
                const cartY = 54;

                doc.setFillColor(252, 250, 246);
                doc.setDrawColor(218, 208, 195);
                doc.setLineWidth(0.3);
                doc.roundedRect(cartX, cartY, cartW, cartH, 2, 2, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(140, 95, 65);
                doc.text('EX LIBRIS', W / 2, cartY + 5.5, { align: 'center' });
                drawPdfDiamond(doc, (W / 2) - 16, cartY + 4.8, 0.8, [140, 95, 65]);
                drawPdfDiamond(doc, (W / 2) + 16, cartY + 4.8, 0.8, [140, 95, 65]);

                // Campo Propietario (Amplio para caber nombre y dos apellidos)
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(80, 72, 64);
                doc.text('ESTE CUADERNO PERTENECE A:', cartX + 6, cartY + 13.5);

                const ownerVal = (bookConfig.owner || '').substring(0, 65);
                if (!isBlank && ownerVal) {
                    doc.setFont('times', 'italic');
                    doc.setFontSize(ownerVal.length > 32 ? 7.6 : 8.8);
                    doc.setTextColor(20, 17, 15);
                    doc.text(ownerVal, cartX + 53, cartY + 13);
                }
                doc.setDrawColor(180, 170, 160);
                doc.setLineWidth(0.2);
                doc.line(cartX + 52, cartY + 14.5, cartX + cartW - 6, cartY + 14.5);

                // Campo Período
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(80, 72, 64);
                doc.text('PERÍODO / AÑO:', cartX + 6, cartY + 21);

                doc.setFont('times', 'italic');
                doc.setFontSize(8.5);
                doc.setTextColor(50, 45, 40);
                const periodText = isBlank ? 'Atemporal (Inicio libre)' : `Año ${year}`;
                doc.text(periodText, cartX + 53, cartY + 20.5);
                doc.setDrawColor(180, 170, 160);
                doc.setLineWidth(0.2);
                doc.line(cartX + 52, cartY + 22, cartX + cartW - 6, cartY + 22);

                // Caja dedicatoria
                const dedW = 104;
                const dedX = (W - dedW) / 2;
                const dedY = 86;
                const dedH = 19;

                doc.setFillColor(250, 247, 242);
                doc.setDrawColor(225, 218, 208);
                doc.setLineWidth(0.25);
                doc.roundedRect(dedX, dedY, dedW, dedH, 2, 2, 'FD');

                doc.setFont('times', 'italic');
                doc.setFontSize(8.0);
                doc.setTextColor(90, 80, 70);
                const dedText = `"${(bookConfig.dedication || '').substring(0, 140)}"`;
                const dedLines = doc.splitTextToSize(dedText, dedW - 12);
                doc.text(dedLines, W / 2, dedY + 6.5, { align: 'center' });

                // Colofón inferior (centrado elegantemente entre caja dedicatoria y marco inferior)
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.0);
                doc.setTextColor(150, 142, 132);
                doc.text(bookConfig.colophon || 'Herramientas en papel para pensar con claridad', W / 2, 124, { align: 'center' });

            // PÁGINA 2: EDITORIAL MENOS RUIDO (PÁGINA EDITORIAL ADAPTADA A LOS 7 LIBROS)
            } else if (page.type === 'editorial') {
                const edKey = getActivePresetKey();
                const edData = getEditorialPageData(edKey);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.0);
                doc.setTextColor(135, 85, 59);
                doc.text('EDITORIAL MENOS RUIDO', M + 5, M + 9);

                doc.setFont('times', 'bold');
                doc.setFontSize(17.5);
                doc.setTextColor(25, 22, 19);
                doc.text(edData.title, M + 5, M + 18);

                doc.setFont('times', 'italic');
                doc.setFontSize(8.8);
                doc.setTextColor(110, 100, 90);
                doc.text(edData.quote, M + 5, M + 24);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(60, 52, 45);
                const p1Lines = doc.splitTextToSize(edData.p1, W - (M * 2) - 10);
                doc.text(p1Lines, M + 5, M + 32);

                const p2Lines = doc.splitTextToSize(edData.p2, W - (M * 2) - 10);
                doc.text(p2Lines, M + 5, M + 46);

                // Recuadro de principios del método específico
                const boxY = M + 61;
                const boxW = W - (M * 2) - 10;
                doc.setFillColor(250, 248, 244);
                doc.setDrawColor(220, 212, 200);
                doc.setLineWidth(0.25);
                doc.roundedRect(M + 5, boxY, boxW, 40, 2, 2, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.8);
                doc.setTextColor(135, 85, 59);
                doc.text(edData.boxTitle, M + 10, boxY + 6.5);

                let princY = boxY + 14;
                edData.principles.forEach((princ) => {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7.6);
                    doc.setTextColor(40, 35, 30);
                    doc.text(princ.bold, M + 10, princY);

                    const boldWidth = doc.getTextWidth(princ.bold);
                    doc.setFont('helvetica', 'normal');
                    const textLines = doc.splitTextToSize(princ.text, boxW - boldWidth - 14);
                    doc.text(textLines, M + 10 + boldWidth + 2, princY);
                    princY += 8.5;
                });

                doc.setFont('times', 'italic');
                doc.setFontSize(8.2);
                doc.setTextColor(100, 90, 80);
                doc.text(edData.footer, W / 2, boxY + 47, { align: 'center' });

            // PÁGINA 3: ÍNDICE DE CONTENIDOS DEL CUADERNO (SUMARIO RESUMIDO SIN DESBORDE)
            } else if (page.type === 'index') {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(135, 85, 59);
                doc.text('EDITORIAL MENOS RUIDO · SUMARIO DEL CUADERNO', M, M + 2.5);

                doc.setFont('times', 'bold');
                doc.setFontSize(15.5);
                doc.setTextColor(20, 18, 16);
                doc.text('Índice de Contenidos', M, M + 8.5);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.0);
                doc.setTextColor(70, 65, 60);
                doc.text(`${total} PÁGINAS COMPILADAS`, W - M, M + 8.2, { align: 'right' });

                doc.setLineWidth(0.35);
                doc.setDrawColor(30, 25, 20);
                doc.line(M, M + 10.5, W - M, M + 10.5);

                const entries = getBookIndexSummaryEntries();
                const half = Math.ceil(entries.length / 2);
                const col1 = entries.slice(0, half);
                const col2 = entries.slice(half);

                const gridW = W - (M * 2);
                const colGap = 14;
                const colW = (gridW - colGap) / 2;
                const startY = M + 18;
                const maxRows = Math.max(col1.length, col2.length, 1);
                const availableH = H - M - 20 - startY;
                const lineH = Math.min(7.2, Math.max(5.2, availableH / (maxRows + 0.5)));

                // Helper para renderizar cada fila del sumario editorial con línea de puntos
                const renderIndexRow = (e, x, y) => {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6.8);
                    doc.setTextColor(40, 35, 30);
                    
                    let label = e.label;
                    const maxLabelW = colW - 28;
                    if (doc.getTextWidth(label) > maxLabelW) {
                        while (label.length > 5 && doc.getTextWidth(label + '...') > maxLabelW) {
                            label = label.slice(0, -1);
                        }
                        label += '...';
                    }
                    doc.text(label, x, y);
                    const labelW = doc.getTextWidth(label);

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6.8);
                    doc.setTextColor(135, 85, 59);
                    const pRange = e.startPage === e.endPage ? `Pág. ${e.startPage}` : `Págs. ${e.startPage}-${e.endPage}`;
                    doc.text(pRange, x + colW, y, { align: 'right' });
                    const pRangeW = doc.getTextWidth(pRange);

                    // Pauta de puntos editorial limpia entre el nombre y el número
                    const dotStartX = x + labelW + 2.5;
                    const dotEndX = x + colW - pRangeW - 2.5;
                    if (dotEndX > dotStartX + 4) {
                        doc.setDrawColor(210, 202, 192);
                        doc.setLineWidth(0.18);
                        doc.setLineDashPattern([0.5, 1.2], 0);
                        doc.line(dotStartX, y - 0.5, dotEndX, y - 0.5);
                        doc.setLineDashPattern([], 0);
                    }
                };

                col1.forEach((e, i) => renderIndexRow(e, M, startY + (i * lineH)));
                col2.forEach((e, i) => renderIndexRow(e, M + colW + colGap, startY + (i * lineH)));

                doc.setFont('helvetica', 'italic');
                doc.setFontSize(6.0);
                doc.setTextColor(140, 130, 120);
                doc.text('Sumario ejecutivo de navegación analógica · Editorial Menos Ruido', W / 2, H - 12, { align: 'center' });

            // 2. CALENDARIO ANUAL (PANORÁMICA 12 MESES CON TARJETAS REDONDEADAS Y CABECERA AVENA)
            } else if (page.type === 'calendar') {
                const calDesignMode = page.design.yearMode || 'auto';
                const calIsBlank = isBlank || calDesignMode === 'blank' || (calDesignMode === 'auto' && isBlank);
                const calYear = page.calendarYear ? page.calendarYear : (calDesignMode === '2026' ? 2026 : (calDesignMode === '2027' ? 2027 : year));

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(135, 85, 59);
                doc.text('MENOS RUIDO · PANORÁMICA DE 12 MESES', M, M + 2.5);

                doc.setFont('times', 'bold');
                doc.setFontSize(15.5);
                doc.setTextColor(20, 18, 16);
                doc.text(`Calendario Anual ${calIsBlank ? 'Atemporal' : calYear}`, M, M + 8.5);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(30, 26, 22);
                doc.text(calIsBlank ? '' : `AÑO ${calYear}`, W - M, M + 8.2, { align: 'right' });

                doc.setLineWidth(0.4);
                doc.setDrawColor(30, 25, 20);
                doc.line(M, M + 10.5, W - M, M + 10.5);

                const gridX = M;
                const gridY = M + 13.5;
                const gridW = W - (M * 2);
                const gridH = H - M - 7 - gridY; // 132.9 - gridY
                const cols = 4;
                const rows = 3;
                const gap = 3.0;
                const colW = (gridW - (gap * (cols - 1))) / cols;
                const rowH = (gridH - (gap * (rows - 1))) / rows;
                const headerH = 4.2;
                const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const mIdx = (r * cols) + c;
                        const bX = gridX + c * (colW + gap);
                        const bY = gridY + r * (rowH + gap);

                        // Marco redondeado del mes
                        doc.setFillColor(255, 255, 255);
                        doc.setDrawColor(220, 215, 205);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(bX, bY, colW, rowH, 1.2, 1.2, 'FD');

                        // Cabecera del mes
                        doc.setFillColor(245, 241, 234);
                        doc.rect(bX, bY, colW, headerH, 'F');
                        doc.line(bX, bY + headerH, bX + colW, bY + headerH);

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.2);
                        doc.setTextColor(45, 40, 35);
                        doc.text(`${months[mIdx]} ${calIsBlank ? '' : calYear}`, bX + (colW / 2), bY + 3.0, { align: 'center' });

                        // Días de la semana
                        const hasWeeks = page.design && page.design.showWeekNumbers !== false;
                        const numCols = hasWeeks ? 8 : 7;
                        const daysW = colW / numCols;
                        const weekColW = hasWeeks ? daysW : 0;

                        if (hasWeeks) {
                            doc.setFillColor(245, 241, 234);
                            doc.rect(bX, bY + headerH, weekColW, rowH - headerH, 'F');
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(4.4);
                            doc.setTextColor(140, 130, 120);
                            doc.text('S', bX + (weekColW / 2), bY + 7.5, { align: 'center' });
                        }

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(4.8);
                        doc.setTextColor(130, 120, 110);
                        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach((d, i) => {
                            const dX = bX + weekColW + (i * daysW) + (daysW / 2);
                            doc.text(d, dX, bY + 7.5, { align: 'center' });
                        });

                        // Cuadrícula de números
                        if (!calIsBlank) {
                            const firstDay = (new Date(calYear, mIdx, 1).getDay() + 6) % 7;
                            const totalDays = new Date(calYear, mIdx + 1, 0).getDate();
                            let cur = 1;

                            for (let wr = 0; wr < 6; wr++) {
                                if (cur > totalDays) break;

                                if (hasWeeks) {
                                    const wMonday = new Date(calYear, mIdx, 1 + (wr * 7) - firstDay);
                                    const wNum = getISOWeek(wMonday);
                                    doc.setFont('helvetica', 'bold');
                                    doc.setFontSize(4.4);
                                    doc.setTextColor(140, 130, 120);
                                    doc.text(String(wNum), bX + (weekColW / 2), bY + 11.2 + (wr * 3.6), { align: 'center' });
                                }

                                doc.setTextColor(35, 30, 25);
                                for (let wc = 0; wc < 7; wc++) {
                                    if (wr === 0 && wc < firstDay) continue;
                                    if (cur <= totalDays) {
                                        doc.setFont('helvetica', 'normal');
                                        doc.setFontSize(4.8);
                                        doc.text(String(cur), bX + weekColW + (wc * daysW) + (daysW / 2), bY + 11.2 + (wr * 3.6), { align: 'center' });
                                        cur++;
                                    }
                                }
                            }
                        }
                    }
                }

            // 3. PLANIFICADOR ANUAL (IDÉNTICO A GENERADOR-PLANIFICADOR-ANUAL: PRIORIDADES + 12 MESES + NOTAS)
            } else if (page.type === 'annual') {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(135, 85, 59);
                doc.text('MENOS RUIDO · PANORÁMICA ANUAL', M, M + 2.5);

                doc.setFont('times', 'bold');
                doc.setFontSize(15.5);
                doc.setTextColor(20, 18, 16);
                doc.text('Planificación Anual', M, M + 8.5);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(30, 26, 22);
                doc.text(isBlank ? 'AÑO: _____________' : `AÑO: ${year}`, W - M, M + 8.2, { align: 'right' });

                doc.setLineWidth(0.4);
                doc.setDrawColor(30, 25, 20);
                doc.line(M, M + 10.5, W - M, M + 10.5);

                const gridW = W - (M * 2);
                
                // FRANJA SUPERIOR: PRIORIDADES ESTRATÉGICAS + LEMA O FOCO
                const topStripY = M + 12.8;
                const topStripH = 17.0;
                const prioW = (gridW - 4) * 0.58;
                const mottoX = M + prioW + 4;
                const mottoW = gridW - prioW - 4;

                // Tarjeta 1: Prioridades estratégicas del año
                doc.setFillColor(250, 248, 245);
                doc.setDrawColor(220, 215, 204);
                doc.setLineWidth(0.2);
                doc.roundedRect(M, topStripY, prioW, topStripH, 1.5, 1.5, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.2);
                doc.setTextColor(45, 39, 34);
                doc.text('PRIORIDADES ESTRATÉGICAS DEL AÑO (MÁXIMO 3)', M + 3.3, topStripY + 4.0);

                doc.setDrawColor(226, 218, 208);
                doc.setLineWidth(0.15);
                doc.line(M + 3, topStripY + 5.2, M + prioW - 3, topStripY + 5.2);

                const prioRowH = (topStripH - 6.5) / 3;
                for (let i = 0; i < 3; i++) {
                    const rowY = topStripY + 6.0 + (i * prioRowH);
                    doc.setFillColor(255, 255, 255);
                    doc.setDrawColor(110, 105, 100);
                    doc.setLineWidth(0.2);
                    doc.circle(M + 4.5, rowY + 1.2, 1.25, 'FD');
                    if (i < 2) {
                        doc.setDrawColor(235, 230, 222);
                        doc.setLineWidth(0.15);
                        doc.setLineDashPattern([1.0, 1.0], 0);
                        doc.line(M + 3, rowY + prioRowH - 0.4, M + prioW - 3, rowY + prioRowH - 0.4);
                        doc.setLineDashPattern([], 0);
                    }
                }

                // Tarjeta 2: Lema o Foco Anual
                doc.setFillColor(250, 248, 245);
                doc.setDrawColor(220, 215, 204);
                doc.setLineWidth(0.2);
                doc.roundedRect(mottoX, topStripY, mottoW, topStripH, 1.5, 1.5, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.2);
                doc.setTextColor(45, 39, 34);
                doc.text('LEMA O FOCO ANUAL', mottoX + 3.3, topStripY + 4.0);

                doc.setDrawColor(226, 218, 208);
                doc.setLineWidth(0.15);
                doc.line(mottoX + 3, topStripY + 5.2, mottoX + mottoW - 3, topStripY + 5.2);

                // CUADRÍCULA CENTRAL DE LOS 12 MESES (4 COLUMNAS × 3 FILAS)
                const gridStartY = topStripY + topStripH + 2.5;
                const bottomNotesH = 15.0;
                const footerLimitY = H - 9;
                const spaceForGrid = (footerLimitY - bottomNotesH - 2.5) - gridStartY;
                const annualGridH = spaceForGrid;

                const aCols = 4;
                const aRows = 3;
                const aGap = 2.4;
                const aColW = (gridW - (aGap * (aCols - 1))) / aCols;
                const aRowH = (annualGridH - (aGap * (aRows - 1))) / aRows;
                const aHeaderH = 4.2;
                const monthNamesAnnual = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
                const quarterBadges = ["Q1", "Q1", "Q1", "Q2", "Q2", "Q2", "Q3", "Q3", "Q3", "Q4", "Q4", "Q4"];

                for (let r = 0; r < aRows; r++) {
                    for (let c = 0; c < aCols; c++) {
                        const mIdx = r * aCols + c;
                        const cellX = M + c * (aColW + aGap);
                        const cellY = gridStartY + r * (aRowH + aGap);

                        // Marco del mes
                        doc.setFillColor(255, 255, 255);
                        doc.setDrawColor(220, 215, 205);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(cellX, cellY, aColW, aRowH, 1.2, 1.2, 'FD');

                        // Cabecera del mes en tono avena
                        doc.setFillColor(245, 241, 234);
                        doc.rect(cellX, cellY, aColW, aHeaderH, 'F');
                        doc.line(cellX, cellY + aHeaderH, cellX + aColW, cellY + aHeaderH);

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.2);
                        doc.setTextColor(45, 40, 35);
                        doc.text(`${mIdx + 1}. ${monthNamesAnnual[mIdx]}`, cellX + 1.8, cellY + 3.0);

                        doc.setFontSize(5.0);
                        doc.setTextColor(135, 85, 59);
                        doc.text(quarterBadges[mIdx], cellX + aColW - 1.8, cellY + 3.0, { align: 'right' });
                    }
                }

                // FRANJA INFERIOR: NOTAS Y BALANCE ANUAL
                const botNotesY = gridStartY + annualGridH + 2.5;
                doc.setFillColor(250, 248, 245);
                doc.setDrawColor(220, 215, 204);
                doc.setLineWidth(0.2);
                doc.roundedRect(M, botNotesY, gridW, bottomNotesH, 1.5, 1.5, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.2);
                doc.setTextColor(45, 39, 34);
                doc.text('NOTAS Y BALANCE ANUAL', M + 3.3, botNotesY + 4.0);

                doc.setDrawColor(226, 218, 208);
                doc.setLineWidth(0.15);
                doc.line(M + 3, botNotesY + 5.2, M + gridW - 3, botNotesY + 5.2);

            // 4. PLANIFICADOR MENSUAL (IDÉNTICO A GENERADOR-PLANIFICADOR-MENSUAL-V1)
            } else if (page.type === 'monthly') {
                const monthIndex = (page.monthIndex !== undefined) ? page.monthIndex : (page.pageIndexInSection % 12);
                const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
                const titleStr = isBlank ? `Planificación Mensual` : `Planificación · ${monthNames[monthIndex]}`;
                const metaStr = isBlank ? `MES: _________ · AÑO: _________` : `MES: ${monthNames[monthIndex]} · AÑO: ${year}`;

                // Cabecera oficial
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(135, 85, 59);
                doc.text('MENOS RUIDO · SISTEMA DE PLANIFICACIÓN MENSUAL', M, M + 2.5);

                doc.setFont('times', 'bold');
                doc.setFontSize(15.5);
                doc.setTextColor(20, 18, 16);
                doc.text(titleStr, M, M + 8.5);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(30, 26, 22);
                doc.text(metaStr, W - M, M + 8.2, { align: 'right' });

                doc.setLineWidth(0.4);
                doc.setDrawColor(30, 25, 20);
                doc.line(M, M + 10.5, W - M, M + 10.5);

                const gridW = W - (M * 2);

                const hasGoals = page.design.showGoals !== false;
                const hasMilestones = page.design.showMilestones !== false;
                const panelPos = page.design.panelPosition || 'top';
                const hasStrip = hasGoals || hasMilestones;
                const stripH = 16.5;
                const gap = 2.5;
                const footerLimitY = H - 9;
                const topContentY = M + 12.8;

                let stripY = topContentY;
                let calStartY = topContentY;
                let calH = footerLimitY - calStartY;

                if (hasStrip) {
                    if (panelPos === 'bottom') {
                        calStartY = topContentY;
                        calH = footerLimitY - stripH - gap - calStartY;
                        stripY = calStartY + calH + gap;
                    } else {
                        stripY = topContentY;
                        calStartY = stripY + stripH + gap;
                        calH = footerLimitY - calStartY;
                    }

                    if (hasGoals && hasMilestones) {
                        const w1 = (gridW - 4) * 0.52;
                        const x2 = M + w1 + 4;
                        const w2 = gridW - w1 - 4;

                        // Tarjeta 1: Metas del Mes
                        doc.setFillColor(250, 248, 245);
                        doc.setDrawColor(220, 215, 204);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(M, stripY, w1, stripH, 1.5, 1.5, 'FD');

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.2);
                        doc.setTextColor(45, 39, 34);
                        doc.text('METAS DEL MES (MÁXIMO 3)', M + 3, stripY + 4.0);

                        doc.setDrawColor(230, 223, 211);
                        doc.setLineWidth(0.15);
                        doc.line(M + 3, stripY + 5.2, M + w1 - 3, stripY + 5.2);

                        const rowH_goals = (stripH - 6.5) / 3;
                        for (let k = 0; k < 3; k++) {
                            const rowY = stripY + 6.0 + (k * rowH_goals);
                            doc.setFillColor(255, 255, 255);
                            doc.setDrawColor(100, 100, 100);
                            doc.setLineWidth(0.18);
                            doc.circle(M + 4.5, rowY + 1.2, 1.25, 'FD');
                            if (k < 2) {
                                doc.setDrawColor(235, 230, 222);
                                doc.setLineWidth(0.15);
                                doc.setLineDashPattern([1.0, 1.0], 0);
                                doc.line(M + 3, rowY + rowH_goals - 0.4, M + w1 - 3, rowY + rowH_goals - 0.4);
                                doc.setLineDashPattern([], 0);
                            }
                        }

                        // Tarjeta 2: Hitos y Fechas Clave
                        doc.setFillColor(250, 248, 245);
                        doc.setDrawColor(220, 215, 204);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(x2, stripY, w2, stripH, 1.5, 1.5, 'FD');

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.2);
                        doc.setTextColor(45, 39, 34);
                        doc.text('HITOS Y FECHAS CLAVE', x2 + 3, stripY + 4.0);

                        doc.setDrawColor(230, 223, 211);
                        doc.setLineWidth(0.15);
                        doc.line(x2 + 3, stripY + 5.2, x2 + w2 - 3, stripY + 5.2);

                        const rowH_m = (stripH - 6.5) / 3;
                        for (let k = 0; k < 3; k++) {
                            const rowY = stripY + 6.0 + (k * rowH_m);
                            doc.setDrawColor(210, 205, 196);
                            doc.setLineWidth(0.18);
                            doc.setFillColor(255, 255, 255);
                            doc.roundedRect(x2 + 3.3, rowY, 8.5, 2.8, 0.4, 0.4, 'FD');
                            if (k < 2) {
                                doc.setDrawColor(235, 230, 222);
                                doc.setLineWidth(0.15);
                                doc.setLineDashPattern([1.0, 1.0], 0);
                                doc.line(x2 + 3, rowY + rowH_m - 0.4, x2 + w2 - 3, rowY + rowH_m - 0.4);
                                doc.setLineDashPattern([], 0);
                            }
                        }
                    } else if (hasGoals) {
                        // Tarjeta 1: Metas del Mes a ancho completo
                        doc.setFillColor(250, 248, 245);
                        doc.setDrawColor(220, 215, 204);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(M, stripY, gridW, stripH, 1.5, 1.5, 'FD');

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.2);
                        doc.setTextColor(45, 39, 34);
                        doc.text('METAS DEL MES (MÁXIMO 3)', M + 3, stripY + 4.0);

                        doc.setDrawColor(230, 223, 211);
                        doc.setLineWidth(0.15);
                        doc.line(M + 3, stripY + 5.2, M + gridW - 3, stripY + 5.2);

                        const rowH_goals = (stripH - 6.5) / 3;
                        for (let k = 0; k < 3; k++) {
                            const rowY = stripY + 6.0 + (k * rowH_goals);
                            doc.setFillColor(255, 255, 255);
                            doc.setDrawColor(100, 100, 100);
                            doc.setLineWidth(0.18);
                            doc.circle(M + 4.5, rowY + 1.2, 1.25, 'FD');
                            if (k < 2) {
                                doc.setDrawColor(235, 230, 222);
                                doc.setLineWidth(0.15);
                                doc.setLineDashPattern([1.0, 1.0], 0);
                                doc.line(M + 3, rowY + rowH_goals - 0.4, M + gridW - 3, rowY + rowH_goals - 0.4);
                                doc.setLineDashPattern([], 0);
                            }
                        }
                    } else if (hasMilestones) {
                        // Tarjeta 2: Hitos y Fechas Clave a ancho completo
                        doc.setFillColor(250, 248, 245);
                        doc.setDrawColor(220, 215, 204);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(M, stripY, gridW, stripH, 1.5, 1.5, 'FD');

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.2);
                        doc.setTextColor(45, 39, 34);
                        doc.text('HITOS Y FECHAS CLAVE', M + 3, stripY + 4.0);

                        doc.setDrawColor(230, 223, 211);
                        doc.setLineWidth(0.15);
                        doc.line(M + 3, stripY + 5.2, M + gridW - 3, stripY + 5.2);

                        const rowH_m = (stripH - 6.5) / 3;
                        for (let k = 0; k < 3; k++) {
                            const rowY = stripY + 6.0 + (k * rowH_m);
                            doc.setDrawColor(210, 205, 196);
                            doc.setLineWidth(0.18);
                            doc.setFillColor(255, 255, 255);
                            doc.roundedRect(M + 3.3, rowY, 8.5, 2.8, 0.4, 0.4, 'FD');
                            if (k < 2) {
                                doc.setDrawColor(235, 230, 222);
                                doc.setLineWidth(0.15);
                                doc.setLineDashPattern([1.0, 1.0], 0);
                                doc.line(M + 3, rowY + rowH_m - 0.4, M + gridW - 3, rowY + rowH_m - 0.4);
                                doc.setLineDashPattern([], 0);
                            }
                        }
                    }
                }

                // CUADRÍCULA DE CALENDARIO DE ANCHO COMPLETO (7 COLUMNAS × 5 FILAS)
                const headerH = 4.2;
                const matrixH = calH - headerH;
                const rowH_cal = matrixH / 5;
                const colW_cal = gridW / 7;

                // Datos de los 35 días
                const firstDate = new Date(year, monthIndex, 1);
                const startCol = (firstDate.getDay() + 6) % 7;
                const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

                // 1. Fondos de celdas
                for (let r = 0; r < 5; r++) {
                    const cellY = calStartY + headerH + (r * rowH_cal);
                    for (let c = 0; c < 7; c++) {
                        const cellIdx = (r * 7) + c;
                        const cellX = M + (c * colW_cal);
                        const isCurrent = !isBlank && (cellIdx >= startCol && cellIdx < startCol + daysInMonth);

                        if (isBlank || isCurrent) {
                            doc.setFillColor(255, 255, 255);
                        } else {
                            doc.setFillColor(250, 248, 245);
                        }
                        doc.rect(cellX, cellY, colW_cal, rowH_cal, 'F');
                    }
                }

                // 2. Líneas interiores de cuadrícula
                doc.setDrawColor(224, 218, 208);
                doc.setLineWidth(0.18);
                for (let r = 0; r < 5; r++) {
                    const cellY = calStartY + headerH + (r * rowH_cal);
                    for (let c = 0; c < 7; c++) {
                        const cellX = M + (c * colW_cal);
                        if (c < 6) doc.line(cellX + colW_cal, cellY, cellX + colW_cal, cellY + rowH_cal);
                        if (r < 4) doc.line(cellX, cellY + rowH_cal, cellX + colW_cal, cellY + rowH_cal);
                    }
                }

                // 3. Números de los días (esquina superior derecha de cada celda)
                if (!isBlank) {
                    for (let r = 0; r < 5; r++) {
                        const cellY = calStartY + headerH + (r * rowH_cal);
                        for (let c = 0; c < 7; c++) {
                            const cellIdx = (r * 7) + c;
                            const cellX = M + (c * colW_cal);

                            let dayNumber = 0;
                            let isCur = false;
                            let cellDate = null;
                            if (cellIdx < startCol) {
                                dayNumber = daysInPrevMonth - startCol + 1 + cellIdx;
                                cellDate = new Date(year, monthIndex - 1, dayNumber);
                            } else if (cellIdx < startCol + daysInMonth) {
                                dayNumber = cellIdx - startCol + 1;
                                isCur = true;
                                cellDate = new Date(year, monthIndex, dayNumber);
                            } else {
                                dayNumber = cellIdx - (startCol + daysInMonth) + 1;
                                cellDate = new Date(year, monthIndex + 1, dayNumber);
                            }

                            doc.setFont('helvetica', isCur ? 'bold' : 'normal');
                            doc.setFontSize(6.2);
                            if (isCur) {
                                doc.setTextColor(30, 26, 22);
                            } else {
                                doc.setTextColor(181, 174, 159);
                            }
                            const dayStr = String(dayNumber);
                            doc.text(dayStr, cellX + 1.8, cellY + 3.0);
                            const numW = doc.getTextWidth(dayStr);

                            // Badge de semana en la primera columna (Lunes) a continuación del día (ej. 29 S7)
                            if (c === 0 && page.design && page.design.showWeekNumbers !== false && cellDate) {
                                const wNum = getISOWeek(cellDate);
                                const badgeX = cellX + 1.8 + numW + 1.2;
                                const badgeY = cellY + 0.9;
                                doc.setFillColor(242, 237, 228);
                                doc.roundedRect(badgeX, badgeY, 5.4, 2.7, 1.35, 1.35, 'F');
                                doc.setFont('helvetica', 'bold');
                                doc.setFontSize(4.4);
                                doc.setTextColor(130, 120, 108);
                                doc.text(`S${wNum}`, badgeX + 2.7, badgeY + 1.9, { align: 'center' });
                            }
                        }
                    }
                }

                // 4. Cabecera LUNES .. DOMINGO
                doc.setFillColor(242, 237, 228);
                doc.rect(M, calStartY, gridW, headerH, 'F');

                const daysHeaders = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.8);
                doc.setTextColor(45, 38, 33);

                daysHeaders.forEach((dayName, colIdx) => {
                    const cX = M + (colIdx * colW_cal);
                    doc.text(dayName, cX + (colW_cal / 2), calStartY + 3.0, { align: 'center' });
                    if (colIdx > 0) {
                        doc.setDrawColor(220, 215, 206);
                        doc.setLineWidth(0.2);
                        doc.line(cX, calStartY, cX, calStartY + headerH);
                    }
                });

                // 5. Marco exterior nítido
                doc.setDrawColor(40, 35, 30);
                doc.setLineWidth(0.35);
                doc.rect(M, calStartY, gridW, calH);
                doc.line(M, calStartY + headerH, M + gridW, calStartY + headerH);

            // 5. RASTREADOR DE HÁBITOS (IDÉNTICO A GENERADOR-PLANIFICADOR-HABITOS-V1)
            } else if (page.type === 'habits') {
                const monthIndex = (page.monthIndex !== undefined) ? page.monthIndex : (page.pageIndexInSection % 12);
                const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
                const titleStr = isBlank ? `Planificador de Hábitos` : `Hábitos · ${monthNames[monthIndex]}`;
                const metaStr = isBlank ? `MES: _________ · AÑO: _________` : `MES: ${monthNames[monthIndex]} · AÑO: ${year}`;
                const habitCount = page.design.habitCount || 10;
                const isCircle = page.design.markerShape !== 'square';
                const daysInMonth = isBlank ? 31 : new Date(year, monthIndex + 1, 0).getDate();

                // Cabecera oficial
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.4);
                doc.setTextColor(135, 85, 59);
                doc.text('MENOS RUIDO · RASTREADOR DE HÁBITOS', M, M + 2.5);

                doc.setFont('times', 'bold');
                doc.setFontSize(15.5);
                doc.setTextColor(20, 18, 16);
                doc.text(titleStr, M, M + 8.5);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.0);
                doc.setTextColor(70, 65, 60);
                doc.text(metaStr, W - M, M + 8.2, { align: 'right' });

                // Foco / intención del mes
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(6.8);
                doc.setTextColor(90, 85, 80);
                doc.text('"Constancia silenciosa, progreso diario y presencia"', M, M + 12.0);

                doc.setLineWidth(0.38);
                doc.setDrawColor(40, 35, 30);
                doc.line(M, M + 13.8, W - M, M + 13.8);

                const gridW = W - (M * 2);
                const habitColW = 48.0;
                const daysGridW = gridW - habitColW;
                const dayColW = daysGridW / daysInMonth;
                const gridStartY = M + 16.5;

                const footerLimitY = H - 9;
                const totalAvailH = footerLimitY - gridStartY;

                const showNotes = page.design.showNotes !== false;
                let tableTotalH = totalAvailH;
                if (showNotes) {
                    if (habitCount <= 6) tableTotalH = 50.0;
                    else if (habitCount <= 8) tableTotalH = 56.0;
                    else tableTotalH = 62.0;
                }

                const headerRowH = 4.4;
                const bodyH = tableTotalH - headerRowH;
                const rowH = bodyH / habitCount;

                // 1. Cabecera tabla de hábitos (fondo avena)
                doc.setFillColor(245, 240, 232);
                doc.setDrawColor(40, 35, 30);
                doc.setLineWidth(0.35);
                doc.rect(M, gridStartY, gridW, headerRowH, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.0);
                doc.setTextColor(45, 40, 35);
                doc.text('HÁBITO FUNDAMENTAL', M + 2.5, gridStartY + 3.1);

                doc.setFontSize(5.2);
                for (let d = 1; d <= daysInMonth; d++) {
                    const dayX = M + habitColW + ((d - 1) * dayColW);
                    doc.text(String(d), dayX + (dayColW / 2), gridStartY + 3.1, { align: 'center' });
                    if (d > 1) {
                        doc.setDrawColor(215, 210, 200);
                        doc.setLineWidth(0.18);
                        doc.line(dayX, gridStartY, dayX, gridStartY + headerRowH);
                    }
                }

                // 2. Filas de hábitos con fondos alternos suaves
                for (let i = 0; i < habitCount; i++) {
                    const rY = gridStartY + headerRowH + (i * rowH);
                    if (i % 2 === 1) {
                        doc.setFillColor(252, 250, 246);
                        doc.rect(M, rY, gridW, rowH, 'F');
                    }
                    doc.setDrawColor(225, 220, 212);
                    doc.setLineWidth(0.18);
                    doc.line(M, rY + rowH, M + gridW, rY + rowH);
                }

                // Líneas divisorias verticales entre días
                doc.setDrawColor(230, 225, 218);
                doc.setLineWidth(0.15);
                for (let d = 1; d <= daysInMonth; d++) {
                    const dayX = M + habitColW + ((d - 1) * dayColW);
                    doc.line(dayX, gridStartY + headerRowH, dayX, gridStartY + tableTotalH);
                }

                // Divisor grueso entre nombre de hábito y días
                doc.setDrawColor(40, 35, 30);
                doc.setLineWidth(0.35);
                doc.line(M + habitColW, gridStartY, M + habitColW, gridStartY + tableTotalH);
                doc.rect(M, gridStartY, gridW, tableTotalH, 'S');

                // Nombres y Casillas de los días
                const radius = Math.min(1.25, Math.max(0.85, rowH * 0.28));
                const sqSize = Math.min(2.30, Math.max(1.6, rowH * 0.50));

                for (let i = 0; i < habitCount; i++) {
                    const rY = gridStartY + headerRowH + (i * rowH);

                    for (let d = 0; d < daysInMonth; d++) {
                        const cX = M + habitColW + (d * dayColW) + (dayColW / 2);
                        const cY = rY + (rowH / 2);
                        doc.setDrawColor(165, 158, 148);
                        doc.setLineWidth(0.18);
                        if (isCircle) {
                            doc.circle(cX, cY, radius, 'S');
                        } else {
                            doc.rect(cX - (sqSize / 2), cY - (sqSize / 2), sqSize, sqSize, 'S');
                        }
                    }
                }

                // 3. Recuadro inferior de reflexión y observaciones del mes (si está activo)
                if (showNotes) {
                    const notesBoxY = gridStartY + tableTotalH + 2.8;
                    const notesBoxH = footerLimitY - notesBoxY;
                    doc.setFillColor(250, 248, 244);
                    doc.setDrawColor(220, 215, 204);
                    doc.setLineWidth(0.2);
                    doc.roundedRect(M, notesBoxY, gridW, notesBoxH, 1.5, 1.5, 'FD');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6.2);
                    doc.setTextColor(135, 85, 59);
                    doc.text('REFLEXIÓN Y OBSERVACIONES DEL MES', M + 3.5, notesBoxY + 3.8);

                    doc.setDrawColor(226, 218, 208);
                    doc.setLineWidth(0.15);
                    doc.line(M + 3, notesBoxY + 5.0, M + gridW - 3, notesBoxY + 5.0);
                }

            // 6. PLANIFICADOR SEMANAL (IDÉNTICO A GENERADOR-PLANIFICADOR-SEMANAL)
            } else if (page.type === 'weekly') {
                const weekNum = (page.weekNum !== undefined) ? page.weekNum : (page.pageIndexInSection + 1);
                const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
                const metaStr = isBlank ? `SEMANA: _____ · MES: _________` : (page.monthIndex !== undefined ? `SEMANA: ${weekNum} · ${monthNames[page.monthIndex]} ${year}` : `SEMANA: ${weekNum} · AÑO ${year}`);
                const isCircle = page.design.markerShape !== 'square';
                const hasHabits = page.design.bottomSection === 'both' || page.design.bottomSection === 'habits';
                const hasNotes = page.design.bottomSection === 'both' || page.design.bottomSection === 'notes';

                let weekDates = [];
                if (!isBlank && (year === 2026 || year === 2027)) {
                    weekDates = getWeekDates(year, weekNum);
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.0);
                doc.setTextColor(135, 85, 59);
                doc.text('MENOS RUIDO · SISTEMA DE PLANIFICACIÓN SEMANAL', M, M + 2.5);

                doc.setFont('times', 'bold');
                doc.setFontSize(16);
                doc.setTextColor(20, 18, 16);
                doc.text('Planificación Semanal', M, M + 8.5);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.0);
                doc.setTextColor(70, 65, 60);
                doc.text(metaStr, W - M, M + 8.2, { align: 'right' });

                doc.setLineWidth(0.35);
                doc.setDrawColor(30, 25, 20);
                doc.line(M, M + 10.5, W - M, M + 10.5);

                const gridW = W - (M * 2);
                const colGap = 6;
                const colW = (gridW - colGap) / 2;
                const bodyStartY = M + 13.5;
                const col1X = M;
                const col2X = M + colW + colGap;

                const hasBottom = page.design.bottomSection !== 'none';
                const normalBodyH = 73.0;
                const bottomGap = 3.2;
                const bottomH = 32.4;
                const expandedBodyH = normalBodyH + bottomGap + bottomH;
                const bodyH1 = hasBottom ? normalBodyH : expandedBodyH;
                const bodyH2 = bodyH1;

                // Marco Columna 1 (Lunes a Jueves)
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(210, 205, 198);
                doc.setLineWidth(0.25);
                doc.roundedRect(col1X, bodyStartY, colW, bodyH1, 1.5, 1.5, 'FD');

                // Marco Columna 2 (Foco + Viernes a Domingo)
                doc.roundedRect(col2X, bodyStartY, colW, bodyH2, 1.5, 1.5, 'FD');

                // --- COLUMNA 1: LUNES A JUEVES ---
                const rowH1 = bodyH1 / 4;
                ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES'].forEach((dName, idx) => {
                    const rowY = bodyStartY + (idx * rowH1);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6.8);
                    doc.setTextColor(30, 25, 20);
                    doc.text(dName, col1X + 4, rowY + 4.5);

                    // Casilla fecha
                    const boxCenterX = col1X + colW - 6.0;
                    const boxCenterY = rowY + 4.2;
                    const boxRadius = 2.6;
                    const boxSize = 5.2;

                    doc.setDrawColor(70, 65, 60);
                    doc.setLineWidth(0.22);
                    if (isCircle) {
                        doc.circle(boxCenterX, boxCenterY, boxRadius, 'S');
                    } else {
                        doc.roundedRect(boxCenterX - boxRadius, boxCenterY - boxRadius, boxSize, boxSize, 0.7, 0.7, 'S');
                    }

                    if (!isBlank && weekDates.length > idx && weekDates[idx] !== '') {
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(7.2);
                        doc.setTextColor(25, 20, 15);
                        doc.text(String(weekDates[idx]), boxCenterX, boxCenterY + 0.9, { align: 'center' });
                    }

                    if (idx < 3) {
                        doc.setDrawColor(230, 225, 218);
                        doc.setLineWidth(0.15);
                        doc.line(col1X + 3, rowY + rowH1, col1X + colW - 3, rowY + rowH1);
                    }
                });

                // --- COLUMNA 2: FOCO + VIERNES A DOMINGO ---
                const rowH2 = bodyH2 / 4;

                // Foco de la semana
                doc.setFillColor(250, 248, 245);
                doc.roundedRect(col2X, bodyStartY, colW, rowH2, 1.5, 1.5, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.8);
                doc.setTextColor(135, 85, 59);
                doc.text('FOCO DE LA SEMANA (META CLAVE)', col2X + 4, bodyStartY + 4.5);

                doc.setDrawColor(220, 215, 208);
                doc.setLineWidth(0.2);
                doc.line(col2X, bodyStartY + rowH2, col2X + colW, bodyStartY + rowH2);

                // Viernes
                const yViernes = bodyStartY + rowH2;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.8);
                doc.setTextColor(30, 25, 20);
                doc.text('VIERNES', col2X + 4, yViernes + 4.5);

                const boxCenterX_vie = col2X + colW - 6.0;
                const boxCenterY_vie = yViernes + 4.2;
                doc.setDrawColor(70, 65, 60);
                doc.setLineWidth(0.22);
                if (isCircle) {
                    doc.circle(boxCenterX_vie, boxCenterY_vie, 2.6, 'S');
                } else {
                    doc.roundedRect(boxCenterX_vie - 2.6, boxCenterY_vie - 2.6, 5.2, 5.2, 0.7, 0.7, 'S');
                }
                if (!isBlank && weekDates.length > 4 && weekDates[4] !== '') {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7.2);
                    doc.setTextColor(25, 20, 15);
                    doc.text(String(weekDates[4]), boxCenterX_vie, boxCenterY_vie + 0.9, { align: 'center' });
                }

                doc.setDrawColor(230, 225, 218);
                doc.setLineWidth(0.15);
                doc.line(col2X + 3, yViernes + rowH2, col2X + colW - 3, yViernes + rowH2);

                // Sábado & Domingo (compartiendo la mitad inferior)
                const yFinSem = yViernes + rowH2;
                const finSemH = rowH2 * 2;
                const halfW = colW / 2;

                // Sábado
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.8);
                doc.setTextColor(30, 25, 20);
                doc.text('SÁBADO', col2X + 4, yFinSem + 4.5);
                const boxCenterX_sab = col2X + halfW - 6.0;
                const boxCenterY_sab = yFinSem + 4.2;
                doc.setDrawColor(70, 65, 60);
                doc.setLineWidth(0.22);
                if (isCircle) {
                    doc.circle(boxCenterX_sab, boxCenterY_sab, 2.6, 'S');
                } else {
                    doc.roundedRect(boxCenterX_sab - 2.6, boxCenterY_sab - 2.6, 5.2, 5.2, 0.7, 0.7, 'S');
                }
                if (!isBlank && weekDates.length > 5 && weekDates[5] !== '') {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7.2);
                    doc.setTextColor(25, 20, 15);
                    doc.text(String(weekDates[5]), boxCenterX_sab, boxCenterY_sab + 0.9, { align: 'center' });
                }

                // Domingo
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.8);
                doc.setTextColor(30, 25, 20);
                doc.text('DOMINGO', col2X + halfW + 4, yFinSem + 4.5);
                const boxCenterX_dom = col2X + colW - 6.0;
                const boxCenterY_dom = yFinSem + 4.2;
                doc.setDrawColor(70, 65, 60);
                doc.setLineWidth(0.22);
                if (isCircle) {
                    doc.circle(boxCenterX_dom, boxCenterY_dom, 2.6, 'S');
                } else {
                    doc.roundedRect(boxCenterX_dom - 2.6, boxCenterY_dom - 2.6, 5.2, 5.2, 0.7, 0.7, 'S');
                }
                if (!isBlank && weekDates.length > 6 && weekDates[6] !== '') {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7.2);
                    doc.setTextColor(25, 20, 15);
                    doc.text(String(weekDates[6]), boxCenterX_dom, boxCenterY_dom + 0.9, { align: 'center' });
                }

                doc.setDrawColor(220, 215, 208);
                doc.line(col2X + halfW, yFinSem, col2X + halfW, yFinSem + finSemH);

                // --- FRANJA INFERIOR ---
                if (hasBottom) {
                    const botY = bodyStartY + normalBodyH + bottomGap;
                    if (hasHabits && hasNotes) {
                        // Bloque Hábitos (Mitad izquierda)
                        doc.setFillColor(255, 255, 255);
                        doc.setDrawColor(210, 205, 198);
                        doc.setLineWidth(0.25);
                        doc.roundedRect(col1X, botY, colW, bottomH, 1.5, 1.5, 'FD');

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.6);
                        doc.setTextColor(40, 35, 30);
                        doc.text('HÁBITOS DE LA SEMANA', col1X + 4, botY + 4.2);

                        // Cabecera L M X J V S D
                        const habitColsX = col1X + colW - 29;
                        doc.setFontSize(5.5);
                        doc.setTextColor(120, 110, 100);
                        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach((d, di) => {
                            doc.text(d, habitColsX + (di * 4.0), botY + 4.2, { align: 'center' });
                        });

                        for (let hb = 0; hb < 3; hb++) {
                            const hy = botY + 10.5 + (hb * 7.2);
                            doc.setDrawColor(150, 142, 132);
                            doc.setLineWidth(0.18);
                            ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach((d, di) => {
                                const dotX = habitColsX + (di * 4.0);
                                if (isCircle) {
                                    doc.circle(dotX, hy - 0.9, 1.35, 'S');
                                } else {
                                    doc.rect(dotX - 1.35, hy - 2.25, 2.7, 2.7, 'S');
                                }
                            });
                            if (hb < 2) {
                                doc.setDrawColor(235, 230, 222);
                                doc.setLineWidth(0.15);
                                doc.setLineDashPattern([1.0, 1.0], 0);
                                doc.line(col1X + 3, hy + 2.7, col1X + colW - 3, hy + 2.7);
                                doc.setLineDashPattern([], 0);
                            }
                        }

                        // Bloque Notas (Mitad derecha)
                        doc.setFillColor(250, 248, 245);
                        doc.roundedRect(col2X, botY, colW, bottomH, 1.5, 1.5, 'FD');
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.6);
                        doc.setTextColor(135, 85, 59);
                        doc.text('TAREAS SECUNDARIAS / NOTAS', col2X + 4, botY + 4.2);

                        doc.setDrawColor(226, 218, 208);
                        doc.setLineWidth(0.15);
                        doc.line(col2X + 3, botY + 5.5, col2X + colW - 3, botY + 5.5);
                    } else if (hasHabits && !hasNotes) {
                        // Bloque Hábitos a ancho completo (gridW)
                        doc.setFillColor(255, 255, 255);
                        doc.setDrawColor(210, 205, 198);
                        doc.setLineWidth(0.25);
                        doc.roundedRect(col1X, botY, gridW, bottomH, 1.5, 1.5, 'FD');

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.6);
                        doc.setTextColor(40, 35, 30);
                        doc.text('HÁBITOS DE LA SEMANA', col1X + 4, botY + 4.2);

                        const habitColsX = col1X + gridW - 35;
                        doc.setFontSize(5.5);
                        doc.setTextColor(120, 110, 100);
                        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach((d, di) => {
                            doc.text(d, habitColsX + (di * 4.8), botY + 4.2, { align: 'center' });
                        });

                        for (let hb = 0; hb < 3; hb++) {
                            const hy = botY + 10.5 + (hb * 7.2);
                            doc.setDrawColor(150, 142, 132);
                            doc.setLineWidth(0.18);
                            ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach((d, di) => {
                                const dotX = habitColsX + (di * 4.8);
                                if (isCircle) {
                                    doc.circle(dotX, hy - 0.9, 1.35, 'S');
                                } else {
                                    doc.rect(dotX - 1.35, hy - 2.25, 2.7, 2.7, 'S');
                                }
                            });
                            if (hb < 2) {
                                doc.setDrawColor(235, 230, 222);
                                doc.setLineWidth(0.15);
                                doc.setLineDashPattern([1.0, 1.0], 0);
                                doc.line(col1X + 3, hy + 2.7, col1X + gridW - 3, hy + 2.7);
                                doc.setLineDashPattern([], 0);
                            }
                        }
                    } else if (hasNotes && !hasHabits) {
                        // Bloque Notas a ancho completo (gridW)
                        doc.setFillColor(250, 248, 245);
                        doc.setDrawColor(210, 205, 198);
                        doc.setLineWidth(0.25);
                        doc.roundedRect(col1X, botY, gridW, bottomH, 1.5, 1.5, 'FD');

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.6);
                        doc.setTextColor(135, 85, 59);
                        doc.text('TAREAS SECUNDARIAS / NOTAS', col1X + 4, botY + 4.2);

                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(5.8);
                        doc.setTextColor(140, 130, 120);
                        doc.text('Registro libre de tareas y notas de la semana', col1X + gridW - 4, botY + 4.2, { align: 'right' });

                        doc.setDrawColor(226, 218, 208);
                        doc.setLineWidth(0.15);
                        doc.line(col1X + 3, botY + 5.5, col1X + gridW - 3, botY + 5.5);
                    }
                }

            // 7. PLANIFICADOR HORARIO (IDÉNTICO A GENERADOR-PLANIFICADOR-HORARIO-V1)
            } else if (page.type === 'hourly') {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(135, 85, 59);
                doc.text('MENOS RUIDO · ESTRUCTURA HORARIA SEMANAL', M, M + 2.5);

                doc.setFont('times', 'bold');
                doc.setFontSize(15);
                doc.setTextColor(20, 18, 16);
                doc.text('Planificador Horario Semanal', M, M + 8.5);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.0);
                doc.setTextColor(70, 65, 60);
                doc.text('SEMANA: _____ · AÑO: _____', W - M, M + 8.2, { align: 'right' });

                doc.setLineWidth(0.35);
                doc.setDrawColor(30, 25, 20);
                doc.line(M, M + 10.5, W - M, M + 10.5);

                const gridW = W - (M * 2);
                const timeColW = 22.0;
                const daysGridW = gridW - timeColW;
                const dayColW = daysGridW / 7;
                const startY = M + 13.5;

                const startHourInt = parseInt(page.design.startHour || '08', 10);
                const step = getHourlyStep(page.design.interval || '1h');
                const rowCount = page.design.rows || 12;

                const headerRowH = 4.8;
                const notesH = 16.0;
                const footerLimitY = H - 9;
                const availableTableH = (footerLimitY - notesH - 2.5) - startY;
                const rowH = (availableTableH - headerRowH) / rowCount;

                // 1. Cabecera tabla horaria
                doc.setFillColor(245, 240, 232);
                doc.setDrawColor(40, 35, 30);
                doc.setLineWidth(0.35);
                doc.rect(M, startY, gridW, headerRowH, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.8);
                doc.setTextColor(45, 40, 35);
                doc.text('HORA', M + (timeColW / 2), startY + 3.2, { align: 'center' });

                const dayNames = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
                dayNames.forEach((dName, di) => {
                    const dX = M + timeColW + (di * dayColW);
                    doc.text(dName, dX + (dayColW / 2), startY + 3.2, { align: 'center' });
                    doc.setDrawColor(215, 210, 200);
                    doc.setLineWidth(0.18);
                    doc.line(dX, startY, dX, startY + headerRowH);
                });

                // 2. Filas de horas
                // Pintar fondo de la columna de horas antes de trazar líneas para no sobreimprimir ni reducir su grosor
                doc.setFillColor(252, 250, 246);
                doc.rect(M, startY + headerRowH, timeColW, availableTableH - headerRowH, 'F');

                for (let r = 0; r < rowCount; r++) {
                    const y = startY + headerRowH + (r * rowH);
                    const hour24 = (startHourInt + (r * step)) % 24;
                    const hStr = hour24.toString().padStart(2, '0') + ':00';

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(5.4);
                    doc.setTextColor(50, 45, 40);
                    doc.text(hStr, M + (timeColW / 2), y + (rowH / 2) + 0.9, { align: 'center' });
                }

                // Líneas divisorias horizontales trazadas de forma continua con grosor 100% idéntico en toda la fila
                doc.setDrawColor(225, 220, 212);
                doc.setLineWidth(0.18);
                for (let r = 0; r < rowCount; r++) {
                    const y = startY + headerRowH + (r * rowH);
                    doc.line(M, y + rowH, M + gridW, y + rowH);
                }

                // Líneas verticales de días
                doc.setDrawColor(225, 220, 212);
                doc.setLineWidth(0.18);
                for (let di = 0; di < 7; di++) {
                    const dX = M + timeColW + (di * dayColW);
                    doc.line(dX, startY + headerRowH, dX, startY + availableTableH);
                }

                // Divisor grueso entre hora y cuadrícula
                doc.setDrawColor(40, 35, 30);
                doc.setLineWidth(0.35);
                doc.line(M + timeColW, startY, M + timeColW, startY + availableTableH);
                doc.rect(M, startY, gridW, availableTableH, 'S');

                // 3. Recuadro inferior de notas y prioridades
                const botNotesY = startY + availableTableH + 2.5;
                doc.setFillColor(251, 249, 245);
                doc.setDrawColor(220, 215, 205);
                doc.setLineWidth(0.2);
                doc.roundedRect(M, botNotesY, gridW, notesH, 1.5, 1.5, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.2);
                doc.setTextColor(135, 85, 59);
                doc.text('NOTAS Y PRIORIDADES DE LA SEMANA', M + 3.5, botNotesY + 3.8);

                doc.setDrawColor(226, 218, 208);
                doc.setLineWidth(0.15);
                doc.line(M + 3, botNotesY + 5.0, M + gridW - 3, botNotesY + 5.0);

            // 8. BITÁCORA DIARIA (ESTÁNDAR EDITORIAL MENOS RUIDO: FORMAL, MICRO-MARCOS, ESPACIO LIMPIO)
            } else if (page.type === 'daily') {
                const dayInfo = getDailyDateInfo(year, page.pageIndexInSection, isBlank);
                const isCircle = page.design.markerShape !== 'square';

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(135, 85, 59);
                doc.text(dayInfo.kicker, M, M + 2.5);

                doc.setFont('times', 'bold');
                doc.setFontSize(15.5);
                doc.setTextColor(20, 18, 16);
                doc.text(dayInfo.title, M, M + 8.5);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.0);
                doc.setTextColor(70, 65, 60);
                doc.text(dayInfo.meta, W - M, M + 8.2, { align: 'right' });

                doc.setLineWidth(0.35);
                doc.setDrawColor(30, 25, 20);
                doc.line(M, M + 10.5, W - M, M + 10.5);

                const gridW = W - (M * 2);
                const colGap = 6.5;
                const startY = M + 13.5;
                const gapY = 2.5;
                const totalH = (H - 9) - startY;

                const markerShape = page.design.markerShape || 'circle';
                const showPriority = page.design.showPriority !== false;
                const showSecondary = page.design.showSecondary !== false;
                const showHabits = page.design.showHabits !== false;
                const showNotes = page.design.showNotes !== false;
                const showReflection = page.design.showReflection !== false;

                const hasCol1 = showPriority || showSecondary || showHabits;
                const hasCol2 = showNotes || showReflection;

                let colW = gridW;
                let col1X = M;
                let col2X = M;
                if (hasCol1 && hasCol2) {
                    colW = (gridW - colGap) / 2;
                    col1X = M;
                    col2X = M + colW + colGap;
                }

                // --- COLUMNA 1: PRIORIDAD, SECUNDARIAS, HÁBITOS ---
                if (hasCol1) {
                    const col1Items = [];
                    if (showPriority) col1Items.push({ id: 'priority', baseH: 29.0 });
                    if (showSecondary) col1Items.push({ id: 'secondary', baseH: 43.0 });
                    if (showHabits) col1Items.push({ id: 'habits', baseH: 39.5 });

                    const totalBaseH = col1Items.reduce((acc, it) => acc + it.baseH, 0);
                    const availH1 = totalH - (gapY * (col1Items.length - 1));

                    let curY = startY;
                    col1Items.forEach(item => {
                        const h = (item.baseH / totalBaseH) * availH1;

                        if (item.id === 'priority') {
                            doc.setFillColor(250, 248, 245);
                            doc.setDrawColor(35, 30, 25);
                            doc.setLineWidth(0.35);
                            doc.roundedRect(col1X, curY, colW, h, 1.5, 1.5, 'FD');

                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(6.8);
                            doc.setTextColor(135, 85, 59);
                            doc.text('LA GRAN PRIORIDAD DEL DÍA', col1X + 4, curY + 4.8);

                            doc.setFont('times', 'italic');
                            doc.setFontSize(6.2);
                            doc.setTextColor(110, 100, 90);
                            doc.text('(Innegociable)', col1X + 44, curY + 4.8);

                            if (markerShape === 'circle') {
                                doc.setDrawColor(35, 30, 25);
                                doc.setLineWidth(0.35);
                                doc.circle(col1X + colW - 6.5, curY + 4.5, 2.2, 'S');
                            } else if (markerShape === 'square') {
                                doc.setDrawColor(35, 30, 25);
                                doc.setLineWidth(0.35);
                                doc.roundedRect(col1X + colW - 8.5, curY + 2.5, 4.2, 4.2, 0.6, 0.6, 'S');
                            }
                        } else if (item.id === 'secondary') {
                            doc.setFillColor(255, 255, 255);
                            doc.setDrawColor(210, 204, 195);
                            doc.setLineWidth(0.22);
                            doc.roundedRect(col1X, curY, colW, h, 1.5, 1.5, 'FD');

                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(6.6);
                            doc.setTextColor(40, 35, 30);
                            doc.text('TAREAS SECUNDARIAS', col1X + 4, curY + 4.6);

                            doc.setFont('times', 'italic');
                            doc.setFontSize(6.0);
                            doc.setTextColor(120, 110, 100);
                            doc.text('(Máximo 3 tareas de soporte)', col1X + 37, curY + 4.6);

                            doc.setDrawColor(230, 224, 216);
                            doc.setLineWidth(0.15);
                            doc.line(col1X + 3.5, curY + 6.2, col1X + colW - 3.5, curY + 6.2);

                            const secStep = (h - 8.5) / 3;
                            for (let k = 0; k < 3; k++) {
                                const rowY = curY + 8.5 + (k * secStep) + (secStep / 2);
                                if (markerShape === 'circle') {
                                    doc.setDrawColor(80, 72, 65);
                                    doc.setLineWidth(0.32);
                                    doc.circle(col1X + 6.5, rowY, 1.9, 'S');
                                } else if (markerShape === 'square') {
                                    doc.setDrawColor(80, 72, 65);
                                    doc.setLineWidth(0.32);
                                    doc.roundedRect(col1X + 4.8, rowY - 1.9, 3.8, 3.8, 0.6, 0.6, 'S');
                                }
                                if (k < 2) {
                                    doc.setDrawColor(235, 230, 222);
                                    doc.setLineWidth(0.15);
                                    doc.setLineDashPattern([1.0, 1.0], 0);
                                    const divY = curY + 8.5 + ((k + 1) * secStep);
                                    doc.line(col1X + 3.5, divY, col1X + colW - 3.5, divY);
                                    doc.setLineDashPattern([], 0);
                                }
                            }
                        } else if (item.id === 'habits') {
                            doc.setFillColor(250, 248, 245);
                            doc.setDrawColor(215, 208, 198);
                            doc.setLineWidth(0.22);
                            doc.roundedRect(col1X, curY, colW, h, 1.5, 1.5, 'FD');

                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(6.6);
                            doc.setTextColor(40, 35, 30);
                            doc.text('HÁBITOS CLAVE DEL DÍA', col1X + 4, curY + 4.6);

                            doc.setFont('times', 'italic');
                            doc.setFontSize(6.0);
                            doc.setTextColor(120, 110, 100);
                            doc.text('(Constancia diaria)', col1X + 41, curY + 4.6);

                            doc.setDrawColor(230, 224, 216);
                            doc.setLineWidth(0.15);
                            doc.line(col1X + 3.5, curY + 6.2, col1X + colW - 3.5, curY + 6.2);

                            const habStep = (h - 8.5) / 3;
                            for (let k = 0; k < 3; k++) {
                                const rowY = curY + 8.5 + (k * habStep) + (habStep / 2);
                                if (markerShape === 'circle') {
                                    doc.setDrawColor(80, 72, 65);
                                    doc.setLineWidth(0.32);
                                    doc.circle(col1X + 6.5, rowY, 1.9, 'S');
                                } else if (markerShape === 'square') {
                                    doc.setDrawColor(80, 72, 65);
                                    doc.setLineWidth(0.32);
                                    doc.roundedRect(col1X + 4.8, rowY - 1.9, 3.8, 3.8, 0.6, 0.6, 'S');
                                }
                                if (k < 2) {
                                    doc.setDrawColor(235, 230, 222);
                                    doc.setLineWidth(0.15);
                                    doc.setLineDashPattern([1.0, 1.0], 0);
                                    const divY = curY + 8.5 + ((k + 1) * habStep);
                                    doc.line(col1X + 3.5, divY, col1X + colW - 3.5, divY);
                                    doc.setLineDashPattern([], 0);
                                }
                            }
                        }

                        curY += h + gapY;
                    });
                }

                // --- COLUMNA 2: DESCARGA MENTAL Y REFLEXIÓN NOCTURNA ---
                if (hasCol2) {
                    let mentalBoxH = totalH;
                    let nightBoxH = totalH;
                    let nightBoxY = startY;

                    if (showNotes && showReflection) {
                        mentalBoxH = (totalH - gapY) * 0.62;
                        nightBoxH = totalH - mentalBoxH - gapY;
                        nightBoxY = startY + mentalBoxH + gapY;
                    }

                    if (showNotes) {
                        doc.setFillColor(255, 255, 255);
                        doc.setDrawColor(210, 204, 195);
                        doc.setLineWidth(0.22);
                        doc.roundedRect(col2X, startY, colW, mentalBoxH, 1.5, 1.5, 'FD');

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.6);
                        doc.setTextColor(40, 35, 30);
                        doc.text('DESCARGA MENTAL & NOTAS RÁPIDAS', col2X + 4, startY + 4.6);

                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(5.6);
                        doc.setTextColor(130, 120, 110);
                        doc.text('Captura libre sin filtros', col2X + colW - 4, startY + 4.6, { align: 'right' });

                        doc.setDrawColor(230, 224, 216);
                        doc.setLineWidth(0.15);
                        doc.line(col2X + 3.5, startY + 6.2, col2X + colW - 3.5, startY + 6.2);
                    }

                    if (showReflection) {
                        doc.setFillColor(250, 248, 244);
                        doc.setDrawColor(218, 210, 198);
                        doc.setLineWidth(0.22);
                        doc.roundedRect(col2X, nightBoxY, colW, nightBoxH, 1.5, 1.5, 'FD');

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(6.6);
                        doc.setTextColor(135, 85, 59);
                        doc.text('REFLEXIÓN DE CIERRE NOCTURNO', col2X + 4, nightBoxY + 4.6);

                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(5.6);
                        doc.setTextColor(130, 120, 110);
                        doc.text('Balance y calma', col2X + colW - 4, nightBoxY + 4.6, { align: 'right' });

                        doc.setDrawColor(230, 224, 216);
                        doc.setLineWidth(0.15);
                        doc.line(col2X + 3.5, nightBoxY + 6.2, col2X + colW - 3.5, nightBoxY + 6.2);
                    }
                }

            // 9. PÁGINA DE NOTAS (PUNTOS, CUADRITOS, LÍNEAS O BLANCO)
            } else if (page.type === 'notes') {
                const gridStyle = page.design.gridStyle || 'dots';
                let metaLabel = 'PUNTOS · 5 MM';
                if (gridStyle === 'squares') metaLabel = 'CUADRÍCULA · 5 MM';
                else if (gridStyle === 'lines') metaLabel = 'RENGLONES · 7 MM';
                else if (gridStyle === 'blank') metaLabel = 'PAPEL LISO · BLANCO';

                doc.setFont('times', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(25, 22, 19);
                doc.text('Notas', M, M + 4);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(135, 85, 59);
                doc.text(metaLabel, W - M, M + 4, { align: 'right' });

                doc.setLineWidth(0.4);
                doc.setDrawColor(30, 25, 20);
                doc.line(M, M + 6, W - M, M + 6);

                const startX = M + 2;
                const startY = M + 12;
                const endX = W - M - 2;
                const endY = H - M - 6;

                if (gridStyle === 'dots') {
                    doc.setFillColor(140, 130, 120);
                    for (let y = startY; y <= endY; y += 5) {
                        for (let x = startX; x <= endX; x += 5) {
                            doc.circle(x, y, 0.25, 'F');
                        }
                    }
                } else if (gridStyle === 'squares') {
                    doc.setDrawColor(220, 214, 204);
                    doc.setLineWidth(0.18);
                    // Líneas verticales
                    for (let x = startX; x <= endX; x += 5) {
                        doc.line(x, startY, x, endY);
                    }
                    // Líneas horizontales
                    for (let y = startY; y <= endY; y += 5) {
                        doc.line(startX, y, endX, y);
                    }
                } else if (gridStyle === 'lines') {
                    doc.setDrawColor(215, 208, 198);
                    doc.setLineWidth(0.2);
                    for (let y = startY; y <= endY; y += 7) {
                        doc.line(startX, y, endX, y);
                    }
                }
                // Si gridStyle === 'blank', no dibujamos tramas para dejar el papel liso

            // 10. PÁGINA FINAL INSTITUCIONAL DE GRATITUD (ESTILO OFICIAL MENOS RUIDO)
            } else if (page.type === 'gratitude') {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.2);
                doc.setTextColor(135, 85, 59);
                doc.text('EDITORIAL MENOS RUIDO · CIERRE', W / 2, M + 12, { align: 'center' });

                doc.setFont('times', 'bold');
                doc.setFontSize(20);
                doc.setTextColor(25, 22, 19);
                doc.text('Tu espacio en papel empieza aquí', W / 2, M + 23, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.8);
                doc.setTextColor(55, 48, 42);
                const pWidth = 146;

                const p1 = 'Gracias por diseñar tu propio planificador en papel. Un cuaderno solo cobra sentido cuando lo abres cada día, ordenas tus ideas y decides con calma qué merece tu atención.';
                const p1Lines = doc.splitTextToSize(p1, pWidth);
                doc.text(p1Lines, W / 2, M + 34, { align: 'center' });

                const p2 = 'Cada página que has elegido —tus semanas, hábitos, notas o bloques diarios— está pensada para ayudarte a reducir el ruido mental, avanzar con constancia y cuidar tu tiempo sin distracciones.';
                const p2Lines = doc.splitTextToSize(p2, pWidth);
                doc.text(p2Lines, W / 2, M + 50, { align: 'center' });

                const p3 = 'Cuando quieras volver a ajustar secciones, crear un nuevo ciclo o diseñar otro cuaderno a medida, te esperamos siempre en www.editorialmenosruido.com.';
                const p3Lines = doc.splitTextToSize(p3, pWidth);
                doc.text(p3Lines, W / 2, M + 67, { align: 'center' });

                // Separador y cierre
                doc.setDrawColor(215, 205, 190);
                doc.setLineWidth(0.3);
                doc.line((W / 2) - 25, M + 80, (W / 2) + 25, M + 80);

                doc.setFont('times', 'italic');
                doc.setFontSize(9.0);
                doc.setTextColor(35, 30, 25);
                const pCierre = '"Menos ruido, más claridad. Una prioridad real cada día basta para cambiar el rumbo de tus semanas."';
                const pCierreLines = doc.splitTextToSize(pCierre, 140);
                doc.text(pCierreLines, W / 2, M + 88, { align: 'center' });
            }
        }


  function getActivePresetKey() { return bookConfig.presetKey || (bookConfig.layoutMode === 'alterno' ? 'alterno' : 'libre'); }
        // TEXTOS EDITORIALES PERSONALIZADOS PARA CADA UNO DE LOS 7 LIBROS
        const editorialPageData = {
            anual: {
                title: 'La arquitectura de un año deliberado',
                quote: '«No conquistamos el año en un solo día, sino cada jornada con serenidad y propósito.»',
                p1: 'Un año entero por delante puede parecer un abismo de compromisos o un lienzo fértil. Vivimos abrumados por la inmediatez digital, saltando de urgencia en urgencia sin perspectiva de largo plazo. Este planificador anual nace para devolverte la visión panorámica: ver las 52 semanas y los 12 meses como un camino continuo y comprensible.',
                p2: 'Al plasmar tus metas y hábitos en papel, transformas las intenciones abstractas en un ritmo tangible. No se trata de sobrecargar cada jornada con tareas infinitas, sino de construir un rumbo claro donde cada semana sume en la misma dirección sin perder la calma.',
                boxTitle: 'LOS TRES PRINCIPIOS DEL PLANIFICADOR ANUAL',
                principles: [
                    { bold: '1. Perspectiva panorámica:', text: 'Mirar el año en su conjunto te enseña a dosificar energías y decir que no a lo intrascendente.' },
                    { bold: '2. Hábitos como ancla:', text: 'Los grandes logros anuales no son fruto de arrebatos, sino de pequeñas rutinas diarias sostenidas en el tiempo.' },
                    { bold: '3. Flexibilidad compasiva:', text: 'El año tendrá imprevistos; planificar en papel no busca la rigidez, sino darte un eje al que regresar.' }
                ],
                footer: 'Este cuaderno es tu mapa anual: un año entero vivido con menos ruido y más intención.'
            },
            alterno: {
                title: 'El ritmo natural de los ciclos mensuales',
                quote: '«Dividir el viaje en etapas alcanzables convierte la incertidumbre en progreso constante.»',
                p1: 'Afrontar un año entero en un solo bloque a menudo genera saturación mental. El método intercalado está concebido para trabajar en ciclos naturales: cerrar un mes con su evaluación y hábitos, y abrir el siguiente con la mente despejada y las prioridades ordenadas.',
                p2: 'Tener el mes, su rastreador de hábitos, sus semanas y sus días encadenados en una misma secuencia elimina el vaivén de hojas sueltas. Te acompaña paso a paso en el presente, permitiéndote reflexionar al final de cada ciclo antes de iniciar el siguiente.',
                boxTitle: 'LOS TRES PRINCIPIOS DEL MÉTODO INTERCALADO',
                principles: [
                    { bold: '1. Secuencia cronológica continua:', text: 'Todo lo que necesitas para tu ciclo mensual vive en orden correlativo, facilitando el enfoque día a día.' },
                    { bold: '2. Cierre y apertura deliberados:', text: 'Cada fin de mes es una pausa para agradecer, aprender y calibrar los hábitos del mes entrante.' },
                    { bold: '3. Una mente sin saturación:', text: 'Al concentrarte solo en el ciclo activo, liberas espacio mental y reduces la ansiedad del futuro.' }
                ],
                footer: 'Un ciclo a la vez, una página a la vez: tu año organizado con armonía y claridad.'
            },
            trimestre: {
                title: 'El poder de un trimestre de enfoque absoluto',
                quote: '«Noventa días son suficientes para transformar un proyecto; un solo día basta para perder el foco.»',
                p1: 'Doce meses es un horizonte demasiado lejano para sostener la urgencia y la motivación. En 90 días, en cambio, la meta es nítida, la energía se concentra y cada semana cuenta de forma visible. Este cuaderno de 90 días está diseñado para ejecutar con precisión lo verdaderamente esencial.',
                p2: 'Aquí la regla de oro es la renuncia inteligente: elegir una única prioridad estratégica para el trimestre y desgranarla en pequeñas victorias diarias. Al eliminar el ruido de las listas interminables, tu atención converge en lo que genera impacto real.',
                boxTitle: 'LOS TRES PRINCIPIOS DE LOS 90 DÍAS',
                principles: [
                    { bold: '1. Una sola prioridad clave:', text: 'El trimestre fracasa cuando intentas abarcarlo todo. Elige una meta maestra y protégela a diario.' },
                    { bold: '2. La regla del 1% diario:', text: '90 días de avance disciplinado producen un salto compuesto extraordinario sin agotarte.' },
                    { bold: '3. Revisión semanal honesta:', text: 'Trece semanas para medir lo aprendido, ajustar desvíos y celebrar los avances tangibles.' }
                ],
                footer: 'Noventa días para materializar lo importante: menos dispersión, máxima profundidad.'
            },
            semestre: {
                title: 'El equilibrio entre visión semestral y presencia diaria',
                quote: '«Seis meses proporcionan la distancia justa para ver madurar las decisiones profundas.»',
                p1: 'Medio año es el período óptimo para proyectos que requieren tiempo de maduración, aprendizaje y consolidación de hábitos. Seis meses ofrecen la calma necesaria para no apresurarse, junto con la estructura para no postergar lo relevante.',
                p2: 'Con 26 semanas y 180 jornadas de atención plena, este planificador semestral crea un puente entre la ambición estratégica y la serenidad cotidiana. Escribir a mano cada mañana te devuelve el mando de tu tiempo antes de que empiece la inercia del día.',
                boxTitle: 'LOS TRES PRINCIPIOS DEL PLANIFICADOR SEMESTRAL',
                principles: [
                    { bold: '1. Tiempo para madurar:', text: 'Proyectos profundos, hábitos de fondo o giros personales florecen en un ciclo de 180 días.' },
                    { bold: '2. Ritmo sostenible:', text: 'Evita el desgaste de las prisas. La constancia calmada rinde más que la urgencia caótica.' },
                    { bold: '3. Claridad acumulada:', text: 'Documentar tus progresos a lo largo de 26 semanas deja un testimonio vivo de tu evolución.' }
                ],
                footer: 'Seis meses de dedicación consciente: el espacio idóneo para transformar tus ideas en realidad.'
            },
            semanal: {
                title: 'La semana como unidad fundamental de vida',
                quote: '«Quien sabe gobernar su semana, aprende a adueñarse de su destino.»',
                p1: 'El día es demasiado breve para proyectos de calado y el mes resulta demasiado amplio para el día a día. La semana es la medida perfecta de la vida: siete días con ritmo propio, desde el arranque del lunes hasta el descanso del domingo.',
                p2: 'Este planificador semanal te permite observar tus compromisos con perspectiva sin caer en el microdetalle asfixiante. Distribuir las tareas a lo largo de los días te enseña a ser realista con tu energía, protegiendo bloques de silencio y tiempo de calidad.',
                boxTitle: 'LOS TRES PRINCIPIOS DE LA PLANIFICACIÓN SEMANAL',
                principles: [
                    { bold: '1. Carga realista:', text: 'Si un día está lleno, no cargues el siguiente; aprende a espaciar tus compromisos con cordura.' },
                    { bold: '2. Hábitos transversales:', text: 'Seguir tus hábitos día a día durante la semana te mantiene conectado con tu bienestar integral.' },
                    { bold: '3. El domingo de perspectiva:', text: 'Mirar la semana entrante con lápiz en mano disuelve la ansiedad de los lunes.' }
                ],
                footer: 'Cincuenta y dos semanas deliberadas: sencillez, espacio libre y serenidad mental.'
            },
            bitacora30: {
                title: 'La verdad de un solo día vivido con presencia',
                quote: '«La vida no sucede en los planes futuros, sino en el espacio exacto de hoy.»',
                p1: 'Cuando la mente se siente saturada por exceso de ruido digital, lo más sabio es reducir la escala. Este cuaderno diario te invita a prescindir de la ansiedad por el largo plazo y enfocar toda tu presencia en las horas que tienes por delante hoy.',
                p2: 'Cada página diaria es un ritual de inicio y de cierre: definir la tarea que hará que el día valga la pena, gestionar las secundarias con sobriedad y dedicar un espacio al final a la introspección y la gratitud sincera.',
                boxTitle: 'LOS TRES PRINCIPIOS DEL ENFOQUE DIARIO',
                principles: [
                    { bold: '1. La tarea innegociable:', text: 'Identifica la acción nuclear del día. Todo lo demás es accesorio o postergable.' },
                    { bold: '2. Descarga sobre el papel:', text: 'Vaciar las preocupaciones de la mente a la hoja reduce el estrés y agiliza tus decisiones.' },
                    { bold: '3. Reflexión de cierre:', text: 'Terminar la jornada anotando qué funcionó y qué soltar te permite descansar en paz.' }
                ],
                footer: 'Un día a la vez: recuperar la soberanía de tu tiempo desde la primera hora de la mañana.'
            },
            libre: {
                title: 'Escribir a mano para pensar con calma',
                quote: '«El silencio no es la ausencia de sonido, sino la presencia de claridad.»',
                p1: 'Vivimos inmersos en una sobreestimulación permanente. Avisos constantes, listas infinitas y una velocidad artificial que fragmenta nuestra atención y agota la serenidad. En Menos Ruido creamos papelería analógica para quienes necesitan detener la inercia, tomar distancia y reconectar con su propio criterio.',
                p2: 'El papel impone un ritmo humano. Al escribir a mano en un cuaderno diseñado a tu medida, no puedes abrir otra pestaña ni acelerar el tiempo; la fricción natural del lápiz sobre la página te obliga a ordenar las ideas, jerarquizar lo valioso y soltar lo superfluo.',
                boxTitle: 'LOS TRES PRINCIPIOS DE MENOS RUIDO',
                principles: [
                    { bold: '1. Un solo foco cada vez:', text: 'Si persigues más de tres prioridades a la vez, no tienes ninguna. El foco verdadero exige renuncia consciente.' },
                    { bold: '2. La fricción analógica:', text: 'Escribir a mano frena la impulsividad y convierte el pensamiento difuso en compromiso visible.' },
                    { bold: '3. Constancia sobre velocidad:', text: 'Un pequeño paso deliberado cada día construye una vida con sentido y serenidad.' }
                ],
                footer: 'Este cuaderno es tu territorio soberano: menos ruido exterior, más presencia interior.'
            }
        };
        function getEditorialPageData(presetKey) {
            return editorialPageData[presetKey] || editorialPageData.libre;
        }

        function getBookIndexSummaryEntries() {
            const total = generatedPageList.length;
            if (total === 0) return [];

            const entries = [];
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

            if (bookConfig.layoutMode === 'alterno') {
                // En modo alterno agrupamos por apertura, visión anual, ciclos mensuales consolidados y bloques finales
                let curOpening = null;
                let curCal = null;
                let curAnnual = null;
                const monthCycles = {}; // key: monthIndex -> { startPage, endPage, hasHabits, hasWeeks, hasDaily }
                let curHourly = null;
                let curNotes = null;
                let curGratitude = null;

                generatedPageList.forEach((pg, idx) => {
                    const pageNum = idx + 1;
                    if (pg.type === 'cover' || pg.type === 'editorial' || pg.type === 'index') {
                        if (!curOpening) curOpening = { label: 'Apertura Editorial', startPage: pageNum, endPage: pageNum };
                        else curOpening.endPage = pageNum;
                    } else if (pg.type === 'calendar') {
                        if (!curCal) curCal = { label: `Calendario Anual (${pg.calendarYear || bookConfig.year})`, startPage: pageNum, endPage: pageNum };
                        else curCal.endPage = pageNum;
                    } else if (pg.type === 'annual') {
                        if (!curAnnual) curAnnual = { label: 'Planificador Anual Estratégico', startPage: pageNum, endPage: pageNum };
                        else curAnnual.endPage = pageNum;
                    } else if (pg.type === 'monthly' || pg.type === 'habits' || pg.type === 'weekly' || pg.type === 'daily') {
                        const mIdx = pg.monthIndex !== undefined ? pg.monthIndex : (pg.cycleMonthIndex !== undefined ? pg.cycleMonthIndex : Math.floor(idx / 10));
                        if (!monthCycles[mIdx]) {
                            monthCycles[mIdx] = {
                                monthIndex: mIdx,
                                startPage: pageNum,
                                endPage: pageNum,
                                hasHabits: pg.type === 'habits',
                                hasWeeks: pg.type === 'weekly',
                                hasDaily: pg.type === 'daily'
                            };
                        } else {
                            monthCycles[mIdx].endPage = pageNum;
                            if (pg.type === 'habits') monthCycles[mIdx].hasHabits = true;
                            if (pg.type === 'weekly') monthCycles[mIdx].hasWeeks = true;
                            if (pg.type === 'daily') monthCycles[mIdx].hasDaily = true;
                        }
                    } else if (pg.type === 'hourly') {
                        if (!curHourly) curHourly = { label: 'Planificador Horario Semanal', startPage: pageNum, endPage: pageNum };
                        else curHourly.endPage = pageNum;
                    } else if (pg.type === 'notes') {
                        if (!curNotes) curNotes = { label: 'Cuaderno de Notas & Reflexión Libre', startPage: pageNum, endPage: pageNum };
                        else curNotes.endPage = pageNum;
                    } else if (pg.type === 'gratitude') {
                        if (!curGratitude) curGratitude = { label: 'Cierre & Gratitud Editorial', startPage: pageNum, endPage: pageNum };
                        else curGratitude.endPage = pageNum;
                    }
                });

                if (curOpening) entries.push(curOpening);
                if (curCal) entries.push(curCal);
                if (curAnnual) entries.push(curAnnual);

                const cycleKeys = Object.keys(monthCycles).map(Number).sort((a,b) => a - b);
                cycleKeys.forEach(mIdx => {
                    const c = monthCycles[mIdx];
                    const mName = monthNames[mIdx % 12] || `Mes ${mIdx + 1}`;
                    let parts = ['Mes'];
                    if (c.hasHabits) parts.push('Hábitos');
                    if (c.hasWeeks) parts.push('Semanas');
                    if (c.hasDaily) parts.push('Días');
                    const subStr = parts.length > 1 ? ` (${parts.join(', ')})` : '';
                    entries.push({
                        label: `Ciclo ${mName}${subStr}`,
                        startPage: c.startPage,
                        endPage: c.endPage
                    });
                });

                if (curHourly) entries.push(curHourly);
                if (curNotes) entries.push(curNotes);
                if (curGratitude) entries.push(curGratitude);

            } else {
                // En modo bloques continuos agrupamos por grandes secciones para un sumario ejecutivo limpio
                let lastType = null;
                let curEntry = null;

                generatedPageList.forEach((pg, idx) => {
                    const pageNum = idx + 1;
                    let typeKey = pg.type;
                    let label = pg.sectionName;

                    if (pg.type === 'cover' || pg.type === 'editorial' || pg.type === 'index') {
                        typeKey = 'opening';
                        label = 'Apertura Editorial';
                    } else if (pg.type === 'calendar') {
                        typeKey = 'calendar';
                        label = `Calendarios Anuales (${bookConfig.year})`;
                    } else if (pg.type === 'annual') {
                        typeKey = 'annual';
                        label = 'Planificador Anual Estratégico (Trimestres)';
                    } else if (pg.type === 'monthly') {
                        typeKey = 'monthly_all';
                        label = `Planificador Mensual (${pg.totalPagesInSection || 12} Meses)`;
                    } else if (pg.type === 'habits') {
                        typeKey = 'habits_all';
                        label = `Rastreador de Hábitos (${pg.totalPagesInSection || 12} Meses)`;
                    } else if (pg.type === 'weekly') {
                        typeKey = 'weekly_all';
                        label = `Planificación Semanal (${pg.totalPagesInSection || 52} Semanas)`;
                    } else if (pg.type === 'hourly') {
                        typeKey = 'hourly_all';
                        label = `Planificador Horario Semanal`;
                    } else if (pg.type === 'daily') {
                        typeKey = 'daily_all';
                        label = `Bitácoras Diarias de Introspección`;
                    } else if (pg.type === 'notes') {
                        typeKey = 'notes_all';
                        label = `Cuaderno de Notas & Reflexión Libre`;
                    } else if (pg.type === 'gratitude') {
                        typeKey = 'gratitude';
                        label = `Cierre & Gratitud Editorial`;
                    }

                    if (typeKey === lastType && curEntry) {
                        curEntry.endPage = pageNum;
                    } else {
                        if (curEntry) entries.push(curEntry);
                        curEntry = {
                            key: typeKey,
                            label: label,
                            startPage: pageNum,
                            endPage: pageNum
                        };
                        lastType = typeKey;
                    }
                });
                if (curEntry) entries.push(curEntry);
            }

            return entries;
        }
        function getISOWeek(yearOrDate, month, day) {
            let date;
            if (yearOrDate instanceof Date) {
                date = yearOrDate;
            } else if (typeof yearOrDate === 'number') {
                date = new Date(yearOrDate, month !== undefined ? month : 0, day !== undefined ? day : 1);
            } else {
                date = new Date();
            }
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        }
        function getWeekDates(year, weekNum) {
            const jan4 = new Date(year, 0, 4);
            const mon1 = new Date(jan4);
            mon1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
            const weekMon = new Date(mon1);
            weekMon.setDate(mon1.getDate() + (weekNum - 1) * 7);
            return Array.from({length: 7}, (_, i) => {
                const d = new Date(weekMon);
                d.setDate(weekMon.getDate() + i);
                return d.getDate();
            });
        }
        function getDailyDateInfo(year, pageIndex, isBlank) {
            if (isBlank) {
                return {
                    title: "Planificador Diario",
                    kicker: "MENOS RUIDO · PLANIFICADOR DIARIO",
                    meta: "FECHA: ________________",
                    dayDisplay: ""
                };
            }
            const d = new Date(year, 0, 1);
            d.setDate(d.getDate() + (pageIndex || 0));
            const weekdays = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
            const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
            const dayNumInMonth = d.getDate();
            const weekdayName = weekdays[d.getDay()];
            const monthName = months[d.getMonth()];
            const capWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);
            const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            const dateStr = `Día ${dayNumInMonth}, ${capWeekday} de ${capMonth}`;
            return {
                title: "Planificador Diario",
                kicker: "MENOS RUIDO · PLANIFICADOR DIARIO",
                meta: dateStr,
                dayDisplay: dateStr
            };
        }
        function getHourlyStep(interval) {
            if (interval === '2h') return 2;
            if (interval === '3h') return 3;
            if (interval === '4h') return 4;
            if (interval === '6h') return 6;
            return 1;
        }
  recalcPages();
  const total = generatedPageList.length;
  const W = 209.55;
  const H = 152.4;
  const M = 12.5;
  const doc = new JsPdfCompat({ orientation: 'landscape', format: [W, H], compress: true });

  for (let i = 0; i < total; i++) {
    if (i > 0) doc.addPage([W, H], 'landscape');
    drawPdfPageExact(doc, generatedPageList[i], i + 1, total, W, H, M, false);
  }

  const buffer = await doc.toBuffer();
  return { buffer, pageCount: total };
}
