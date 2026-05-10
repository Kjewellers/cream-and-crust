import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  OAuthProvider
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
    let role = "customer"; // default role
    if (userDoc.exists()) {
      role = userDoc.data().role || "customer";
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
    
    // Create user document in Firestore with role 'customer'
    await setDoc(doc(db, "users", user.uid), {
      name: name || email.split('@')[0],
      email: email,
      role: "customer",
      createdAt: new Date().toISOString()
    });
    
    return { user, role: "customer" };
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
        role: "customer",
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
        role: "customer",
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
      return userDoc.data().role || "customer";
    }
    return "customer";
  } catch (error) {
    console.error("Error fetching user role:", error);
    return "customer";
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
