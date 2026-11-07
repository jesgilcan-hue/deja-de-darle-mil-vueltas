const fs = require('fs');

const file = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/mi-espacio.js';
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// 1. Target in openBasketCheckoutModal
const target1 = `  if (shipContainer) {
    shipContainer.innerHTML = \`
      <div style="line-height: 1.55; color: #3d342c;">
        <div><strong style="color: #1f1c19;">\${escapeHtml(firstShip.name || 'Cliente')}</strong> (<span style="color: #665e54;">\${escapeHtml(firstShip.email || user?.email || '')}</span>)</div>
        <div style="color: #4a4138; margin-top: 3px;">\${escapeHtml(firstShip.address || '')}, \${escapeHtml(firstShip.postalCode || '')} \${escapeHtml(firstShip.city || '')} (\${escapeHtml(firstShip.province || '')})</div>
        <div style="color: #665e54; font-size: 0.78rem; margin-top: 3px;">Teléfono: <strong>\${escapeHtml(firstShip.phone || '+34 600 000 000')}</strong></div>
        <div style="margin-top: 10px; border-top: 1px dashed #ebd5c3; padding-top: 8px;">
          <label style="display:block; font-size: 0.76rem; font-weight: 700; color: #5a5147; margin-bottom: 4px;">Instrucciones para el repartidor (opcional):</label>
          <input type="text" id="checkout-modal-customer-notes" value="\${escapeHtml(firstShip.notes || '')}" placeholder="Ej: Dejar en conserjería, llamar al 2ºB..." style="width: 100%; font-size: 0.80rem; padding: 7px 10px; border: 1px solid #dcd3c5; border-radius: 6px; box-sizing: border-box; background: #ffffff;">
        </div>
      </div>
    \`;
  }`;

const rep1 = `  if (shipContainer) {
    const savedCustomerEmail = localStorage.getItem('mr_customer_contact_email') || firstShip.email || user?.email || '';

    shipContainer.innerHTML = \`
      <div style="line-height: 1.55; color: #3d342c;">
        <div style="margin-bottom: 12px; background: #ffffff; border: 1.5px solid #215c38; border-radius: 8px; padding: 11px 14px; box-shadow: 0 1px 4px rgba(33,92,56,0.08);">
          <label for="checkout-modal-customer-email" style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 800; color: #1e3d29; margin-bottom: 4px;">
            <span>📧</span> Email para confirmación y seguimiento de entrega:
          </label>
          <input type="email" id="checkout-modal-customer-email" value="\${escapeHtml(savedCustomerEmail)}" placeholder="tu-email@ejemplo.com" required style="width: 100%; font-size: 0.88rem; font-weight: 600; padding: 8px 11px; border: 1.5px solid #a3cfbb; border-radius: 6px; box-sizing: border-box; background: #f4faf6; color: #143522;">
          <span style="display: block; font-size: 0.71rem; color: #4a5d52; margin-top: 4px; line-height: 1.35;">
            Enviaremos aquí la factura digital, el justificante de compra y los avisos de la empresa de transporte con el número de seguimiento.
          </span>
        </div>

        <div><strong style="color: #1f1c19;">\${escapeHtml(firstShip.name || 'Cliente')}</strong></div>
        <div style="color: #4a4138; margin-top: 3px;">\${escapeHtml(firstShip.address || '')}, \${escapeHtml(firstShip.postalCode || '')} \${escapeHtml(firstShip.city || '')} (\${escapeHtml(firstShip.province || '')})</div>
        <div style="color: #665e54; font-size: 0.78rem; margin-top: 3px;">Teléfono: <strong>\${escapeHtml(firstShip.phone || '+34 600 000 000')}</strong></div>
        <div style="margin-top: 10px; border-top: 1px dashed #ebd5c3; padding-top: 8px;">
          <label style="display:block; font-size: 0.76rem; font-weight: 700; color: #5a5147; margin-bottom: 4px;">Instrucciones para el repartidor (opcional):</label>
          <input type="text" id="checkout-modal-customer-notes" value="\${escapeHtml(firstShip.notes || '')}" placeholder="Ej: Dejar en conserjería, llamar al 2ºB..." style="width: 100%; font-size: 0.80rem; padding: 7px 10px; border: 1px solid #dcd3c5; border-radius: 6px; box-sizing: border-box; background: #ffffff;">
        </div>
      </div>
    \`;
  }`;

// 2. Target in handleConfirmCheckoutOrder
const target2 = `  const user = currentUser || auth.currentUser;
  const notesInp = document.getElementById('checkout-modal-customer-notes');
  const deliveryNotes = notesInp ? notesInp.value.trim() : '';

  const customerPlatformName = (user ? getUserDisplayName(user) : '') || 'Cliente';
  const customerPlatformEmail = (user ? getUserEmail(user) : '') || 'jesusgil_87@hotmail.com';`;

const rep2 = `  const user = currentUser || auth.currentUser;
  const notesInp = document.getElementById('checkout-modal-customer-notes');
  const deliveryNotes = notesInp ? notesInp.value.trim() : '';

  const emailInp = document.getElementById('checkout-modal-customer-email');
  const specifiedEmail = emailInp ? emailInp.value.trim().toLowerCase() : '';
  if (!specifiedEmail || !specifiedEmail.includes('@') || !specifiedEmail.includes('.')) {
    alert('Por favor, indica un email válido donde recibir la confirmación y el seguimiento del pedido.');
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = 'Confirmar Pedido';
    if (emailInp) emailInp.focus();
    return;
  }

  try {
    localStorage.setItem('mr_customer_contact_email', specifiedEmail);
  } catch(e) {}

  const customerPlatformName = (user ? getUserDisplayName(user) : '') || 'Cliente';
  const customerPlatformEmail = specifiedEmail;`;

if (content.includes(target1) && content.includes(target2)) {
  content = content.replace(target1, rep1).replace(target2, rep2);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ mi-espacio.js actualizado exitosamente con campo editable de email');
} else {
  console.error('✗ Fallo al localizar targets:', {
    hasTarget1: content.includes(target1),
    hasTarget2: content.includes(target2)
  });
}
