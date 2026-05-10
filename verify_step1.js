import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
