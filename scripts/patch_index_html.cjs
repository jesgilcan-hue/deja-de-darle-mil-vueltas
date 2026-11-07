const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const oldBlock = `<div class="dropdown">
                    <a href="/generador.html" style="cursor: default;">Generadores ▾</a>
                    <div class="dropdown-content tree-dropdown">
                        <div class="tree-group">
                            <span class="tree-branch-title">Generadores Web (8)</span>
                            <div class="tree-branch-items tree-branch-scrollable">
                                <a href="/generador-planificador-diario.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Diario (Hoy)</a>
                                <a href="/generador-planificador-semanal.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Semanal</a>
                                <a href="/generador-planificador-mensual.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Mensual</a>
                                <a href="/generador-planificador-anual.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Anual</a>
                                <a href="/generador-planificador-habitos.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Rastreador de Hábitos</a>
                                <a href="/generador-planificador-horario.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Bloques Horarios</a>
                                <a href="/generador-portadas.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Diseñador de Portadas</a>
                                <a href="/generador-libro-completo.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Cuaderno Completo (86 págs)</a>
                            </div>
                            <a href="/generador.html" class="tree-view-all-link">Ver todos los generadores (8)</a>
                        </div>
                    </div>
                </div>`;

const newBlock = `<div class="dropdown">
                    <a href="/generador.html" style="cursor: default;">Generadores ▾</a>
                    <div class="dropdown-content tree-dropdown">
                        <div class="tree-group tree-group-generadores">
                            <span class="tree-branch-title">Generadores Web (8)</span>
                            <div class="tree-branch-items tree-branch-generadores-list">
                                <a href="/generador-portadas.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Diseñador de Portadas</a>
                                <a href="/generador-libro-completo.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Cuaderno Completo</a>
                                <a href="/generador-planificador-diario.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Diario (Hoy)</a>
                                <a href="/generador-planificador-semanal.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Semanal</a>
                                <a href="/generador-planificador-mensual.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Mensual</a>
                                <a href="/generador-planificador-anual.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Planificador Anual</a>
                                <a href="/generador-planificador-habitos.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Rastreador de Hábitos</a>
                                <a href="/generador-planificador-horario.html" class="tree-item" onclick="document.body.classList.remove('nav-open')">Bloques Horarios</a>
                            </div>
                            <a href="/generador.html" class="tree-view-all-link">Ver todos los generadores (8) &rarr;</a>
                        </div>
                    </div>
                </div>`;

if (html.includes(oldBlock)) {
  html = html.replace(oldBlock, newBlock);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('index.html actualizado (LF)');
} else if (html.includes(oldBlock.replace(/\n/g, '\r\n'))) {
  html = html.replace(oldBlock.replace(/\n/g, '\r\n'), newBlock.replace(/\n/g, '\r\n'));
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('index.html actualizado (CRLF)');
} else {
  console.warn('Bloque no encontrado en index.html');
}
