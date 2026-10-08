/**
 * CustomerRepository.js
 * All Firestore operations for the customers collection.
 */

import { collection, addDoc, getDocs, updateDoc, doc, query, onSnapshot, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { encryptData, decryptData } from '../../utils/crypto';
import { auditLog, AUDIT } from '../auditLog.js';

export const customersCollection = collection(db, 'customers');

export const subscribeToCustomers = (callback, errorCallback, userId) => {
  const q = query(customersCollection, where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER'));
  return onSnapshot(
    q,
    async (snapshot) => {
      const customersPromises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (data.deleted) return null;
        return {
          id: docSnap.id,
          ...data,
          name: await decryptData(data.name),
          phone: await decryptData(data.phone),
          address: await decryptData(data.address),
        };
      });
      const resolved = await Promise.all(customersPromises);
      callback(resolved.filter(c => c !== null));
    },
    (error) => {
      console.error('Customers subscription error:', error);
      if (errorCallback) errorCallback(error);
    }
  );
};

export const addCustomerToDB = async (customerData) => {
  try {
    const uid = auth.currentUser?.uid;
    const encryptedData = { ...customerData };
    if (encryptedData.name) encryptedData.name = await encryptData(encryptedData.name, uid);
    if (encryptedData.phone) encryptedData.phone = await encryptData(encryptedData.phone, uid);
    if (encryptedData.address) encryptedData.address = await encryptData(encryptedData.address, uid);

    let docId;
    if (customerData.phone) {
      const phoneClean = customerData.phone.replace(/\D/g, '');
      const enc = new TextEncoder();
      const data = enc.encode(`${uid}-${phoneClean}`);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      docId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 20);
      await setDoc(doc(db, 'customers', docId), { ...encryptedData, uid, createdAt: new Date().toISOString() }, { merge: true });
    } else {
      const docRef = await addDoc(customersCollection, { ...encryptedData, uid, createdAt: new Date().toISOString() });
      docId = docRef.id;
    }
    return docId;
  } catch (e) {
    console.error('Error adding customer: ', e);
    throw e;
  }
};

export const updateCustomerInDB = async (customerId, customerData) => {
  try {
    const uid = auth.currentUser?.uid;
    const encryptedData = { ...customerData };
    if (encryptedData.name) encryptedData.name = await encryptData(encryptedData.name, uid);
    if (encryptedData.phone) encryptedData.phone = await encryptData(encryptedData.phone, uid);
    if (encryptedData.address) encryptedData.address = await encryptData(encryptedData.address, uid);
    await updateDoc(doc(db, 'customers', customerId), encryptedData);
  } catch (e) {
    console.error('Error updating customer: ', e);
    throw e;
  }
};

export const deleteCustomerFromDB = async (customerId) => {
  try {
    const uid = auth.currentUser?.uid;
    await updateDoc(doc(db, 'customers', customerId), { deleted: true, deletedAt: new Date().toISOString() });
    auditLog(AUDIT.CUSTOMER_DELETED, uid, { customerId });
  } catch (e) {
    console.error('Error deleting customer: ', e);
    throw e;
  }
};

export const autoDeduplicateCustomers = async (customers, orders) => {
  if (!customers || !customers.length || !orders || !auth.currentUser?.uid) return;
  const digitsOnly = (str) => String(str || '').replace(/\D/g, '');
  const customerGroups = {};
  customers.forEach(c => {
    const p = digitsOnly(c.phone);
    if (p) {
      if (!customerGroups[p]) customerGroups[p] = [];
      customerGroups[p].push(c);
    }
  });
  const duplicateGroups = Object.entries(customerGroups).filter(([_, group]) => group.length > 1);
  if (duplicateGroups.length === 0) return;
  for (const [phone, group] of duplicateGroups) {
    try {
      group.sort((a, b) => {
        if (a.name && !b.name) return -1;
        if (!a.name && b.name) return 1;
        return new Date(b.lastOrder || 0) - new Date(a.lastOrder || 0);
      });
      const survivor = group[0];
      const toDelete = group.slice(1);
      const matchingOrders = orders.filter((o) => {
        const orderPhone = typeof o.customer === 'object' ? o.customer?.phone : (o.phone || o.customerPhone);
        return digitsOnly(orderPhone) === phone;
      });
      const trueTotalOrders = matchingOrders.length;
      const trueTotalSpent = matchingOrders.reduce((sum, o) => sum + Number(o.total || o.totalAmount || 0), 0);
      let mergedName = survivor.name;
      let mergedAddress = survivor.address;
      for (const old of toDelete) {
        if (!mergedName && old.name) mergedName = old.name;
        if (!mergedAddress && old.address) mergedAddress = old.address;
      }
      await updateDoc(doc(db, 'customers', survivor.id), { name: mergedName, address: mergedAddress, totalOrders: trueTotalOrders, totalSpent: trueTotalSpent, updatedAt: new Date().toISOString() });
      for (const old of toDelete) {
        await deleteDoc(doc(db, 'customers', old.id));
      }
    } catch (e) {
      console.error(`[Deduplicator] Error merging group ${phone}:`, e);
    }
  }
};
