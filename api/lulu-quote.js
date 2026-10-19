// Serverless Function para Vercel: /api/lulu-quote
// Cotización en tiempo real contra Lulu Direct API + Cortacircuitos de Margen Mínimo (Safety Guard)
// Exclusivo para desarrollador autenticado (jesgilcan@gmail.com) durante fase de pruebas

const ALLOWED_ADMIN_EMAIL = 'jesgilcan@gmail.com';
const ALLOWED_TEST_CUSTOMER_EMAIL = 'jesusgil_87@hotmail.com';
const FIREBASE_WEB_API_KEY = process.env.VITE_FIREBASE_API_KEY || Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8');

// Credenciales Lulu Direct API (prioriza variable de entorno en Vercel)
const LULU_AUTH_BASIC = process.env.LULU_AUTH_BASIC || 'Basic MDQzYjg2NWUtNjRmNC00MzA0LTg5ZTctZTJmZDMzNWI0ZjQwOmpDSkJhMXJVOUNKSnpOMHEzd29ZSEk5MFNSS3czRVM4NmdNWHZmeko0OFRuR0NnOGxZVG5JZkRkUDdZWjI5cHRwOE5pVjVvTGFSSnFUemRGeGN0U0JQ';

// Tabla de Precios Base de Venta al Público (PVP con envío incluido hasta 150 págs)
export const FIXED_RETAIL_PRICES = {
  softcover: {
    basePrice: 24.90,
    label: 'Tapa blanda (Rústica Fresada · Mate)',
    podPackageId: '0600X0900BWSTDPB060UC444MXX'
  },
  perfect: {
    basePrice: 24.90,
    label: 'Tapa blanda (Rústica Fresada · Mate)',
    podPackageId: '0600X0900BWSTDPB060UC444MXX'
  },
  coil: {
    basePrice: 27.90,
    label: 'Encuadernación Anillas (Espiral Wire-O · Mate)',
    podPackageId: '0600X0900BWSTDCO060UC444MXX'
  },
  hardcover: {
    basePrice: 32.90,
    label: 'Tapa dura (Casewrap · Mate)',
    podPackageId: '0600X0900BWSTDCW060UC444MXX'
  }
};

/**
 * Calcula el PVP dinámico con envío incluido según encuadernación y número de páginas
 */
export function calculateDynamicRetailPrice(bindingType = 'coil', pageCount = 120) {
  const cfg = FIXED_RETAIL_PRICES[bindingType] || FIXED_RETAIL_PRICES.coil;
  const pages = Math.max(32, Math.min(800, parseInt(pageCount, 10) || 120));
  let extraPagesFee = 0;
  if (pages > 300) {
    extraPagesFee = 5.00;
  } else if (pages > 220) {
    extraPagesFee = 3.00;
  } else if (pages > 150) {
    extraPagesFee = 2.00;
  }
  return +(cfg.basePrice + extraPagesFee).toFixed(2);
}

// Margen neto mínimo de seguridad por pedido (Cortacircuitos)
// Si (PVP - Coste Total Lulu - Comisión Stripe) < MIN_SAFE_MARGIN_EUR, se bloquea la compra.
export const MIN_SAFE_MARGIN_EUR = 8.00;

async function verifyDeveloperIdToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Acceso restringido: falta token de sesión de Firebase Auth.' };
  }
  const idToken = authHeader.replace('Bearer ', '').trim();
  if (!idToken) {
    return { valid: false, error: 'Token vacío.' };
  }

  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.users || !verifyData.users.length) {
      return { valid: false, error: 'Sesión de Firebase inválida o expirada.' };
    }
    const userEmail = (verifyData.users[0].email || '').toLowerCase().trim();
    if (userEmail !== ALLOWED_ADMIN_EMAIL && userEmail !== ALLOWED_TEST_CUSTOMER_EMAIL) {
      return { valid: false, error: 'Acceso exclusivo para la cuenta de desarrollo autorizada.' };
    }
    return { valid: true, email: userEmail };
  } catch (err) {
    return { valid: false, error: 'Error al verificar identidad en Google Identity Toolkit.' };
  }
}

