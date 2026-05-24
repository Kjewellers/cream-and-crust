import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from './firebase';

const capturesCollection = collection(db, 'userCaptures');

export const addCaptureToDB = async (data) => {
  try {
    const docRef = await addDoc(capturesCollection, {
      ...data,
      uid: auth.currentUser?.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding capture:', e);
    throw e;
  }
};

export const updateCaptureInDB = async (id, data) => {
  try {
    await updateDoc(doc(db, 'userCaptures', id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Error updating capture:', e);
    throw e;
  }
};

export const deleteCaptureFromDB = async (id) => {
  try {
    await deleteDoc(doc(db, 'userCaptures', id));
  } catch (e) {
    console.error('Error deleting capture:', e);
    throw e;
  }
};

export const subscribeToCaptures = (callback, errorCallback, userId) => {
  const uid = userId || auth.currentUser?.uid;
  const q = query(capturesCollection, where('uid', '==', uid));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(items);
  }, (err) => {
    console.error('Captures subscription error:', err);
    if (errorCallback) errorCallback(err);
  });
};
