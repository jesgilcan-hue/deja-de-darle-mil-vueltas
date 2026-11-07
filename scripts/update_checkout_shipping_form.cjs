const fs = require('fs');

const file = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/mi-espacio.js';
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// 1. Add updateCheckoutShippingSingleLine function before openBasketCheckoutModal
const targetHelper = `function openBasketCheckoutModal(targetItemId = null) {`;

const newHelper = `window.updateCheckoutShippingSingleLine = function() {
  const name = document.getElementById('checkout-ship-name')?.value.trim() || '';
  const email = document.getElementById('checkout-modal-customer-email')?.value.trim() || '';
  const phone = document.getElementById('checkout-ship-phone')?.value.trim() || '';
  const addr = document.getElementById('checkout-ship-address')?.value.trim() || '';
  const cp = document.getElementById('checkout-ship-postal')?.value.trim() || '';
  const city = document.getElementById('checkout-ship-city')?.value.trim() || '';
  const prov = document.getElementById('checkout-ship-province')?.value.trim() || '';

  const parts = [];
  if (name) parts.push('<strong>' + escapeHtml(name) + '</strong>');
  if (addr) parts.push(escapeHtml(addr));
  if (cp || city) parts.push(escapeHtml((cp + ' ' + city).trim()) + (prov ? ' (' + escapeHtml(prov) + ')' : ''));
  if (phone) parts.push('Tlf: <strong>' + escapeHtml(phone) + '</strong>');
  if (email) parts.push('Email: <strong>' + escapeHtml(email) + '</strong>');

  const lineEl = document.getElementById('checkout-shipping-single-line-text');
  if (lineEl) {
    lineEl.innerHTML = parts.length > 0 ? parts.join(' · ') : '<span style="color:#888;">Introduce los datos arriba para previsualizar la línea completa</span>';
  }
};

function openBasketCheckoutModal(targetItemId = null) {`;

if (!content.includes('window.updateCheckoutShippingSingleLine')) {
  content = content.replace(targetHelper, newHelper);
}

