import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  where,
  setDoc,
  arrayUnion,
  runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { encryptData, decryptData } from '../utils/crypto';
import {
  convertUnit,
  parseSizeMultiplier,
  MissingRecipeLinkError,
  MissingInventoryItemError,
  InsufficientStockError,
  IncompatibleUnitError,
} from './inventoryErrors.js';
import { auditLog, AUDIT } from './auditLog.js';

// Helper to strip undefined values to prevent Firestore errors
const removeUndefined = (obj) => {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      if (obj[key] === undefined) delete obj[key];
    });
  }
  return obj;
};

// ==========================================
// NOTIFICATIONS
// ==========================================

export const notificationsCollection = collection(db, 'notifications');

export const addNotificationToDB = async (notificationData) => {
  try {
    const targetUid = notificationData.userId || auth.currentUser?.uid;
    const docRef = await addDoc(notificationsCollection, {
      ...notificationData,
      uid: targetUid,
      read: false,
      createdAt: new Date().toISOString(),
    });

    // Try to send push notification
    if (targetUid) {
      try {
        const userSnap = await getDoc(doc(db, 'users', targetUid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const tokens = userData.fcmTokens || (userData.fcmToken ? [userData.fcmToken] : []);
          if (tokens.length > 0) {
            // Call our custom Node backend to dispatch the FCM push
            // Attach Firebase ID token so requireAuth middleware accepts the request
            const apiBase = import.meta.env.VITE_API_URL || '/api';
            Promise.resolve()
              .then(async () => {
                const { getAuth } = await import('firebase/auth');
                const fbUser = getAuth().currentUser;
                const idToken = fbUser ? await fbUser.getIdToken() : null;
                return fetch(`${apiBase}/notifications/send`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                  },
                  body: JSON.stringify({
                    tokens: tokens,
                    title: notificationData.title || 'New Notification',
                    body: notificationData.message || '',
                    data: { url: '/notifications' },
                  }),
                });
              })
              .catch((e) => console.error('Push API error:', e));
          }
        }
      } catch (pushErr) {
        console.error('Failed to trigger push:', pushErr);
      }
    }

    return docRef.id;
  } catch (e) {
    console.error('Error adding notification: ', e);
    throw e;
  }
};

export const saveFCMToken = async (token) => {
  if (!auth.currentUser) return;
  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, { fcmTokens: arrayUnion(token) }, { merge: true });
    console.log('FCM Token saved to DB array');
  } catch (e) {
    console.error('Error saving FCM token:', e);
  }
};

export const subscribeToNotifications = (userId, callback) => {
  const q = query(
    notificationsCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // Sort descending by createdAt
      notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(notifs);
    },
    (error) => {
      console.error('Notifications subscription error:', error);
    }
  );
};

export const updateNotificationInDB = async (id, updatedData) => {
  try {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, updatedData);
  } catch (e) {
    console.error('Error updating notification: ', e);
    throw e;
  }
};

export const deleteNotificationFromDB = async (id) => {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (e) {
    console.error('Error deleting notification: ', e);
    throw e;
  }
};

