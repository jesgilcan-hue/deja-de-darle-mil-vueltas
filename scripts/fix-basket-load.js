import fs from 'fs';

let content = fs.readFileSync('mi-espacio.js', 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Fix line 1814-1815
content = content.replace(
  "async function initClientOrdersAndBasketModule(user) {\n  if (!user || (!isDeveloper(user) && !isTestCustomer(user))) return;",
  `async function initClientOrdersAndBasketModule(user) {
  const hasPending = !!localStorage.getItem('mr_pending_payment_books') || !!localStorage.getItem('mr_cart_cover_item');
  if (!user && !hasPending) return;
  if (user && !isDeveloper(user) && !isTestCustomer(user) && !hasPending) return;`
);

// 2. Guard getDocs(collection(db, 'orders'))
content = content.replace(
  "let loadedOrders = [];\n  try {\n    const snap = await getDocs(collection(db, 'orders'));",
  `let loadedOrders = [];\n  if (user && (isDeveloper(user) || isTestCustomer(user))) {\n    try {\n      const snap = await getDocs(collection(db, 'orders'));`
);

content = content.replace(
  "snap.forEach(d => loadedOrders.push({ id: d.id, ...d.data() }));\n  } catch (e) {}",
  `snap.forEach(d => loadedOrders.push({ id: d.id, ...d.data() }));\n    } catch (e) {}\n  }`
);

// 3. Guard seedFullProfileOrder
content = content.replace(
  "if (clientProfileOrders.length === 0) {\n    await seedFullProfileOrder(user, false);\n  }",
  `if (clientProfileOrders.length === 0 && user && isDeveloper(user)) {\n    await seedFullProfileOrder(user, false);\n  }`
);

// 4. Guard onSnapshot
content = content.replace(
  "if (!window.__mrOrdersCollectionSnapshotUnsub) {",
  "if (!window.__mrOrdersCollectionSnapshotUnsub && user && (isDeveloper(user) || isTestCustomer(user))) {"
);

fs.writeFileSync('mi-espacio.js', content, 'utf8');
console.log('✓ Successfully patched mi-espacio.js with normalized line breaks');
