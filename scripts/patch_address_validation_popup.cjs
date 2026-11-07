const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'mi-espacio.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update unauthenticated return condition to allow tab=ajustes
code = code.replace(
  "urlParams.get('tab') === 'pedidos';",
  "urlParams.get('tab') === 'pedidos' || urlParams.get('tab') === 'ajustes';"
);

// 2. Enhance executeSaveDirecciones with the Menos Ruido confirmation popup
const oldSaveFunc = `  async function executeSaveDirecciones(returnToBasket = false) {
    const name = document.getElementById('ajustes-shipping-name')?.value.trim();
    const email = document.getElementById('ajustes-shipping-email')?.value.trim().toLowerCase() || (currentUser ? getUserEmail(currentUser) : '');
    const phone = document.getElementById('ajustes-shipping-phone')?.value.trim();
    const address = document.getElementById('ajustes-shipping-address')?.value.trim();
    const postalCode = document.getElementById('ajustes-shipping-zip')?.value.trim();
    const city = document.getElementById('ajustes-shipping-city')?.value.trim();
    const province = document.getElementById('ajustes-shipping-province')?.value.trim();
    const notes = document.getElementById('ajustes-shipping-notes')?.value.trim() || '';
    const isSameBilling = sameBillingCheck ? sameBillingCheck.checked : true;

    if (!name || !address) {
      showToast('Por favor, indica al menos destinatario y dirección');
      return false;
    }`;

const newSaveFunc = `  async function executeSaveDirecciones(returnToBasket = false) {
    const name = document.getElementById('ajustes-shipping-name')?.value.trim();
    const email = document.getElementById('ajustes-shipping-email')?.value.trim().toLowerCase() || (currentUser ? getUserEmail(currentUser) : '');
    const phone = document.getElementById('ajustes-shipping-phone')?.value.trim();
    const address = document.getElementById('ajustes-shipping-address')?.value.trim();
    const postalCode = document.getElementById('ajustes-shipping-zip')?.value.trim();
    const city = document.getElementById('ajustes-shipping-city')?.value.trim();
    const province = document.getElementById('ajustes-shipping-province')?.value.trim();
    const notes = document.getElementById('ajustes-shipping-notes')?.value.trim() || '';
    const isSameBilling = sameBillingCheck ? sameBillingCheck.checked : true;

    if (!name || !address || !postalCode || !city) {
      alert('⚠️ Por favor, completa los campos requeridos: Destinatario, Dirección de entrega, Código Postal y Ciudad.');
      return false;
    }

    if (!email || !email.includes('@')) {
      alert('⚠️ Por favor, introduce un correo electrónico válido para poder enviarte la confirmación y el seguimiento de tu pedido.');
      const inpEmail = document.getElementById('ajustes-shipping-email');
      if (inpEmail) inpEmail.focus();
      return false;
    }

    // Modal popup con estética Menos Ruido para validación en 1 sola línea
    const summaryAddress = \`\${address}, \${postalCode} \${city}\${province ? ' (' + province + ')' : ''}\`;
    const confirmMessage = \`Por favor, confirma que tu dirección de entrega y correo son exactos:

📍 Dirección de entrega:
\${name}
\${summaryAddress}

✉️ Correo de confirmación y tracking:
\${email}\${phone ? \`\\n📞 Teléfono: \${phone}\` : ''}\${notes ? \`\\n📝 Notas repartidor: «\${notes}»\` : ''}

¿Son correctos estos datos para el envío de tus cuadernos?\`;

    const userConfirmed = await (window.mrConfirm ? window.mrConfirm(confirmMessage, {
      title: 'Validación de Dirección y Contacto',
      badge: 'Editorial Menos Ruido · Envío Físico',
      confirmText: '✓ Confirmar y Guardar',
      cancelText: 'Modificar datos'
    }) : confirm(confirmMessage));

    if (!userConfirmed) return false;`;

if (code.includes(oldSaveFunc)) {
  code = code.replace(oldSaveFunc, newSaveFunc);
  console.log('✓ executeSaveDirecciones actualizado con modal de validación de dirección y email');
} else {
  console.log('• Buscando alternativa para executeSaveDirecciones...');
  // Handle if whitespace differs
  const startIdx = code.indexOf('async function executeSaveDirecciones');
  if (startIdx !== -1) {
    const endIdx = code.indexOf('const shippingData = {', startIdx);
    code = code.substring(0, startIdx) + newSaveFunc + '\n\n' + code.substring(endIdx);
    console.log('✓ executeSaveDirecciones reemplazado mediante index');
  }
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Parche aplicado con éxito.');
