import fs from 'fs';

let content = fs.readFileSync('mi-espacio.js', 'utf8');

// 1. checkUrlTab hasPending
content = content.replace(
  "const isOrdersAllowed = isDevAllowed || isTestCustomer(user);",
  "const hasPending = !!localStorage.getItem('mr_pending_payment_books') || !!localStorage.getItem('mr_cart_cover_item');\n  const isOrdersAllowed = isDevAllowed || isTestCustomer(user) || hasPending;"
);

// 2. onAuthStateChanged unauthenticated hasPending
content = content.replace(
  "renderUnauthenticatedView();\n      }",
  "renderUnauthenticatedView();\n      }\n      const hasPending = !!localStorage.getItem('mr_pending_payment_books') || !!localStorage.getItem('mr_cart_cover_item');\n      if (hasPending) {\n        const btnPed = document.getElementById('tab-btn-pedidos');\n        if (btnPed) btnPed.style.setProperty('display', 'inline-flex', 'important');\n        initClientOrdersAndBasketModule(null);\n      }"
);

// 3. initClientOrdersAndBasketModule check
content = content.replace(
  "async function initClientOrdersAndBasketModule(user) {\n  if (!user || (!isDeveloper(user) && !isTestCustomer(user))) return;",
  "async function initClientOrdersAndBasketModule(user) {\n  const hasPending = !!localStorage.getItem('mr_pending_payment_books') || !!localStorage.getItem('mr_cart_cover_item');\n  if (!user && !hasPending) return;\n  if (user && !isDeveloper(user) && !isTestCustomer(user) && !hasPending) return;"
);

// 4. Expose window functions
if (!content.includes('window.initClientOrdersAndBasketModule')) {
  content += "\n\nwindow.initClientOrdersAndBasketModule = initClientOrdersAndBasketModule;\nwindow.renderClientOrdersAndBasketViews = renderClientOrdersAndBasketViews;\n";
}

fs.writeFileSync('mi-espacio.js', content, 'utf8');
console.log('✓ mi-espacio.js patched for universal basket access');
