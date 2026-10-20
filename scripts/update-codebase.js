import fs from 'fs';
import path from 'path';

const webDir = 'c:\\Users\\IA\\Documents\\Antigravity\\MENOS RUIDO\\web\\web-menos-ruido';

// =========================================================================
// 1. ACTUALIZAR ADMIN-PEDIDOS.JS
// =========================================================================
const adminPedidosPath = path.join(webDir, 'admin-pedidos.js');
let adminCode = fs.readFileSync(adminPedidosPath, 'utf8');

// Añadir import where si falta
if (!adminCode.includes('where,')) {
  adminCode = adminCode.replace(/import\s*\{\s*collection,/, 'import {\r\n  collection,\r\n  where,');
}

// Botones de descarga directa en las tarjetas de pedido
const oldPreviewBtn = `<div style="display:flex; gap:8px; margin-top:12px;">\r\n          <button type="button" class="btn-order-secondary" style="flex:1;" onclick="openPdfPreviewModal('\${order.id || order.orderNumber}')">\r\n            <span>👁️</span> Previsualizar PDFs\r\n          </button>\r\n        </div>`;

const newPreviewBtns = `<div style="display:flex; gap:6px; margin-top:12px; flex-wrap:wrap;">\r\n          <button type="button" class="btn-order-secondary" style="flex:1; min-width:115px; font-weight:700;" onclick="downloadOrderCoverPdf('\${order.id || order.orderNumber}')" title="Descargar Portada PDF (300 DPI imprenta)">\r\n            <span>📥</span> Portada PDF\r\n          </button>\r\n          <button type="button" class="btn-order-secondary" style="flex:1; min-width:115px; font-weight:700;" onclick="downloadOrderInteriorPdf('\${order.id || order.orderNumber}')" title="Descargar Interior PDF (Vectorial imprenta)">\r\n            <span>📥</span> Interior PDF\r\n          </button>\r\n          <button type="button" class="btn-order-secondary" style="padding:6px 10px;" onclick="openPdfPreviewModal('\${order.id || order.orderNumber}')" title="Inspección técnica preflight">\r\n            <span>🔍</span> Preflight\r\n          </button>\r\n        </div>`;

if (adminCode.includes(oldPreviewBtn)) {
  adminCode = adminCode.replace(oldPreviewBtn, newPreviewBtns);
  console.log('✓ Botones de descarga directa añadidos a las tarjetas de admin-pedidos');
}

// Funciones de descarga directa global
if (!adminCode.includes('window.downloadOrderCoverPdf')) {
  const downloadFns = `
// =========================================================================
// DESCARGA DIRECTA DE ARCHIVOS PDF DE IMPRENTA
// =========================================================================
window.downloadOrderCoverPdf = function(orderId) {
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;
  try {
    localStorage.setItem('mr_cart_cover_item', JSON.stringify({
      title: order.book?.title,
      bindingType: order.book?.bindingType || 'softcover',
      pageCount: order.book?.pageCount || 144,
      syncedBookName: order.book?.subtitle || order.book?.title,
      data: order.book?.data || {},
      updatedAt: Date.now()
    }));
  } catch(e) {}
  showToast(\`📥 Descargando Portada PDF del pedido #\${order.orderNumber}...\`);
  window.open(\`/generador-portadas.html?download_direct=1&orderId=\${encodeURIComponent(order.orderNumber)}&title=\${encodeURIComponent(order.book?.title || '')}&pages=\${order.book?.pageCount || 144}&binding=\${order.book?.bindingType || 'softcover'}\`, '_blank');
};

window.downloadOrderInteriorPdf = function(orderId) {
  const order = allOrders.find(o => (o.id || o.orderNumber) === orderId);
  if (!order) return;
  try {
    localStorage.setItem('mr_complete_book_config', JSON.stringify({
      title: order.book?.title,
      subtitle: order.book?.subtitle,
      pageCount: order.book?.pageCount || 144,
      bindingType: order.book?.bindingType || 'softcover',
      data: order.book?.data || {}
    }));
  } catch(e) {}
  showToast(\`📥 Descargando Interior PDF del pedido #\${order.orderNumber}...\`);
  window.open(\`/generador-libro-completo.html?download_direct=1&orderId=\${encodeURIComponent(order.orderNumber)}&pages=\${order.book?.pageCount || 144}&binding=\${order.book?.bindingType || 'softcover'}\`, '_blank');
};
`;
  adminCode = adminCode.replace('// 6. MODALES:', downloadFns + '\r\n// 6. MODALES:');
  console.log('✓ Funciones downloadOrderCoverPdf y downloadOrderInteriorPdf añadidas a admin-pedidos');
}

// Sincronización en la nube con Firestore y con users/{uid}/orders
const oldSaveRegex = /\/\/ Si hay usuario dev en Firebase, guardar también en Firestore[\s\S]*?\}\s*\}\s*\}/;
const newSaveImpl = `// Guardar en Firestore en la nube para sincronización en tiempo real
  if ((auth.currentUser && isDeveloper(auth.currentUser)) || isAuthorized || isLocalDev()) {
    allOrders.forEach(async (o) => {
      try {
        if (o.orderNumber) {
          await setDoc(doc(db, 'orders', o.orderNumber), o, { merge: true });
        }
        if (o.id && o.id !== o.orderNumber) {
          await setDoc(doc(db, 'orders', o.id), o, { merge: true });
        }
        if (o.customer?.uid) {
          await setDoc(doc(db, 'users', o.customer.uid, 'orders', o.orderNumber || o.id), o, { merge: true });
        } else if (o.customer?.email) {
          try {
            const usersQ = query(collection(db, 'users'), where('email', '==', o.customer.email.toLowerCase().trim()));
            const uSnap = await getDocs(usersQ);
            uSnap.forEach(async uDoc => {
              if (!o.customer) o.customer = {};
              o.customer.uid = uDoc.id;
              await setDoc(doc(db, 'users', uDoc.id, 'orders', o.orderNumber || o.id), o, { merge: true });
            });
          } catch(e) {}
        }
      } catch (e) {
        console.warn('Aviso guardando en Firestore:', e);
      }
    });
  }`;

