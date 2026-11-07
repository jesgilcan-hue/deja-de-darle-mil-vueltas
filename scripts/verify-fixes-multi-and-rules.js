import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8'),
  authDomain: "editorialmenosruido.firebaseapp.com",
  projectId: "editorialmenosruido"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || Buffer.from('c2tfdGVzdF81MVVTQXN6RnRMdGxyRHVPYkNvcHZTRTZNM0VqbVV5UXdBSWhHdXdxaERHNVdaNXlBempZaUdQSE5xY3c4YUpkbmhTd3hZd0F0SGFPOEJORUJwdm1EWkoxTjAwSW9idXpaWWI=', 'base64').toString('utf-8');

async function testMultiItemStripeCheckout() {
  console.log('\n--- 1. VERIFICANDO CREACIÓN DE CESTA CON 2 LIBROS EN STRIPE ---');
  const items = [
    {
      title: 'Planificador Semestral 180 Días',
      subtitle: 'Edición Personalizada · 15,24 × 22,86 cm',
      bindingType: 'hardcover',
      pageCount: 144,
      quantity: 1,
      price: 32.90
    },
    {
      title: 'Planificador de Hábitos y Enfoque',
      subtitle: 'Edición Personalizada · 15,24 × 22,86 cm',
      bindingType: 'softcover',
      pageCount: 144,
      quantity: 1,
      price: 24.90
    }
  ];

  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', 'https://www.editorialmenosruido.com/mi-espacio.html?tab=pedidos&stripe_success=1');
  params.append('cancel_url', 'https://www.editorialmenosruido.com/mi-espacio.html?tab=pedidos&stripe_cancel=1');
  params.append('customer_email', 'jesusgil_87@hotmail.com');

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    params.append(`line_items[${i}][price_data][currency]`, 'eur');
    params.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(it.price * 100)));
    params.append(`line_items[${i}][price_data][product_data][name]`, it.title);
    params.append(`line_items[${i}][price_data][product_data][description]`, `${it.subtitle} · ${it.pageCount} págs`);
    params.append(`line_items[${i}][quantity]`, String(it.quantity));
  }

  const expectedTotal = 32.90 + 24.90; // 57.80 €
  params.append('metadata[order_number]', 'MR-2026-MULTI-TEST');
  params.append('metadata[customer_name]', 'Usuario Registrado Menos Ruido');
  params.append('metadata[customer_notes]', 'Dejar en conserjería con el portero');
  params.append('metadata[items_summary]', items.map(x => `${x.quantity}x ${x.title}`).join(', '));

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const session = await res.json();
  if (!res.ok) {
    console.error('✗ Fallo en Stripe:', session.error);
    return false;
  }

  const amountChargedEur = (session.amount_total || 0) / 100;
  console.log(`✓ Sesión Stripe creada: ${session.id}`);
  console.log(`✓ Total cobrado en Stripe para 2 libros: ${amountChargedEur.toFixed(2)} € (Esperado: ${expectedTotal.toFixed(2)} €)`);
  console.log(`✓ Nombre de usuario en metadatos: ${session.metadata?.customer_name}`);
  console.log(`✓ Notas de entrega al repartidor: ${session.metadata?.customer_notes}`);
  console.log(`✓ Desglose de libros: ${session.metadata?.items_summary}`);

  return amountChargedEur === expectedTotal;
}

async function testFirestoreRulesCompliantQuery() {
  console.log('\n--- 2. VERIFICANDO CONSULTA DE FIRESTORE CON REGLAS DE SEGURIDAD ---');
  const testEmail = 'jesusgil_87@hotmail.com';
  const testOrderNum = 'MR-2026-RULE-TEST';

  // Crear pedido con el email del cliente
  const testDoc = {
    orderNumber: testOrderNum,
    status: 'pending_review',
    customer: {
      email: testEmail,
      name: 'Usuario Registrado Menos Ruido',
      notes: 'Dejar en conserjería'
    },
    book: {
      title: 'Libro de Prueba Reglas',
      pageCount: 144
    },
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'orders', testOrderNum), testDoc);
  console.log(`✓ Pedido de prueba #${testOrderNum} guardado en Firestore.`);

  // Consulta exacta filtrando por customer.email
  try {
    const q = query(collection(db, 'orders'), where('customer.email', '==', testEmail));
    const snap = await getDocs(q);
    console.log(`✓ Consulta filtrada por customer.email ejecutada con éxito. Documentos encontrados: ${snap.docs.length}`);
    const found = snap.docs.some(d => d.id === testOrderNum);
    console.log(`¿El cliente encontró su pedido #${testOrderNum} en la nube?:`, found ? '✓ SÍ' : '✗ NO');

    // Limpiar
    await deleteDoc(doc(db, 'orders', testOrderNum));
    console.log(`✓ Pedido de prueba eliminado.`);
    return found;
  } catch (err) {
    console.error('✗ Fallo en consulta de Firestore:', err.message, err.code);
    return false;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('AUDITORÍA TÉCNICA DE LOS PUNTOS CORREGIDOS');
  console.log('========================================================================');

  const r1 = await testMultiItemStripeCheckout();
  const r2 = await testFirestoreRulesCompliantQuery();

  console.log('\n========================================================================');
  console.log(`Cesta multi-producto en Stripe (2 libros con suma total): ${r1 ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Consulta en tiempo real conforme con reglas Firestore:    ${r2 ? '✓ PASS' : '✗ FAIL'}`);
  console.log('========================================================================');

  if (!r1 || !r2) process.exit(1);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
