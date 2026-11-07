const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'mi-espacio.js');
let code = fs.readFileSync(filePath, 'utf8');

// Buscamos desde // Calcular total acumulado de todos los libros hasta el final de handleConfirmCheckoutOrder
const targetStart = '  // Calcular total acumulado de todos los libros';
const targetEnd = '  closeBasketCheckoutModal();\n  renderClientOrdersAndBasketViews(user || auth.currentUser);\n  showToast(`🎉 ¡Pedido #${orderNumber} confirmado con éxito! Entrando en Revisión Técnica.`);\n\n  // Llevar a la vista del pedido\n  setTimeout(() => {\n    const card = document.getElementById(\'order-card-\' + orderNumber);\n    if (card) {\n      card.scrollIntoView({ behavior: \'smooth\', block: \'center\' });\n    }\n  }, 400);\n}';

const targetEndCRLF = targetEnd.replace(/\n/g, '\r\n');

// Nueva lógica de pago con Stripe Checkout oficial
const newLogic = `  // Calcular total acumulado de todos los libros
  let totalAmount = 0;
  selectedItems.forEach(it => {
    const q = typeof it.quantity === 'number' ? it.quantity : 1;
    totalAmount += calcDynamicPriceForProfile(it.bindingType, it.pageCount) * q;
  });

  const orderNumber = 'MR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const primaryItem = selectedItems[0];
  const pageCount = primaryItem.pageCount || 144;
  const spineWidth = (pageCount * 0.057).toFixed(1);

  // Guardar datos temporales del pedido para el retorno de la pasarela Stripe
  const activeCheckoutOrder = {
    orderNumber,
    items: selectedItems,
    customer: {
      uid: user?.uid || (auth.currentUser ? auth.currentUser.uid : ''),
      name: customerPlatformName,
      email: customerPlatformEmail.toLowerCase().trim(),
      phone: firstShip.phone || '+34 600 000 000',
      address: firstShip.address,
      postalCode: firstShip.postalCode,
      city: firstShip.city,
      province: firstShip.province,
      country: 'España',
      notes: firstShip.notes || 'Sin instrucciones adicionales'
    },
    deliveryNotes: firstShip.notes || 'Sin instrucciones adicionales',
    totalAmount,
    createdAt: new Date().toISOString()
  };

  try {
    localStorage.setItem('mr_active_checkout_order', JSON.stringify(activeCheckoutOrder));
  } catch(e) {}

  // Iniciar sesión segura en Stripe Checkout
  try {
    const idToken = user ? await user.getIdToken() : '';
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': \`Bearer \${idToken}\` } : {})
      },
      body: JSON.stringify({
        items: selectedItems,
        bookTitle: primaryItem.title,
        bookSubtitle: primaryItem.subtitle || 'Edición Personalizada',
        bindingType: primaryItem.bindingType || 'softcover',
        pageCount: pageCount,
        customerName: firstShip.name,
        customerEmail: firstShip.email,
        customerPhone: firstShip.phone,
        address: firstShip.address,
        postalCode: firstShip.postalCode,
        city: firstShip.city,
        province: firstShip.province,
        notes: firstShip.notes || '',
        returnOrigin: window.location.origin
      })
    });

    const data = await res.json();
    if (!res.ok || !data.checkoutUrl) {
      throw new Error(data.error || 'No se pudo iniciar la sesión de pago con tarjeta en Stripe.');
    }

    // Redirigir a la pasarela segura de pago
    window.location.href = data.checkoutUrl;
    return;
  } catch (err) {
    console.error('Error al iniciar pago con Stripe:', err);
    alert('⚠️ No se pudo conectar con la pasarela de pago: ' + (err.message || 'Inténtalo de nuevo en unos instantes.'));
    if (confirmBtn) confirmBtn.disabled = false;
    if (confirmTxt) confirmTxt.textContent = \`Pagar con Tarjeta · \${totalAmount.toFixed(2).replace('.', ',')} € (Envío incluido)\`;
    return;
  }
}`;

const startIndex = code.indexOf(targetStart);
let endIndex = code.indexOf(targetEnd);
let isCRLF = false;

if (endIndex === -1) {
  endIndex = code.indexOf(targetEndCRLF);
  isCRLF = true;
}

if (startIndex !== -1 && endIndex !== -1) {
  const matchLen = isCRLF ? targetEndCRLF.length : targetEnd.length;
  code = code.substring(0, startIndex) + (isCRLF ? newLogic.replace(/\n/g, '\r\n') : newLogic) + code.substring(endIndex + matchLen);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('mi-espacio.js actualizado con Stripe Checkout.');
} else {
  console.warn('No se encontraron los delimitadores en mi-espacio.js');
}
