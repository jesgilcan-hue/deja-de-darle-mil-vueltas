const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, '..', 'main.js');
let code = fs.readFileSync(mainJsPath, 'utf8');

// 1. Añadir import mr-popup
if (!code.includes('mr-popup.js')) {
  code = "import './mr-popup.js';\n" + code;
}

// 2. Reemplazar dropdown generadores en desktop
const oldDesktopRegex = /<div class="tree-group">[\s\S]*?<span class="tree-branch-title">Generadores Web \(8\)<\/span>[\s\S]*?<a href="\/generador\.html" class="tree-view-all-link">Ver todos los generadores \(8\)<\/a>[\s\S]*?<\/div>/;

const newDesktopHtml = `<div class="tree-group tree-group-generadores">
            <span class="tree-branch-title">Generadores Web (8)</span>
            <div class="tree-branch-items tree-branch-generadores-list">
              <a href="/generador-portadas.html" class="tree-item">Diseñador de Portadas</a>
              <a href="/generador-libro-completo.html" class="tree-item">Cuaderno Completo</a>
              <a href="/generador-planificador-diario.html" class="tree-item">Planificador Diario (Hoy)</a>
              <a href="/generador-planificador-semanal.html" class="tree-item">Planificador Semanal</a>
              <a href="/generador-planificador-mensual.html" class="tree-item">Planificador Mensual</a>
              <a href="/generador-planificador-anual.html" class="tree-item">Planificador Anual</a>
              <a href="/generador-planificador-habitos.html" class="tree-item">Rastreador de Hábitos</a>
              <a href="/generador-planificador-horario.html" class="tree-item">Bloques Horarios</a>
            </div>
            <a href="/generador.html" class="tree-view-all-link">Ver todos los generadores (8) &rarr;</a>
          </div>`;

if (oldDesktopRegex.test(code)) {
  code = code.replace(oldDesktopRegex, newDesktopHtml);
  console.log('Dropdown desktop reemplazado con éxito.');
} else {
  console.warn('No se encontró el patrón desktop en main.js');
}

// 3. Reemplazar orden en el drawer móvil
const oldMobileRegex = /<div class="mobile-scrollable-sublist">[\s\S]*?<a href="\/generador-planificador-diario\.html"[\s\S]*?<a href="\/generador-libro-completo\.html"[\s\S]*?<\/div>\s*<\/a>\s*<\/div>/;

const newMobileHtml = `<div class="mobile-scrollable-sublist">
          <a href="/generador-portadas.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <div class="mobile-book-info">
              <span class="mobile-book-title">Diseñador de Portadas</span>
              <span class="mobile-book-subtitle">Lomo y pliego exacto</span>
            </div>
          </a>
          <a href="/generador-libro-completo.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <div class="mobile-book-info">
              <span class="mobile-book-title">Cuaderno Completo</span>
              <span class="mobile-book-subtitle">Compilador de libro continuo</span>
            </div>
          </a>
          <a href="/generador-planificador-diario.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <div class="mobile-book-info">
              <span class="mobile-book-title">Planificador Diario (Hoy)</span>
              <span class="mobile-book-subtitle">Formato vertical 6" × 9"</span>
            </div>
          </a>
          <a href="/generador-planificador-semanal.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <div class="mobile-book-info">
              <span class="mobile-book-title">Planificador Semanal</span>
              <span class="mobile-book-subtitle">Formato apaisado 8.25" × 6"</span>
            </div>
          </a>
          <a href="/generador-planificador-mensual.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <div class="mobile-book-info">
              <span class="mobile-book-title">Planificador Mensual</span>
              <span class="mobile-book-subtitle">Vista mes a doble página</span>
            </div>
          </a>
          <a href="/generador-planificador-anual.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <div class="mobile-book-info">
              <span class="mobile-book-title">Planificador Anual</span>
              <span class="mobile-book-subtitle">Visión estratégica 12 meses</span>
            </div>
          </a>
          <a href="/generador-planificador-habitos.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <div class="mobile-book-info">
              <span class="mobile-book-title">Rastreador de Hábitos</span>
              <span class="mobile-book-subtitle">Matriz mensual analógica</span>
            </div>
          </a>
          <a href="/generador-planificador-horario.html" class="mobile-book-card sub-card" onclick="document.body.classList.remove('nav-open')">
            <div class="mobile-book-info">
              <span class="mobile-book-title">Bloques Horarios</span>
              <span class="mobile-book-subtitle">Time blocking diario</span>
            </div>
          </a>
        </div>`;

if (oldMobileRegex.test(code)) {
  code = code.replace(oldMobileRegex, newMobileHtml);
  console.log('Lista móvil reemplazada con éxito.');
} else {
  console.warn('No se encontró el patrón móvil en main.js');
}

fs.writeFileSync(mainJsPath, code, 'utf8');
console.log('main.js actualizado correctamente.');