// ==========================================
// ORDERS
// ==========================================

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

    // Audit log — fire-and-forget
    auditLog(AUDIT.ORDER_CREATED, uid, { orderId: docRef.id });

    // Analytics: track order creation + detect first-ever order for funnel
    import('../services/analytics.js').then(({ trackOrderCreate, trackFirstOrder }) => {
      trackOrderCreate({ product: orderData.product || 'unknown' });
      // First order detection: if this is the first doc, it's the funnel milestone
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

/**
 * Deduct inventory ingredients for an order when it transitions to "baking".
 *
 * Fixed behaviours (Tasks 3.2 – 3.5):
 *   3.2 — Uses explicit `recipeId` on the order; no fuzzy product-name match.
 *   3.3 — Reads qty + unit from each recipe ingredient; uses convertUnit() for
 *          unit-aware, size-scaled deductions.
 *   3.4 — Wraps all inventory writes in one Firestore transaction and guards
 *          re-entry with a `deductedForOrder` flag (idempotency).
 *   3.5 — On any error, shows a toast and persists `deductionError` on the order.
 */
export const deductIngredientsForOrder = async (orderId, orderData) => {
  const uid = orderData.userId || orderData.uid || auth.currentUser?.uid;
  if (!uid) return;

  // Idempotency guard — skip if already processed
  if (orderData.deductedForOrder) return;

  // Support both legacy single recipeId and new items array
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
    // Fetch all inventory for this user once
    const invSnap = await getDocs(query(collection(db, 'inventory'), where('uid', '==', uid)));
    const inventoryItems = invSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

    // Build deduction plan: resolve each ingredient before opening the transaction
    const deductionPlan = []; // [{ invId, invRef, needed, unit, itemName }]
    const deductionSummary = []; // human-readable for the UI

    for (const orderItem of itemsToDeduct) {
      // Fetch the single recipe document by id, scoped to uid
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

        // Find matching inventory item by name
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
          deductionPlan.push({
            invId: matchedInv.id,
            invRef: matchedInv.ref,
            needed,
            unit: invUnit,
            itemName: matchedInv.item,
          });
        }

        const existingSummary = deductionSummary.find(s => s.ingredient === ing.name && s.unit === invUnit);
        if (existingSummary) {
          existingSummary.deducted = parseFloat((existingSummary.deducted + needed).toFixed(4));
        } else {
          deductionSummary.push({ ingredient: ing.name, deducted: needed, unit: invUnit });
        }
      }
    }

    // 3.4 — Single atomic transaction with idempotency guard
    const orderRef = doc(db, 'orders', orderId);
    await runTransaction(db, async (txn) => {
      // Re-check idempotency inside the transaction
      const freshOrder = await txn.get(orderRef);
      if (freshOrder.exists() && freshOrder.data().deductedForOrder) return;

      // Validate stock and build updates inside the transaction
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

      // Mark order as deducted + store summary
      txn.update(orderRef, {
        deductedForOrder: true,
        deductionSummary,
        deductedAt: new Date().toISOString(),
      });
    });
  } catch (e) {
    // 3.5 — Surface error via toast and persist on the order doc
    const errorMsg = e.message || 'Unknown deduction error';
    console.error('Deduction error:', errorMsg);

    try {
      const { showToast } = await import('../components/iOS.jsx');
      showToast(`⚠️ Stock deduction failed: ${errorMsg}`, 'error');
    } catch (_) {
      /* toast not critical */
    }

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        deductionError: {
          code: e.code || 'UNKNOWN',
          message: errorMsg,
          at: new Date().toISOString(),
        },
      });
    } catch (_) {
      /* best-effort */
    }

    // Re-throw for callers that care
    throw e;
  }
};

/**
 * Task 3.6 — Restock ingredients when an order is cancelled.
 * Only restocks if the order was previously deducted (deductedForOrder=true).
 * Uses the stored deductionSummary for exact quantities.
 */
export const restockIngredientsForOrder = async (orderId, orderData) => {
  const uid = orderData.userId || orderData.uid || auth.currentUser?.uid;
  if (!uid) return;

  // Only restock if we actually deducted
  if (!orderData.deductedForOrder) return;

  const summary = orderData.deductionSummary;
  if (!Array.isArray(summary) || summary.length === 0) return;

  try {
    // Fetch inventory for matching
    const invSnap = await getDocs(query(collection(db, 'inventory'), where('uid', '==', uid)));
    const inventoryItems = invSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

    const orderRef = doc(db, 'orders', orderId);

    await runTransaction(db, async (txn) => {
      // Re-check to prevent double-restock
      const freshOrder = await txn.get(orderRef);
      if (!freshOrder.exists() || freshOrder.data().restockedForOrder) return;

      for (const { ingredient, deducted, unit } of summary) {
        const ingName = (ingredient || '').toLowerCase();
        const matchedInv = inventoryItems.find((item) => {
          const itemName = (item.item || '').toLowerCase();
          return itemName === ingName || itemName.includes(ingName) || ingName.includes(itemName);
        });
        if (!matchedInv) continue; // item may have been deleted — skip silently

        const invDoc = await txn.get(matchedInv.ref);
        if (!invDoc.exists()) continue;
        const currentStock = Number(invDoc.data().stock || 0);
        const newStock = parseFloat((currentStock + Number(deducted || 0)).toFixed(4));
        txn.update(matchedInv.ref, { stock: newStock });
      }

      txn.update(orderRef, {
        restockedForOrder: true,
        restockedAt: new Date().toISOString(),
      });
    });
  } catch (e) {
    console.error('Restock error:', e.message);
    try {
      const { showToast } = await import('../components/iOS.jsx');
      showToast(`⚠️ Restock failed: ${e.message}`, 'error');
    } catch (_) {
      /* non-critical */
    }
  }
};

