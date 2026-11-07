const fs = require('fs');
const path = require('path');

// 1. Portadas
const portadasPath = path.join(__dirname, '..', 'generador-portadas.html');
let portadasHtml = fs.readFileSync(portadasPath, 'utf8');

const oldDevCart = `            const cartWrapper = document.getElementById('devCartWrapper');
            if (cartWrapper) {
                const canBuy = !!user && (isDeveloper(user) || isTestCustomer(user));
                cartWrapper.style.setProperty('display', canBuy ? 'flex' : 'none', 'important');
            }`;

const newDevCart = `            const cartWrapper = document.getElementById('devCartWrapper');
            if (cartWrapper) {
                cartWrapper.style.setProperty('display', 'flex', 'important');
            }`;

if (portadasHtml.includes(oldDevCart)) {
  portadasHtml = portadasHtml.replace(oldDevCart, newDevCart);
} else if (portadasHtml.includes(oldDevCart.replace(/\n/g, '\r\n'))) {
  portadasHtml = portadasHtml.replace(oldDevCart.replace(/\n/g, '\r\n'), newDevCart.replace(/\n/g, '\r\n'));
}

fs.writeFileSync(portadasPath, portadasHtml, 'utf8');
console.log('generador-portadas.html actualizado.');

// 2. Libro Completo
const libroPath = path.join(__dirname, '..', 'generador-libro-completo.html');
let libroHtml = fs.readFileSync(libroPath, 'utf8');

// En openCompileModal
const oldOpenCompile = `        function openCompileModal() {
            recalcPages();`;

const newOpenCompile = `        function openCompileModal() {
            let user = (window.auth && window.auth.currentUser) || null;
            if (!user && window.openAuthModal) {
                window.openAuthModal({
                    title: 'Descarga tu Cuaderno Completo en PDF',
                    subtitle: 'Inicia sesión o crea tu cuenta gratuita para compilar y descargar tu libro completo listo para imprenta.',
                    badge: 'Cuaderno Completo',
                    actionContext: 'download',
                    onSuccess: () => { openCompileModal(); }
                });
                return;
            }
            recalcPages();`;

if (libroHtml.includes(oldOpenCompile)) {
  libroHtml = libroHtml.replace(oldOpenCompile, newOpenCompile);
} else if (libroHtml.includes(oldOpenCompile.replace(/\n/g, '\r\n'))) {
  libroHtml = libroHtml.replace(oldOpenCompile.replace(/\n/g, '\r\n'), newOpenCompile.replace(/\n/g, '\r\n'));
}

// En openSaveAndValidateModal
const oldOpenSave = `        function openSaveAndValidateModal() {
            const modal = document.getElementById('modalSaveAndValidateBook');`;

const newOpenSave = `        function openSaveAndValidateModal() {
            let user = (window.auth && window.auth.currentUser) || null;
            if (!user && window.openAuthModal) {
                window.openAuthModal({
                    title: 'Guarda tu cuaderno en Mi Espacio',
                    subtitle: 'Inicia sesión o crea tu cuenta gratuita para conservar tu libro y poder editarlo cuando quieras.',
                    badge: 'Guardar diseño',
                    actionContext: 'save',
                    onSuccess: () => { openSaveAndValidateModal(); }
                });
                return;
            }
            const modal = document.getElementById('modalSaveAndValidateBook');`;

if (libroHtml.includes(oldOpenSave)) {
  libroHtml = libroHtml.replace(oldOpenSave, newOpenSave);
} else if (libroHtml.includes(oldOpenSave.replace(/\n/g, '\r\n'))) {
  libroHtml = libroHtml.replace(oldOpenSave.replace(/\n/g, '\r\n'), newOpenSave.replace(/\n/g, '\r\n'));
}

fs.writeFileSync(libroPath, libroHtml, 'utf8');
console.log('generador-libro-completo.html actualizado.');
