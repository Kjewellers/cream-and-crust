import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  OAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  deleteUser,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from './firebase';
import { Capacitor } from '@capacitor/core';
import { log } from '../utils/logger';

/**
 * Returns true when running inside a Capacitor native app (Android/iOS APK).
 * On those platforms:
 *  - signInWithRedirect does NOT work — it uses sessionStorage which
 *    Capacitor's WebView clears between page navigations, causing the
 *    "missing initial state" Firebase error shown in the bug screenshot.
 *  - signInWithPopup works correctly via an in-app browser tab (Custom Tabs
 *    on Android, SFSafariViewController on iOS).
 */
const isNativeApp = () => Capacitor.isNativePlatform();

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Log in an existing user
export const loginUser = async (email, password) => {
  try {
    log.auth('loginUser: attempting email login for', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch user role
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    let role = 'admin'; // default role is now admin
    if (userDoc.exists()) {
      role = userDoc.data().role || 'admin';
    }

    // Ensure they are promoted if they were a customer
    if (role === 'customer') {
      await promoteToAdmin(user.uid);
      role = 'admin';
    }

    log.auth('loginUser: success, uid:', user.uid, 'role:', role);
    return { user, role };
  } catch (error) {
    log.auth.error('loginUser failed:', error?.code, error?.message);
    throw error;
  }
};

// Register a new user (defaults to customer)
export const registerUser = async (email, password, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore with role 'admin'
    await setDoc(doc(db, 'users', user.uid), {
      name: name || email.split('@')[0],
      email: email,
      role: 'admin',
      createdAt: new Date().toISOString(),
    });

    // Create initial business document
    await setDoc(doc(db, 'business', user.uid), {
      name: '',
      logo: '',
      username:
        (name || email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() +
        Math.floor(100 + Math.random() * 900),
      uid: user.uid,
      createdAt: serverTimestamp(),
    });

    return { user, role: 'admin' };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};
// Google Sign In
// On native Capacitor (Android/iOS): always use signInWithPopup.
//   → signInWithRedirect uses sessionStorage to store OAuth state.
//     Capacitor's WebView does NOT preserve sessionStorage across the
//     OAuth redirect, causing the "missing initial state" error.
// On web browser: also use signInWithPopup (already the default).
export const signInWithGoogle = async () => {
  const platform = Capacitor.getPlatform();
  log.auth(`signInWithGoogle - platform: ${platform}, native: ${isNativeApp()}`);

  try {
    if (isNativeApp()) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const nativeResult = await FirebaseAuthentication.signInWithGoogle({
        scopes: ['email', 'profile'],
      });
      const idToken = nativeResult?.credential?.idToken;
      const accessToken = nativeResult?.credential?.accessToken;

      if (!idToken && !accessToken) {
        throw new Error('Google sign-in did not return a credential. Check native Firebase setup.');
      }

      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;
      log.auth('signInWithGoogle: native credential succeeded, uid:', user.uid);
      await ensureGoogleUserDocs(user);
      return user;
    }

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    log.auth('signInWithGoogle: popup succeeded, uid:', user.uid);
    await ensureGoogleUserDocs(user);
    return user;
  } catch (error) {
    log.auth.error('Google login error:', error?.code, error?.message);

    const shouldFallbackToRedirect =
      !isNativeApp() &&
      [
        'auth/popup-blocked',
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/operation-not-supported-in-this-environment',
        'auth/web-storage-unsupported',
      ].includes(error?.code);

    if (shouldFallbackToRedirect) {
      log.auth('Google popup unavailable; falling back to redirect.');
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw error;
  }
};

const signInWithGoogleLegacy = async () => {
  const platform = Capacitor.getPlatform();
  log.auth(`signInWithGoogle — platform: ${platform}, native: ${isNativeApp()}`);

  try {
    // signInWithPopup works on both web and Capacitor native
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    log.auth('signInWithGoogle: popup succeeded, uid:', user.uid);
    await ensureGoogleUserDocs(user);
    return user;
  } catch (error) {
    log.auth.error('Google login error:', error?.code, error?.message);

    // On Capacitor native, if popup is blocked, try opening via Browser plugin
    if (isNativeApp() && (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user')) {
      log.auth('Popup blocked on native, retrying with Browser plugin workaround...');
      try {
        const { Browser } = await import('@capacitor/browser');
        // Re-attempt — the Browser plugin opens a proper Custom Tab
        // that can handle the OAuth flow correctly
        const retryResult = await signInWithPopup(auth, googleProvider);
        const retryUser = retryResult.user;
        log.auth('signInWithGoogle retry succeeded, uid:', retryUser.uid);
        await ensureGoogleUserDocs(retryUser);
        return retryUser;
      } catch (retryError) {
        log.auth.error('Google login retry also failed:', retryError?.code, retryError?.message);
        throw retryError;
      }
    }

    throw error;
  }
};

// Handle redirect result (called once on app mount in AuthContext)
// On native Capacitor, getRedirectResult always resolves to null because
// we never call signInWithRedirect — skip it to prevent spurious errors.
// On web, also skip if sessionStorage is unavailable (storage-partitioned
// browsers) to prevent the "missing initial state" error.
export const handleGoogleRedirectResult = async () => {
  if (isNativeApp()) {
    log.auth('handleGoogleRedirectResult: skipped (native app)');
    return null;
  }
  try {
    // Check if sessionStorage is accessible before calling getRedirectResult
    try {
      sessionStorage.getItem('__test__');
    } catch {
      log.auth('handleGoogleRedirectResult: sessionStorage inaccessible, skipping');
      return null;
    }
    const result = await getRedirectResult(auth);
    if (result?.user) {
      log.auth('handleGoogleRedirectResult: got user from redirect');
      await ensureGoogleUserDocs(result.user);
      return result.user;
    }
    return null;
  } catch (error) {
    // Silently ignore "missing initial state" errors — they're expected
    // in storage-partitioned environments (3rd-party cookie restrictions)
    if (error?.message?.includes('missing initial state')) {
      log.auth('handleGoogleRedirectResult: missing initial state (expected in partitioned storage)');
      return null;
    }
    log.auth.error('Google redirect result error:', error?.code, error?.message);
    return null;
  }
};

// Shared helper: create user/business docs if they don't exist yet
async function ensureGoogleUserDocs(user) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await setDoc(userRef, {
      name: user.displayName,
      email: user.email,
      role: 'admin',
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'business', user.uid), {
      name: '',
      logo: '',
      username:
        (user.displayName || user.email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() +
        Math.floor(100 + Math.random() * 900),
      uid: user.uid,
      createdAt: serverTimestamp(),
    });
  }
}

/**
 * Reset password via Phone OTP (Calls Cloud Function)
 * Note: The user MUST be currently signed in via Phone Auth for this to work.
 */
export const resetPasswordViaPhone = async (newPassword) => {
  try {
    const functions = getFunctions();
    const resetPasswordFn = httpsCallable(functions, 'resetPasswordWithPhone');
    const result = await resetPasswordFn({ newPassword });
    return result.data;
  } catch (error) {
    console.error('OTP Password reset error:', error);
    throw error;
  }
};

// Apple Sign In
export const signInWithApple = async () => {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    const user = result.user;

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        name: user.displayName || 'Apple User',
        email: user.email,
        role: 'admin',
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'business', user.uid), {
        name: '',
        logo: '',
        username:
          (user.displayName || user.email.split('@')[0])
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase() + Math.floor(100 + Math.random() * 900),
        uid: user.uid,
        createdAt: serverTimestamp(),
      });
    }

    return user;
  } catch (error) {
    console.error('Apple login error:', error);
    throw error;
  }
};