export const updateOrderStatusInDB = async (orderId, newStatus, extraFields = {}) => {
  try {
    const uid = auth.currentUser?.uid;
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: newStatus,
      ...extraFields,
    });

    // Audit log status change
    auditLog(AUDIT.ORDER_STATUS_CHANGED, uid, { orderId, newStatus });

    if (newStatus.toLowerCase() === 'confirmed') {
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        // Only attempt deduction if a recipeId is linked to the order or any of its items
        const hasRecipe = orderData.recipeId || (Array.isArray(orderData.items) && orderData.items.some(i => i.recipeId));
        if (hasRecipe) {
          await deductIngredientsForOrder(orderId, { id: orderSnap.id, ...orderData });
        }
      }
    }

    // Task 3.7 — Restock ingredients when order is cancelled
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
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, fields);
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
    if (encryptedData.customerName)
      encryptedData.customerName = await encryptData(encryptedData.customerName, uid);
    if (encryptedData.phone) encryptedData.phone = await encryptData(encryptedData.phone, uid);
    if (encryptedData.deliveryAddress)
      encryptedData.deliveryAddress = await encryptData(encryptedData.deliveryAddress, uid);
    if (encryptedData.notes) encryptedData.notes = await encryptData(encryptedData.notes, uid);

    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, removeUndefined(encryptedData));
  } catch (e) {
    console.error('Error updating order: ', e);
    throw e;
  }
};

export const deleteOrderFromDB = async (orderId) => {
  try {
    const uid = auth.currentUser?.uid;
    const orderRef = doc(db, 'orders', orderId);
    await deleteDoc(orderRef);
    // Audit log — fire-and-forget
    auditLog(AUDIT.ORDER_DELETED, uid, { orderId });
  } catch (e) {
    console.error('Error deleting order: ', e);
    throw e;
  }
};

// Listen to orders in real-time
export const subscribeToOrders = (callback, userId, errorCallback) => {
  const q = query(
    ordersCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );

  return onSnapshot(
    q,
    async (snapshot) => {
      const ordersPromises = snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let decCustomer = data.customer;
        if (typeof decCustomer === 'string') {
          decCustomer = await decryptData(decCustomer);
          if (typeof decCustomer === 'string' && (decCustomer.startsWith('{') || decCustomer.startsWith('['))) {
            try { decCustomer = JSON.parse(decCustomer); } catch(e) {}
          }
        }
        return {
          id: doc.id,
          ...data,
          customerName: await decryptData(data.customerName),
          customer: decCustomer,
          phone: await decryptData(data.phone),
          deliveryAddress: await decryptData(data.deliveryAddress),
          notes: await decryptData(data.notes),
        };
      });
      const orders = await Promise.all(ordersPromises);
      callback(orders);
    },
    (error) => {
      console.error('Orders subscription error:', error);
      // Prefer an explicit error callback; fall back to the legacy pattern
      // where the second arg was sometimes a callback.
      if (typeof errorCallback === 'function') errorCallback(error);
      else if (typeof userId === 'function') userId(error);
    }
  );
};

// ==========================================
// PRODUCTS (CATALOG)
// ==========================================

export const productsCollection = collection(db, 'products');

export const addProductToDB = async (productData) => {
  try {
    const docRef = await addDoc(productsCollection, { ...productData, uid: auth.currentUser?.uid });
    return docRef.id;
  } catch (e) {
    console.error('Error adding product: ', e);
    throw e;
  }
};

