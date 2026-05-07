import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, terminate } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDyYe38Ge0N6W99eZtDpVNs2s1XfGQGl90",
  authDomain: "cream-and-crust.firebaseapp.com",
  projectId: "cream-and-crust",
  storageBucket: "cream-and-crust.firebasestorage.app",
  messagingSenderId: "357779803337",
  appId: "1:357779803337:web:72b634c84a8b77ead75118"
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
