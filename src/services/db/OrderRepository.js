/**
 * OrderRepository.js
 *
 * All Firestore operations for the orders collection.
 * Migrated from db.js as part of the Repository Layer refactoring.
 *
 * Import from here for new code:
 *   import { addOrderToDB, subscribeToOrders } from '../services/db/OrderRepository';
 *
 * Legacy imports from '../services/db' continue to work via the re-export shim.
 */

import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  onSnapshot,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { encryptData, decryptData } from '../../utils/crypto';
import {
  convertUnit,
  parseSizeMultiplier,
  MissingRecipeLinkError,
  MissingInventoryItemError,
  InsufficientStockError,
  IncompatibleUnitError,
} from '../inventoryErrors.js';
import { auditLog, AUDIT } from '../auditLog.js';

// Helper to strip undefined values to prevent Firestore errors
const removeUndefined = (obj) => {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      if (obj[key] === undefined) delete obj[key];
    });
  }
  return obj;
};

export const ordersCollection = collection(db, 'orders');

export const addOrderToDB = async (orderData) => {
  try {
    const encryptedData = { ...orderData };
    const uid = orderData.userId || auth.currentUser?.uid;
    if (encryptedData.customer) encryptedData.customer = await encryptData(encryptedData.customer, uid);
    if (encryptedData.customerName)
      encryptedData.customerName = await encryptData(encryptedData.customerName, uid);
    if (encryptedData.phone) encryptedData.phone = await encryptData(encryptedData.phone, uid);
    if (encryptedData.deliveryAddress)
      encryptedData.deliveryAddress = await encryptData(encryptedData.deliveryAddress, uid);
    if (encryptedData.notes) encryptedData.notes = await encryptData(encryptedData.notes, uid);

    const docRef = await addDoc(ordersCollection, removeUndefined({
      ...encryptedData,
      uid: uid,
      createdAt: new Date().toISOString(),
    }));

    auditLog(AUDIT.ORDER_CREATED, uid, { orderId: docRef.id });

    import('../analytics.js').then(({ trackOrderCreate, trackFirstOrder }) => {
      trackOrderCreate({ product: orderData.product || 'unknown' });
      getDocs(query(ordersCollection, where('uid', '==', uid))).then((snap) => {
        if (snap.size === 1) trackFirstOrder();
      }).catch(() => {});
    }).catch(() => {});

    return docRef.id;
  } catch (e) {
    console.error('Error adding order: ', e);
    throw e;
  }
};

