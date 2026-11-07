const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');

const modalStyles = `
/* =========================================================================
   ESTÉTICA UNIFICADA EDITORIAL MENOS RUIDO PARA TODOS LOS POP-UPS Y MODALES
   ========================================================================= */
.modal-overlay,
.modal-backdrop,
.auth-modal-overlay,
#basket-checkout-modal {
    background: rgba(28, 24, 21, 0.52) !important;
    backdrop-filter: blur(4px) !important;
    -webkit-backdrop-filter: blur(4px) !important;
}

.modal-card,
.auth-modal-card,
#basket-checkout-modal > div {
    background: #faf8f5 !important;
    border: 1px solid #e6ded3 !important;
    border-radius: 12px !important;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.16), 0 4px 14px rgba(0, 0, 0, 0.06) !important;
    color: #2b2520 !important;
}

.modal-title,
.auth-modal-title {
    font-family: 'Playfair Display', Georgia, serif !important;
    color: #1a1714 !important;
    font-weight: 700 !important;
    letter-spacing: -0.3px !important;
}

.modal-desc,
.auth-modal-subtitle {
    color: #5c5247 !important;
    font-size: 0.88rem !important;
    line-height: 1.5 !important;
}

.modal-format-badge {
    background: #f0e9df !important;
    color: #6e442e !important;
    border: 1px solid #dfd4c5 !important;
    border-radius: 20px !important;
}

.btn-modal-primary {
    background: #24211e !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 8px !important;
    padding: 11px 18px !important;
    font-weight: 600 !important;
    transition: background 0.15s, transform 0.15s !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
}

.btn-modal-primary:hover {
    background: #3b3530 !important;
}

.btn-modal-secondary {
    background: #f0e9df !important;
    color: #4a423a !important;
    border: 1px solid #dcd2c4 !important;
    border-radius: 8px !important;
    padding: 10px 18px !important;
    font-weight: 600 !important;
    transition: background 0.15s !important;
}

.btn-modal-secondary:hover {
    background: #e5ded2 !important;
}

.modal-email-box {
    background: #f5f0e6 !important;
    border: 1px solid #e4dacb !important;
    border-radius: 10px !important;
}

.modal-btn-send {
    background: #24211e !important;
    color: #ffffff !important;
    border-radius: 6px !important;
}

.modal-btn-send:hover {
    background: #3d3630 !important;
}

.modal-close-btn,
.auth-modal-close {
    color: #8c8276 !important;
    transition: background 0.15s, color 0.15s !important;
    border-radius: 6px !important;
}

.modal-close-btn:hover,
.auth-modal-close:hover {
    background: #ede6db !important;
    color: #1f1c19 !important;
}
`;

if (!css.includes('ESTÉTICA UNIFICADA EDITORIAL MENOS RUIDO PARA TODOS LOS POP-UPS')) {
  css += '\n' + modalStyles;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('style.css actualizado con la estética unificada de modales Menos Ruido.');
} else {
  console.log('Ya estaban los estilos de modales.');
}
