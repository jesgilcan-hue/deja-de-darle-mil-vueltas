import fs from 'fs';
import path from 'path';

const ROOT_DIR = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido';

// -------------------------------------------------------------
// 1. GENERADOR LIBRO COMPLETO
// -------------------------------------------------------------
const fileLibro = path.join(ROOT_DIR, 'generador-libro-completo.html');
let contentLibro = fs.readFileSync(fileLibro, 'utf8');

// 1.1 Preset alterno: 11 páginas de notas por defecto -> 424 páginas exactas (par)
contentLibro = contentLibro.replace(
  /(alterno:\s*\{[\s\S]*?daily:\s*\{\s*active:\s*true,\s*pages:\s*365\s*\},\s*notes:\s*\{\s*active:\s*true,\s*pages:\s*)10(\s*\})/,
  '$111$2'
);

// 1.2 Status claro de páginas en modal
const oldPagesEl = "pagesEl.innerHTML = `📖 Total actual: <strong>${total} páginas</strong> (${isEven ? '<span style=\"color:#166534; font-weight:700;\">Número par ✓ Apto para imprenta</span>' : '<span style=\"color:#dc2626; font-weight:700;\">Número impar ⚠️ No apto para imprenta</span>'})${fixBtnHtml}`;";

const newPagesEl = `let statusHtml = '';
                if (!isEven) {
                    statusHtml = '<span style="color:#dc2626; font-weight:700;">Número impar ⚠️ No apto para imprenta</span>';
                } else if (total > 450) {
                    statusHtml = '<span style="color:#dc2626; font-weight:700;">Supera el límite de 450 págs ⚠️ No apto para imprenta</span>';
                } else if (total > 365) {
                    statusHtml = '<span style="color:#166534; font-weight:700;">Número par ✓ Apto solo para Anillas (máx. 450 págs)</span>';
                } else {
                    statusHtml = '<span style="color:#166534; font-weight:700;">Número par ✓ Apto para imprenta (Tapa blanda, dura o anillas)</span>';
                }
                pagesEl.innerHTML = \`📖 Total actual: <strong>\${total} páginas</strong> (\${statusHtml})\${fixBtnHtml}\`;`;

if (contentLibro.includes(oldPagesEl)) {
  contentLibro = contentLibro.replace(oldPagesEl, newPagesEl);
}

// 1.3 Bloqueo de más de 450 páginas al validar para imprenta
const targetCheck16 = `            if (total < 16) {
                alert(\`⚠️ El libro tiene \${total} páginas. Se requiere un mínimo de 16 páginas para cualquier tipo de libro físico en imprenta.\`);
                return;
            }`;

const replacementCheck16 = `            if (total < 16) {
                alert(\`⚠️ El libro tiene \${total} páginas. Se requiere un mínimo de 16 páginas para cualquier tipo de libro físico en imprenta.\`);
                return;
            }
            if (total > 450) {
                alert(\`⚠️ El libro tiene \${total} páginas y supera el límite físico de 450 páginas de imprenta (anillas Wire-O).\\n\\nPara poder imprimirlo, reduce el número de semanas, meses o páginas de notas para no superar 450 páginas.\`);
                return;
            }`;

if (contentLibro.includes(targetCheck16)) {
  contentLibro = contentLibro.replace(targetCheck16, replacementCheck16);
}

fs.writeFileSync(fileLibro, contentLibro, 'utf8');
console.log('✓ generador-libro-completo.html modificado con éxito.');

// -------------------------------------------------------------
// 2. GENERADOR DE PORTADAS
// -------------------------------------------------------------
const filePortadas = path.join(ROOT_DIR, 'generador-portadas.html');
let contentPortadas = fs.readFileSync(filePortadas, 'utf8');

// 2.1 Deshabilitar botones de encuadernación en HTML cuando no estén permitidos
const targetApplyBtn = `            const applyBtn = (btn, allowed, tooltip) => {
                if (!btn) return;
                btn.title = tooltip;
                if (allowed) {
                    btn.classList.remove('binding-disabled');
                    btn.removeAttribute('disabled');
                } else {
                    btn.classList.add('binding-disabled');
                }
            };`;

const replacementApplyBtn = `            const applyBtn = (btn, allowed, tooltip) => {
                if (!btn) return;
                btn.title = tooltip;
                if (allowed) {
                    btn.classList.remove('binding-disabled');
                    btn.removeAttribute('disabled');
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    btn.style.pointerEvents = 'auto';
                } else {
                    btn.classList.add('binding-disabled');
                    btn.setAttribute('disabled', 'true');
                    btn.style.opacity = '0.38';
                    btn.style.cursor = 'not-allowed';
                    btn.style.pointerEvents = 'auto'; // Permitir leer el tooltip pedagógico
                }
            };`;

if (contentPortadas.includes(targetApplyBtn)) {
  contentPortadas = contentPortadas.replace(targetApplyBtn, replacementApplyBtn);
}

// 2.2 Bloqueo de rangos máximos en setBindingType (365 págs para tapa blanda/dura, 450 para anillas)
const targetSetBinding = `        function setBindingType(type, silent = false) {
            const pages = parseInt(coverState.pageCount, 10) || 0;
            if (!silent) {
                if (type === 'hardcover' && pages < 60) {
                    alert(\`Te faltan \${60 - pages} páginas para encuadernación en tapa dura.\\n\\nEl mínimo técnico para tapa dura con lomo rígido impreso es de 60 páginas (actualmente tiene \${pages}).\`);
                    return;
                }
                if (type === 'perfect' && pages < 32) {
                    alert(\`Te faltan \${32 - pages} páginas para encuadernación en tapa blanda.\\n\\nEl mínimo técnico de fresado y cola para tapa blanda es de 32 páginas (actualmente tiene \${pages}).\`);
                    return;
                }
                if (type === 'coil' && pages < 16) {
                    alert(\`Te faltan \${16 - pages} páginas para encuadernación en anillas.\\n\\nEl mínimo técnico para encuadernación en anillas es de 16 páginas (actualmente tiene \${pages}).\`);
                    return;
                }
            }`;

const replacementSetBinding = `        function setBindingType(type, silent = false) {
            const pages = parseInt(coverState.pageCount, 10) || 0;
            if (!silent) {
                if (type === 'hardcover') {
                    if (pages < 60) {
                        alert(\`⚠️ La encuadernación en tapa dura requiere un mínimo de 60 páginas (actualmente tiene \${pages} págs).\`);
                        return;
                    }
                    if (pages > 365) {
                        alert(\`⚠️ La tapa dura solo admite hasta 365 páginas (actualmente tiene \${pages} págs).\\n\\nPara cuadernos de más de 365 páginas (hasta 450), utiliza encuadernación en Anillas.\`);
                        return;
                    }
                }
                if (type === 'perfect') {
                    if (pages < 32) {
                        alert(\`⚠️ La tapa blanda requiere un mínimo de 32 páginas (actualmente tiene \${pages} págs).\`);
                        return;
                    }
                    if (pages > 365) {
                        alert(\`⚠️ La tapa blanda solo admite hasta 365 páginas (actualmente tiene \${pages} págs).\\n\\nPara cuadernos de más de 365 páginas (hasta 450), utiliza encuadernación en Anillas.\`);
                        return;
                    }
                }
                if (type === 'coil') {
                    if (pages < 16) {
                        alert(\`⚠️ La encuadernación en anillas requiere un mínimo de 16 páginas (actualmente tiene \${pages} págs).\`);
                        return;
                    }
                    if (pages > 450) {
                        alert(\`⚠️ La encuadernación en anillas solo admite hasta 450 páginas (actualmente tiene \${pages} págs).\\n\\nReduce el número de páginas en el interior para imprimirlo.\`);
                        return;
                    }
                }
            }`;

if (contentPortadas.includes(targetSetBinding)) {
  contentPortadas = contentPortadas.replace(targetSetBinding, replacementSetBinding);
}

// 2.3 Prioridad estricta al número de páginas del libro en refreshAvailableInteriorBooks
const targetRefreshDraft = `            // 1. Borrador activo en el Constructor de Cuaderno Completo (mr_complete_book_config)
            try {
                const rawDraft = localStorage.getItem('mr_complete_book_config');
                if (rawDraft) {
                    const parsed = JSON.parse(rawDraft);
                    if (parsed && typeof parsed === 'object') {
                        const calc = calculatePagesFromSections(parsed.sections);
                        const pages = calc ? calc.totalPages : 143;`;

const replacementRefreshDraft = `            // 1. Borrador activo en el Constructor de Cuaderno Completo (mr_complete_book_config)
            try {
                const rawDraft = localStorage.getItem('mr_complete_book_config');
                if (rawDraft) {
                    const parsed = JSON.parse(rawDraft);
                    if (parsed && typeof parsed === 'object') {
                        const calc = calculatePagesFromSections(parsed.sections);
                        const pages = (parsed.pageCount && parseInt(parsed.pageCount, 10) > 0) ? parseInt(parsed.pageCount, 10) : (calc ? calc.totalPages : 143);`;

if (contentPortadas.includes(targetRefreshDraft)) {
  contentPortadas = contentPortadas.replace(targetRefreshDraft, replacementRefreshDraft);
}

// 2.4 Control de páginas máximas en handleAddToCart
const targetCartBindingCheck = `        // 2. Comprobación de límites por encuadernación
        if (coverState.bindingType === 'hardcover' && pages < 60) {
            alert(\`⚠️ La tapa dura requiere un mínimo de 60 páginas (actualmente tiene \${pages}).\\n\\nCambia a Tapa Blanda o Anillas, o añade más páginas al interior.\`);
            return;
        }
        if (coverState.bindingType === 'perfect' && pages < 32) {
            alert(\`⚠️ La tapa blanda requiere un mínimo de 32 páginas (actualmente tiene \${pages}).\\n\\nCambia a Anillas o añade más páginas al interior.\`);
            return;
        }
        if (coverState.bindingType === 'coil' && pages < 16) {
            alert(\`⚠️ Se requiere un mínimo de 16 páginas para cualquier encuadernación física (actualmente tiene \${pages}).\`);
            return;
        }`;

const replacementCartBindingCheck = `        // 2. Comprobación de límites por encuadernación
        if (pages > 450) {
            alert(\`⚠️ El cuaderno tiene \${pages} páginas y supera el límite técnico máximo de 450 páginas de imprenta.\\n\\nReduce el número de páginas en el interior antes de pedir a imprenta.\`);
            return;
        }
        if (coverState.bindingType === 'hardcover') {
            if (pages < 60) {
                alert(\`⚠️ La tapa dura requiere un mínimo de 60 páginas (actualmente tiene \${pages}).\\n\\nCambia a Tapa Blanda o Anillas, o añade más páginas al interior.\`);
                return;
            }
            if (pages > 365) {
                alert(\`⚠️ La tapa dura solo admite hasta 365 páginas (actualmente tiene \${pages}).\\n\\nPara cuadernos de más de 365 páginas (hasta 450), utiliza encuadernación en Anillas.\`);
                return;
            }
        }
        if (coverState.bindingType === 'perfect') {
            if (pages < 32) {
                alert(\`⚠️ La tapa blanda requiere un mínimo de 32 páginas (actualmente tiene \${pages}).\\n\\nCambia a Anillas o añade más páginas al interior.\`);
                return;
            }
            if (pages > 365) {
                alert(\`⚠️ La tapa blanda solo admite hasta 365 páginas (actualmente tiene \${pages}).\\n\\nPara cuadernos de más de 365 páginas (hasta 450), utiliza encuadernación en Anillas.\`);
                return;
            }
        }
        if (coverState.bindingType === 'coil' && pages < 16) {
            alert(\`⚠️ Se requiere un mínimo de 16 páginas para cualquier encuadernación física (actualmente tiene \${pages}).\`);
            return;
        }`;

if (contentPortadas.includes(targetCartBindingCheck)) {
  contentPortadas = contentPortadas.replace(targetCartBindingCheck, replacementCartBindingCheck);
}

fs.writeFileSync(filePortadas, contentPortadas, 'utf8');
console.log('✓ generador-portadas.html modificado con éxito.');
