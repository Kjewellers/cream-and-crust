import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";



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

async function verify() {
  const orders = await getDocs(collection(db, "orders"));
  const customers = await getDocs(collection(db, "customers"));
  const inventory = await getDocs(collection(db, "inventory"));

  console.log("Remaining Orders:", orders.size);
  orders.forEach(d => {
      const data = d.data();
      const amount = Number(data.total) || 0;
      if (amount > 50000) console.log("High Amount Order:", d.id, amount);
  });

  console.log("Remaining Customers:", customers.size);
  customers.forEach(d => {
      console.log("Customer:", d.data().name);
  });

  console.log("Remaining Inventory:", inventory.size);
  inventory.forEach(d => {
      console.log("Inventory:", d.data().item);
  });

  process.exit(0);
}

verify().catch(console.error);
