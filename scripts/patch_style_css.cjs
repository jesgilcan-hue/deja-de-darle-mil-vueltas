const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');

const target = `.tree-branch-scrollable {
    max-height: 110px; /* Exactamente 3 elementos visibles de ~34px-36px */
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 5px;
    scrollbar-width: thin;
    scrollbar-color: rgba(135, 85, 59, 0.35) transparent;
}`;

const replacement = `.tree-branch-scrollable {
    max-height: 110px; /* Exactamente 3 elementos visibles de ~34px-36px */
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 5px;
    scrollbar-width: thin;
    scrollbar-color: rgba(135, 85, 59, 0.35) transparent;
}

/* En el desplegable de generadores se muestran los 8 directamente sin recorte ni scroll */
.tree-branch-generadores-list {
    max-height: none;
    overflow-y: visible;
}`;

if (css.includes(target)) {
  css = css.replace(target, replacement);
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('style.css actualizado (LF)');
} else if (css.includes(target.replace(/\n/g, '\r\n'))) {
  css = css.replace(target.replace(/\n/g, '\r\n'), replacement.replace(/\n/g, '\r\n'));
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('style.css actualizado (CRLF)');
} else {
  console.warn('Target no encontrado en style.css');
}
