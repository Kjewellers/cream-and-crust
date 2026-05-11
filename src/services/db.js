import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "./firebase";
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

export const updateOrderFieldsInDB = async (orderId, fields) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, fields);
  } catch (e) {
    console.error("Error updating order fields: ", e);
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
    const docRef = await addDoc(productsCollection, productData);
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

// ==========================================
// CUSTOMERS
// ==========================================

export const customersCollection = collection(db, "customers");

export const subscribeToCustomers = (callback, errorCallback) => {
  return onSnapshot(customersCollection, async (snapshot) => {
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

// ==========================================
// BUSINESS PROFILE
// ==========================================

export const businessCollection = collection(db, "business");

export const subscribeToBusiness = (callback, errorCallback) => {
  return onSnapshot(businessCollection, (snapshot) => {
    const data = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    // Return first business doc (there should only be one per owner usually, or we use userId)
    callback(data[0] || { name: 'Cream & Crust', logo: '🧁' });
  }, (error) => {
    console.error("Business subscription error:", error);
    if (errorCallback) errorCallback(error);
  });
};

export const updateBusinessInDB = async (businessId, businessData) => {
  try {
    const bizRef = doc(db, "business", businessId);
    await updateDoc(bizRef, businessData);
  } catch (e) {
    // If doesn't exist, create it?
    console.error("Error updating business: ", e);
    throw e;
  }
};
