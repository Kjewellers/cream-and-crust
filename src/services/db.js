import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// ORDERS
// ==========================================

export const ordersCollection = collection(db, "orders");

export const addOrderToDB = async (orderData) => {
  try {
    const docRef = await addDoc(ordersCollection, {
      ...orderData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding order: ", e);
    throw e;
  }
};

export const updateOrderStatusInDB = async (orderId, newStatus) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      status: newStatus
    });
  } catch (e) {
    console.error("Error updating order: ", e);
    throw e;
  }
};

// Listen to orders in real-time
export const subscribeToOrders = (callback, userId = null) => {
  let q;
  if (userId) {
    q = query(ordersCollection, where("userId", "==", userId));
  } else {
    q = query(ordersCollection);
  }
  
  return onSnapshot(q, (snapshot) => {
    const orders = [];
    snapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
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
    const docRef = await addDoc(productsCollection, productData);
    return docRef.id;
  } catch (e) {
    console.error("Error adding product: ", e);
    throw e;
  }
};

export const subscribeToProducts = (callback, errorCallback) => {
  return onSnapshot(productsCollection, (snapshot) => {
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
    const docRef = await addDoc(recipesCollection, recipeData);
    return docRef.id;
  } catch (e) {
    console.error("Error adding recipe: ", e);
    throw e;
  }
};

export const subscribeToRecipes = (callback, errorCallback) => {
  return onSnapshot(recipesCollection, (snapshot) => {
    const recipes = [];
    snapshot.forEach((doc) => {
      recipes.push({ id: doc.id, ...doc.data() });
    });
    callback(recipes);
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
    const docRef = await addDoc(inventoryCollection, itemData);
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

export const subscribeToInventory = (callback, errorCallback) => {
  return onSnapshot(inventoryCollection, (snapshot) => {
    const items = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    callback(items);
  }, (error) => {
    console.error("Inventory subscription error:", error);
    if (errorCallback) errorCallback(error);
  });
};