export const updateProductInDB = async (productId, productData) => {
  try {
    const prodRef = doc(db, 'products', productId);
    await updateDoc(prodRef, productData);
  } catch (e) {
    console.error('Error updating product: ', e);
    throw e;
  }
};

export const deleteProductFromDB = async (productId) => {
  try {
    const uid = auth.currentUser?.uid;
    const prodRef = doc(db, 'products', productId);
    await deleteDoc(prodRef);
    auditLog(AUDIT.PRODUCT_DELETED, uid, { productId });
  } catch (e) {
    console.error('Error deleting product: ', e);
    throw e;
  }
};

export const subscribeToProducts = (callback, errorCallback, userId) => {
  const q = query(
    productsCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const products = [];
      snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      callback(products);
    },
    (error) => {
      console.error('Products subscription error:', error);
      if (errorCallback) errorCallback(error);
    }
  );
};

// ==========================================
// RECIPES
// ==========================================

export const recipesCollection = collection(db, 'recipes');

export const addRecipeToDB = async (recipeData) => {
  try {
    const docRef = await addDoc(recipesCollection, { ...recipeData, uid: auth.currentUser?.uid });
    return docRef.id;
  } catch (e) {
    console.error('Error adding recipe: ', e);
    throw e;
  }
};

export const updateRecipeInDB = async (recipeId, recipeData) => {
  try {
    const recipeRef = doc(db, 'recipes', recipeId);
    await updateDoc(recipeRef, recipeData);
  } catch (e) {
    console.error('Error updating recipe: ', e);
    throw e;
  }
};

export const deleteRecipeFromDB = async (recipeId) => {
  try {
    const uid = auth.currentUser?.uid;
    const recipeRef = doc(db, 'recipes', recipeId);
    await deleteDoc(recipeRef);
    auditLog(AUDIT.RECIPE_DELETED, uid, { recipeId });
  } catch (e) {
    console.error('Error deleting recipe: ', e);
    throw e;
  }
};

export const subscribeToRecipes = (callback, errorCallback, userId) => {
  const q = query(
    recipesCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    },
    (error) => {
      console.error('Recipes subscription error:', error);
      if (errorCallback) errorCallback(error);
    }
  );
};

// ==========================================
// INVENTORY
// ==========================================

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
    const itemRef = doc(db, 'inventory', itemId);
    await updateDoc(itemRef, {
      stock: newStock,
    });
  } catch (e) {
    console.error('Error updating inventory stock: ', e);
    throw e;
  }
};

export const updateInventoryFieldsInDB = async (itemId, fields) => {
  try {
    const itemRef = doc(db, 'inventory', itemId);
    await updateDoc(itemRef, fields);
  } catch (e) {
    console.error('Error updating inventory fields: ', e);
    throw e;
  }
};

export const deleteInventoryFromDB = async (itemId) => {
  try {
    const itemRef = doc(db, 'inventory', itemId);
    await deleteDoc(itemRef);
  } catch (e) {
    console.error('Error deleting inventory item: ', e);
    throw e;
  }
};

export const subscribeToInventory = (callback, errorCallback, userId) => {
  const q = query(
    inventoryCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    },
    (error) => {
      console.error('Inventory subscription error:', error);
      if (errorCallback) errorCallback(error);
    }
  );
};

// ==========================================
// CUSTOMERS
// ==========================================

export const customersCollection = collection(db, 'customers');

