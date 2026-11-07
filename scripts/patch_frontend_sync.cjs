const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');

// =========================================================================
// 1. PATCH mi-espacio.js
// =========================================================================
const miEspacioPath = path.join(baseDir, 'mi-espacio.js');
let miEspacioCode = fs.readFileSync(miEspacioPath, 'utf8');

// Patch checkUrlTab to NEVER kick the user out of tab-pedidos on return or when viewing orders
const oldCheckUrlTab = `function checkUrlTab(allowDevTabs = false) {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const user = auth.currentUser;
  const isDevAllowed = isDeveloper(user) && allowDevTabs;
  const hasPending = !!localStorage.getItem('mr_pending_payment_books');
  const isOrdersAllowed = isDevAllowed || isTestCustomer(user) || hasPending;

  if (params.get('stripe_test_success') === '1') {
    const ordNum = params.get('order') || '';
    setTimeout(() => {
      showToast(\`✓ Pago Test completado · Pedido #\${ordNum} confirmado y emails enviados\`);
    }, 300);
  }

  if (tab === 'ajustes') {
    activateTab('tab-ajustes');
  } else if (tab === 'pedidos') {
    if (isOrdersAllowed) {
      const btnPed = document.getElementById('tab-btn-pedidos');
      if (btnPed) btnPed.style.setProperty('display', 'inline-flex', 'important');
      activateTab('tab-pedidos');
    } else {
      activateTab('tab-disenos');
    }
  } else if (tab === 'dev') {
    if (isDevAllowed) {
      if (tabBtnDev) tabBtnDev.style.setProperty('display', 'inline-flex', 'important');
      activateTab('tab-dev');
    } else {
      activateTab('tab-disenos');
    }
  } else if (tab === 'disenos') {
    activateTab('tab-disenos');
  } else if (tab === 'futuras') {
    if (isDevAllowed) {
      if (tabBtnFuturas) tabBtnFuturas.style.setProperty('display', 'inline-flex', 'important');
      activateTab('tab-futuras');
    } else {
      activateTab('tab-disenos');
    }
  }
}`;

const newCheckUrlTab = `function checkUrlTab(allowDevTabs = false) {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const user = auth.currentUser || currentUser;
  const isOrderReturn = params.get('stripe_success') === '1' || params.get('stripe_test_success') === '1' || !!params.get('order') || !!params.get('orderId');
  const isDevAllowed = isDeveloper(user);
  const isCustomer = isTestCustomer(user);
  const hasPending = !!localStorage.getItem('mr_pending_payment_books');
  const hasOrders = (clientProfileOrders && clientProfileOrders.length > 0) || !!localStorage.getItem('mr_simulated_orders');
  const isOrdersAllowed = isOrderReturn || hasOrders || hasPending || isDevAllowed || isCustomer;

  if (params.get('stripe_success') === '1' || params.get('stripe_test_success') === '1') {
    const ordNum = params.get('order') || '';
    setTimeout(() => {
      showToast('✓ Pago con tarjeta completado · Pedido #' + ordNum + ' confirmado');
    }, 300);
  }

  if (tab === 'pedidos' || isOrderReturn) {
    const btnPed = document.getElementById('tab-btn-pedidos');
    if (btnPed) btnPed.style.setProperty('display', 'inline-flex', 'important');
    activateTab('tab-pedidos');
    return;
  }

  if (tab === 'ajustes') {
    activateTab('tab-ajustes');
  } else if (tab === 'dev') {
    if (isDevAllowed && allowDevTabs) {
      if (tabBtnDev) tabBtnDev.style.setProperty('display', 'inline-flex', 'important');
      activateTab('tab-dev');
    } else {
      activateTab('tab-disenos');
    }
  } else if (tab === 'disenos') {
    activateTab('tab-disenos');
  } else if (tab === 'futuras') {
    if (isDevAllowed && allowDevTabs) {
      if (tabBtnFuturas) tabBtnFuturas.style.setProperty('display', 'inline-flex', 'important');
      activateTab('tab-futuras');
    } else {
      activateTab('tab-disenos');
    }
  }
}`;

if (miEspacioCode.includes('function checkUrlTab')) {
  miEspacioCode = miEspacioCode.replace(oldCheckUrlTab, newCheckUrlTab);
  console.log('✓ mi-espacio.js: checkUrlTab parcheado con acceso robusto a tab-pedidos');
}

// Patch loadClientOrdersAndBasketData to invoke subscribeToIndividualOrders
if (!miEspacioCode.includes('subscribeToIndividualOrders(clientProfileOrders);')) {
  miEspacioCode = miEspacioCode.replace(
    "clientProfileOrders.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));\n}",
    "clientProfileOrders.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));\n  subscribeToIndividualOrders(clientProfileOrders);\n}"
  );
  console.log('✓ mi-espacio.js: subscribeToIndividualOrders conectado en loadClientOrdersAndBasketData');
}