// 2. Replace shipContainer rendering in openBasketCheckoutModal
const targetShipRender = `  // 2. Renderizar resumen de dirección de entrega
  const shipContainer = document.getElementById('checkout-modal-shipping-summary');
  const user = currentUser || auth.currentUser;
  const notesInp = document.getElementById('checkout-modal-customer-notes');
  const deliveryNotes = notesInp ? notesInp.value.trim() : '';

  const firstShip = selectedItems[0]?.shipping || {
    name: (user ? getUserDisplayName(user) : '') || 'Cliente Menos Ruido',
    email: (user ? getUserEmail(user) : '') || 'jesusgil_87@hotmail.com',
    phone: '+34 600 000 000',
    address: 'Calle Serrano 42, 4º Derecha',
    postalCode: '28001',
    city: 'Madrid',
    province: 'Madrid',
    notes: deliveryNotes || 'Sin instrucciones adicionales'
  };
  if (deliveryNotes) firstShip.notes = deliveryNotes;

  if (shipContainer) {
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

const newShipRender = `  // 2. Renderizar formulario estructurado de dirección postal y línea de validación
  const shipContainer = document.getElementById('checkout-modal-shipping-summary');
  const user = currentUser || auth.currentUser;

  let savedShip = null;
  try {
    const raw = localStorage.getItem('mr_customer_shipping_address');
    if (raw) savedShip = JSON.parse(raw);
  } catch(e) {}

  const defaultName = savedShip?.name || (user ? getUserDisplayName(user) : '') || '';
  const defaultEmail = savedShip?.email || localStorage.getItem('mr_customer_contact_email') || (user ? getUserEmail(user) : '') || '';
  const defaultPhone = savedShip?.phone || '';
  const defaultAddress = savedShip?.address || '';
  const defaultPostal = savedShip?.postalCode || '';
  const defaultCity = savedShip?.city || '';
  const defaultProvince = savedShip?.province || '';
  const defaultNotes = savedShip?.notes || '';

  if (shipContainer) {
    shipContainer.innerHTML = \`
      <div style="line-height: 1.45; color: #3d342c;">
        <!-- CAMPOS POSTALES ESTRUCTURADOS -->
        <div style="background: #ffffff; border: 1.5px solid #d8cfc0; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #473f36; margin-bottom: 3px;">Nombre y apellidos del destinatario *</label>
              <input type="text" id="checkout-ship-name" value="\${escapeHtml(defaultName)}" placeholder="Ej: Lucas Molina Gómez" oninput="updateCheckoutShippingSingleLine()" required style="width: 100%; font-size: 0.84rem; padding: 7px 10px; border: 1px solid #d4cbbd; border-radius: 6px; box-sizing: border-box; background: #faf8f5;">
            </div>
            <div>
              <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #473f36; margin-bottom: 3px;">Teléfono móvil (para el repartidor) *</label>
              <input type="tel" id="checkout-ship-phone" value="\${escapeHtml(defaultPhone)}" placeholder="Ej: 612 345 678" oninput="updateCheckoutShippingSingleLine()" required style="width: 100%; font-size: 0.84rem; padding: 7px 10px; border: 1px solid #d4cbbd; border-radius: 6px; box-sizing: border-box; background: #faf8f5;">
            </div>
          </div>

          <div style="background: #f4faf6; border: 1.5px solid #215c38; border-radius: 6px; padding: 9px 12px;">
            <label for="checkout-modal-customer-email" style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 800; color: #1e3d29; margin-bottom: 3px;">
              <span>📧</span> Email para confirmación y seguimiento de entrega *
            </label>
            <input type="email" id="checkout-modal-customer-email" value="\${escapeHtml(defaultEmail)}" placeholder="tu-email@ejemplo.com" oninput="updateCheckoutShippingSingleLine()" required style="width: 100%; font-size: 0.84rem; font-weight: 600; padding: 7px 10px; border: 1px solid #a3cfbb; border-radius: 5px; box-sizing: border-box; background: #ffffff; color: #143522;">
            <span style="display: block; font-size: 0.69rem; color: #4a5d52; margin-top: 3px;">
              Enviaremos aquí la factura digital y el seguimiento en vivo de Correos Express.
            </span>
          </div>

          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #473f36; margin-bottom: 3px;">Dirección completa (Calle, número, piso, puerta) *</label>
            <input type="text" id="checkout-ship-address" value="\${escapeHtml(defaultAddress)}" placeholder="Ej: Calle Velázquez 34, 4º Derecha" oninput="updateCheckoutShippingSingleLine()" required style="width: 100%; font-size: 0.84rem; padding: 7px 10px; border: 1px solid #d4cbbd; border-radius: 6px; box-sizing: border-box; background: #faf8f5;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1.3fr 1.3fr; gap: 10px;">
            <div>
              <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #473f36; margin-bottom: 3px;">C. Postal *</label>
              <input type="text" id="checkout-ship-postal" maxlength="5" value="\${escapeHtml(defaultPostal)}" placeholder="28001" oninput="updateCheckoutShippingSingleLine()" required style="width: 100%; font-size: 0.84rem; padding: 7px 10px; border: 1px solid #d4cbbd; border-radius: 6px; box-sizing: border-box; background: #faf8f5;">
            </div>
            <div>
              <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #473f36; margin-bottom: 3px;">Ciudad / Municipio *</label>
              <input type="text" id="checkout-ship-city" value="\${escapeHtml(defaultCity)}" placeholder="Madrid" oninput="updateCheckoutShippingSingleLine()" required style="width: 100%; font-size: 0.84rem; padding: 7px 10px; border: 1px solid #d4cbbd; border-radius: 6px; box-sizing: border-box; background: #faf8f5;">
            </div>
            <div>
              <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #473f36; margin-bottom: 3px;">Provincia *</label>
              <input type="text" id="checkout-ship-province" value="\${escapeHtml(defaultProvince)}" placeholder="Madrid" oninput="updateCheckoutShippingSingleLine()" required style="width: 100%; font-size: 0.84rem; padding: 7px 10px; border: 1px solid #d4cbbd; border-radius: 6px; box-sizing: border-box; background: #faf8f5;">
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #5a5147; margin-bottom: 3px;">Instrucciones para el repartidor (opcional):</label>
            <input type="text" id="checkout-modal-customer-notes" value="\${escapeHtml(defaultNotes)}" placeholder="Ej: Dejar en conserjería, llamar al 2ºB..." style="width: 100%; font-size: 0.80rem; padding: 7px 10px; border: 1px solid #dcd3c5; border-radius: 6px; box-sizing: border-box; background: #ffffff;">
          </div>
        </div>

        <!-- LÍNEA DE RESUMEN DE ENTREGA -->
        <div id="checkout-shipping-single-line-box" style="background: #faf7f2; border: 1px dashed #d6cbba; border-radius: 7px; padding: 10px 12px; margin-bottom: 12px; font-size: 0.79rem; color: #453c33; line-height: 1.45;">
          <div style="font-weight: 800; color: #87553b; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px;">
            📍 Resumen de Entrega en 1 línea:
          </div>
          <div id="checkout-shipping-single-line-text" style="font-size: 0.80rem; color: #1f1c19; word-break: break-word;">
            <!-- Rellenado dinámicamente -->
          </div>
        </div>

        <!-- CASILLA DE VALIDACIÓN COMPLETA DE DIRECCIÓN E EMAIL -->
        <div id="checkout-shipping-confirm-box" style="background: #fffdf5; border: 1.5px solid #e4d5bc; border-radius: 8px; padding: 12px 14px; margin-bottom: 6px; transition: all 0.25s;">
          <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 0.82rem; color: #231f1a; line-height: 1.45;">
            <input type="checkbox" id="checkout-ship-confirm-check" onchange="const b = document.getElementById('checkout-shipping-confirm-box'); if(b){ b.style.background = this.checked ? '#f0fdf4' : '#fffdf5'; b.style.borderColor = this.checked ? '#86efac' : '#e4d5bc'; }" style="margin-top: 3px; width: 18px; height: 18px; accent-color: #215c38; cursor: pointer;" />
            <span>
              <strong style="color: #1f1c19;">He comprobado la línea de entrega y valido que la dirección física y el email son exactos y completos.</strong>
              <span style="display: block; font-size: 0.74rem; color: #665b4f; margin-top: 2px;">
                Entiendo que el cuaderno se imprimirá y enviará físicamente por mensajería a esta dirección exacta.
              </span>
            </span>
          </label>
        </div>
      </div>
    \`;
    if (typeof window.updateCheckoutShippingSingleLine === 'function') {
      window.updateCheckoutShippingSingleLine();
    }
  }`;

if (content.includes(targetShipRender)) {
  content = content.replace(targetShipRender, newShipRender);
} else {
  console.error('✗ No se encontró targetShipRender');
}

// 3. Update handleConfirmCheckoutOrder validation and parsing
const targetOrderValidation = `  const user = currentUser || auth.currentUser;
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
  const customerPlatformEmail = specifiedEmail;

  const firstShip = selectedItems[0]?.shipping || {
    name: customerPlatformName,
    email: customerPlatformEmail,
    phone: '+34 600 000 000',
    address: 'Calle Serrano 42, 4º Derecha',
    postalCode: '28001',
    city: 'Madrid',
    province: 'Madrid',
    country: 'España',
    notes: deliveryNotes || 'Sin instrucciones adicionales'
  };
  if (deliveryNotes) firstShip.notes = deliveryNotes;
  firstShip.name = customerPlatformName;

  // Persistir dirección e instrucciones de entrega en el perfil del cliente
  try {
    localStorage.setItem('mr_customer_shipping_address', JSON.stringify(firstShip));
  } catch(e) {}`;

const newOrderValidation = `  const user = currentUser || auth.currentUser;
  const nameInp = document.getElementById('checkout-ship-name');
  const phoneInp = document.getElementById('checkout-ship-phone');
  const emailInp = document.getElementById('checkout-modal-customer-email');
  const addrInp = document.getElementById('checkout-ship-address');
  const postalInp = document.getElementById('checkout-ship-postal');
  const cityInp = document.getElementById('checkout-ship-city');
  const provInp = document.getElementById('checkout-ship-province');
  const notesInp = document.getElementById('checkout-modal-customer-notes');
  const chkShipConfirm = document.getElementById('checkout-ship-confirm-check');

  const shipName = nameInp ? nameInp.value.trim() : '';
  const shipPhone = phoneInp ? phoneInp.value.trim() : '';
  const shipEmail = emailInp ? emailInp.value.trim().toLowerCase() : '';
  const shipAddr = addrInp ? addrInp.value.trim() : '';
  const shipPostal = postalInp ? postalInp.value.trim() : '';
  const shipCity = cityInp ? cityInp.value.trim() : '';
  const shipProvince = provInp ? provInp.value.trim() : '';
  const deliveryNotes = notesInp ? notesInp.value.trim() : '';

  if (!shipName) {
    alert('Por favor, indica el nombre y apellidos del destinatario para la entrega.');
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = 'Confirmar Pedido';
    if (nameInp) nameInp.focus();
    return;
  }
  if (!shipPhone || shipPhone.length < 8) {
    alert('Por favor, introduce un teléfono móvil de contacto para que el transportista coordine la entrega.');
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = 'Confirmar Pedido';
    if (phoneInp) phoneInp.focus();
    return;
  }
  if (!shipEmail || !shipEmail.includes('@') || !shipEmail.includes('.')) {
    alert('Por favor, indica un email válido donde recibir la confirmación y el seguimiento del pedido.');
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = 'Confirmar Pedido';
    if (emailInp) emailInp.focus();
    return;
  }
  if (!shipAddr || shipAddr.length < 5) {
    alert('Por favor, introduce la dirección postal completa (calle, número, piso/puerta).');
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = 'Confirmar Pedido';
    if (addrInp) addrInp.focus();
    return;
  }
  if (!shipPostal || shipPostal.length < 4) {
    alert('Por favor, introduce un código postal válido.');
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = 'Confirmar Pedido';
    if (postalInp) postalInp.focus();
    return;
  }
  if (!shipCity) {
    alert('Por favor, introduce la ciudad o municipio de entrega.');
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = 'Confirmar Pedido';
    if (cityInp) cityInp.focus();
    return;
  }

  // Validación obligatoria del check de dirección y email
  if (chkShipConfirm && !chkShipConfirm.checked) {
    alert('⚠️ Por favor, revisa la línea de resumen de entrega y marca la casilla confirmando que la dirección física y el email son exactos.');
    const box = document.getElementById('checkout-shipping-confirm-box');
    if (box) {
      box.style.borderColor = '#dc2626';
      box.style.background = '#fef2f2';
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      chkShipConfirm.focus();
    }
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = 'Confirmar Pedido';
    return;
  }

  const shippingObj = {
    name: shipName,
    email: shipEmail,
    phone: shipPhone,
    address: shipAddr,
    postalCode: shipPostal,
    city: shipCity,
    province: shipProvince,
    country: 'España',
    notes: deliveryNotes || 'Sin instrucciones adicionales'
  };

  try {
    localStorage.setItem('mr_customer_shipping_address', JSON.stringify(shippingObj));
    localStorage.setItem('mr_customer_contact_email', shipEmail);
  } catch(e) {}

  const customerPlatformName = shipName;
  const customerPlatformEmail = shipEmail;
  const firstShip = shippingObj;`;

if (content.includes(targetOrderValidation)) {
  content = content.replace(targetOrderValidation, newOrderValidation);
} else {
  console.error('✗ No se encontró targetOrderValidation');
}

fs.writeFileSync(file, content, 'utf8');
console.log('✓ mi-espacio.js actualizado con formulario postal, resumen en 1 línea y check de validación');
