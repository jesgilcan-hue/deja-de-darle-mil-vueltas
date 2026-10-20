import fs from 'fs';

let content = fs.readFileSync('mi-espacio.js', 'utf8');

// 1. In renderGuestLocalView (line ~1075)
content = content.replace(
  "activateTab('tab-disenos');\n  updateDesignCounts();",
  `const params = new URLSearchParams(window.location.search);\n  const hasPending = !!localStorage.getItem('mr_pending_payment_books') || !!localStorage.getItem('mr_cart_cover_item');\n  const btnPed = document.getElementById('tab-btn-pedidos');\n  if (hasPending && btnPed) btnPed.style.setProperty('display', 'inline-flex', 'important');\n  if (params.get('tab') === 'pedidos' && hasPending) {\n    activateTab('tab-pedidos');\n  } else {\n    activateTab('tab-disenos');\n  }\n  updateDesignCounts();`
);

// 2. In DOMContentLoaded (around line 177)
content = content.replace(
  "// 2. Comprobación en segundo plano con Firebase",
  `// Cargar inmediatamente pedidos y cesta local\n  initClientOrdersAndBasketModule(null);\n\n  // 2. Comprobación en segundo plano con Firebase`
);

// 3. In onAuthStateChanged (when user is present)
content = content.replace(
  "await Promise.all([loadUserData(user), loadUserDesigns(user)]);",
  "await Promise.all([loadUserData(user), loadUserDesigns(user)]);\n      await initClientOrdersAndBasketModule(user);"
);

fs.writeFileSync('mi-espacio.js', content, 'utf8');
console.log('✓ mi-espacio.js patched with immediate basket initialization');