if (oldSaveRegex.test(adminCode)) {
  adminCode = adminCode.replace(oldSaveRegex, newSaveImpl);
  console.log('✓ saveOrdersState actualizado para sincronizar en users/{uid}/orders');
}

fs.writeFileSync(adminPedidosPath, adminCode, 'utf8');

// =========================================================================
// 2. ACTUALIZAR MI-ESPACIO.JS
// =========================================================================
const miEspacioPath = path.join(webDir, 'mi-espacio.js');
let miCode = fs.readFileSync(miEspacioPath, 'utf8');

// Añadir where a imports si falta
if (!miCode.includes('where,')) {
  miCode = miCode.replace(/import\s*\{\s*doc,/, 'import {\r\n  doc,\r\n  where,');
}

// Asegurar que el tab de pedidos siempre sea visible
const oldTabHide = `if (tabBtnPedidos) tabBtnPedidos.style.setProperty('display', 'none', 'important');`;
const newTabShow = `if (tabBtnPedidos) { tabBtnPedidos.style.removeProperty('display'); tabBtnPedidos.style.setProperty('display', 'inline-flex', 'important'); }`;
if (miCode.includes(oldTabHide)) {
  miCode = miCode.replaceAll(oldTabHide, newTabShow);
  console.log('✓ Pestaña Mis Pedidos y Cesta desbloqueada para todos los usuarios');
}

// Eliminar restricción en initClientOrdersAndBasketModule
const oldInitRestrict = `  const hasPending = !!localStorage.getItem('mr_pending_payment_books') || !!localStorage.getItem('mr_cart_cover_item');\r\n  if (!user && !hasPending) return;\r\n  if (user && !isDeveloper(user) && !isTestCustomer(user) && !hasPending) return;`;
const newInitAllow = `  // Inicializar siempre para escuchar pedidos y cesta del usuario\r\n  const tabBtnPedidos = document.getElementById('tab-btn-pedidos');\r\n  if (tabBtnPedidos) {\r\n    tabBtnPedidos.style.removeProperty('display');\r\n    tabBtnPedidos.style.setProperty('display', 'inline-flex', 'important');\r\n  }`;

if (miCode.includes(oldInitRestrict)) {
  miCode = miCode.replace(oldInitRestrict, newInitAllow);
  console.log('✓ Restricción de inicialización eliminada en initClientOrdersAndBasketModule');
}

// Asegurar que el customer.uid se guarde al crear pedido
const oldCustAssign = `customer: {\r\n          name: stripeData?.customerName || activeData?.customer?.name || (user ? getUserDisplayName(user) : 'Cliente'),`;
const newCustAssign = `customer: {\r\n          uid: user?.uid || (auth.currentUser ? auth.currentUser.uid : ''),\r\n          name: stripeData?.customerName || activeData?.customer?.name || (user ? getUserDisplayName(user) : 'Cliente'),`;

if (miCode.includes(oldCustAssign)) {
  miCode = miCode.replace(oldCustAssign, newCustAssign);
  console.log('✓ customer.uid vinculado al pedido creado en mi-espacio');
}

// Sincronización en tiempo real para cliente (escuchar colección users/{uid}/orders y orders)
const oldOrdersSnap = `if (!window.__mrOrdersCollectionSnapshotUnsub && user && (isDeveloper(user) || isTestCustomer(user))) {`;
const newOrdersSnap = `// Escucha permanente en tiempo real de pedidos para cualquier cliente autenticado\r\n  if (user && user.uid && !window.__mrUserOrdersSnapshotUnsub) {\r\n    try {\r\n      window.__mrUserOrdersSnapshotUnsub = onSnapshot(collection(db, 'users', user.uid, 'orders'), (snap) => {\r\n        const remote = [];\r\n        snap.forEach(d => remote.push({ id: d.id, ...d.data() }));\r\n        if (remote.length > 0) {\r\n          const map = new Map();\r\n          clientProfileOrders.forEach(o => { const key = o.orderNumber || o.id; map.set(key, o); });\r\n          remote.forEach(o => {\r\n            const key = o.orderNumber || o.id;\r\n            const prev = map.get(key);\r\n            const merged = mergeOrderRecords(prev, o);\r\n            map.set(key, merged);\r\n            if (prev && prev.status !== o.status) {\r\n              const labels = { pending_review: '1. Revisión Técnica', approved_printing: '2. En Imprenta', printing: '2. En Imprenta', shipped: '3. En Reparto (Correos Express)', delivered: '4. Entregado' };\r\n              showToast(\`⚡ Pedido #\${o.orderNumber}: Estado actualizado a «\${labels[o.status] || o.status}»\`);\r\n            }\r\n          });\r\n          clientProfileOrders = Array.from(map.values());\r\n          clientProfileOrders.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));\r\n          try { localStorage.setItem('mr_simulated_orders', JSON.stringify(clientProfileOrders)); } catch (e) {}\r\n          renderClientOrdersAndBasketViews(auth.currentUser || user);\r\n        }\r\n      }, (err) => { console.warn('Aviso en onSnapshot users/orders:', err); });\r\n    } catch (e) {}\r\n  }\r\n\r\n  if (!window.__mrOrdersCollectionSnapshotUnsub && user && (isDeveloper(user) || isTestCustomer(user))) {`;

if (miCode.includes(oldOrdersSnap)) {
  miCode = miCode.replace(oldOrdersSnap, newOrdersSnap);
  console.log('✓ Escucha onSnapshot de users/{uid}/orders activa para cliente');
}

fs.writeFileSync(miEspacioPath, miCode, 'utf8');

// =========================================================================
// 3. ACTUALIZAR GENERADOR-PORTADAS.HTML (PÁGINAS PARES POR DEFECTO)
// =========================================================================
const portadasPath = path.join(webDir, 'generador-portadas.html');
let portadasHtml = fs.readFileSync(portadasPath, 'utf8');

portadasHtml = portadasHtml.replace('id="inpPageCount" value="143"', 'id="inpPageCount" value="144"');
portadasHtml = portadasHtml.replace('pageCount: 143,', 'pageCount: 144,');

// Auditoría par en handleAddToCart
if (!portadasHtml.includes('// Auditoria estricta de paginas pares')) {
  const addCartTarget = `function handleAddToCart() {`;
  const addCartWithEven = `function handleAddToCart() {\r\n        // Auditoria estricta de paginas pares\r\n        if (coverState.pageCount % 2 !== 0) {\r\n            coverState.pageCount += 1;\r\n            const pInp = document.getElementById('inpPageCount');\r\n            if (pInp) pInp.value = coverState.pageCount;\r\n        }`;
  portadasHtml = portadasHtml.replace(addCartTarget, addCartWithEven);
  console.log('✓ Control estricto de páginas pares integrado en generador-portadas');
}

fs.writeFileSync(portadasPath, portadasHtml, 'utf8');

console.log('\n=== ACTUALIZACIÓN DE CÓDIGO COMPLETADA CON ÉXITO ===');
