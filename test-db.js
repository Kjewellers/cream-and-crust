import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDyYe38Ge0N6W99eZtDpVNs2s1XfGQGl90",
  authDomain: "cream-and-crust.firebaseapp.com",
  projectId: "cream-and-crust",
  storageBucket: "cream-and-crust.firebasestorage.app",
  messagingSenderId: "357779803337",
  appId: "1:357779803337:web:72b634c84a8b77ead75118"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runTests() {
  console.log('🚀 Starting Database Module Audit (Direct Config)...');
  
  const collections = ['products', 'orders', 'expenses', 'shoppingList', 'customers'];
  
  for (const name of collections) {
    try {
      const q = query(collection(db, name), limit(1));
      const snap = await getDocs(q);
      console.log(`✅ Collection [${name}]: Connection Successful (${snap.size} docs found)`);
    } catch (e) {
      console.error(`❌ Collection [${name}]: FAILED - ${e.message}`);
    }
  }
  
  console.log('\nAudit Complete.');
  process.exit(0);
}

runTests();
