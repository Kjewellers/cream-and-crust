/**
 * RecycleBinRepository.js
 * Cross-collection soft-delete restore/purge operations.
 */
import { collection, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { auditLog, AUDIT } from '../auditLog.js';

export const restoreFromDB = async (collectionName, id) => {
  try {
    await updateDoc(doc(db, collectionName, id), { deleted: false });
    const uid = auth.currentUser?.uid;
    auditLog(AUDIT.ITEM_RESTORED, uid, { collectionName, id });
  } catch (e) {
    console.error('Error restoring item:', e);
    throw e;
  }
};

export const permanentlyDeleteFromDB = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    const uid = auth.currentUser?.uid;
    auditLog(AUDIT.ITEM_PERMANENTLY_DELETED, uid, { collectionName, id });
  } catch (e) {
    console.error('Error permanently deleting item:', e);
    throw e;
  }
};

export const fetchDeletedItems = async (userId) => {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return [];
  const collections = ['orders', 'customers', 'products', 'recipes', 'inventory', 'expenses', 'shoppingList'];
  let allDeleted = [];
  try {
    for (const col of collections) {
      const q = query(collection(db, col), where('uid', '==', uid));
      const snap = await getDocs(q);
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.deleted === true) {
          allDeleted.push({ id: docSnap.id, _collection: col, ...data });
        }
      });
    }
    return allDeleted.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));
  } catch (e) {
    console.error('Error fetching deleted items:', e);
    return [];
  }
};

export const getCrashReports = async (limitCount = 10) => {
  try {
    const qCrashes = query(collection(db, 'crash_reports'), orderBy('timestamp', 'desc'), limit(limitCount));
    const crashSnap = await getDocs(qCrashes);
    return crashSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error fetching crash reports:', e);
    throw e;
  }
};

export const getAuditLogs = async (limitCount = 15) => {
  try {
    const qAudits = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(limitCount));
    const auditSnap = await getDocs(qAudits);
    return auditSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error fetching audit logs:', e);
    throw e;
  }
};

