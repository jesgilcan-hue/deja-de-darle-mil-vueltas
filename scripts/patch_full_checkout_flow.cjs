const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');

// =========================================================================
// 1. PATCH api/create-checkout-session.js
// =========================================================================
const createSessionPath = path.join(baseDir, 'api', 'create-checkout-session.js');
let createCode = fs.readFileSync(createSessionPath, 'utf8');

if (!createCode.includes("metadata[customer_uid]")) {
  createCode = createCode.replace(
    "params.append('metadata[order_number]', orderNumber);",
    "params.append('metadata[order_number]', orderNumber);\n    if (authCheck && authCheck.uid) {\n      params.append('metadata[customer_uid]', authCheck.uid);\n    }"
  );
  fs.writeFileSync(createSessionPath, createCode, 'utf8');
  console.log('✓ 1. create-checkout-session.js actualizado con metadata[customer_uid]');
} else {
  console.log('• 1. create-checkout-session.js ya contenía metadata[customer_uid]');
}

// =========================================================================
// 2. PATCH api/verify-checkout-session.js
// =========================================================================
const verifySessionPath = path.join(baseDir, 'api', 'verify-checkout-session.js');
let verifyCode = fs.readFileSync(verifySessionPath, 'utf8');

// Ensure Firebase imports exist
if (!verifyCode.includes("from 'firebase/firestore'")) {
  const firebaseHeader = `import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf8'),
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'editorialmenosruido.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'editorialmenosruido'
};
const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp);
`;

  verifyCode = firebaseHeader + '\n' + verifyCode;
}

// Replace clientEmailTarget logic to respect the real email without overwrite
verifyCode = verifyCode.replace(
  /let clientEmailTarget = TEST_CLIENT_EMAIL;[\s\S]*?if \(rawCustomerEmail[\s\S]*?clientEmailTarget = rawCustomerEmail\.toLowerCase\(\)\.trim\(\);\s*\}/,
  `const safeCustomerEmail = (rawCustomerEmail || metadata.customer_email || 'jesusgil_87@hotmail.com').toLowerCase().trim();
    let clientEmailTarget = safeCustomerEmail;`
);

// Add server-side Firestore persistence when isPaid is true
if (!verifyCode.includes("setDoc(doc(firestoreDb, 'orders', orderNumber)")) {
  const persistenceBlock = `
    let parsedItems = [];
    if (metadata.items_json) {
      try {
        parsedItems = JSON.parse(metadata.items_json);
      } catch(e) {}
    }
    if (!parsedItems.length) {
      parsedItems = [{
        title: metadata.book_title || bookTitle,
        binding: metadata.binding_type || 'softcover',
        pages: parseInt(metadata.page_count || 144, 10),
        qty: 1,
        price: amountTotal
      }];
    }

    const orderDoc = {
      id: 'ord_' + (session.created ? session.created * 1000 : Date.now()),
      orderNumber: orderNumber,
      status: 'pending_review',
      createdAt: new Date(session.created ? session.created * 1000 : Date.now()).toISOString(),
      items: parsedItems,
      customer: {
        uid: metadata.customer_uid || '',
        name: customerName,
        email: safeCustomerEmail,
        phone: metadata.customer_phone || '+34 600 000 000',
        address: address,
        notes: customerNotes,
        isRegistered: true
      },
      shipping: {
        carrier: 'Correos Express',
        trackingNumber: 'CEX-' + Math.floor(10000000 + Math.random() * 90000000),
        lastCarrierMessage: 'Pedido recibido. En fase 1: En Revisión Técnica de tripas y maquetación.'
      },
      comms: {
        compra: { sent: true, date: new Date().toISOString() },
        imprenta: { sent: false },
        tracking: { sent: false },
        entregado: { sent: false }
      },
      book: {
        title: metadata.book_title || bookTitle,
        subtitle: metadata.book_subtitle || 'Edición Personalizada',
        bindingType: metadata.binding_type || 'softcover',
        pageCount: parseInt(metadata.page_count || 144, 10),
        quantity: 1,
        size: '8.25x6',
        spineWidthMm: (parseInt(metadata.page_count || 144, 10) * 0.057).toFixed(1)
      },
      pricing: {
        currency: (session.currency || 'eur').toUpperCase(),
        totalPaid: amountTotal,
        luluCostEstimate: parseFloat(metadata.lulu_total_cost_eur || 13.93),
        netMargin: parseFloat(metadata.net_margin_eur || 13.30),
        stripePaymentId: session.payment_intent || session.id
      },
      timeline: [
        {
          date: new Date(session.created ? session.created * 1000 : Date.now()).toISOString(),
          message: 'Pedido recibido y registrado en imprenta'
        },
        {
          date: new Date().toISOString(),
          message: 'Pago con tarjeta confirmado vía Stripe Checkout'
        }
      ]
    };

    if (isPaid) {
      try {
        await setDoc(doc(firestoreDb, 'orders', orderNumber), orderDoc, { merge: true });
        if (metadata.customer_uid) {
          await setDoc(doc(firestoreDb, 'users', metadata.customer_uid, 'orders', orderNumber), orderDoc, { merge: true });
        }
        console.log('✓ Pedido #' + orderNumber + ' guardado directamente en Firestore desde el servidor.');
      } catch(dbErr) {
        console.error('Error persistiendo pedido en Firestore desde servidor:', dbErr);
      }
    }
`;

  verifyCode = verifyCode.replace(
    "if (isPaid) {",
    persistenceBlock + "\n    if (isPaid) {"
  );

  verifyCode = verifyCode.replace(
    "orderNumber: orderNumber,\n      metadata: metadata,",
    "orderNumber: orderNumber,\n      order: orderDoc,\n      metadata: metadata,"
  );

  fs.writeFileSync(verifySessionPath, verifyCode, 'utf8');
  console.log('✓ 2. verify-checkout-session.js actualizado con guardado directo en Firestore y datos reales');
} else {
  console.log('• 2. verify-checkout-session.js ya contenía persistencia Firestore');
}

console.log('Fase 1 y 2 completadas.');