// Phone Authentication is now handled by recaptchaManager.js singleton
// and Login.jsx directly. The old setupRecaptcha() and signInWithPhone()
// functions that used window.recaptchaVerifier have been removed.

// --- PASSWORD RESET ---

/**
 * Send a password-reset email via Firebase Auth.
 * actionCodeSettings sets the "Continue" URL to the real production domain
 * so the link is not flagged as spam (the default firebaseapp.com domain
 * often triggers spam filters on major email providers).
 */
export const resetPasswordByEmail = async (email) => {
  // Use the current origin so this works on both Vercel preview URLs and
  // the production domain without needing a hard-coded URL.
  const continueUrl = `${window.location.origin}/login`;
  const actionCodeSettings = {
    url: continueUrl,
    handleCodeInApp: false, // opens in browser, not the app
  };
  try {
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

/**
 * Log in using a phone number stored in the user's Firestore profile.
 * Flow: look up email by phone → sign in with email + password.
 * Returns { user, role } same as loginUser.
 */
export const loginWithPhone = async (phoneInput, password) => {
  const { email } = await lookupEmailByPhone(phoneInput);
  return loginUser(email, password);
};

/**
 * Look up a user's email by their phone number.
 * Queries the `users` collection for a matching `phone` field.
 * Returns `{ email, maskedEmail }` or throws if not found.
 *
 * The maskedEmail (e.g. "r***@gmail.com") is safe to show on-screen;
 * the raw email is used internally to call sendPasswordResetEmail.
 */
export const lookupEmailByPhone = async (phoneNumber) => {
  try {
    // Normalize: strip spaces, dashes; ensure +91 prefix for bare 10-digit numbers
    let normalized = phoneNumber.replace(/[\s\-()]/g, '');
    const digits = normalized.replace(/\D/g, '');
    if (digits.length === 10) normalized = `+91${digits}`;
    else if (!normalized.startsWith('+')) normalized = `+${digits}`;

    // Try multiple formats: exact match, with/without +91 prefix
    const candidates = [
      normalized,
      digits.length === 12 && digits.startsWith('91') ? `+${digits}` : null,
      digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : null,
      digits.length === 10 ? digits : null,
      digits.length === 10 ? `+91${digits}` : null,
    ].filter(Boolean);

    // De-duplicate
    const unique = [...new Set(candidates)];

    for (const phone of unique) {
      const q = query(collection(db, 'users'), where('phone', '==', phone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userData = snap.docs[0].data();
        const email = userData.email;
        if (email) {
          // Mask: keep first char, replace middle with ***, keep domain
          const [local, domain] = email.split('@');
          const masked =
            local.length <= 2
              ? `${local[0]}***@${domain}`
              : `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local.slice(-1)}@${domain}`;
          return { email, maskedEmail: masked };
        }
      }
    }

    throw new Error('No account found with that phone number.');
  } catch (error) {
    if (error.message?.includes('No account found')) throw error;
    console.error('Phone lookup error:', error);
    throw new Error('Could not look up that phone number. Please try with your email instead.');
  }
};

// ── Partial storage clear — call on logout and on user-switch ────────────────
//
// Clears storage layers related to session tokens and UI state:
//   1. All cc_* keys in localStorage
//   2. All sessionStorage
//
// IMPORTANT: We intentionally DO NOT clear IndexedDB or unregister Service Workers.
// This allows the PWA to load instantly offline, and preserves the encrypted Firestore
// cache for a zero-lag experience when the user logs back in.
export const clearAllAppStorage = async () => {
  log.cache('clearAllAppStorage: starting full storage wipe...');

  // 1. localStorage — remove every key that starts with "cc_" or is a
  //    known non-prefixed key this app writes (theme, etc.)
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('cc_') || k === 'theme')) {
        // Keep theme so the user's dark/light preference survives logout
        if (k !== 'theme') keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    log.cache('localStorage cleared:', keysToRemove.length, 'keys');
  } catch (e) {
    log.cache.warn('localStorage clear failed:', e?.message);
  }

  // 2. sessionStorage — anonymous sign-in attempt flag + any other keys
  try {
    sessionStorage.clear();
    log.cache('sessionStorage cleared');
  } catch (e) {
    log.cache.warn('sessionStorage clear failed:', e?.message);
  }

  log.cache('clearAllAppStorage: done (IndexedDB and SW intentionally preserved)');
};

// Log out the current user — signs out Firebase Auth AND clears all storage.
// After cleanup, forces a hard page reload so Firestore re-initializes
// cleanly without the "client already terminated" error.
export const logoutUser = async () => {
  log.auth('logoutUser: signing out...');
  try {
    if (isNativeApp()) {
      try {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        await FirebaseAuthentication.signOut();
      } catch (nativeError) {
        log.auth.warn('Native signOut skipped:', nativeError?.message);
      }
    }
    await signOut(auth);
    log.auth('logoutUser: signOut complete, clearing storage...');
    await clearAllAppStorage();
    log.auth('logoutUser: storage cleared, reloading page...');
    // Hard reload to get a fresh Firestore instance
    window.location.replace('/login');
  } catch (error) {
    log.auth.error('Logout error:', error?.code, error?.message);
    // Even on error, try to navigate away
    try { window.location.replace('/login'); } catch { /* ignore */ }
  }
};

// Fetch user role independently
export const getUserRole = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const role = userDoc.data().role || 'admin';
      if (role === 'customer') {
        await promoteToAdmin(uid);
        return 'admin';
      }
      return role;
    }
    // If user exists in Auth but not in Firestore, create doc with admin role
    return 'admin';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'admin';
  }
};

