import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: Buffer.from('QUl6YVN5RGlXblE1eS1BOG51emFaa1Z5ZTBvWWZIMUQxdVJxVXl3', 'base64').toString('utf-8'),
  authDomain: "editorialmenosruido.firebaseapp.com",
  projectId: "editorialmenosruido"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const testCollections = [
  'users',
  'orders',
  'designs',
  'books',
  'cart',
  'public',
  'site',
  'settings',
  'global'
];

async function check() {
  for (const c of testCollections) {
    try {
      const snap = await getDocs(collection(db, c));
      console.log(`[ALLOWED] Collection '${c}': ${snap.docs.length} docs found`);
      snap.docs.forEach(d => console.log(`   - ${d.id}`));
    } catch (e) {
      console.log(`[DENIED] Collection '${c}': ${e.code}`);
    }
  }
  process.exit(0);
}

check().catch(console.error);
