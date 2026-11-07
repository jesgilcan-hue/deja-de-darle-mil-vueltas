const fs = require('fs');

// 1. UPDATE mi-espacio.html: Add email and notes fields to #ajustes-address-card
const fileHtml = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/mi-espacio.html';
let contentHtml = fs.readFileSync(fileHtml, 'utf8').replace(/\r\n/g, '\n');

const oldAddressRow1 = `                                  <div class="form-group-row">
                                      <div class="form-group" style="flex:1;">
                                          <label for="ajustes-shipping-name">Destinatario / Nombre completo</label>
                                          <input type="text" id="ajustes-shipping-name" placeholder="Nombre y dos apellidos" />
                                      </div>
                                      <div class="form-group" style="flex:1;">
                                          <label for="ajustes-shipping-phone">Teléfono de contacto (Móvil)</label>
                                          <input type="tel" id="ajustes-shipping-phone" placeholder="+34 600 000 000" />
                                      </div>
                                  </div>`;

const newAddressRow1 = `                                  <div class="form-group-row">
                                      <div class="form-group" style="flex:1.2;">
                                          <label for="ajustes-shipping-name">Destinatario / Nombre completo *</label>
                                          <input type="text" id="ajustes-shipping-name" placeholder="Nombre y dos apellidos" required />
                                      </div>
                                      <div class="form-group" style="flex:1.2;">
                                          <label for="ajustes-shipping-email">Email de confirmación y seguimiento *</label>
                                          <input type="email" id="ajustes-shipping-email" placeholder="tu-email@ejemplo.com" required />
                                      </div>
                                      <div class="form-group" style="flex:1;">
                                          <label for="ajustes-shipping-phone">Teléfono móvil (repartidor) *</label>
                                          <input type="tel" id="ajustes-shipping-phone" placeholder="+34 600 000 000" required />
                                      </div>
                                  </div>`;

const oldProvinceRow = `                                      <div class="form-group" style="flex:1;">
                                          <label for="ajustes-shipping-province">Provincia</label>
                                          <input type="text" id="ajustes-shipping-province" placeholder="Madrid" />
                                      </div>
                                  </div>`;

const newProvinceRow = `                                      <div class="form-group" style="flex:1;">
                                          <label for="ajustes-shipping-province">Provincia *</label>
                                          <input type="text" id="ajustes-shipping-province" placeholder="Madrid" required />
                                      </div>
                                  </div>
                                  <div class="form-group" style="margin-top: 12px;">
                                      <label for="ajustes-shipping-notes">Instrucciones para el repartidor (opcional)</label>
                                      <input type="text" id="ajustes-shipping-notes" placeholder="Ej: Dejar en conserjería, llamar al telefonillo..." />
                                  </div>`;

if (contentHtml.includes(oldAddressRow1)) {
  contentHtml = contentHtml.replace(oldAddressRow1, newAddressRow1);
} else {
  console.log('Notice: oldAddressRow1 already replaced or not found');
}

if (contentHtml.includes(oldProvinceRow)) {
  contentHtml = contentHtml.replace(oldProvinceRow, newProvinceRow);
} else {
  console.log('Notice: oldProvinceRow already replaced or not found');
}

fs.writeFileSync(fileHtml, contentHtml, 'utf8');
console.log('✓ mi-espacio.html actualizado con campos de email y notas en Ajustes');

// 2. UPDATE mi-espacio.js:
const fileJs = 'c:/Users/IA/Documents/Antigravity/MENOS RUIDO/web/web-menos-ruido/mi-espacio.js';
let contentJs = fs.readFileSync(fileJs, 'utf8').replace(/\r\n/g, '\n');

// 2a. Update executeSaveDirecciones to read email and notes
const oldSaveDir = `    const name = document.getElementById('ajustes-shipping-name')?.value.trim();
    const phone = document.getElementById('ajustes-shipping-phone')?.value.trim();
    const address = document.getElementById('ajustes-shipping-address')?.value.trim();
    const postalCode = document.getElementById('ajustes-shipping-zip')?.value.trim();
    const city = document.getElementById('ajustes-shipping-city')?.value.trim();
    const province = document.getElementById('ajustes-shipping-province')?.value.trim();
    const notes = document.getElementById('ajustes-shipping-notes')?.value.trim() || '';`;

const newSaveDir = `    const name = document.getElementById('ajustes-shipping-name')?.value.trim();
    const email = document.getElementById('ajustes-shipping-email')?.value.trim().toLowerCase() || (currentUser ? getUserEmail(currentUser) : '');
    const phone = document.getElementById('ajustes-shipping-phone')?.value.trim();
    const address = document.getElementById('ajustes-shipping-address')?.value.trim();
    const postalCode = document.getElementById('ajustes-shipping-zip')?.value.trim();
    const city = document.getElementById('ajustes-shipping-city')?.value.trim();
    const province = document.getElementById('ajustes-shipping-province')?.value.trim();
    const notes = document.getElementById('ajustes-shipping-notes')?.value.trim() || '';`;

if (contentJs.includes(oldSaveDir)) {
  contentJs = contentJs.replace(oldSaveDir, newSaveDir);
}