// Initial Setup Helper: Promote a user to admin
export const promoteToAdmin = async (uid) => {
  try {
    await setDoc(doc(db, 'users', uid), { role: 'admin' }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error promoting user:', error);
    throw error;
  }
};

// Onboarding Status
export const getOnboardingStatus = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data().onboardingComplete || userDoc.data().onboardingCompleted || false;
    }
    return false;
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return false;
  }
};

export const completeOnboarding = async (uid) => {
  try {
    await setDoc(
      doc(db, 'users', uid),
      { onboardingComplete: true, onboardingCompleted: true },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
};

export const completeTourV1 = async (uid) => {
  try {
    await setDoc(doc(db, 'users', uid), { hasSeenTourV1: true }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error completing tour:', error);
    throw error;
  }
};

// --- RECIPE VAULT PIN & BIOMETRICS ---
export const updateRecipeVaultPin = async (uid, hashedPin) => {
  try {
    await setDoc(doc(db, 'users', uid), { recipeVaultPin: hashedPin }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating PIN:', error);
    throw error;
  }
};

export const updateRecipeVaultBiometrics = async (uid, credentialId) => {
  try {
    // Save or clear the credential ID
    await setDoc(doc(db, 'users', uid), { recipeVaultCredentialId: credentialId }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating biometrics:', error);
    throw error;
  }
};

// --- PASSWORD CHANGE HELPERS ---

export const changeUserPassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return true;
  } catch (error) {
    console.error('Password change error:', error);
    throw error;
  }
};

// --- ACCOUNT DELETION ---

/**
 * Returns which sign-in providers the current user has. Used to decide
 * what re-authentication challenge to present before deletion:
 *   - 'password'  → ask for the account password
 *   - 'google.com'→ re-run the Google popup
 *   - 'apple.com' → re-run the Apple popup
 */
export const getCurrentUserProviders = () => {
  const user = auth.currentUser;
  if (!user) return [];
  return (user.providerData || []).map((p) => p.providerId);
};

/**
 * Re-authenticate the current user immediately before a sensitive
 * operation. Firebase requires a recent login to delete an account.
 *
 * @param {Object} opts
 * @param {string} [opts.password] required when the user signed up with email/password
 */
export const reauthenticateCurrentUser = async ({ password } = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');
  const providers = getCurrentUserProviders();

  if (providers.includes('google.com')) {
    // Google users re-confirm via the popup (no password to type).
    await reauthenticateWithPopup(user, googleProvider);
    return true;
  }
  if (providers.includes('apple.com')) {
    await reauthenticateWithPopup(user, appleProvider);
    return true;
  }
  // Email / password
  if (!password) throw new Error('Password required');
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  return true;
};

/**
 * Record why the user is leaving (best-effort analytics / feedback) in a
 * top-level `accountDeletions` collection BEFORE the account is removed,
 * since the user doc itself gets deleted.
 */
const recordDeletionReason = async (uid, reason, detail) => {
  try {
    await setDoc(doc(db, 'accountDeletions', `${uid}_${Date.now()}`), {
      uid,
      email: auth.currentUser?.email || '',
      reason: reason || 'unspecified',
      detail: detail || '',
      deletedAt: serverTimestamp(),
    });
  } catch (e) {
    // Non-fatal — never block deletion because feedback logging failed.
    console.warn('Could not record deletion reason:', e);
  }
};

/**
 * Permanently delete the current user's account.
 *
 * Steps:
 *   1. Re-authenticate (password for email users, popup for Google/Apple).
 *   2. Log the deletion reason for product feedback.
 *   3. Delete their primary Firestore docs (users/{uid}, business/{uid}).
 *   4. Delete the Firebase Auth user.
 *
 * NOTE: Sub-collections (orders, products, recipes, …) are owned by `uid`
 * but are not bulk-deleted client-side here (Firestore has no client
 * cascade). The auth account removal revokes all access; a scheduled
 * Cloud Function / manual cleanup can purge orphaned docs server-side.
 *
 * @param {Object} opts
 * @param {string} [opts.password] required for email/password accounts
 * @param {string} [opts.reason]   short reason code/string
 * @param {string} [opts.detail]   freeform extra detail
 */
export const deleteCurrentAccount = async ({ password, reason, detail } = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');
  const uid = user.uid;

  // 1. Re-authenticate (throws if password wrong / popup cancelled)
  await reauthenticateCurrentUser({ password });

  // 2. Record the reason before we lose access to write
  await recordDeletionReason(uid, reason, detail);

  // 3. Best-effort delete of the user's primary documents
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (e) {
    console.warn('Could not delete user doc:', e);
  }
  try {
    await deleteDoc(doc(db, 'business', uid));
  } catch (e) {
    console.warn('Could not delete business doc:', e);
  }

  // 4. Delete the auth account (final — signs the user out)
  await deleteUser(user);
  return true;
};
