import { collection, addDoc, getDoc, getDocs, updateDoc, doc, deleteDoc, query, orderBy, onSnapshot, where, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase";
import { encryptData, decryptData } from "../utils/crypto";

// ==========================================
// ORDERS
// ==========================================

export const ordersCollection = collection(db, "orders");

export const addOrderToDB = async (orderData) => {
  try {
    const encryptedData = { ...orderData };
    if (encryptedData.customer) encryptedData.customer = await encryptData(encryptedData.customer);
    if (encryptedData.customerName) encryptedData.customerName = await encryptData(encryptedData.customerName);
    if (encryptedData.phone) encryptedData.phone = await encryptData(encryptedData.phone);
    if (encryptedData.deliveryAddress) encryptedData.deliveryAddress = await encryptData(encryptedData.deliveryAddress);
    if (encryptedData.notes) encryptedData.notes = await encryptData(encryptedData.notes);

    const docRef = await addDoc(ordersCollection, {
      ...encryptedData,
      uid: orderData.userId || auth.currentUser?.uid,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding order: ", e);
    throw e;
  }
};

export const deductIngredientsForOrder = async (orderId, orderData) => {
  try {
    const uid = orderData.userId || orderData.uid || auth.currentUser?.uid;
    if (!uid) return;

    const productName = (orderData.product || "").toLowerCase();
    
    // 1. Fetch user's recipes
    const recipesSnapshot = await getDocs(query(collection(db, "recipes"), where("uid", "==", uid)));
    const recipes = recipesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Find matching recipe
    const matchedRecipe = recipes.find(r => {
      const rName = (r.name || "").toLowerCase();
      return productName.includes(rName) || rName.includes(productName);
    });

    if (!matchedRecipe || !matchedRecipe.ingredients || matchedRecipe.ingredients.length === 0) {
      console.log("No matching recipe or no ingredients to deduct.");
      return;
    }

    // 3. Determine multiplier based on order size/weight
    const sizeStr = String(orderData.size || "1kg").toLowerCase();
    let multiplier = 1.0;
    if (sizeStr.includes("500g") || sizeStr.includes("500gm") || sizeStr.includes("0.5")) {
      multiplier = 0.5;
    } else if (sizeStr.includes("1.5")) {
      multiplier = 1.5;
    } else if (sizeStr.includes("2")) {
      multiplier = 2.0;
    }

    // 4. Fetch all inventory items
    const invSnapshot = await getDocs(query(collection(db, "inventory"), where("uid", "==", uid)));
    const inventoryItems = invSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // 5. Deduct ingredients
    for (const ing of matchedRecipe.ingredients) {
      const ingName = (ing.name || "").toLowerCase();
      // Match inventory item that has the closest name
      const matchedInv = inventoryItems.find(item => {
        const itemName = (item.item || "").toLowerCase();
        return itemName.includes(ingName) || ingName.includes(itemName);
      });

      if (matchedInv) {
        const unit = String(matchedInv.unit || "kg").toLowerCase();
        let deduction = 0.2 * multiplier; // Default for kg or L (e.g. 200g flour)
        
        if (["g", "ml"].includes(unit)) {
          deduction = 200 * multiplier;
        } else if (["pcs", "boxes", "packets"].includes(unit)) {
          deduction = Math.ceil(1 * multiplier);
        }

        const newStock = Math.max(0, Number(matchedInv.stock || 0) - deduction);
        // Format to 2 decimal places to avoid float precision issues
        const roundedStock = parseFloat(newStock.toFixed(2));
        
        await updateInventoryStockInDB(matchedInv.id, roundedStock);
        console.log(`Auto-deducted ${deduction} ${unit} from ${matchedInv.item}. New stock: ${roundedStock}`);
      }
    }
  } catch (e) {
    console.error("Error auto-deducting ingredients: ", e);
  }
};

export const updateOrderStatusInDB = async (orderId, newStatus) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      status: newStatus
    });

    if (newStatus.toLowerCase() === "baking") {
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        await deductIngredientsForOrder(orderId, { id: orderSnap.id, ...orderData });
      }
    }
  } catch (e) {
    console.error("Error updating order: ", e);
    throw e;
  }
};

