const fs = require('fs');
const path = require('path');

const webDir = 'C:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido';

const modalCss = `
/* =========================================================================
   MODAL UNIFICADO HOJEAR EN 3D (LIGHTBOX FLOTANTE)
   ========================================================================= */
.book-modal-backdrop {
    display: none !important;
    position: fixed;
    inset: 0;
    background: rgba(18, 16, 14, 0.92);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    z-index: 100000;
    align-items: center;
    justify-content: center;
    padding: 24px;
}
.book-modal-backdrop.is-open {
    display: flex !important;
}
.book-modal-window {
    position: relative;
    width: 100%;
    max-width: 1240px;
    height: 90vh;
    height: 90dvh;
    background: #141414;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.12);
}
.book-modal-iframe {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
    background: #141414;
}
.book-modal-close-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 1000;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(20, 20, 20, 0.75);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}
.book-modal-close-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.08);
}
@media (max-width: 768px) {
    .book-modal-backdrop {
        padding: 8px !important;
    }
    .book-modal-window {
        height: 95vh !important;
        height: 95dvh !important;
        border-radius: 12px !important;
    }
}
`;

// 1. Add to style.css and src/style.css
for (const sFile of ['style.css', 'src/style.css']) {
    const sPath = path.join(webDir, sFile);
    if (fs.existsSync(sPath)) {
        let css = fs.readFileSync(sPath, 'utf-8');
        if (!css.includes('.book-modal-backdrop')) {
            css += '\n' + modalCss;
            fs.writeFileSync(sPath, css, 'utf-8');
            console.log(`Added modal CSS to ${sFile}`);
        }
    }
}

// 2. Books to update
const books = [
    { page: 'habla-claro.html', visorSlug: 'visor-habla-claro' },
    { page: 'deja-de-darle-mil-vueltas.html', visorSlug: 'visor-deja-de-darle-mil-vueltas' },
    { page: 'planificador-90-dias.html', visorSlug: 'visor-planificador-90-dias' },
    { page: 'planificador-180-dias.html', visorSlug: 'visor-planificador-180-dias' },
    { page: 'planificador-semanal-simple.html', visorSlug: 'visor-planificador-semanal-simple' },
    { page: 'planificador-semanal-reversible.html', visorSlug: 'visor-planificador-semanal-reversible' },
    { page: 'afirmaciones-diarias.html', visorSlug: 'visor-afirmaciones-diarias' }
];

for (const b of books) {
    const pagePath = path.join(webDir, b.page);
    if (!fs.existsSync(pagePath)) continue;

    let html = fs.readFileSync(pagePath, 'utf-8');

    // 2.1 Inject CSS into <style> if not already there
    if (!html.includes('.book-modal-backdrop')) {
        html = html.replace('</head>', `<style>${modalCss}</style>\n</head>`);
    }

    // 2.2 Standardize the modal HTML block
    const modalHtml = `    <!-- MODAL POP-UP VISOR UNIFICADO (3D + HOJEAR) -->
    <div id="book-modal" class="book-modal-backdrop" onclick="handleModalBackdropClick(event)" aria-hidden="true" role="dialog">
        <div class="book-modal-window" onclick="event.stopPropagation()">
            <button type="button" class="book-modal-close-btn" onclick="closeBookModal()" aria-label="Cerrar visor" title="Cerrar (Esc)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <iframe id="book-modal-frame" class="book-modal-iframe" title="Visor 3D y muestra de páginas" src="about:blank"></iframe>
        </div>
    </div>`;

    // Replace existing modal block
    html = html.replace(/<div id="book-modal"[\s\S]*?<\/iframe>\s*<\/div>\s*<\/div>/, modalHtml);

    // 2.3 Standardize the script functions
    const scriptBlock = `    <script>
        function openBookModal(mode = '3d') {
            const modal = document.getElementById('book-modal');
            const frame = document.getElementById('book-modal-frame');
            if (modal && frame) {
                const targetSrc = mode === 'interior' 
                    ? '/${b.visorSlug}?mode=interior' 
                    : '/${b.visorSlug}';
                frame.src = targetSrc;
                modal.classList.add('is-open');
                modal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeBookModal() {
            const modal = document.getElementById('book-modal');
            const frame = document.getElementById('book-modal-frame');
            if (modal) {
                modal.classList.remove('is-open');
                modal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
                if (frame) {
                    frame.src = 'about:blank';
                }
            }
        }

        function handleModalBackdropClick(event) {
            if (event.target.id === 'book-modal') {
                closeBookModal();
            }
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeBookModal();
            }
        });
    </script>`;

    // Replace the script functions for modal
    const oldScriptRegex = /<script>\s*function\s+openBookModal[\s\S]*?<\/script>/;
    if (oldScriptRegex.test(html)) {
        html = html.replace(oldScriptRegex, scriptBlock);
    } else {
        html = html.replace('</body>', `${scriptBlock}\n</body>`);
    }

    fs.writeFileSync(pagePath, html, 'utf-8');
    console.log(`Updated modal and script in: ${b.page}`);
}

console.log("Modal CSS & Script fix completed for all product pages!");
