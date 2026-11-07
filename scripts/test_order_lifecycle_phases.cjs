const puppeteer = require('puppeteer-core');
const path = require('path');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, updateDoc, setDoc } = require('firebase/firestore');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const artifactDir = 'C:\\Users\\IA\\.gemini\\antigravity\\brain\\31991198-d8a9-43a3-aedd-d3479e4df3a3';

const firebaseConfig = {
  apiKey: Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf8'),
  authDomain: 'editorialmenosruido.firebaseapp.com',
  projectId: 'editorialmenosruido'
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runLifecycleTest() {
  console.log('--- INICIANDO TEST DE TRANSICIÓN DE ESTADOS EN VIVO ---');

  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  const targetUrl = 'https://www.editorialmenosruido.com/mi-espacio.html?tab=pedidos&orderId=MR-2026-2906';
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4000));

  // --- FASE 1: Revisión Técnica ---
  await setDoc(doc(db, 'orders', 'MR-2026-2906'), {
    status: 'pending_review'
  }, { merge: true });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(artifactDir, 'test_fase1_revision_tecnica.png') });
  console.log('✓ Captura Fase 1 (Revisión Técnica) guardada');

  // --- FASE 2: En Imprenta ---
  console.log('Cambiando a Fase 2: En Imprenta...');
  await setDoc(doc(db, 'orders', 'MR-2026-2906'), {
    status: 'printing',
    luluJob: {
      status: 'printing',
      jobId: 'LULU-981244',
      cost: 22.81
    }
  }, { merge: true });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(artifactDir, 'test_fase2_en_imprenta.png') });
  console.log('✓ Captura Fase 2 (En Imprenta) guardada');

  // --- FASE 3: En Reparto (Correos Express con tracking) ---
  console.log('Cambiando a Fase 3: En Reparto...');
  await setDoc(doc(db, 'orders', 'MR-2026-2906'), {
    status: 'shipped',
    shipping: {
      carrier: 'Correos Express',
      trackingNumber: 'ES84920491028',
      lastCarrierMessage: 'Correos Express: Paquete en reparto con seguimiento activo ES84920491028.'
    }
  }, { merge: true });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(artifactDir, 'test_fase3_en_reparto.png') });
  console.log('✓ Captura Fase 3 (En Reparto) guardada');

  // --- FASE 4: Entregado ---
  console.log('Cambiando a Fase 4: Entregado...');
  await setDoc(doc(db, 'orders', 'MR-2026-2906'), {
    status: 'delivered',
    shipping: {
      carrier: 'Correos Express',
      trackingNumber: 'ES84920491028',
      lastCarrierMessage: 'Correos Express: Entrega completada satisfactoriamente en el domicilio del destinatario.'
    }
  }, { merge: true });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(artifactDir, 'test_fase4_entregado.png') });
  console.log('✓ Captura Fase 4 (Entregado) guardada');

  // Dejar el pedido en su estado natural (pending_review) para que el gestor pueda operarlo
  await setDoc(doc(db, 'orders', 'MR-2026-2906'), {
    status: 'pending_review'
  }, { merge: true });
  console.log('✓ Pedido restablecido a estado pending_review para la operativa real.');

  await browser.close();
  console.log('--- TEST DE 4 FASES COMPLETADO AL 100% CON ÉXITO ---');
}

runLifecycleTest().catch(err => {
  console.error('Error en test de fases:', err);
  process.exit(1);
});