export const updateOrderFieldsInDB = async (orderId, fields) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, fields);
  } catch (e) {
    console.error("Error updating order fields: ", e);
    throw e;
  }
};

export const updateOrderInDB = async (orderId, orderData) => {
  try {
    const encryptedData = { ...orderData };
    if (encryptedData.customer) encryptedData.customer = await encryptData(encryptedData.customer);
    if (encryptedData.customerName) encryptedData.customerName = await encryptData(encryptedData.customerName);
    if (encryptedData.phone) encryptedData.phone = await encryptData(encryptedData.phone);
    if (encryptedData.deliveryAddress) encryptedData.deliveryAddress = await encryptData(encryptedData.deliveryAddress);
    if (encryptedData.notes) encryptedData.notes = await encryptData(encryptedData.notes);

    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, encryptedData);
  } catch (e) {
    console.error("Error updating order: ", e);
    throw e;
  }
};

export const deleteOrderFromDB = async (orderId) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await deleteDoc(orderRef);
  } catch (e) {
    console.error("Error deleting order: ", e);
    throw e;
  }
};

// Listen to orders in real-time
export const subscribeToOrders = (callback, userId) => {
  const q = query(ordersCollection, where("uid", "==", userId || auth.currentUser?.uid));
  
  return onSnapshot(q, async (snapshot) => {
    const ordersPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let decCustomer = data.customer;
      if (typeof decCustomer === 'string') {
        decCustomer = await decryptData(decCustomer);
      }
      return { 
        id: doc.id, 
        ...data,
        customerName: await decryptData(data.customerName),
        customer: decCustomer,
        phone: await decryptData(data.phone),
        deliveryAddress: await decryptData(data.deliveryAddress),
        notes: await decryptData(data.notes)
      };
    });
    const orders = await Promise.all(ordersPromises);
    callback(orders);
  }, (error) => {
    console.error("Orders subscription error:", error);
    if (typeof userId === 'function') userId(error); // Handle case where second arg might be callback in older calls
  });
};

// ==========================================
// PRODUCTS (CATALOG)
// ==========================================

export const productsCollection = collection(db, "products");

export const addProductToDB = async (productData) => {
  try {
    const docRef = await addDoc(productsCollection, { ...productData, uid: auth.currentUser?.uid });
    return docRef.id;
  } catch (e) {
    console.error("Error adding product: ", e);
    throw e;
  }
};

export const updateProductInDB = async (productId, productData) => {
  try {
    const prodRef = doc(db, "products", productId);
    await updateDoc(prodRef, productData);
  } catch (e) {
    console.error("Error updating product: ", e);
    throw e;
  }
};

export const deleteProductFromDB = async (productId) => {
  try {
    const prodRef = doc(db, "products", productId);
    await deleteDoc(prodRef);
  } catch (e) {
    console.error("Error deleting product: ", e);
    throw e;
  }
};

export const subscribeToProducts = (callback, errorCallback, userId) => {
  const q = query(productsCollection, where("uid", "==", userId || auth.currentUser?.uid));
  
  return onSnapshot(q, (snapshot) => {
    const products = [];
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    callback(products);
  }, (error) => {
    console.error("Products subscription error:", error);
    if (errorCallback) errorCallback(error);
  });
};

// ==========================================
// RECIPES
// ==========================================

export const recipesCollection = collection(db, "recipes");

export const addRecipeToDB = async (recipeData) => {
  try {
    const docRef = await addDoc(recipesCollection, { ...recipeData, uid: auth.currentUser?.uid });
    return docRef.id;
  } catch (e) {
    console.error("Error adding recipe: ", e);
    throw e;
  }
};

export const updateRecipeInDB = async (recipeId, recipeData) => {
  try {
    const recipeRef = doc(db, "recipes", recipeId);
    await updateDoc(recipeRef, recipeData);
  } catch (e) {
    console.error("Error updating recipe: ", e);
    throw e;
  }
};

