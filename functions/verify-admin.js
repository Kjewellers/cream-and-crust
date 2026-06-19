const admin = require('firebase-admin');

// Ensure you have the service account key or ADC configured locally
// Actually, since we are just connecting to the default project locally, we can try default app
admin.initializeApp({
  projectId: "cream-and-crust"
});
const db = admin.firestore();

async function run() {
  const bakeryId = '08r44wyarNWmVGzUZoCOf7JDMbd2'; // baker791
  
  console.log("=== 1. RAW EVENTS ===");
  const snap = await db.collection('analytics_events').where('bakeryId', '==', bakeryId).get();
  if (snap.empty) {
    console.log("No events found for", bakeryId);
  } else {
    snap.docs.forEach(d => {
      const data = d.data();
      console.log(`[${data.eventType}] ID: ${d.id} | Timestamp: ${data.timestamp?.toDate()?.toISOString()}`);
      if (data.revenue) console.log(`  - Revenue: ${data.revenue}`);
      if (data.productId) console.log(`  - Product: ${data.productId}`);
    });
  }

  console.log("\n=== 2. AGGREGATED SUMMARY ===");
  const sumRef = db.collection('analytics_summary').doc(bakeryId);
  const sumSnap = await sumRef.get();
  if (!sumSnap.exists) {
    console.log("No summary found for", bakeryId);
  } else {
    console.log("Summary Document:", JSON.stringify(sumSnap.data(), null, 2));
  }

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
