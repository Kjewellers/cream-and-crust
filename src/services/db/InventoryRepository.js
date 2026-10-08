/**
 * InventoryRepository.js
 * All Firestore operations for the inventory collection.
 */
import { collection, addDoc, updateDoc, doc, query, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { auditLog, AUDIT } from '../auditLog.js';

export const inventoryCollection = collection(db, 'inventory');

export const addInventoryToDB = async (itemData) => {
  try {
    const docRef = await addDoc(inventoryCollection, { ...itemData, uid: auth.currentUser?.uid });
    return docRef.id;
  } catch (e) {
    console.error('Error adding inventory item: ', e);
    throw e;
  }
};

export const updateInventoryStockInDB = async (itemId, newStock) => {
  try {
    await updateDoc(doc(db, 'inventory', itemId), { stock: newStock });
  } catch (e) {
    console.error('Error updating inventory stock: ', e);
    throw e;
  }
};

export const updateInventoryFieldsInDB = async (itemId, fields) => {
  try {
    await updateDoc(doc(db, 'inventory', itemId), fields);
  } catch (e) {
    console.error('Error updating inventory fields: ', e);
    throw e;
  }
};

export const deleteInventoryFromDB = async (itemId) => {
  try {
    const uid = auth.currentUser?.uid;
    await updateDoc(doc(db, 'inventory', itemId), { deleted: true, deletedAt: new Date().toISOString() });
    auditLog(AUDIT.INVENTORY_DELETED, uid, { itemId });
  } catch (e) {
    console.error('Error deleting inventory item: ', e);
    throw e;
  }
};

export const subscribeToInventory = (callback, errorCallback, userId) => {
  const q = query(inventoryCollection, where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER'));
  return onSnapshot(
    q,
    (snapshot) => {
      const valid = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.deleted) valid.push({ id: docSnap.id, ...data });
      });
      callback(valid);
    },
    (error) => {
      console.error('Inventory subscription error:', error);
      if (errorCallback) errorCallback(error);
    }
  );
};
