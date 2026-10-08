/**
 * ExpenseRepository.js
 * All Firestore operations for the expenses collection + receipt storage.
 */
import { collection, addDoc, updateDoc, doc, query, onSnapshot, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { auditLog, AUDIT } from '../auditLog.js';

export const expensesCollection = collection(db, 'expenses');

export const uploadImageToStorage = async (file, path = 'uploads') => {
  try {
    const uid = auth.currentUser?.uid || 'anonymous';
    const storageRef = ref(storage, `${path}/${uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (e) {
    console.error('Error uploading image:', e);
    throw e;
  }
};

export const uploadReceiptToStorage = async (file) => {
  return await uploadImageToStorage(file, 'receipts');
};

export const addExpenseToDB = async (expenseData) => {
  try {
    const docRef = await addDoc(expensesCollection, {
      ...expenseData,
      uid: auth.currentUser?.uid,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding expense:', e);
    throw e;
  }
};

export const deleteExpenseFromDB = async (expenseId) => {
  try {
    const uid = auth.currentUser?.uid;
    await updateDoc(doc(db, 'expenses', expenseId), { deleted: true, deletedAt: new Date().toISOString() });
    auditLog(AUDIT.EXPENSE_DELETED, uid, { expenseId });
  } catch (e) {
    console.error('Error deleting expense:', e);
    throw e;
  }
};

export const subscribeToExpenses = (callback, errorCallback, userId) => {
  const q = query(expensesCollection, where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER'));
  return onSnapshot(
    q,
    (snapshot) => {
      let expenses = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.deleted) expenses.push({ id: docSnap.id, ...data });
      });
      expenses.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      callback(expenses);
    },
    (error) => {
      console.error('Expenses subscription error:', error);
      if (errorCallback) errorCallback(error);
    }
  );
};