export const deductIngredientsForOrder = async (orderId, orderData) => {
  const uid = orderData.userId || orderData.uid || auth.currentUser?.uid;
  if (!uid) return;

  if (orderData.deductedForOrder) return;

  const items = Array.isArray(orderData.items) ? orderData.items : [{
    recipeId: orderData.recipeId,
    name: orderData.product || 'Unknown Product',
    size: orderData.size || '1kg'
  }];

  const itemsToDeduct = items.filter(item => item.recipeId);
  if (itemsToDeduct.length === 0) {
    throw new MissingRecipeLinkError(orderId, orderData.product || 'Items');
  }

  try {
    const invSnap = await getDocs(query(collection(db, 'inventory'), where('uid', '==', uid)));
    const inventoryItems = invSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

    const deductionPlan = [];
    const deductionSummary = [];

    for (const orderItem of itemsToDeduct) {
      const recipeSnap = await getDoc(doc(db, 'recipes', orderItem.recipeId));
      if (!recipeSnap.exists() || recipeSnap.data().uid !== uid) {
        throw new MissingRecipeLinkError(orderId, orderItem.name || '');
      }
      
      const recipe = recipeSnap.data();
      const ingredients = recipe.ingredients || [];
      const multiplier = parseSizeMultiplier(orderItem.size || recipe.defaultSize || '1kg');

      for (const ing of ingredients) {
        const ingName = (ing.name || '').toLowerCase();
        const ingQty = Number(ing.qty || ing.quantity || 0);
        const ingUnit = (ing.unit || 'g').toLowerCase();

        const matchedInv = inventoryItems.find((item) => {
          const itemName = (item.item || '').toLowerCase();
          return itemName === ingName || itemName.includes(ingName) || ingName.includes(itemName);
        });

        if (!matchedInv) {
          throw new MissingInventoryItemError(ing.name);
        }

        const invUnit = (matchedInv.unit || 'kg').toLowerCase();

        let needed;
        try {
          needed = convertUnit(ingQty * multiplier, ingUnit, invUnit, ing.name);
        } catch (unitErr) {
          throw new IncompatibleUnitError(ingUnit, invUnit, ing.name);
        }

        needed = parseFloat(needed.toFixed(4));

        const existingPlan = deductionPlan.find(p => p.invId === matchedInv.id);
        if (existingPlan) {
          existingPlan.needed = parseFloat((existingPlan.needed + needed).toFixed(4));
        } else {
          deductionPlan.push({ invId: matchedInv.id, invRef: matchedInv.ref, needed, unit: invUnit, itemName: matchedInv.item });
        }

        const existingSummary = deductionSummary.find(s => s.ingredient === ing.name && s.unit === invUnit);
        if (existingSummary) {
          existingSummary.deducted = parseFloat((existingSummary.deducted + needed).toFixed(4));
        } else {
          deductionSummary.push({ ingredient: ing.name, deducted: needed, unit: invUnit });
        }
      }
    }

    const orderRef = doc(db, 'orders', orderId);
    await runTransaction(db, async (txn) => {
      const freshOrder = await txn.get(orderRef);
      if (freshOrder.exists() && freshOrder.data().deductedForOrder) return;

      for (const { invRef, needed, unit, itemName } of deductionPlan) {
        const invDoc = await txn.get(invRef);
        if (!invDoc.exists()) throw new MissingInventoryItemError(itemName);
        const available = Number(invDoc.data().stock || 0);
        if (available < needed) {
          throw new InsufficientStockError(itemName, available, needed, unit);
        }
        const newStock = parseFloat((available - needed).toFixed(4));
        txn.update(invRef, { stock: newStock });
      }

      txn.update(orderRef, {
        deductedForOrder: true,
        deductionSummary,
        deductedAt: new Date().toISOString(),
      });
    });
  } catch (e) {
    const errorMsg = e.message || 'Unknown deduction error';
    console.error('Deduction error:', errorMsg);

    try {
      const { showToast } = await import('../../components/iOS.jsx');
      showToast(`⚠️ Stock deduction failed: ${errorMsg}`, 'error');
    } catch (_) { /* toast not critical */ }

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        deductionError: { code: e.code || 'UNKNOWN', message: errorMsg, at: new Date().toISOString() },
      });
    } catch (_) { /* best-effort */ }

    throw e;
  }
};

export const restockIngredientsForOrder = async (orderId, orderData) => {
  const uid = orderData.userId || orderData.uid || auth.currentUser?.uid;
  if (!uid) return;
  if (!orderData.deductedForOrder) return;

  const summary = orderData.deductionSummary;
  if (!Array.isArray(summary) || summary.length === 0) return;

  try {
    const invSnap = await getDocs(query(collection(db, 'inventory'), where('uid', '==', uid)));
    const inventoryItems = invSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
    const orderRef = doc(db, 'orders', orderId);

    await runTransaction(db, async (txn) => {
      const freshOrder = await txn.get(orderRef);
      if (!freshOrder.exists() || freshOrder.data().restockedForOrder) return;

      for (const { ingredient, deducted, unit } of summary) {
        const ingName = (ingredient || '').toLowerCase();
        const matchedInv = inventoryItems.find((item) => {
          const itemName = (item.item || '').toLowerCase();
          return itemName === ingName || itemName.includes(ingName) || ingName.includes(itemName);
        });
        if (!matchedInv) continue;

        const invDoc = await txn.get(matchedInv.ref);
        if (!invDoc.exists()) continue;
        const currentStock = Number(invDoc.data().stock || 0);
        const newStock = parseFloat((currentStock + Number(deducted || 0)).toFixed(4));
        txn.update(matchedInv.ref, { stock: newStock });
      }

      txn.update(orderRef, { restockedForOrder: true, restockedAt: new Date().toISOString() });
    });
  } catch (e) {
    console.error('Restock error:', e.message);
    try {
      const { showToast } = await import('../../components/iOS.jsx');
      showToast(`⚠️ Restock failed: ${e.message}`, 'error');
    } catch (_) { /* non-critical */ }
  }
};

