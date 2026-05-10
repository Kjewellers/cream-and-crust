import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

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

async function cleanup() {
  console.log("Starting pass 2 cleanup...");

  // 1. Orders
  const ordersRef = collection(db, "orders");
  const ordersSnap = await getDocs(ordersRef);
  let ordersDeleted = 0;
  
  for (const d of ordersSnap.docs) {
    const data = d.data();
    const id = d.id;
    const orderId = data.orderId;
    const amount = Number(data.total) || 0;
    const customer = data.customer;
    const customerName = typeof customer === 'object' ? (customer?.name || '') : String(customer || '');

    const shouldDelete = 
      ["CC-104", "CXTfE", "TFptt", "jH65m"].includes(orderId) ||
      ["CC-104", "CXTfE", "TFptt", "jH65m"].includes(id) ||
      amount > 50000 ||
      customerName.toLowerCase() === "customer" || 
      !customerName ||
      customerName.toLowerCase().includes("test");

    if (shouldDelete) {
      await deleteDoc(doc(db, "orders", id));
      console.log(`Deleted Order: ${orderId || id} (${customerName})`);
      ordersDeleted++;
    }
  }
  console.log(`Total Orders deleted in pass 2: ${ordersDeleted}`);

  // 2. Inventory
  const invRef = collection(db, "inventory");
  const invSnap = await getDocs(invRef);
  let invDeleted = 0;
  for (const d of invSnap.docs) {
    const item = d.data().item;
    if (item === "fk=Flour" || item === "fk Flour") {
      await deleteDoc(doc(db, "inventory", d.id));
      console.log(`Deleted Inventory item: ${item}`);
      invDeleted++;
    }
  }
  console.log(`Total Inventory items deleted in pass 2: ${invDeleted}`);

  // 3. Customers
  const custRef = collection(db, "customers");
  const custSnap = await getDocs(custRef);
  let custDeleted = 0;
  for (const d of custSnap.docs) {
    const name = d.data().name || "";
    const nameLower = name.toLowerCase();
    const shouldDelete = 
      nameLower === "customer" || 
      nameLower.includes("test") || 
      !name;

    if (shouldDelete) {
      await deleteDoc(doc(db, "customers", d.id));
      console.log(`Deleted Customer: ${name}`);
      custDeleted++;
    }
  }
  console.log(`Total Customers deleted in pass 2: ${custDeleted}`);

  console.log("Cleanup pass 2 finished.");
  process.exit(0);
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
