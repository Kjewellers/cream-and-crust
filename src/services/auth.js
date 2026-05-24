import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  OAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

// Log in an existing user
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch user role
    const userDoc = await getDoc(doc(db, "users", user.uid));
    let role = "admin"; // default role is now admin
    if (userDoc.exists()) {
      role = userDoc.data().role || "admin";
    }
    
    // Ensure they are promoted if they were a customer
    if (role === "customer") {
      await promoteToAdmin(user.uid);
      role = "admin";
    }
    
    return { user, role };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Register a new user (defaults to customer)
export const registerUser = async (email, password, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore with role 'admin'
    await setDoc(doc(db, "users", user.uid), {
      name: name || email.split('@')[0],
      email: email,
      role: "admin",
      createdAt: new Date().toISOString()
    });
    
    // Create initial business document
    await setDoc(doc(db, "business", user.uid), {
      name: 'Cream & Crust',
      logo: '🧁',
      username: (name || email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(100 + Math.random() * 900),
      uid: user.uid,
      createdAt: serverTimestamp()
    });
    
    return { user, role: "admin" };
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};
// Google Sign In
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Create user document if it doesn't exist
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        role: "admin",
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "business", user.uid), {
        name: 'Cream & Crust',
        logo: '🧁',
        username: (user.displayName || user.email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(100 + Math.random() * 900),
        uid: user.uid,
        createdAt: serverTimestamp()
      });
    }

    return user;
  } catch (error) {
    console.error("Google login error:", error);
    throw error;
  }
};

// Apple Sign In
export const signInWithApple = async () => {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        name: user.displayName || 'Apple User',
        email: user.email,
        role: "admin",
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "business", user.uid), {
        name: 'Cream & Crust',
        logo: '🧁',
        username: (user.displayName || user.email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(100 + Math.random() * 900),
        uid: user.uid,
        createdAt: serverTimestamp()
      });
    }

    return user;
  } catch (error) {
    console.error("Apple login error:", error);
    throw error;
  }
};

// Phone Authentication
export const setupRecaptcha = (containerId) => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible'
    });
  }
};

export const signInWithPhone = async (phoneNumber) => {
  try {
    const appVerifier = window.recaptchaVerifier;
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    return confirmationResult;
  } catch (error) {
    console.error("Phone login error:", error);
    throw error;
  }
};

// Log out the current user
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

// Fetch user role independently
export const getUserRole = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const role = userDoc.data().role || "admin";
      if (role === "customer") {
        await promoteToAdmin(uid);
        return "admin";
      }
      return role;
    }
    // If user exists in Auth but not in Firestore, create doc with admin role
    return "admin";
  } catch (error) {
    console.error("Error fetching user role:", error);
    return "admin";
  }
};

// Initial Setup Helper: Promote a user to admin
export const promoteToAdmin = async (uid) => {
  try {
    await setDoc(doc(db, "users", uid), { role: "admin" }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error promoting user:", error);
    throw error;
  }
};

// Onboarding Status
export const getOnboardingStatus = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data().onboardingComplete || userDoc.data().onboardingCompleted || false;
    }
    return false;
  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    return false;
  }
};

export const completeOnboarding = async (uid) => {
  try {
    await setDoc(doc(db, "users", uid), { onboardingComplete: true, onboardingCompleted: true }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error completing onboarding:", error);
    throw error;
  }
};


export const completeTourV1 = async (uid) => {
  try {
    await setDoc(doc(db, "users", uid), { hasSeenTourV1: true }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error completing tour:", error);
    throw error;
  }
};

// --- RECIPE VAULT PIN & BIOMETRICS ---
export const updateRecipeVaultPin = async (uid, hashedPin) => {
  try {
    await setDoc(doc(db, "users", uid), { recipeVaultPin: hashedPin }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating PIN:", error);
    throw error;
  }
};

export const updateRecipeVaultBiometrics = async (uid, credentialId) => {
  try {
    // Save or clear the credential ID
    await setDoc(doc(db, "users", uid), { recipeVaultCredentialId: credentialId }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating biometrics:", error);
    throw error;
  }
};

// --- PASSWORD CHANGE HELPERS ---


export const changeUserPassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return true;
  } catch (error) {
    console.error("Password change error:", error);
    throw error;
  }
};

