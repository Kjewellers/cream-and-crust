import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanData() {
  console.log('Starting Firestore cleanup...');

  try {
    // 1. Orders Collection
    console.log('\n--- Cleaning Orders ---');
    const ordersRef = collection(db, 'orders');
    const ordersSnap = await getDocs(ordersRef);
    console.log(`Found ${ordersSnap.size} orders in Firestore.`);
    
    const hardcodedOrderIds = ['CC-104', 'CXTfE', 'TFptt', 'jH65m'];
    
    for (const orderDoc of ordersSnap.docs) {
      const data = orderDoc.data();
      const id = orderDoc.id;
      
      let shouldDelete = false;
      
      if (hardcodedOrderIds.includes(id) || hardcodedOrderIds.includes(data.orderId)) {
        shouldDelete = true;
      }
      
      if (data.totalAmount > 50000 || data.total > 50000) {
        shouldDelete = true;
      }
      
      if (data.customer && typeof data.customer === 'object' && data.customer.name === 'Customer') {
        shouldDelete = true;
      }
      if (data.customerName === 'Customer') {
        shouldDelete = true;
      }

      if (shouldDelete) {
        await deleteDoc(doc(db, 'orders', id));
        console.log(`Deleted order: ${id} (${data.orderId})`);
      }
    }

    // 2. Inventory Collection
    console.log('\n--- Cleaning Inventory ---');
    const inventoryRef = collection(db, 'inventory');
    const inventorySnap = await getDocs(inventoryRef);
    
    for (const invDoc of inventorySnap.docs) {
      const data = invDoc.data();
      const id = invDoc.id;
      
      if (id === 'fk=Flour' || data.name === 'fk=Flour') {
        await deleteDoc(doc(db, 'inventory', id));
        console.log(`Deleted inventory item: ${id}`);
      }
    }

    // 3. Customers Collection
    console.log('\n--- Cleaning Customers ---');
    const customersRef = collection(db, 'customers');
    const customersSnap = await getDocs(customersRef);
    
    const invalidCustomerNames = ['Customer', 'Test UserTest User', 'Test Order', 'Test Customer'];
    
    for (const custDoc of customersSnap.docs) {
      const data = custDoc.data();
      const id = custDoc.id;
      
      if (invalidCustomerNames.includes(data.name)) {
        await deleteDoc(doc(db, 'customers', id));
        console.log(`Deleted customer: ${id} (${data.name})`);
      }
    }

    console.log('\n✅ Cleanup completed successfully.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanData();