// 2b. Include email in shippingData
const oldShippingData = `    const shippingData = {
      name,
      nombre: name,
      phone,
      telefono: phone,
      address,
      direccion: address,
      postalCode,
      cp: postalCode,
      city,
      ciudad: city,
      province,
      provincia: province,
      notes,
      notas: notes,
      pais: 'España',
      updatedAt: new Date().toISOString()
    };`;

const newShippingData = `    const shippingData = {
      name,
      nombre: name,
      email,
      phone,
      telefono: phone,
      address,
      direccion: address,
      postalCode,
      cp: postalCode,
      city,
      ciudad: city,
      province,
      provincia: province,
      notes,
      notas: notes,
      pais: 'España',
      updatedAt: new Date().toISOString()
    };
    try { localStorage.setItem('mr_customer_contact_email', email); } catch(e) {}`;

if (contentJs.includes(oldShippingData)) {
  contentJs = contentJs.replace(oldShippingData, newShippingData);
}

// 2c. Update populateUserData to populate email and notes in Ajustes
const oldPopulate = `    setVal('ajustes-shipping-name', shipping.nombre || shipping.name);
    setVal('ajustes-shipping-phone', shipping.telefono || shipping.phone);
    setVal('ajustes-shipping-address', shipping.direccion || shipping.address);
    setVal('ajustes-shipping-zip', shipping.cp || shipping.postalCode);
    setVal('ajustes-shipping-city', shipping.ciudad || shipping.city);
    setVal('ajustes-shipping-province', shipping.provincia || shipping.province);`;

const newPopulate = `    setVal('ajustes-shipping-name', shipping.nombre || shipping.name);
    setVal('ajustes-shipping-email', shipping.email || getUserEmail(user));
    setVal('ajustes-shipping-phone', shipping.telefono || shipping.phone);
    setVal('ajustes-shipping-address', shipping.direccion || shipping.address);
    setVal('ajustes-shipping-zip', shipping.cp || shipping.postalCode);
    setVal('ajustes-shipping-city', shipping.ciudad || shipping.city);
    setVal('ajustes-shipping-province', shipping.provincia || shipping.province);
    setVal('ajustes-shipping-notes', shipping.notas || shipping.notes || '');`;

if (contentJs.includes(oldPopulate)) {
  contentJs = contentJs.replace(oldPopulate, newPopulate);
}

// 2d. Add closeBasketCheckoutModalAndGoToAjustes function
const helperFunc = `window.closeBasketCheckoutModalAndGoToAjustes = function() {
  closeBasketCheckoutModal();
  const tabBtn = document.querySelector('button[data-tab="tab-ajustes"]');
  if (tabBtn) tabBtn.click();
  const addressCard = document.getElementById('ajustes-address-card');
  if (addressCard) {
    addressCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const inp = document.getElementById('ajustes-shipping-address') || document.getElementById('ajustes-shipping-name');
    if (inp) inp.focus();
  }
};
`;

if (!contentJs.includes('window.closeBasketCheckoutModalAndGoToAjustes')) {
  contentJs = helperFunc + '\n' + contentJs;
}

// 2e. Update openBasketCheckoutModal to render CLEAN 1-LINE SUMMARY & CHECKBOX (NO BULKY FORMS!)
const shipContainerRegex = /\/\/ 2\. Renderizar formulario estructurado de dirección postal[\s\S]*?if \(typeof window\.updateCheckoutShippingSingleLine === 'function'\) \{\s*window\.updateCheckoutShippingSingleLine\(\);\s*\}/;

