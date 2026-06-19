const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (fs.existsSync(path.join(__dirname, 'functions', 'serviceAccountKey.json'))) {
  const serviceAccount = require('./functions/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // Try default initialization
  admin.initializeApp();
}

const db = admin.firestore();

async function checkCollections() {
  const collectionsToCheck = [
    'analytics_events', 'menu_events',
    'analytics_summary', 'menu_analytics_summary',
    'analytics_products', 'menu_analytics_products',
    'analytics_cities', 'menu_analytics_cities',
    'analytics_peak_hours', 'menu_analytics_hours',
    'analytics_sources', 'menu_analytics_sources',
    'analytics_customers', 'menu_analytics_customers',
    'menu_analytics_daily'
  ];

  console.log('==================================================');
  console.log('FIRESTORE COLLECTION REPORT');
  console.log('==================================================\n');

  for (const coll of collectionsToCheck) {
    try {
      const snapshot = await db.collection(coll).count().get();
      const count = snapshot.data().count;
      console.log(`Collection Name: ${coll}`);
      console.log(`Document Count: ${count}\n`);
    } catch (err) {
      console.log(`Collection Name: ${coll}`);
      console.log(`Error: ${err.message}\n`);
    }
  }
}

checkCollections().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
