/**
 * ShoppingRepository.js
 * All Firestore operations for the shopping list collection.
 */
import { collection, addDoc, updateDoc, doc, query, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { auditLog, AUDIT } from '../auditLog.js';

export const shoppingListCollection = collection(db, 'shoppingList');

export const addShoppingItemToDB = async (itemData) => {
  try {
    const docRef = await addDoc(shoppingListCollection, {
      ...itemData,
      uid: auth.currentUser?.uid,
      bought: false,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding shopping item:', e);
    throw e;
  }
};

export const toggleShoppingItemInDB = async (itemId, bought) => {
  try {
    await updateDoc(doc(db, 'shoppingList', itemId), { bought });
  } catch (e) {
    console.error('Error toggling shopping item:', e);
    throw e;
  }
};

export const deleteShoppingItemFromDB = async (itemId) => {
  try {
    const uid = auth.currentUser?.uid;
    await updateDoc(doc(db, 'shoppingList', itemId), { deleted: true, deletedAt: new Date().toISOString() });
    auditLog(AUDIT.SHOPPING_DELETED, uid, { itemId });
  } catch (e) {
    console.error('Error deleting shopping item:', e);
    throw e;
  }
};

export const subscribeToShoppingList = (callback, errorCallback, userId) => {
  const q = query(shoppingListCollection, where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER'));
  return onSnapshot(
    q,
    (snapshot) => {
      let items = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.deleted) items.push({ id: docSnap.id, ...data });
      });
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      callback(items);
    },
    (error) => {
      console.error('Shopping list subscription error:', error);
      if (errorCallback) errorCallback(error);
    }
  );
};