// Patch checkAndHandleStripeCheckoutReturn to use server order and clean basket
const oldReturnHandle = `      try {
        if (newOrder.orderNumber) {
          await setDoc(doc(db, 'orders', newOrder.orderNumber), newOrder, { merge: true });
        }
        if (newOrder.id && newOrder.id !== newOrder.orderNumber) {
          await setDoc(doc(db, 'orders', newOrder.id), newOrder, { merge: true });
        }
        if (user && user.uid) {
          await setDoc(doc(db, 'users', user.uid, 'orders', newOrder.orderNumber), newOrder, { merge: true });
        }
      } catch(e) {}

      // Emitir evento instantáneo a la ventana del gestor
      if (orderSyncChannel) {
        orderSyncChannel.postMessage({ type: 'ORDER_CREATED', order: newOrder });
      }

      clientProfileOrders.unshift(newOrder);
      try {
        localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders));
      } catch(e) {}

      try {
        await sendOrderLifecycleEmails(newOrder, 'order_created');
      } catch(e) {}

      showToast(\`🎉 ¡Pago completado con éxito en Stripe! Pedido #\${orderNumber} registrado.\`);
      
      // Limpiar URL
      try {
        window.history.replaceState({}, document.title, \`/mi-espacio.html?tab=pedidos&orderId=\${encodeURIComponent(orderNumber)}\`);
      } catch(e) {}

      renderClientOrdersAndBasketViews(user);`;

const newReturnHandle = `      const finalOrder = (stripeData && stripeData.order) ? stripeData.order : newOrder;

      try {
        if (finalOrder.orderNumber) {
          await setDoc(doc(db, 'orders', finalOrder.orderNumber), finalOrder, { merge: true });
        }
        if (user && user.uid) {
          await setDoc(doc(db, 'users', user.uid, 'orders', finalOrder.orderNumber), finalOrder, { merge: true });
        }
      } catch(e) {}

      // Emitir evento instantáneo a la ventana del gestor
      if (orderSyncChannel) {
        orderSyncChannel.postMessage({ type: 'ORDER_CREATED', order: finalOrder });
      }

      const existingIdx = clientProfileOrders.findIndex(o => (o.orderNumber === finalOrder.orderNumber || o.id === finalOrder.id));
      if (existingIdx >= 0) {
        clientProfileOrders[existingIdx] = mergeOrderRecords(clientProfileOrders[existingIdx], finalOrder);
      } else {
        clientProfileOrders.unshift(finalOrder);
      }
      try {
        localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders));
      } catch(e) {}

      subscribeToIndividualOrders([finalOrder]);

      showToast('🎉 ¡Pago completado con éxito en Stripe! Pedido #' + orderNumber + ' registrado.');

      try {
        window.history.replaceState({}, document.title, '/mi-espacio.html?tab=pedidos&orderId=' + encodeURIComponent(orderNumber));
      } catch(e) {}

      renderClientOrdersAndBasketViews(user || auth.currentUser || currentUser);
      activateTab('tab-pedidos');`;

if (miEspacioCode.includes('showToast(`🎉 ¡Pago completado con éxito en Stripe! Pedido #${orderNumber} registrado.`);')) {
  miEspacioCode = miEspacioCode.replace(oldReturnHandle, newReturnHandle);
  console.log('✓ mi-espacio.js: checkAndHandleStripeCheckoutReturn actualizado con finalOrder y activación de tab-pedidos');
}

fs.writeFileSync(miEspacioPath, miEspacioCode, 'utf8');

// =========================================================================
// 2. PATCH admin-pedidos.js
// =========================================================================
const adminPedidosPath = path.join(baseDir, 'admin-pedidos.js');
let adminCode = fs.readFileSync(adminPedidosPath, 'utf8');

// Deduplicate maps cleanly
adminCode = adminCode.replace(
  "localSim.forEach(o => map.set(o.id || o.orderNumber, o));\n  loaded.forEach(o => map.set(o.id || o.orderNumber, o));",
  "localSim.forEach(o => { const k = o.orderNumber || o.id; if (k) map.set(k, mergeOrderRecords(map.get(k), o)); });\n  loaded.forEach(o => { const k = o.orderNumber || o.id; if (k) map.set(k, mergeOrderRecords(map.get(k), o)); });"
);

fs.writeFileSync(adminPedidosPath, adminCode, 'utf8');
console.log('✓ admin-pedidos.js: mapa deduplicado por orderNumber');
