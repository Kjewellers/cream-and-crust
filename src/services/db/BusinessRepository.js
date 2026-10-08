/**
 * BusinessRepository.js
 * All Firestore operations for the business profile, portfolio settings,
 * menu builder settings, and user lookups.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  onSnapshot,
  where,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export const businessCollection = collection(db, 'business');

export const subscribeToBusiness = (callback, errorCallback, identifier = null) => {
  const isUserId = identifier && identifier.length > 20 && !identifier.includes(' ');

  if (isUserId) {
    const bizRef = doc(db, 'business', identifier);
    return onSnapshot(
      bizRef,
      (docSnap) => {
        callback(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : { id: identifier, name: '', logo: '' });
      },
      (error) => {
        console.error('Business subscription error:', error);
        if (errorCallback) errorCallback(error);
      }
    );
  }

  if (identifier && typeof identifier === 'string') {
    const q = query(businessCollection, where('username', '==', identifier.toLowerCase()));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          callback({ id: docSnap.id, ...docSnap.data() });
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Business subscription by username error:', error);
        if (errorCallback) errorCallback(error);
      }
    );
  }

  return onSnapshot(businessCollection, (snapshot) => {
    const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    callback(data[0] || { name: '', logo: '' });
  });
};

export const getBusinessByUsername = async (username) => {
  try {
    const q1 = query(businessCollection, where('username', '==', username.toLowerCase()));
    const snapshot1 = await getDocs(q1);
    if (!snapshot1.empty) return { id: snapshot1.docs[0].id, ...snapshot1.docs[0].data() };
    const q2 = query(businessCollection, where('username', '==', username));
    const snapshot2 = await getDocs(q2);
    if (!snapshot2.empty) return { id: snapshot2.docs[0].id, ...snapshot2.docs[0].data() };
    return null;
  } catch (e) {
    console.error('Error fetching business by username:', e);
    return null;
  }
};

export const updateBusinessInDB = async (businessId, businessData) => {
  try {
    const safeId = businessId || 'main';
    const bizRef = doc(db, 'business', safeId);
    await setDoc(bizRef, { ...businessData, uid: safeId }, { merge: true });
  } catch (e) {
    console.error('Error updating business: ', e);
    throw e;
  }
};

export const updatePortfolioSettings = async (uid, settings) => {
  try {
    await updateDoc(doc(db, 'users', uid), { portfolioSettings: settings });
  } catch (e) {
    console.error('Error updating portfolio settings:', e);
    throw e;
  }
};

export const subscribeToPortfolioSettings = (uid, callback) => {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (docSnap) => {
    callback(docSnap.exists() ? docSnap.data().portfolioSettings || {} : {});
  });
};

export const updateMenuSettings = async (uid, settings) => {
  try {
    await setDoc(
      doc(db, 'users', uid),
      { menuBuilder: { ...settings, updatedAt: new Date().toISOString() } },
      { merge: true }
    );
  } catch (e) {
    console.error('Error updating menu settings:', e);
    throw e;
  }
};

export const publishMenuSettings = async (uid, settings) => {
  try {
    const publishedAt = new Date().toISOString();
    await updateMenuSettings(uid, { ...settings, published: true, publishedAt });
    await updateBusinessInDB(uid, { menuPublished: true, menuPublishedAt: publishedAt, menuSettings: settings });
  } catch (e) {
    console.error('Error publishing menu:', e);
    throw e;
  }
};

export const subscribeToMenuSettings = (uid, callback) => {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (docSnap) => {
    callback(docSnap.exists() ? docSnap.data().menuBuilder || {} : {});
  });
};

export const getMenuSettingsByUserId = async (uid) => {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    return userSnap.exists() ? userSnap.data().menuBuilder || {} : {};
  } catch (e) {
    console.error('Error fetching menu settings:', e);
    return {};
  }
};

export const getUserByUsername = async (username) => {
  try {
    const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  } catch (e) {
    console.error('Error fetching user by username:', e);
    return null;
  }
};

export const getUserDoc = async (uid) => {
  try {
    const uSnap = await getDoc(doc(db, 'users', uid));
    return uSnap.exists() ? { id: uSnap.id, ...uSnap.data() } : null;
  } catch (e) {
    console.error('Error fetching user doc:', e);
    return null;
  }
};

export const updateUserDoc = async (uid, data) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, data, { merge: true });
  } catch (e) {
    console.error('Error updating user doc:', e);
    throw e;
  }
};

export const getBusinessByUserId = async (uid) => {
  try {
    const bizSnap = await getDoc(doc(db, 'business', uid));
    return bizSnap.exists() ? { id: bizSnap.id, ...bizSnap.data() } : null;
  } catch (e) {
    console.error('Error fetching business by userId:', e);
    return null;
  }
};

