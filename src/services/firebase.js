import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Singleton initialization pattern for HMR support
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Firebase App Check (reCAPTCHA v3 — invisible) ─────────────────
// Protects Auth, Firestore, Storage, and Cloud Functions from bots
// and abuse. The reCAPTCHA v3 provider runs silently in the background
// (no widget, no user interaction) and scores each request.
//
// To enable:
// 1. Go to https://console.cloud.google.com/security/recaptcha
//    → Create a reCAPTCHA v3 key for your domain (creamandcrust.online)
// 2. Add the site key to your .env as VITE_RECAPTCHA_SITE_KEY
// 3. In Firebase Console → App Check → Register your app with reCAPTCHA v3
//
// In development (localhost), set FIREBASE_APPCHECK_DEBUG_TOKEN=true in
// the browser console to bypass App Check.
if (import.meta.env.DEV) {
   
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// ── Firebase App Check (GUARDED — re-enable safely) ───────────────
// App Check previously broke login when enabled unconditionally. It now
// initializes ONLY when explicitly turned on via env (VITE_APP_CHECK_ENABLED
// === 'true') AND a reCAPTCHA site key is present, and is wrapped in try/catch
// so a missing key or attestation init error logs a warning and lets the app
// continue to authenticate normally (Req 15.7, 15.8).
const appCheckEnabled = import.meta.env.VITE_APP_CHECK_ENABLED === 'true';
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (appCheckEnabled && recaptchaSiteKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    // Never block sign-in if App Check fails to initialize.
    console.warn('[AppCheck] init skipped:', e?.message || e);
  }
}

// ── Firestore with offline persistence ────────────────────────────
// `persistentLocalCache` caches every queried doc in IndexedDB so the
// app keeps working in poor signal — bakers can still browse orders,
// recipes, customers etc. when offline. `persistentMultipleTabManager`
// keeps multiple open tabs in sync.
//
// We always try the offline-cache path first. If it fails (Safari
// private mode / disabled IndexedDB), we fall back to the default
// (memory-only) Firestore so the app still works.
let dbInstance;
try {
  // persistentSingleTabManager works reliably on iOS Safari PWA / private mode.
  // persistentMultipleTabManager requires SharedWorker which iOS Safari blocks.
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager(),
    }),
  });
} catch (e) {
  // initializeFirestore throws if it has already been called (HMR, double
  // import). In that case, just grab the existing instance.
  try {
    dbInstance = getFirestore(app);
  } catch (e2) {
    dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
  }
}

export const db = dbInstance;
const _auth = getAuth(app);

// Explicitly set localStorage persistence so iOS PWA retains login across
// app restarts. Firebase defaults to this, but on Safari PWA the session
// can be reset; making it explicit ensures re-hydration on every launch.
setPersistence(_auth, browserLocalPersistence).catch(() => {
  // Safari private mode blocks localStorage — silently ignore, user will
  // need to log in again which is acceptable in private browsing.
});

export const auth = _auth;
export const storage = getStorage(app);

// ── Firebase Cloud Messaging (lazy — same pattern as Performance) ────────────
// isSupported() is async so the module-level export would always be null
// on first import. Instead we expose a lazy getter so callers always get
// the resolved instance (or null on unsupported browsers like iOS Safari).
let _messagingInstance = null;
let _messagingInitTried = false;

export async function getMessagingInstance() {
  if (_messagingInstance || _messagingInitTried) return _messagingInstance;
  _messagingInitTried = true;
  try {
    const supported = await isSupported();
    if (supported) {
      _messagingInstance = getMessaging(app);
    }
  } catch {
    _messagingInstance = null;
  }
  return _messagingInstance;
}

// Keep legacy export name for backwards compat — always null at module
// load time but harmless since nothing reads it synchronously.
export const messaging = null;

// ── Firebase Performance Monitoring (fully lazy) ──────────────────────────
// Initialized ONLY on first call to startTrace() — never at module load time.
// This prevents any race condition with Firestore initialization.
let perfInstance = null;
let perfInitTried = false;

async function getPerfSafe() {
  if (perfInstance || perfInitTried) return perfInstance;
  perfInitTried = true;
  try {
    const { getPerformance } = await import('firebase/performance');
    perfInstance = getPerformance(app);
  } catch {
    // Performance monitoring is best-effort — never block the app.
    perfInstance = null;
  }
  return perfInstance;
}

export const getPerf = () => perfInstance;

/**
 * Start a custom performance trace.
 * Usage: const trace = await startTrace('screen_orders_load');
 *        ... do work ...
 *        trace?.stop();
 */
export async function startTrace(name) {
  try {
    const perf = await getPerfSafe();
    if (!perf) return null;
    const { trace } = await import('firebase/performance');
    const t = trace(perf, name);
    t.start();
    return t;
  } catch {
    return null;
  }
}