export const deleteRecipeFromDB = async (recipeId) => {
  try {
    const recipeRef = doc(db, "recipes", recipeId);
    await deleteDoc(recipeRef);
  } catch (e) {
    console.error("Error deleting recipe: ", e);
    throw e;
  }
};

export const subscribeToRecipes = (callback, errorCallback, userId) => {
  const q = query(recipesCollection, where("uid", "==", userId || auth.currentUser?.uid));
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error("Recipes subscription error:", error);
    if (errorCallback) errorCallback(error);
  });
};

// ==========================================
// INVENTORY
// ==========================================

export const inventoryCollection = collection(db, "inventory");

export const addInventoryToDB = async (itemData) => {
  try {
    const docRef = await addDoc(inventoryCollection, { ...itemData, uid: auth.currentUser?.uid });
    return docRef.id;
  } catch (e) {
    console.error("Error adding inventory item: ", e);
    throw e;
  }
};

export const updateInventoryStockInDB = async (itemId, newStock) => {
  try {
    const itemRef = doc(db, "inventory", itemId);
    await updateDoc(itemRef, {
      stock: newStock
    });
  } catch (e) {
    console.error("Error updating inventory stock: ", e);
    throw e;
  }
};

export const deleteInventoryFromDB = async (itemId) => {
  try {
    const itemRef = doc(db, "inventory", itemId);
    await deleteDoc(itemRef);
  } catch (e) {
    console.error("Error deleting inventory item: ", e);
    throw e;
  }
};

export const subscribeToInventory = (callback, errorCallback, userId) => {
  const q = query(inventoryCollection, where("uid", "==", userId || auth.currentUser?.uid));
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error("Inventory subscription error:", error);
    if (errorCallback) errorCallback(error);
  });
};

// ==========================================
// CUSTOMERS
// ==========================================

export const customersCollection = collection(db, "customers");

export const subscribeToCustomers = (callback, errorCallback, userId) => {
  const q = query(customersCollection, where("uid", "==", userId || auth.currentUser?.uid));
  
  return onSnapshot(q, async (snapshot) => {
    const customersPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        name: await decryptData(data.name),
        phone: await decryptData(data.phone),
        address: await decryptData(data.address)
      };
    });
    const customers = await Promise.all(customersPromises);
    callback(customers);
  }, (error) => {
    console.error("Customers subscription error:", error);
    if (errorCallback) errorCallback(error);
  });
};

export const addCustomerToDB = async (customerData) => {
  try {
    const encryptedData = { ...customerData };
    if (encryptedData.name) encryptedData.name = await encryptData(encryptedData.name);
    if (encryptedData.phone) encryptedData.phone = await encryptData(encryptedData.phone);
    if (encryptedData.address) encryptedData.address = await encryptData(encryptedData.address);

    const docRef = await addDoc(customersCollection, {
      ...encryptedData,
      uid: auth.currentUser?.uid,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding customer: ", e);
    throw e;
  }
};

export const updateCustomerInDB = async (customerId, customerData) => {
  try {
    const encryptedData = { ...customerData };
    if (encryptedData.name) encryptedData.name = await encryptData(encryptedData.name);
    if (encryptedData.phone) encryptedData.phone = await encryptData(encryptedData.phone);
    if (encryptedData.address) encryptedData.address = await encryptData(encryptedData.address);

    const custRef = doc(db, "customers", customerId);
    await updateDoc(custRef, encryptedData);
  } catch (e) {
    console.error("Error updating customer: ", e);
    throw e;
  }
};

export const deleteCustomerFromDB = async (customerId) => {
  try {
    const custRef = doc(db, "customers", customerId);
    await deleteDoc(custRef);
  } catch (e) {
    console.error("Error deleting customer: ", e);
    throw e;
  }
};

// ==========================================
// BUSINESS PROFILE
// ==========================================

export const businessCollection = collection(db, "business");

export const subscribeToBusiness = (callback, errorCallback, identifier = null) => {
  // If identifier is a 28-char Firebase UID (approx), treat as userId
  // Otherwise, treat as username
  const isUserId = identifier && identifier.length > 20 && !identifier.includes(' ');

  if (isUserId) {
    const bizRef = doc(db, "business", identifier);
    return onSnapshot(bizRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      } else {
        callback({ id: identifier, name: 'Cream & Crust', logo: '🧁' });
      }
    }, (error) => {
      console.error("Business subscription error:", error);
      if (errorCallback) errorCallback(error);
    });
  }

  if (identifier && typeof identifier === 'string') {
    const q = query(businessCollection, where("username", "==", identifier.toLowerCase()));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        callback({ id: docSnap.id, ...docSnap.data() });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error("Business subscription by username error:", error);
      if (errorCallback) errorCallback(error);
    });
  }

  // Global fallback
  return onSnapshot(businessCollection, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data[0] || { name: 'Cream & Crust', logo: '🧁' });
  });
};


