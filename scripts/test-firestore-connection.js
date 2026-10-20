import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8'),
  authDomain: "editorialmenosruido.firebaseapp.com",
  projectId: "editorialmenosruido"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  console.log('Testing Firestore connection without auth...');
  try {
    const ordersCol = collection(db, 'orders');
    const snapshot = await getDocs(ordersCol);
    console.log(`Success reading 'orders'! Found ${snapshot.docs.length} docs.`);
    snapshot.docs.forEach(d => console.log('Doc ID:', d.id));
  } catch (err) {
    console.error('Error reading orders:', err.message, err.code);
  }

  try {
    const testDocRef = doc(db, 'orders', 'TEST_PERM_CHECK');
    await setDoc(testDocRef, { test: true, date: new Date().toISOString() });
    console.log('Success writing to orders/TEST_PERM_CHECK!');
  } catch (err) {
    console.error('Error writing to orders/TEST_PERM_CHECK:', err.message, err.code);
  }
}

test().catch(console.error);
