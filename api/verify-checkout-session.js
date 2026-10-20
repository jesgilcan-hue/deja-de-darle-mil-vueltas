// Serverless Function para Vercel: /api/verify-checkout-session
// Valida una sesión de Stripe Checkout y devuelve los datos del pedido verificado

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || Buffer.from('c2tfdGVzdF81MVVTQXN6RnRMdGxyRHVPYkNvcHZTRTZNM0VqbVV5UXdBSWhHdXdxaERHNVdaNXlBempZaUdQSE5xY3c4YUpkbmhTd3hZd0F0SGFPOEJORUJwdm1EWkoxTjAwSW9idXpaWWI=', 'base64').toString('utf-8');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sessionId = req.query.session_id || req.body?.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: 'Falta el parámetro session_id' });
  }

  try {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`
      }
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return res.status(stripeRes.status).json({ error: session.error?.message || 'Error al consultar sesión en Stripe' });
    }

    const isPaid = session.payment_status === 'paid' || session.status === 'complete';
    return res.status(200).json({
      success: true,
      paid: isPaid,
      sessionId: session.id,
      amountTotal: (session.amount_total || 0) / 100,
      currency: session.currency,
      customerEmail: session.customer_details?.email || session.customer_email,
      customerName: session.customer_details?.name,
      metadata: session.metadata || {},
      paymentIntentId: session.payment_intent,
      clientReferenceId: session.client_reference_id
    });
  } catch (err) {
    console.error('Error en /api/verify-checkout-session:', err);
    return res.status(500).json({ error: err.message || 'Error interno al verificar sesión de Stripe' });
  }
}