export const getBusinessByUsername = async (username) => {
  try {
    const q1 = query(businessCollection, where("username", "==", username.toLowerCase()));
    const snapshot1 = await getDocs(q1);
    if (!snapshot1.empty) return { id: snapshot1.docs[0].id, ...snapshot1.docs[0].data() };

    // Fallback for mixed-case usernames if any exist
    const q2 = query(businessCollection, where("username", "==", username));
    const snapshot2 = await getDocs(q2);
    if (!snapshot2.empty) return { id: snapshot2.docs[0].id, ...snapshot2.docs[0].data() };

    return null;
  } catch (e) {
    console.error("Error fetching business by username:", e);
    return null;
  }
};

export const updateBusinessInDB = async (businessId, businessData) => {
  try {
    const safeId = businessId || "main";
    const bizRef = doc(db, "business", safeId);
    // Ensure userId is stored for querying purposes if needed
    const dataWithId = { ...businessData, uid: safeId };
    await setDoc(bizRef, dataWithId, { merge: true });
  } catch (e) {
    console.error("Error updating business: ", e);
    throw e;
  }
};

// ==========================================
// PORTFOLIO SETTINGS (Stored in users/{uid})
// ==========================================

export const updatePortfolioSettings = async (uid, settings) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { portfolioSettings: settings });
  } catch (e) {
    console.error("Error updating portfolio settings:", e);
    throw e;
  }
};

export const subscribeToPortfolioSettings = (uid, callback) => {
  const userRef = doc(db, "users", uid);
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
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
      menuBuilder: {
        ...settings,
        updatedAt: new Date().toISOString()
      }
    }, { merge: true });
  } catch (e) {
    console.error("Error updating menu settings:", e);
    throw e;
  }
};

export const publishMenuSettings = async (uid, settings) => {
  try {
    const publishedAt = new Date().toISOString();
    await updateMenuSettings(uid, { ...settings, published: true, publishedAt });
    await updateBusinessInDB(uid, { menuPublished: true, menuPublishedAt: publishedAt });
  } catch (e) {
    console.error("Error publishing menu:", e);
    throw e;
  }
};

export const subscribeToMenuSettings = (uid, callback) => {
  const userRef = doc(db, "users", uid);
  return onSnapshot(userRef, (docSnap) => {
    callback(docSnap.exists() ? (docSnap.data().menuBuilder || {}) : {});
  });
};

export const getMenuSettingsByUserId = async (uid) => {
  try {
    const { getDoc } = await import("firebase/firestore");
    const userSnap = await getDoc(doc(db, "users", uid));
    return userSnap.exists() ? (userSnap.data().menuBuilder || {}) : {};
  } catch (e) {
    console.error("Error fetching menu settings:", e);
    return {};
  }
};

export const getUserByUsername = async (username) => {
  try {
    const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  } catch (e) {
    console.error("Error fetching user by username:", e);
    return null;
  }
};

// ==========================================
// NOTIFICATIONS
// ==========================================

export const notificationsCollection = collection(db, "notifications");