export const subscribeToCustomers = (callback, errorCallback, userId) => {
  const q = query(
    customersCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );

  return onSnapshot(
    q,
    async (snapshot) => {
      const customersPromises = snapshot.docs.map(async (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: await decryptData(data.name),
          phone: await decryptData(data.phone),
          address: await decryptData(data.address),
        };
      });
      const customers = await Promise.all(customersPromises);
      callback(customers);
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

    const docRef = await addDoc(customersCollection, {
      ...encryptedData,
      uid,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
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

    const custRef = doc(db, 'customers', customerId);
    await updateDoc(custRef, encryptedData);
  } catch (e) {
    console.error('Error updating customer: ', e);
    throw e;
  }
};

export const deleteCustomerFromDB = async (customerId) => {
  try {
    const custRef = doc(db, 'customers', customerId);
    await deleteDoc(custRef);
  } catch (e) {
    console.error('Error deleting customer: ', e);
    throw e;
  }
};

// ==========================================
// BUSINESS PROFILE
// ==========================================

export const businessCollection = collection(db, 'business');

export const subscribeToBusiness = (callback, errorCallback, identifier = null) => {
  // If identifier is a 28-char Firebase UID (approx), treat as userId
  // Otherwise, treat as username
  const isUserId = identifier && identifier.length > 20 && !identifier.includes(' ');

  if (isUserId) {
    const bizRef = doc(db, 'business', identifier);
    return onSnapshot(
      bizRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() });
        } else {
          callback({ id: identifier, name: '', logo: '' });
        }
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

  // Global fallback
  return onSnapshot(businessCollection, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(data[0] || { name: '', logo: '' });
  });
};

export const getBusinessByUsername = async (username) => {
  try {
    const q1 = query(businessCollection, where('username', '==', username.toLowerCase()));
    const snapshot1 = await getDocs(q1);
    if (!snapshot1.empty) return { id: snapshot1.docs[0].id, ...snapshot1.docs[0].data() };

    // Fallback for mixed-case usernames if any exist
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
    // Ensure userId is stored for querying purposes if needed
    const dataWithId = { ...businessData, uid: safeId };
    await setDoc(bizRef, dataWithId, { merge: true });
  } catch (e) {
    console.error('Error updating business: ', e);
    throw e;
  }
};

// ==========================================
// PORTFOLIO SETTINGS (Stored in users/{uid})
// ==========================================

export const updatePortfolioSettings = async (uid, settings) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { portfolioSettings: settings });
  } catch (e) {
    console.error('Error updating portfolio settings:', e);
    throw e;
  }
};

export const subscribeToPortfolioSettings = (uid, callback) => {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().portfolioSettings || {});
    } else {
      callback({});
    }
  });
};

// ==========================================
// MENU BUILDER SETTINGS (Stored in users/{uid})
// ==========================================

export const updateMenuSettings = async (uid, settings) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(
      userRef,
      {
        menuBuilder: {
          ...settings,
          updatedAt: new Date().toISOString(),
        },
      },
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
    await updateBusinessInDB(uid, { menuPublished: true, menuPublishedAt: publishedAt });
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
    const { getDoc } = await import('firebase/firestore');
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

// ==========================================
// EXPENSES
// ==========================================

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

export const expensesCollection = collection(db, 'expenses');

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
    await deleteDoc(doc(db, 'expenses', expenseId));
  } catch (e) {
    console.error('Error deleting expense:', e);
    throw e;
  }
};

export const subscribeToExpenses = (callback, errorCallback, userId) => {
  const q = query(
    expensesCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const expenses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort in memory to avoid index requirements
      expenses.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      callback(expenses);
    },
    (error) => {
      console.error('Expenses subscription error:', error);
      if (errorCallback) errorCallback(error);
    }
  );
};

// ==========================================
// SHOPPING LIST
// ==========================================

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
    await deleteDoc(doc(db, 'shoppingList', itemId));
  } catch (e) {
    console.error('Error deleting shopping item:', e);
    throw e;
  }
};

export const subscribeToShoppingList = (callback, errorCallback, userId) => {
  const q = query(
    shoppingListCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort in memory to avoid index requirements
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      callback(items);
    },
    (error) => {
      console.error('Shopping list subscription error:', error);
      if (errorCallback) errorCallback(error);
    }
  );
};

// ==========================================
// STORIES
// ==========================================

export const storiesCollection = collection(db, 'stories');

export const subscribeToStories = (callback, userId) => {
  const q = query(
    storiesCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  });
};

