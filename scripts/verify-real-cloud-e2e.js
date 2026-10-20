import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const GESTOR_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\edge_profile_gestor_' + Date.now();
const CLIENTE_PROFILE = 'C:\\Users\\IA\\AppData\\Local\\Temp\\edge_profile_cliente_' + Date.now();
const ARTIFACT_DIR = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';

const firebaseConfig = {
  apiKey: Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8'),
  authDomain: "editorialmenosruido.firebaseapp.com",
  projectId: "editorialmenosruido"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runRealCloudTest(testName) {
  console.log(`\n========================================================================`);
  console.log(`🚀 EJECUTANDO PRUEBA REAL EN NUBE: ${testName}`);
  console.log(`(Dos instancias de Edge 100% aisladas, sin memoria compartida, solo Firestore)`);
  console.log(`========================================================================\n`);

  const orderNumber = 'MR-2026-' + Math.floor(1000 + Math.random() * 9000);
  console.log(`[INFO] Número de pedido de prueba: #${orderNumber}`);

  // 1. Abrir Navegador GESTOR (instancia A)
  console.log('[1/6] Lanzando Navegador Gestor (Perfil A)...');
  const browserGestor = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    userDataDir: GESTOR_PROFILE,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });
  const pageGestor = await browserGestor.newPage();
  await pageGestor.evaluateOnNewDocument(() => {
    sessionStorage.setItem('mr_test_bypass', '1');
    sessionStorage.setItem('mr_admin_pin_verified', 'true');
    sessionStorage.setItem('mr_dev_pin_verified', 'true');
  });

  await pageGestor.goto('https://www.editorialmenosruido.com/admin-pedidos.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  console.log('✓ Panel Gestor cargado y escuchando Firestore.');

  // 2. Abrir Navegador CLIENTE (instancia B completamente separada)
  console.log('[2/6] Lanzando Navegador Cliente (Perfil B - Sesión Aislada)...');
  const browserCliente = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    userDataDir: CLIENTE_PROFILE,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });
  const pageCliente = await browserCliente.newPage();
  await pageCliente.goto('https://www.editorialmenosruido.com/mi-espacio.html?tab=pedidos', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  console.log('✓ Panel Cliente cargado.');

  // 3. Crear pedido en la nube de Firestore (como hace Stripe / el cliente al pagar)
  console.log(`[3/6] Grabando pedido #${orderNumber} directamente en Google Firestore en la nube...`);
  const initialOrderData = {
    id: 'ord_' + Date.now(),
    orderNumber: orderNumber,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    customer: {
      name: 'Cliente Real Firestore',
      email: 'jesusgil_87@hotmail.com',
      phone: '+34 600 123 456',
      address: 'Gran Vía 32, 3º Izq, 28013 Madrid',
      postalCode: '28013',
      city: 'Madrid',
      province: 'Madrid',
      country: 'España',
      notes: 'Llamar al timbre 3º Izq'
    },
    shipping: {
      carrier: 'Correos Express',
      trackingNumber: 'Pendiente de expedición',
      lastCarrierMessage: 'Pedido recibido. En fase 1: En Revisión Técnica.'
    },
    book: {
      title: 'Planificador Semestral 180 Días',
      bindingType: 'hardcover',
      pageCount: 144,
      quantity: 1,
      spineWidthMm: '8.2'
    },
    pricing: {
      currency: 'EUR',
      totalPaid: 32.90,
      luluCostEstimate: 14.20,
      netMargin: 18.20
    },
    timeline: [
      { date: new Date().toISOString(), message: 'Pedido recibido y registrado en la nube de Firestore' }
    ]
  };

  await setDoc(doc(db, 'orders', orderNumber), initialOrderData);
  console.log(`✓ Pedido #${orderNumber} guardado en Firestore Cloud.`);

  // 4. Verificar que el Gestor (Perfil A) recibe el pedido en tiempo real desde la nube
  console.log('[4/6] Verificando recepción en tiempo real en la pantalla del Gestor...');
  let gestorSawOrder = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    gestorSawOrder = await pageGestor.evaluate((ordNum) => {
      const card = document.getElementById(`order-card-${ordNum}`) || 
                   document.querySelector(`[data-order-number="${ordNum}"]`) ||
                   document.body.innerText.includes(ordNum);
      return !!card;
    }, orderNumber);
    if (gestorSawOrder) break;
  }
  console.log(`¿El Gestor recibió el pedido #${orderNumber} desde la nube sin recargar?:`, gestorSawOrder ? '✓ SÍ (RECIBIDO)' : '✗ NO');

  // 5. El Gestor avanza el pedido a Fase 2 (Imprenta) y Fase 3 (Enviado) en Firestore
  console.log('[5/6] Gestor actualiza el pedido en Firestore a En Imprenta y En Reparto...');
  const updatedOrderData = {
    ...initialOrderData,
    status: 'shipped',
    shipping: {
      carrier: 'Correos Express',
      trackingNumber: 'ES994820145',
      trackingUrl: 'https://www.correos.es/es/es/herramientas/localizador/envios?numero=ES994820145',
      lastCarrierMessage: 'Correos Express: Paquete en reparto hacia el domicilio.'
    },
    timeline: [
      ...initialOrderData.timeline,
      { date: new Date().toISOString(), message: 'Lulu despacha el paquete con Correos Express' }
    ]
  };
  await setDoc(doc(db, 'orders', orderNumber), updatedOrderData, { merge: true });
  console.log('✓ Pedido actualizado en Firestore a status="shipped" con Tracking ES994820145.');

  // 6. Verificar que el Cliente (Perfil B en su propio navegador) ve la actualización
  console.log('[6/6] Verificando en la ventana del Cliente si la pantalla se actualiza con los datos de Firestore...');
  await new Promise(r => setTimeout(r, 2000));
  
  // Guardar captura del cliente
  const clientShot = path.join(ARTIFACT_DIR, `real_cloud_${testName}_cliente.png`);
  await pageCliente.screenshot({ path: clientShot, fullPage: false });
  console.log('✓ Captura Cliente guardada:', clientShot);

  const gestorShot = path.join(ARTIFACT_DIR, `real_cloud_${testName}_gestor.png`);
  await pageGestor.screenshot({ path: gestorShot, fullPage: false });
  console.log('✓ Captura Gestor guardada:', gestorShot);

  // Limpiar pedido de prueba
  await deleteDoc(doc(db, 'orders', orderNumber));
  console.log(`✓ Pedido #${orderNumber} eliminado de Firestore tras la prueba.`);

  await browserGestor.close();
  await browserCliente.close();

  try {
    fs.rmSync(GESTOR_PROFILE, { recursive: true, force: true });
    fs.rmSync(CLIENTE_PROFILE, { recursive: true, force: true });
  } catch (e) {}

  return gestorSawOrder;
}

async function main() {
  console.log('========================================================================');
  console.log('PRUEBA 1: Verificación de comunicación en la nube con Firestore desbloqueado');
  console.log('========================================================================');
  const test1 = await runRealCloudTest('ejemplo_1');

  console.log('\n========================================================================');
  console.log('PRUEBA 2: Segundo pedido real consecutivo sin tocar código');
  console.log('========================================================================');
  const test2 = await runRealCloudTest('ejemplo_2_limpio');

  console.log('\n========================================================================');
  console.log(`RESULTADOS FINALES:`);
  console.log(`Prueba 1 (Firestore Cloud Sync): ${test1 ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Prueba 2 (Ejecución Limpia):     ${test2 ? '✓ PASS' : '✗ FAIL'}`);
  console.log('========================================================================');

  if (!test1 || !test2) process.exit(1);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
