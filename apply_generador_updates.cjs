const fs = require('fs');
const path = require('path');

console.log('--- ACTUALIZANDO GENERADORES EN LA WEB ---');

// 1. ACTUALIZAR index.html
const indexPath = path.resolve(__dirname, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

const oldGeneradoresRegex = /<!-- 5\. GENERADORES WEB INTERACTIVOS -->[\s\S]*?<\/section>/;
const newGeneradoresHtml = `<!-- 5. GENERADORES WEB INTERACTIVOS -->
        <section id="generadores" class="section" style="background: #faf8f5; padding: 50px 0; border-top: 1px solid rgba(0,0,0,0.06); border-bottom: 1px solid rgba(0,0,0,0.06);">
            <div class="container" style="max-width: 1040px;">
                <div class="section-header" style="text-align: center; max-width: 740px; margin: 0 auto 35px;">
                    <span class="badge" style="background: rgba(135, 85, 59, 0.1); color: var(--color-accent); font-weight: 600; padding: 4px 14px; border-radius: 20px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 0.8rem;">Herramientas Gratuitas</span>
                    <h2>Generadores Web para Pensar en Papel</h2>
                    <p>Diseña tu plantilla personalizada en el navegador, escribe tus bloques de tareas prioritarias y genera tu propio PDF listo para imprimir en casa.</p>
                </div>

                <div style="max-width: 740px; margin: 0 auto;">
                    <!-- Tarjeta Destacada: Planificador Semanal -->
                    <div class="feature-card" style="border-top: 4px solid var(--color-accent); background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.06);">
                        <a href="/generador-planificador-semanal.html" style="display: block; overflow: hidden; border-radius: 8px; margin-bottom: 1.25rem; border: 1px solid rgba(0,0,0,0.06);">
                            <img src="/images/tutorial-semanal/captura-web-planificador-completo.png" alt="Generador Semanal Web" style="width: 100%; height: auto; display: block;" loading="lazy">
                        </a>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 8px;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-accent); text-transform: uppercase; letter-spacing: 1px;">Plantilla Interactiva Gratuita</span>
                            <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 10px; border-radius: 12px; background: #eaf5ee; color: #2b7a4b;">Disponible gratis</span>
                        </div>
                        
                        <h3 style="font-family: 'Playfair Display', serif; font-size: 1.6rem; margin: 0 0 0.6rem 0; color: #1a1715;">Planificador Semanal</h3>
                        <p style="font-size: 0.98rem; color: #555; line-height: 1.6; margin-bottom: 1.25rem;">Estructura horizontal de escritorio para coordinar tus 7 días de un solo vistazo con foco clave y notas secundarias.</p>
                        
                        <ul style="list-style: none; padding: 0; margin: 0 0 1.25rem 0; font-size: 0.9rem; color: #4a4a4a; display: flex; flex-direction: column; gap: 0.5rem;">
                            <li><strong style="color: var(--color-accent);">✓</strong> Formato apaisado horizontal de lunes a domingo.</li>
                            <li><strong style="color: var(--color-accent);">✓</strong> Bloque para meta clave (foco) y tareas secundarias.</li>
                            <li><strong style="color: var(--color-accent);">✓</strong> Rayado inferior personalizable: puntos, líneas, cuadrícula o blanco.</li>
                            <li><strong style="color: var(--color-accent);">✓</strong> Exportación en formato Libro Apaisado 8.25"×6" o Folio DIN A4.</li>
                        </ul>

                        <!-- AVISO DE LO QUE NO CONTIENE LA HOJA SUELTA VS EL LIBRO -->
                        <div style="margin-bottom: 1.5rem; padding: 14px 16px; background: rgba(135,85,59,0.06); border-radius: 8px; border-left: 3px solid var(--color-accent); text-align: left;">
                            <span style="display: block; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-accent); margin-bottom: 4px;">Lo que no contiene esta hoja suelta:</span>
                            <p style="font-size: 0.84rem; color: #555; line-height: 1.45; margin: 0;">
                                Esta descarga te permite probar la vista semanal en tu mesa, pero <strong>no incluye la metodología completa</strong> para articular objetivos y balances semanales, ni la experiencia de tener las 53 semanas del año reunidas en una libreta apaisada de tapa dura sin hojas sueltas volando por el escritorio.
                            </p>
                        </div>

                        <!-- GRUPO DE BOTONES -->
                        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                            <a href="/generador-planificador-semanal.html" class="btn-primary" style="flex: 1; min-width: 220px; text-align: center; text-decoration: none; padding: 0.85rem 1.4rem; font-weight: 600;">Abrir generador web →</a>
                            <a href="/tutorial-generador-planificador-semanal.html" class="btn-secondary" style="font-size: 0.85rem; padding: 0.85rem 1.2rem; text-align: center; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem;">
                                <span>📖</span> Ver tutorial paso a paso ↗
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;

if (oldGeneradoresRegex.test(indexHtml)) {
  indexHtml = indexHtml.replace(oldGeneradoresRegex, newGeneradoresHtml);
  fs.writeFileSync(indexPath, indexHtml, 'utf8');
  console.log('[OK] Seccion #generadores actualizada en index.html');
} else {
  console.error('[ERROR] No se pudo encontrar <!-- 5. GENERADORES WEB INTERACTIVOS --> en index.html');
}

// 2. ACTUALIZAR generador.html
const genPath = path.resolve(__dirname, 'generador.html');
let genHtml = fs.readFileSync(genPath, 'utf8');

// Quitar PIN redirect
const pinRegex = /\s*<!-- Protección de acceso por código PIN 1111 -->[\s\S]*?<\/script>/;
if (pinRegex.test(genHtml)) {
  genHtml = genHtml.replace(pinRegex, '');
  console.log('[OK] Eliminada proteccion PIN de generador.html');
}

// Reemplazar la seccion del catalogo de generadores para que solo contenga el semanal con la foto del home
const genCatalogRegex = /<!-- CATÁLOGO DE GENERADORES -->[\s\S]*?<\/section>/;
const newGenCatalogHtml = `<!-- CATÁLOGO DE GENERADORES -->
        <section class="generators-section">
            <div class="section-intro-bar">
                <h2>Elige tu plantilla generadora</h2>
                <p>Personaliza los campos, el tipo de rayado y descarga tu archivo vectorial listo para lápiz o pluma.</p>
            </div>

            <div style="max-width: 740px; margin: 0 auto;">
                <!-- Tarjeta Única: Planificador Semanal -->
                <article class="gen-card active-feature" style="border-top: 4px solid var(--color-accent); background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.06);">
                    <a href="/generador-planificador-semanal.html" style="display: block; overflow: hidden; border-radius: 8px; margin-bottom: 1.25rem; border: 1px solid rgba(0,0,0,0.06);">
                        <img src="/images/tutorial-semanal/captura-web-planificador-completo.png" alt="Generador Semanal Web" style="width: 100%; height: auto; display: block;" loading="lazy">
                    </a>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 8px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-accent); text-transform: uppercase; letter-spacing: 1px;">Plantilla Interactiva Gratuita</span>
                        <span class="gen-status-badge status-available">Disponible gratis</span>
                    </div>

                    <h3 style="font-family: 'Playfair Display', serif; font-size: 1.6rem; margin: 0 0 0.6rem 0; color: #1a1715;">Planificador Semanal</h3>
                    <p style="font-size: 0.98rem; color: #555; line-height: 1.6; margin-bottom: 1.25rem;">Estructura horizontal de escritorio para coordinar tus 7 días de un solo vistazo con foco clave y notas secundarias.</p>

                    <ul style="list-style: none; padding: 0; margin: 0 0 1.25rem 0; font-size: 0.9rem; color: #4a4a4a; display: flex; flex-direction: column; gap: 0.5rem;">
                        <li><strong style="color: var(--color-accent);">✓</strong> Formato apaisado horizontal de lunes a domingo.</li>
                        <li><strong style="color: var(--color-accent);">✓</strong> Bloque para meta clave (foco) y tareas secundarias.</li>
                        <li><strong style="color: var(--color-accent);">✓</strong> Rayado inferior personalizable: puntos, líneas, cuadrícula o blanco.</li>
                        <li><strong style="color: var(--color-accent);">✓</strong> Exportación en formato Libro Apaisado 8.25"×6" o Folio DIN A4.</li>
                    </ul>

                    <!-- AVISO DE LO QUE NO CONTIENE LA HOJA SUELTA VS EL LIBRO -->
                    <div style="margin-bottom: 1.5rem; padding: 14px 16px; background: rgba(135,85,59,0.06); border-radius: 8px; border-left: 3px solid var(--color-accent); text-align: left;">
                        <span style="display: block; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-accent); margin-bottom: 4px;">Lo que no contiene esta hoja suelta:</span>
                        <p style="font-size: 0.84rem; color: #555; line-height: 1.45; margin: 0;">
                            Esta descarga te permite probar la vista semanal en tu mesa, pero <strong>no incluye la metodología completa</strong> para articular objetivos y balances semanales, ni la experiencia de tener las 53 semanas del año reunidas en una libreta apaisada de tapa dura sin hojas sueltas volando por el escritorio.
                        </p>
                    </div>

                    <!-- GRUPO DE BOTONES -->
                    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                        <a href="/generador-planificador-semanal.html" class="btn-gen-action" style="flex: 1; min-width: 220px; text-align: center; text-decoration: none; padding: 0.85rem 1.4rem; font-weight: 600;" onclick="trackVercelEvent('abrir_generador', { herramienta: 'planificador_semanal' })">
                            ✨ Abrir Generador Planificador Semanal →
                        </a>
                        <a href="/tutorial-generador-planificador-semanal.html" class="btn-secondary" style="font-size: 0.85rem; padding: 0.85rem 1.2rem; text-align: center; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem;">
                            <span>📖</span> Ver tutorial paso a paso ↗
                        </a>
                    </div>
                </article>
            </div>
        </section>`;

if (genCatalogRegex.test(genHtml)) {
  genHtml = genHtml.replace(genCatalogRegex, newGenCatalogHtml);
  console.log('[OK] Catalogo de generadores actualizado en generador.html');
}

fs.writeFileSync(genPath, genHtml, 'utf8');

// 3. ACTUALIZAR DROPDOWN EN ÁRBOL EN TODOS LOS ARCHIVOS HTML
const oldTreeDropdownRegex = /<div class="dropdown">\s*<a href="\/generador[^"]*"[^>]*>Generadores ▾<\/a>\s*<div class="dropdown-content tree-dropdown">[\s\S]*?<\/div>\s*<\/div>/g;

const newTreeDropdownHtml = `<div class="dropdown">
                    <a href="/generador.html" style="cursor: default;">Generadores ▾</a>
                    <div class="dropdown-content tree-dropdown">
                        <div class="tree-group">
                            <span class="tree-branch-title">Generadores</span>
                            <div class="tree-branch-items">
                                <a href="/generador.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Todos los generadores</a>
                            </div>
                        </div>
                        <div class="tree-group">
                            <span class="tree-branch-title">Planificación Semanal</span>
                            <div class="tree-branch-items">
                                <a href="/generador-planificador-semanal.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Generador Semanal Web</a>
                            </div>
                        </div>
                    </div>
                </div>`;

const allHtmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

allHtmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (oldTreeDropdownRegex.test(content)) {
    content = content.replace(oldTreeDropdownRegex, newTreeDropdownHtml);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`[OK] Dropdown de generadores actualizado en ${file}`);
  }
});

// En generador.html, si tenía el navbar antiguo, actualizarlo también
let currentGen = fs.readFileSync(genPath, 'utf8');
if (!currentGen.includes('tree-dropdown')) {
  // Reemplazar el nav antiguo de generador.html por el nav moderno con tree-dropdown
  const oldNavRegex = /<nav>[\s\S]*?<\/nav>/;
  const standardNavMatch = fs.readFileSync(indexPath, 'utf8').match(/<nav>[\s\S]*?<\/nav>/);
  if (standardNavMatch && oldNavRegex.test(currentGen)) {
    currentGen = currentGen.replace(oldNavRegex, standardNavMatch[0]);
    fs.writeFileSync(genPath, currentGen, 'utf8');
    console.log('[OK] Navbar moderno en arbol aplicado a generador.html');
  }
}

console.log('--- FINALIZADO CON ÉXITO ---');