export const addStoryToDB = async (storyData) => {
  try {
    const docRef = await addDoc(storiesCollection, {
      ...storyData,
      uid: auth.currentUser?.uid,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding story:', e);
    throw e;
  }
};

export const deleteStoryFromDB = async (storyId) => {
  try {
    await deleteDoc(doc(db, 'stories', storyId));
  } catch (e) {
    console.error('Error deleting story:', e);
    throw e;
  }
};

// ==========================================
// INQUIRIES
// ==========================================

export const inquiriesCollection = collection(db, 'inquiries');

export const addInquiryToDB = async (inquiryData) => {
  try {
    const docRef = await addDoc(inquiriesCollection, {
      ...inquiryData,
      uid: inquiryData.userId || auth.currentUser?.uid,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding inquiry:', e);
    throw e;
  }
};

export const subscribeToInquiries = (callback, userId) => {
  const q = query(
    inquiriesCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(data);
  });
};

// ==========================================
// LOCAL CONNECT (MAP & CHAT)
// ==========================================

export const bakersLocationsCollection = collection(db, 'bakers_locations');
export const chatsCollection = collection(db, 'chats');

export const updateBakerLocation = async (lat, lng, details) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    await setDoc(doc(db, 'bakers_locations', uid), {
      lat,
      lng,
      displayName: details.displayName || auth.currentUser.displayName || 'Anonymous Baker',
      photoURL: details.photoURL || auth.currentUser.photoURL || '',
      specialty: details.specialty || 'Baking',
      specialties: details.specialties || [details.specialty || 'Baking'],
      privacyMode: details.privacyMode || 'exact', // 'exact', 'approximate', 'invisible'
      liveStatus: details.liveStatus || '', // e.g. "Baking Now", "Need Whipped Cream"
      lastActive: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating baker location:', error);
  }
};

export const subscribeToBakers = (callback) => {
  return onSnapshot(bakersLocationsCollection, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};

export const startOrGetChat = async (targetUid) => {
  if (!auth.currentUser) return null;
  const uid = auth.currentUser.uid;
  try {
    const q = query(chatsCollection, where('participants', 'array-contains', uid));
    const snapshot = await getDocs(q);
    
    // Find a chat where targetUid is also a participant
    let existingChatId = null;
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.participants && data.participants.includes(targetUid)) {
        existingChatId = docSnap.id;
      }
    });

    if (existingChatId) {
      return existingChatId;
    }

    // Create new chat
    const chatRef = await addDoc(chatsCollection, {
      participants: [uid, targetUid],
      updatedAt: new Date().toISOString(),
      lastMessage: ''
    });
    return chatRef.id;
  } catch (error) {
    console.error('Error starting chat:', error);
    return null;
  }
};

export const sendMessage = async (chatId, text) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    const messagesCollection = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesCollection, {
      senderId: uid,
      text,
      timestamp: new Date().toISOString()
    });
    
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: text,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

export const subscribeToMessages = (chatId, callback) => {
  if (!chatId) return () => {};
  const messagesCollection = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesCollection, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};

// ==========================================
// BAKER CONNECT PHASE 2 (STORIES & COMMUNITY)
// ==========================================

export const bakerStoriesCollection = collection(db, 'baker_stories');
export const communityCollection = collection(db, 'community_posts');

export const addBakerStory = async (mediaUrl, text) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    await addDoc(bakerStoriesCollection, {
      uid,
      displayName: auth.currentUser.displayName || 'Anonymous',
      photoURL: auth.currentUser.photoURL || '',
      mediaUrl,
      text: text || '',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h TTL
    });
  } catch (error) {
    console.error('Error adding story:', error);
  }
};

export const subscribeToBakerStories = (callback) => {
  // In a real app we would query where expiresAt > now
  const q = query(bakerStoriesCollection, orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    // Filter out expired client-side as fallback
    const valid = data.filter(s => new Date(s.expiresAt) > new Date());
    callback(valid);
  });
};

export const addCommunityPost = async (text, type = 'request') => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    await addDoc(communityCollection, {
      uid,
      displayName: auth.currentUser.displayName || 'Anonymous',
      photoURL: auth.currentUser.photoURL || '',
      text,
      type, // 'request', 'offer', 'collaboration'
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding community post:', error);
  }
};

export const subscribeToCommunityPosts = (callback) => {
  const q = query(communityCollection, orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};
