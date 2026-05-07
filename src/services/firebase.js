import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, terminate } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Singleton initialization pattern for HMR support
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Handle Firestore initialization carefully
let dbInstance;
try {
  dbInstance = getFirestore(app);
} catch (e) {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
}

export const db = dbInstance;
export const auth = getAuth(app);
