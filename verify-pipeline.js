import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "cream-and-crust",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const bakeryId = '08r44wyarNWmVGzUZoCOf7JDMbd2'; // baker791
  
  console.log("--- 1. EVENTS ---");
  const eventsQ = query(collection(db, 'analytics_events'), where('bakeryId', '==', bakeryId));
  const snap = await getDocs(eventsQ);
  if (snap.empty) {
    console.log("No events found for", bakeryId);
  } else {
    snap.docs.forEach(d => {
      const data = d.data();
      console.log(`[Event: ${data.eventType}] Date: ${data.timestamp?.toDate()?.toISOString()} | Session: ${data.sessionId}`);
      if (data.revenue) console.log(`  - Revenue: ${data.revenue}`);
      if (data.productId) console.log(`  - Product: ${data.productId}`);
    });
  }

  console.log("\n--- 2. SUMMARY ---");
  const sumRef = doc(db, 'analytics_summary', bakeryId);
  const sumSnap = await getDoc(sumRef);
  if (!sumSnap.exists()) {
    console.log("No summary found for", bakeryId);
  } else {
    console.log("Summary Document:", JSON.stringify(sumSnap.data(), null, 2));
  }

  process.exit(0);
}
run();
