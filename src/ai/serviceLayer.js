import {
  addCustomerToDB,
  addExpenseToDB,
  addInventoryToDB,
  addMemoryToDB,
  addOrderToDB,
  addProductToDB,
  addRecipeToDB,
  addShoppingItemToDB,
  deleteCustomerFromDB,
  deleteExpenseFromDB,
  deleteInventoryFromDB,
  deleteMemoryFromDB,
  deleteOrderFromDB,
  deleteProductFromDB,
  deleteRecipeFromDB,
  deleteShoppingItemFromDB,
  toggleShoppingItemInDB,
  updateInventoryFieldsInDB,
  updateOrderStatusInDB,
  updateCustomerInDB,
} from '../services/db';
import { INTENTS } from './actionSchemas';

function orderPayload(data) {
  const qty = Number(data.qty || data.quantity || 1);
  const unitPrice = Number(data.price || 0);
  return {
    customerName: data.customerName,
    customer: data.customerName,
    phone: data.phone || '',
    product: data.product,
    qty,
    quantity: qty,
    size: data.size || '',
    price: unitPrice,
    total: unitPrice > 0 ? unitPrice * qty : 0,
    deliveryDate: data.deliveryDate,
    deliveryTime: data.deliveryTime,
    deliveryAddress: data.deliveryAddress || '',
    deliveryType: data.deliveryType || 'pickup',
    notes: data.notes || '',
    items: data.items,
    recipeId: data.recipeId || '',
    status: 'new',
    paymentStatus: 'unpaid',
    isPaid: false,
    source: 'cream_ai',
  };
}

function inventoryPayload(data) {
  return {
    item: data.item,
    stock: Number(data.stock),
    unit: data.unit,
    minStock: Number(data.minStock || 0),
    expiryDate: data.expiryDate || '',
    cost: Number(data.cost || 0),
    source: 'cream_ai',
    deleted: false,
  };
}

function customerPayload(data) {
  return {
    name: data.name,
    phone: data.phone || '',
    address: data.address || '',
    dob: data.dob || '',
    source: 'cream_ai',
  };
}

function expensePayload(data) {
  return {
    title: data.title,
    amount: Number(data.amount),
    category: data.category,
    vendor: data.vendor || '',
    date: data.date || new Date().toISOString().split('T')[0],
    notes: data.notes || '',
    source: 'cream_ai',
    deleted: false,
  };
}

function shoppingPayload(data) {
  return {
    item: data.item,
    qty: Number(data.qty ?? data.quantity ?? 1),
    quantity: Number(data.quantity ?? data.qty ?? 1),
    unit: data.unit || 'pcs',
    estimatedCost: Number(data.estimatedCost || 0),
    notes: data.notes || '',
    source: 'cream_ai',
    deleted: false,
  };
}

function productPayload(data) {
  return {
    name: data.name,
    price: Number(data.price),
    category: data.category || 'Uncategorized',
    description: data.description || '',
    imageUrl: data.imageUrl || '',
    cost: Number(data.cost || 0),
    source: 'cream_ai',
    deleted: false,
  };
}

function recipePayload(data) {
  return {
    name: data.name,
    category: data.category || 'Uncategorized',
    yield: data.yield || '',
    prepTime: data.prepTime || '',
    bakeTime: data.bakeTime || '',
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    steps: Array.isArray(data.steps) ? data.steps : [],
    source: 'cream_ai',
    deleted: false,
  };
}

export async function executeServiceAction(action, context = {}) {
  const data = action.data || {};

  switch (action.intent) {
    case INTENTS.CREATE_ORDER: {
      const payload = orderPayload(data);
      if (context.customers && payload.customerName) {
        const existing = context.customers.find(c => 
          (c.name && c.name.toLowerCase() === payload.customerName.toLowerCase()) ||
          (c.phone && payload.phone && c.phone === payload.phone)
        );
        if (!existing) {
          await addCustomerToDB({ name: payload.customerName, phone: payload.phone, address: payload.deliveryAddress });
        } else if (!existing.phone && payload.phone) {
          // Merge missing phone
          await updateCustomerInDB(existing.id, { phone: payload.phone });
        }
      }
      return { id: await addOrderToDB(payload) };
    }
    case INTENTS.UPDATE_ORDER_STATUS:
      await updateOrderStatusInDB(data.orderId, data.status);
      return { id: data.orderId };
    case INTENTS.DELETE_ORDER:
      await deleteOrderFromDB(data.orderId);
      return { id: data.orderId };
    case INTENTS.ADD_INVENTORY:
      return { id: await addInventoryToDB(inventoryPayload(data)) };
    case INTENTS.UPDATE_INVENTORY_STOCK:
      await updateInventoryFieldsInDB(data.itemId, { stock: Number(data.stock) });
      return { id: data.itemId };
    case INTENTS.DELETE_INVENTORY:
      await deleteInventoryFromDB(data.itemId);
      return { id: data.itemId };
    case INTENTS.ADD_CUSTOMER: {
      const payload = customerPayload(data);
      if (context.customers && payload.name) {
        const existing = context.customers.find(c => 
          (c.name && c.name.toLowerCase() === payload.name.toLowerCase()) ||
          (c.phone && payload.phone && c.phone === payload.phone)
        );
        if (existing) {
          await updateCustomerInDB(existing.id, { ...payload });
          return { id: existing.id };
        }
      }
      return { id: await addCustomerToDB(payload) };
    }
    case INTENTS.DELETE_CUSTOMER:
      await deleteCustomerFromDB(data.customerId);
      return { id: data.customerId };
    case INTENTS.ADD_EXPENSE:
      return { id: await addExpenseToDB(expensePayload(data)) };
    case INTENTS.DELETE_EXPENSE:
      await deleteExpenseFromDB(data.expenseId);
      return { id: data.expenseId };
    case INTENTS.ADD_SHOPPING_ITEM:
      return { id: await addShoppingItemToDB(shoppingPayload(data)) };
    case INTENTS.TOGGLE_SHOPPING_ITEM:
      await toggleShoppingItemInDB(data.itemId, data.bought === true);
      return { id: data.itemId };
    case INTENTS.DELETE_SHOPPING_ITEM:
      await deleteShoppingItemFromDB(data.itemId);
      return { id: data.itemId };
    case INTENTS.ADD_PRODUCT:
      return { id: await addProductToDB(productPayload(data)) };
    case INTENTS.DELETE_PRODUCT:
      await deleteProductFromDB(data.productId);
      return { id: data.productId };
    case INTENTS.ADD_RECIPE:
      return { id: await addRecipeToDB(recipePayload(data)) };
    case INTENTS.DELETE_RECIPE:
      await deleteRecipeFromDB(data.recipeId);
      return { id: data.recipeId };
    case INTENTS.ADD_MEMORY:
      return { id: await addMemoryToDB(data.note) };
    case INTENTS.DELETE_MEMORY:
      await deleteMemoryFromDB(data.memoryId);
      return { id: data.memoryId };
    default:
      throw new Error('Unsupported service action');
  }
}
