/**
 * ProductRepository.js
 * All Firestore operations for the products (catalog) collection.
 */
import { collection, addDoc, updateDoc, doc, query, onSnapshot, where, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { auditLog, AUDIT } from '../auditLog.js';

export const productsCollection = collection(db, 'products');

export const addProductToDB = async (productData) => {
  try {
    const uid = auth.currentUser?.uid;
    let docId;
    if (productData.name) {
      const nameClean = productData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const enc = new TextEncoder();
      const data = enc.encode(`${uid}-${nameClean}`);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      docId = 'prod_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
      await setDoc(doc(db, 'products', docId), { ...productData, uid }, { merge: true });
    } else {
      const docRef = await addDoc(productsCollection, { ...productData, uid });
      docId = docRef.id;
    }
    return docId;
  } catch (e) {
    console.error('Error adding product: ', e);
    throw e;
  }
};

export const updateProductInDB = async (productId, productData) => {
  try {
    await updateDoc(doc(db, 'products', productId), productData);
  } catch (e) {
    console.error('Error updating product: ', e);
    throw e;
  }
};

export const deleteProductFromDB = async (productId) => {
  try {
    const uid = auth.currentUser?.uid;
    await updateDoc(doc(db, 'products', productId), { deleted: true, deletedAt: new Date().toISOString() });
    auditLog(AUDIT.PRODUCT_DELETED, uid, { productId });
  } catch (e) {
    console.error('Error deleting product: ', e);
    throw e;
  }
};

export const subscribeToProducts = (callback, errorCallback, userId) => {
  const q = query(productsCollection, where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER'));
  return onSnapshot(
    q,
    (snapshot) => {
      const products = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.deleted) products.push({ id: docSnap.id, ...data });
      });
      callback(products);
    },
    (error) => {
      console.error('Products subscription error:', error);
      if (errorCallback) errorCallback(error);
    }
  );
};