export const addNotificationToDB = async (notificationData) => {
  try {
    await addDoc(notificationsCollection, {
      ...notificationData,
      uid: auth.currentUser?.uid,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error adding notification:", e);
  }
};

export const subscribeToNotifications = (userId, callback) => {
  const q = query(notificationsCollection, where("uid", "==", userId || auth.currentUser?.uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ==========================================
// EXPENSES
// ==========================================

export const uploadImageToStorage = async (file, path = 'uploads') => {
  try {
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (e) {
    console.error("Error uploading image:", e);
    throw e;
  }
};

export const uploadReceiptToStorage = async (file) => {
  return await uploadImageToStorage(file, 'receipts');
};

export const expensesCollection = collection(db, "expenses");

export const addExpenseToDB = async (expenseData) => {
  try {
    const docRef = await addDoc(expensesCollection, {
      ...expenseData,
      uid: auth.currentUser?.uid,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding expense:", e);
    throw e;
  }
};

export const deleteExpenseFromDB = async (expenseId) => {
  try {
    await deleteDoc(doc(db, "expenses", expenseId));
  } catch (e) {
    console.error("Error deleting expense:", e);
    throw e;
  }
};

export const subscribeToExpenses = (callback, errorCallback, userId) => {
  const q = query(expensesCollection, where("uid", "==", userId || auth.currentUser?.uid));
  
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort in memory to avoid index requirements
    expenses.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    callback(expenses);
  }, (error) => {
    console.error("Expenses subscription error:", error);
    if (errorCallback) errorCallback(error);
  });
};

// ==========================================
// SHOPPING LIST
// ==========================================

export const shoppingListCollection = collection(db, "shoppingList");

export const addShoppingItemToDB = async (itemData) => {
  try {
    const docRef = await addDoc(shoppingListCollection, {
      ...itemData,
      uid: auth.currentUser?.uid,
      bought: false,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding shopping item:", e);
    throw e;
  }
};

export const toggleShoppingItemInDB = async (itemId, bought) => {
  try {
    await updateDoc(doc(db, "shoppingList", itemId), { bought });
  } catch (e) {
    console.error("Error toggling shopping item:", e);
    throw e;
  }
};

export const deleteShoppingItemFromDB = async (itemId) => {
  try {
    await deleteDoc(doc(db, "shoppingList", itemId));
  } catch (e) {
    console.error("Error deleting shopping item:", e);
    throw e;
  }
};

export const subscribeToShoppingList = (callback, errorCallback, userId) => {
  const q = query(shoppingListCollection, where("uid", "==", userId || auth.currentUser?.uid));
  
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort in memory to avoid index requirements
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    callback(items);
  }, (error) => {
    console.error("Shopping list subscription error:", error);
    if (errorCallback) errorCallback(error);
  });
};

// ==========================================
// STORIES
// ==========================================

export const storiesCollection = collection(db, "stories");

export const subscribeToStories = (callback, userId) => {
  const q = query(storiesCollection, where("uid", "==", userId || auth.currentUser?.uid));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const addStoryToDB = async (storyData) => {
  try {
    const docRef = await addDoc(storiesCollection, {
      ...storyData,
      uid: auth.currentUser?.uid,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding story:", e);
    throw e;
  }
};

export const deleteStoryFromDB = async (storyId) => {
  try {
    await deleteDoc(doc(db, "stories", storyId));
  } catch (e) {
    console.error("Error deleting story:", e);
    throw e;
  }
};

// ==========================================
// INQUIRIES
// ==========================================

export const inquiriesCollection = collection(db, "inquiries");

export const addInquiryToDB = async (inquiryData) => {
  try {
    const docRef = await addDoc(inquiriesCollection, {
      ...inquiryData,
      uid: inquiryData.userId || auth.currentUser?.uid,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding inquiry:", e);
    throw e;
  }
};

export const subscribeToInquiries = (callback, userId) => {
  const q = query(inquiriesCollection, where("uid", "==", userId || auth.currentUser?.uid));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(data);
  });
};