export async function calculateLuluQuoteAndSafety({
  bindingType = 'softcover',
  pageCount = 120,
  postalCode = '28001',
  city = 'Madrid',
  province = 'M',
  country = 'ES',
  shippingOption = 'MAIL',
  simulateSpike = false
}) {
  const productConfig = FIXED_RETAIL_PRICES[bindingType] || FIXED_RETAIL_PRICES.softcover;
  const safePageCount = Math.max(32, Math.min(800, parseInt(pageCount, 10) || 120));
  const retailPrice = calculateDynamicRetailPrice(bindingType, safePageCount);

  // 1. Obtener token OAuth2 de Lulu Direct API
  const tokenRes = await fetch(
    'https://api.lulu.com/auth/realms/glasstree/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: {
        'Authorization': LULU_AUTH_BASIC,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    }
  );

  if (!tokenRes.ok) {
    throw new Error(`Error autenticando con Lulu API (${tokenRes.status})`);
  }
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // 2. Consultar coste exacto en tiempo real a Lulu (/print-job-cost-calculations/)
  const calcPayload = {
    line_items: [
      {
        page_count: safePageCount,
        pod_package_id: productConfig.podPackageId,
        quantity: 1
      }
    ],
    shipping_address: {
      city: city || 'Madrid',
      country_code: (country || 'ES').toUpperCase(),
      postcode: String(postalCode || '28001').trim(),
      state_code: String(province || 'M').trim().slice(0, 10),
      street1: 'Calle de Alcalá 1',
      phone_number: '+34600000000'
    },
    shipping_option: shippingOption || 'MAIL'
  };

  const costRes = await fetch('https://api.lulu.com/print-job-cost-calculations/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify(calcPayload)
  });

  const costData = await costRes.json();
  if (!costRes.ok) {
    const detail = JSON.stringify(costData);
    throw new Error(`Lulu rechazó el cálculo de envío/impresión: ${detail}`);
  }

  let printCostExclTax = parseFloat(costData.line_item_costs?.[0]?.total_cost_excl_tax || '0');
  let shippingCostExclTax = parseFloat(costData.shipping_cost?.total_cost_excl_tax || '0');
  let totalTax = parseFloat(costData.total_tax || '0');
  let luluTotalCost = parseFloat(costData.total_cost_incl_tax || '0');

  // Modo simulador de subida de tarifas de Lulu (para probar el bloqueo de seguridad)
  if (simulateSpike) {
    shippingCostExclTax = +(shippingCostExclTax + 13.50).toFixed(2);
    luluTotalCost = +(luluTotalCost + 14.50).toFixed(2);
  }

  // Comisión estándar Stripe UE (1.5% + 0.25 €)
  const stripeFee = +(retailPrice * 0.015 + 0.25).toFixed(2);

  // Margen neto real que nos queda limpio
  const netMargin = +(retailPrice - luluTotalCost - stripeFee).toFixed(2);

  // 3. EVALUACIÓN DEL CORTACIRCUITOS (SAFETY GUARD)
  let canPurchase = true;
  let circuitBreakerTriggered = false;
  let blockReason = '';
  let publicErrorMessage = '';

  if (luluTotalCost >= retailPrice) {
    canPurchase = false;
    circuitBreakerTriggered = true;
    blockReason = `ALERTA CRÍTICA: El coste de Lulu (${luluTotalCost.toFixed(2)} €) supera el precio de venta fijado (${retailPrice.toFixed(2)} €). Pérdida directa de ${Math.abs(netMargin).toFixed(2)} €. Botón de compra bloqueado automáticamente.`;
    publicErrorMessage = 'Envío temporalmente no disponible para este código postal o configuración. Por favor, escríbenos a contacto@editorialmenosruido.com.';
  } else if (netMargin < MIN_SAFE_MARGIN_EUR) {
    canPurchase = false;
    circuitBreakerTriggered = true;
    blockReason = `CORTACIRCUITOS ACTIVO: El margen neto limpio (${netMargin.toFixed(2)} €) cae por debajo del mínimo de seguridad establecido (${MIN_SAFE_MARGIN_EUR.toFixed(2)} €) debido al coste de Lulu (${luluTotalCost.toFixed(2)} €). Botón de compra deshabilitado.`;
    publicErrorMessage = 'No podemos procesar el envío estándar a esta zona en este momento. Consulta con contacto@editorialmenosruido.com.';
  }

  return {
    canPurchase,
    circuitBreakerTriggered,
    blockReason,
    publicErrorMessage,
    simulatedSpike: Boolean(simulateSpike),
    product: {
      bindingType,
      label: productConfig.label,
      podPackageId: productConfig.podPackageId,
      pageCount: safePageCount
    },
    pricing: {
      currency: 'EUR',
      retailPrice: +retailPrice.toFixed(2),
      minSafeMargin: +MIN_SAFE_MARGIN_EUR.toFixed(2),
      luluPrintCost: +printCostExclTax.toFixed(2),
      luluShippingCost: +shippingCostExclTax.toFixed(2),
      luluTax: +totalTax.toFixed(2),
      luluTotalCost: +luluTotalCost.toFixed(2),
      stripeFee,
      netMargin
    }
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  // Mientras el carrito está en fase privada de desarrollador, exigimos token de jesgilcan@gmail.com
  const authCheck = await verifyDeveloperIdToken(req);
  if (!authCheck.valid) {
    return res.status(403).json({ error: authCheck.error });
  }

  try {
    const quote = await calculateLuluQuoteAndSafety(req.body || {});
    return res.status(200).json(quote);
  } catch (err) {
    console.error('Error en /api/lulu-quote:', err);
    return res.status(500).json({
      canPurchase: false,
      circuitBreakerTriggered: true,
      blockReason: `Fallo técnico al consultar Lulu API: ${err.message}. Por seguridad, se bloquea la compra si Lulu no confirma coste.`,
      error: err.message
    });
  }
}
