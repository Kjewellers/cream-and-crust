import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

// Manual env parsing since dotenv might not be available or working as expected with import.meta
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const bypassOnboarding = async () => {
  try {
    const q = collection(db, "business");
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("No businesses found.");
      return;
    }

    for (const bizDoc of snapshot.docs) {
      const data = bizDoc.data();
      if (!data.portfolioTemplate) {
        console.log(`Bypassing onboarding for: ${data.name || bizDoc.id}`);
        await updateDoc(doc(db, "business", bizDoc.id), {
          portfolioTemplate: 'luxury-minimal',
          portfolioConfig: {
            tagline: 'Freshly Baked Goodness',
            about: 'A passionate local bakery.',
            heroImage: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&q=80&w=2070',
            selectedProductIds: [],
            primaryColor: '#8C7851'
          }
        });
      }
    }
    console.log("All businesses updated!");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    process.exit();
  }
};

bypassOnboarding();
