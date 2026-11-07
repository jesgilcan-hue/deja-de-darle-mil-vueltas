const fs = require('fs');
const path = require('path');

const authModalPath = path.join(__dirname, '..', 'auth-modal.js');
let code = fs.readFileSync(authModalPath, 'utf8');

if (!code.includes('window.openAuthModal = openAuthModal;')) {
  code += `\nif (typeof window !== 'undefined') {\n  window.openAuthModal = openAuthModal;\n  window.auth = auth;\n}\n`;
  fs.writeFileSync(authModalPath, code, 'utf8');
  console.log('auth-modal.js expone window.openAuthModal y window.auth con éxito.');
} else {
  console.log('Ya estaba expuesto.');
}