export const updateOrderStatusInDB = async (orderId, newStatus, extraFields = {}) => {
  try {
    const uid = auth.currentUser?.uid;
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status: newStatus, ...extraFields });
    auditLog(AUDIT.ORDER_STATUS_CHANGED, uid, { orderId, newStatus });

    if (newStatus.toLowerCase() === 'confirmed') {
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const hasRecipe = orderData.recipeId || (Array.isArray(orderData.items) && orderData.items.some(i => i.recipeId));
        if (hasRecipe) {
          await deductIngredientsForOrder(orderId, { id: orderSnap.id, ...orderData });
        }
      }
    }

    if (newStatus.toLowerCase() === 'cancelled') {
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        if (orderData.deductedForOrder) {
          await restockIngredientsForOrder(orderId, { id: orderSnap.id, ...orderData });
        }
      }
    }
  } catch (e) {
    console.error('Error updating order: ', e);
    throw e;
  }
};

export const updateOrderFieldsInDB = async (orderId, fields) => {
  try {
    await updateDoc(doc(db, 'orders', orderId), fields);
  } catch (e) {
    console.error('Error updating order fields: ', e);
    throw e;
  }
};

export const updateOrderInDB = async (orderId, orderData) => {
  try {
    const encryptedData = { ...orderData };
    const uid = orderData.userId || orderData.uid || auth.currentUser?.uid;
    if (encryptedData.customer) encryptedData.customer = await encryptData(encryptedData.customer, uid);
    if (encryptedData.customerName) encryptedData.customerName = await encryptData(encryptedData.customerName, uid);
    if (encryptedData.phone) encryptedData.phone = await encryptData(encryptedData.phone, uid);
    if (encryptedData.deliveryAddress) encryptedData.deliveryAddress = await encryptData(encryptedData.deliveryAddress, uid);
    if (encryptedData.notes) encryptedData.notes = await encryptData(encryptedData.notes, uid);
    await updateDoc(doc(db, 'orders', orderId), removeUndefined(encryptedData));
  } catch (e) {
    console.error('Error updating order: ', e);
    throw e;
  }
};

export const deleteOrderFromDB = async (orderId) => {
  try {
    const uid = auth.currentUser?.uid;
    await updateDoc(doc(db, 'orders', orderId), { deleted: true, deletedAt: new Date().toISOString() });
    auditLog(AUDIT.ORDER_DELETED, uid, { orderId });
  } catch (e) {
    console.error('Error deleting order: ', e);
    throw e;
  }
};

export const subscribeToOrders = (callback, userId, errorCallback) => {
  const q = query(
    ordersCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );

  return onSnapshot(
    q,
    async (snapshot) => {
      const ordersPromises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let decCustomer = data.customer;
        if (typeof decCustomer === 'string') {
          decCustomer = await decryptData(decCustomer);
          if (typeof decCustomer === 'string' && (decCustomer.startsWith('{') || decCustomer.startsWith('['))) {
            try { decCustomer = JSON.parse(decCustomer); } catch(e) {}
          }
        }
        return {
          id: docSnap.id,
          ...data,
          customerName: await decryptData(data.customerName),
          customer: decCustomer,
          phone: await decryptData(data.phone),
          deliveryAddress: await decryptData(data.deliveryAddress),
          notes: await decryptData(data.notes),
        };
      });
      const orders = await Promise.all(ordersPromises);
      callback(orders.filter(o => !o.deleted));
    },
    (error) => {
      console.error('Orders subscription error:', error);
      if (typeof errorCallback === 'function') errorCallback(error);
      else if (typeof userId === 'function') userId(error);
    }
  );
};
