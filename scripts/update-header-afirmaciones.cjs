const fs = require('fs');
const path = require('path');

const webDir = path.resolve(__dirname, '..');
const files = fs.readdirSync(webDir).filter(f => f.endsWith('.html'));

let updatedCount = 0;

for (const file of files) {
    const filePath = path.join(webDir, file);
    let html = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // 1. Remove misplaced afirmaciones in generadores sub-collapsible if present
    // <a href="/afirmaciones-diarias.html" class="tree-item" onclick="document.body.classList.remove(\'nav-open\')">Afirmaciones Diarias</a>
    // <a href="/afirmaciones-diarias.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Afirmaciones Diarias</a>
    const generadoresWithAfirmaciones = /(<button type="button" class="tree-sub-toggle">▸ Desplegar generadores \([0-9]+\)<\/button>\s*<div class="tree-sub-collapsible"[^>]*>)\s*<a href="\/afirmaciones-diarias\.html"[^>]*>Afirmaciones Diarias<\/a>/gi;
    if (generadoresWithAfirmaciones.test(html)) {
        html = html.replace(generadoresWithAfirmaciones, '$1');
        modified = true;
    }

    // Also ensure generadores count says (6)
    const genCountOld = /▸ Desplegar generadores \([0-9]+\)/g;
    // but don't touch pasatiempos generadores which is (5)

    // 2. In Desplegar cuadernos: ensure Afirmaciones Diarias is present
    // Check if "Desplegar cuadernos" exists in this file
    const cuadernosToggleRegex = /(<button type="button" class="tree-sub-toggle">▸ Desplegar cuadernos \([0-9]+\)<\/button>\s*<div class="tree-sub-collapsible"[^>]*>)/gi;
    
    if (cuadernosToggleRegex.test(html)) {
        // Check if afirmaciones-diarias.html is already inside the cuadernos list
        // Match the entire block of tree-sub-collapsible for cuadernos
        html = html.replace(
            /(<button type="button" class="tree-sub-toggle">▸ Desplegar cuadernos \([0-9]+\)<\/button>\s*<div class="tree-sub-collapsible"[^>]*>)([\s\S]*?)(<\/div>)/i,
            (match, header, items, footer) => {
                let cleanItems = items;
                // If afirmaciones is not in cleanItems, add it right at the top
                if (!cleanItems.includes('/afirmaciones-diarias.html')) {
                    const newItem = `\n                                    <a href="/afirmaciones-diarias.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Afirmaciones Diarias</a>`;
                    cleanItems = newItem + cleanItems;
                    modified = true;
                }
                // Ensure the button says (7)
                const newHeader = header.replace(/\([0-9]+\)/, '(7)');
                return newHeader + cleanItems + footer;
            }
        );
    }

    if (modified) {
        fs.writeFileSync(filePath, html, 'utf-8');
        updatedCount++;
    }
}

console.log(`Updated header and menu in ${updatedCount} HTML files.`);