const cleanModalShippingRender = `  // 2. Renderizar resumen limpio de dirección postal en 1 línea y check de validación
  const shipContainer = document.getElementById('checkout-modal-shipping-summary');
  const user = currentUser || auth.currentUser;

  let savedShip = null;
  try {
    const raw = localStorage.getItem('mr_customer_shipping_address');
    if (raw) savedShip = JSON.parse(raw);
  } catch(e) {}

  const shipName = savedShip?.name || savedShip?.nombre || (user ? getUserDisplayName(user) : '') || '';
  const shipEmail = savedShip?.email || localStorage.getItem('mr_customer_contact_email') || (user ? getUserEmail(user) : '') || '';
  const shipPhone = savedShip?.phone || savedShip?.telefono || '';
  const shipAddr = savedShip?.address || savedShip?.direccion || '';
  const shipPostal = savedShip?.postalCode || savedShip?.cp || '';
  const shipCity = savedShip?.city || savedShip?.ciudad || '';
  const shipProv = savedShip?.province || savedShip?.provincia || '';
  const shipNotes = savedShip?.notes || savedShip?.notas || '';

  const hasFullAddress = !!(shipName && shipAddr && shipPostal && shipCity);

  if (shipContainer) {
    if (!hasFullAddress) {
      shipContainer.innerHTML = \`
        <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 14px 16px; text-align: center;">
          <div style="font-size: 0.88rem; font-weight: 800; color: #92400e; margin-bottom: 5px;">
            ⚠️ Falta completar tu dirección física de entrega
          </div>
          <p style="font-size: 0.79rem; color: #78350f; margin: 0 0 10px 0; line-height: 1.4;">
            Para imprimir y enviarte el cuaderno por mensajería, necesitamos tu dirección postal completa guardada en tu perfil.
          </p>
          <button type="button" onclick="closeBasketCheckoutModalAndGoToAjustes()" style="background: #87553b; color: #ffffff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <span>📍</span> Rellenar Dirección en «Ajustes y Mis Datos» →
          </button>
        </div>
      \`;
    } else {
      const lineHtml = \`<strong>\${escapeHtml(shipName)}</strong> · \${escapeHtml(shipAddr)}, \${escapeHtml(shipPostal)} \${escapeHtml(shipCity)}\${shipProv ? ' (' + escapeHtml(shipProv) + ')' : ''} · Tlf: <strong>\${escapeHtml(shipPhone || 'No indicado')}</strong> · Email: <strong>\${escapeHtml(shipEmail || 'No indicado')}</strong>\`;

      shipContainer.innerHTML = \`
        <div style="background: #ffffff; border: 1.5px solid #ded5c6; border-radius: 10px; padding: 13px 15px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
            <span style="font-size: 0.73rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #87553b;">
              📍 Dirección de Entrega Física
            </span>
            <button type="button" onclick="closeBasketCheckoutModalAndGoToAjustes()" style="background: none; border: none; color: #2563eb; font-weight: 700; font-size: 0.78rem; cursor: pointer; text-decoration: underline; padding: 0; display: inline-flex; align-items: center; gap: 4px;">
              ✏️ Modificar en «Ajustes y Mis Datos» →
            </button>
          </div>

          <!-- Línea única limpia -->
          <div style="background: #faf7f2; border: 1px solid #e7dfd1; border-radius: 6px; padding: 10px 12px; font-size: 0.82rem; color: #1f1c19; line-height: 1.55; word-break: break-word;">
            \${lineHtml}
          </div>

          \${shipNotes ? \`<div style="font-size: 0.74rem; color: #665e54; margin-top: 6px;">ℹ️ Instrucciones repartidor: <em>\${escapeHtml(shipNotes)}</em></div>\` : ''}

          <!-- Casilla obligatoria de validación completa -->
          <div id="checkout-shipping-confirm-box" style="margin-top: 12px; background: #fffdf5; border: 1.5px solid #e4d5bc; border-radius: 8px; padding: 11px 13px; transition: all 0.25s;">
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
    }
  }`;

if (shipContainerRegex.test(contentJs)) {
  contentJs = contentJs.replace(shipContainerRegex, cleanModalShippingRender);
  console.log('✓ Renderizado limpio de dirección en el pop-up sustituido');
} else {
  console.log('Notice: shipContainerRegex did not match directly, trying manual replace');
}

// 2f. Update handleConfirmCheckoutOrder to read savedShip
const oldConfirmShipValidation = /const nameInp = document\.getElementById\('checkout-ship-name'\);[\s\S]*?const firstShip = shippingObj;/;

const newConfirmShipValidation = `  let savedShip = null;
  try {
    const raw = localStorage.getItem('mr_customer_shipping_address');
    if (raw) savedShip = JSON.parse(raw);
  } catch(e) {}

  const shipName = savedShip?.name || savedShip?.nombre || (user ? getUserDisplayName(user) : '') || '';
  const shipEmail = savedShip?.email || localStorage.getItem('mr_customer_contact_email') || (user ? getUserEmail(user) : '') || '';
  const shipPhone = savedShip?.phone || savedShip?.telefono || '';
  const shipAddr = savedShip?.address || savedShip?.direccion || '';
  const shipPostal = savedShip?.postalCode || savedShip?.cp || '';
  const shipCity = savedShip?.city || savedShip?.ciudad || '';
  const shipProv = savedShip?.province || savedShip?.provincia || '';
  const shipNotes = savedShip?.notes || savedShip?.notas || '';

  if (!shipName || !shipAddr || !shipPostal || !shipCity) {
    alert('⚠️ Por favor, introduce tu dirección de entrega en «Ajustes y Mis Datos» antes de tramitar el pedido.');
    closeBasketCheckoutModalAndGoToAjustes();
    if (confirmBtn) confirmBtn.disabled = false;
    return;
  }

  const chkShipConfirm = document.getElementById('checkout-ship-confirm-check');
  if (chkShipConfirm && !chkShipConfirm.checked) {
    alert('⚠️ Por favor, revisa la línea de entrega y marca la casilla confirmando que los datos son exactos.');
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
    province: shipProv,
    country: 'España',
    notes: shipNotes || 'Sin instrucciones adicionales'
  };

  const customerPlatformName = shipName;
  const customerPlatformEmail = shipEmail;
  const firstShip = shippingObj;`;

if (oldConfirmShipValidation.test(contentJs)) {
  contentJs = contentJs.replace(oldConfirmShipValidation, newConfirmShipValidation);
  console.log('✓ Validación de orden en handleConfirmCheckoutOrder actualizada');
}

fs.writeFileSync(fileJs, contentJs, 'utf8');
console.log('✓ mi-espacio.js actualizado exitosamente');
