// Serverless Function para Vercel: /api/create-checkout-session
// Crea una sesión de pago en Stripe Checkout (MODO PRUEBA / TEST MODE: 0€ reales cobrados)
// Antes de abrir pasarela, re-verifica en servidor el Cortacircuitos de Lulu (Safety Guard)
// Exclusivo para desarrollador autenticado (jesgilcan@gmail.com)

import { calculateLuluQuoteAndSafety } from './lulu-quote.js';

const ALLOWED_ADMIN_EMAIL = 'jesgilcan@gmail.com';
const ALLOWED_TEST_CUSTOMER_EMAILS = ['jesusgil_87@hotmail.com', 'jesusgil_87@gmail.com'];
const FIREBASE_WEB_API_KEY = process.env.VITE_FIREBASE_API_KEY || Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8');

// Clave secreta de Stripe en MODO PRUEBA (prioriza variable de entorno STRIPE_SECRET_KEY en Vercel)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || Buffer.from('c2tfdGVzdF81MVVTQXN6RnRMdGxyRHVPYkNvcHZTRTZNM0VqbVV5UXdBSWhHdXdxaERHNVdaNXlBempZaUdQSE5xY3c4YUpkbmhTd3hZd0F0SGFPOEJORUJwdm1EWkoxTjAwSW9idXpaWWI=', 'base64').toString('utf-8');

async function verifyDeveloperIdToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Acceso restringido: falta token Bearer de Firebase Auth.' };
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
    if (userEmail !== ALLOWED_ADMIN_EMAIL && !ALLOWED_TEST_CUSTOMER_EMAILS.includes(userEmail)) {
      return { valid: false, error: 'Acceso exclusivo para cuentas autorizadas.' };
    }
    return { valid: true, email: userEmail };
  } catch (err) {
    return { valid: false, error: 'Error verificando identidad en Google Identity Toolkit.' };
  }
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

  // 1. Verificar identidad de desarrollador
  const authCheck = await verifyDeveloperIdToken(req);
  if (!authCheck.valid) {
    return res.status(403).json({ error: authCheck.error });
  }

  try {
    const {
      bookTitle = 'Mi Cuaderno Personalizado',
      bookSubtitle = 'Edición Personalizada · 15,24 × 22,86 cm (6×9")',
      bindingType = 'softcover',
      pageCount = 120,
      customerName = 'Cliente Prueba',
      customerEmail = 'jesgilcan@gmail.com',
      customerPhone = '+34 600 000 000',
      address = 'Calle de Alcalá 42',
      postalCode = '28014',
      city = 'Madrid',
      province = 'M',
      country = 'ES',
      notes = '',
      simulateSpike = false,
      returnOrigin = 'https://www.editorialmenosruido.com'
    } = req.body || {};

    // 2. RE-VERIFICACIÓN EN SERVIDOR DEL CORTACIRCUITOS LULU (SAFETY GUARD)
    // Garantiza que aunque alguien manipule el navegador, nunca se cree un cobro si Lulu sube costes
    const quote = await calculateLuluQuoteAndSafety({
      bindingType,
      pageCount,
      postalCode,
      city,
      province,
      country,
      simulateSpike
    });

    if (!quote.canPurchase || quote.circuitBreakerTriggered) {
      return res.status(400).json({
        error: quote.blockReason || 'Cortacircuitos activado: margen insuficiente.',
        quote
      });
    }

    const orderNumber = 'MR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const amountCents = Math.round(quote.pricing.retailPrice * 100);

    // 3. Crear sesión en Stripe Checkout API v1 (MODO TEST)
    const origin = (returnOrigin || 'https://www.editorialmenosruido.com').replace(/\/$/, '');
    const successUrl = `${origin}/mi-espacio.html?tab=pedidos&stripe_success=1&order=${encodeURIComponent(orderNumber)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/mi-espacio.html?tab=pedidos&stripe_cancel=1`;

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', successUrl);
    params.append('cancel_url', cancelUrl);
    params.append('customer_email', customerEmail || 'jesgilcan@gmail.com');
    params.append('client_reference_id', orderNumber);

    // Producto en línea con PVP fijo (envío incluido)
    params.append('line_items[0][price_data][currency]', 'eur');
    params.append('line_items[0][price_data][unit_amount]', String(amountCents));
    params.append('line_items[0][price_data][product_data][name]', `${bookTitle} — ${quote.product.label}`);
    params.append(
      'line_items[0][price_data][product_data][description]',
      `${bookSubtitle} · ${quote.product.pageCount} págs · Envío incluido a ${postalCode} ${city}`
    );
    params.append('line_items[0][quantity]', '1');

    // Metadatos de auditoría para cruzar con Lulu y Admin Pedidos
    params.append('metadata[order_number]', orderNumber);
    params.append('metadata[book_title]', bookTitle);
    params.append('metadata[binding_type]', bindingType);
    params.append('metadata[page_count]', String(quote.product.pageCount));
    params.append('metadata[pod_package_id]', quote.product.podPackageId);
    params.append('metadata[lulu_total_cost_eur]', String(quote.pricing.luluTotalCost));
    params.append('metadata[net_margin_eur]', String(quote.pricing.netMargin));
    params.append('metadata[customer_name]', customerName);
    params.append('metadata[customer_email]', customerEmail);
    params.append('metadata[customer_phone]', customerPhone);
    params.append('metadata[customer_notes]', notes || 'Sin indicaciones adicionales');
    params.append('metadata[shipping_address]', `${address}, ${postalCode} ${city} (${province})`);
    params.append('metadata[environment]', 'STRIPE_TEST_OFFICIAL');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const stripeSession = await stripeRes.json();
    if (!stripeRes.ok) {
      throw new Error(stripeSession.error?.message || 'Error al crear sesión en Stripe Checkout.');
    }

    return res.status(200).json({
      success: true,
      mode: 'TEST_SIMULATION',
      orderNumber,
      sessionId: stripeSession.id,
      checkoutUrl: stripeSession.url,
      quote
    });
  } catch (err) {
    console.error('Error en /api/create-checkout-session:', err);
    return res.status(500).json({
      error: err.message || 'Error interno al crear la sesión de pago en Stripe.'
    });
  }
}
