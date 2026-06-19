import { INFORMATION_NOT_FOUND } from './actionSchemas';
import {
  calculateCollectedRevenue,
  calculatePendingPayments,
  calculateTotalRevenue,
} from '../utils/finance';

const MAX_CONTEXT_ITEMS = 80;

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function take(list, max = MAX_CONTEXT_ITEMS) {
  return Array.isArray(list) ? list.filter(Boolean).slice(0, max) : [];
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function orderDate(order) {
  return order?.deliveryDate || order?.date || order?.createdAt || '';
}

function isLowStock(item) {
  return safeNumber(item?.stock) <= safeNumber(item?.minStock);
}

export function buildAIContext(data = {}) {
  return {
    orders: take(data.orders).map((order) => ({
      id: order.id,
      orderId: order.orderId,
      customerName: cleanString(order.customerName),
      customer: typeof order.customer === 'object' ? order.customer?.name : cleanString(order.customer),
      product: cleanString(order.product),
      size: cleanString(order.size),
      total: safeNumber(order.total ?? order.totalAmount),
      advance: safeNumber(order.advance ?? order.advanceAmount ?? order.amountPaid),
      status: cleanString(order.status),
      paymentStatus: cleanString(order.paymentStatus),
      isPaid: order.isPaid === true,
      deliveryDate: cleanString(order.deliveryDate),
      deliveryTime: cleanString(order.deliveryTime),
      createdAt: cleanString(order.createdAt),
    })),
    inventory: take(data.inventory).map((item) => ({
      id: item.id,
      item: cleanString(item.item || item.name),
      stock: safeNumber(item.stock),
      unit: cleanString(item.unit),
      minStock: safeNumber(item.minStock),
      expiryDate: cleanString(item.expiryDate),
      cost: safeNumber(item.cost),
      lowStock: isLowStock(item),
    })),
    customers: take(data.customers).map((customer) => ({
      id: customer.id,
      name: cleanString(customer.name),
      phone: cleanString(customer.phone),
      address: cleanString(customer.address),
      totalOrders: safeNumber(customer.totalOrders),
      totalSpent: safeNumber(customer.totalSpent),
    })),
    expenses: take(data.expenses).map((expense) => ({
      id: expense.id,
      title: cleanString(expense.title || expense.name),
      amount: safeNumber(expense.amount),
      category: cleanString(expense.category),
      date: cleanString(expense.date || expense.createdAt),
    })),
    shoppingItems: take(data.shoppingItems || data.shoppingList).map((item) => ({
      id: item.id,
      item: cleanString(item.item || item.name),
      qty: safeNumber(item.qty ?? item.quantity),
      unit: cleanString(item.unit),
      bought: item.bought === true,
      estimatedCost: safeNumber(item.estimatedCost),
    })),
    products: take(data.products).map((product) => ({
      id: product.id,
      name: cleanString(product.name),
      category: cleanString(product.category),
      price: safeNumber(product.price),
      cost: safeNumber(product.cost),
    })),
    recipes: take(data.recipes).map((recipe) => ({
      id: recipe.id,
      name: cleanString(recipe.name),
      category: cleanString(recipe.category),
      yield: cleanString(recipe.yield),
      ingredientsCount: Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0,
    })),
    memories: take(data.memories).map((memory) => ({
      id: memory.id,
      note: cleanString(memory.note),
    })),
    business: data.business
      ? {
          id: data.business.id,
          name: cleanString(data.business.name),
          username: cleanString(data.business.username),
          phone: cleanString(data.business.phone || data.business.whatsapp),
        }
      : null,
  };
}

export function getInventorySnapshot(context = {}) {
  const inventory = take(context.inventory);
  if (inventory.length === 0) {
    return {
      ok: false,
      message: INFORMATION_NOT_FOUND,
      items: [],
    };
  }

  return {
    ok: true,
    items: inventory.map((item) => ({
      id: item.id,
      item: item.item,
      stock: item.stock,
      unit: item.unit || '',
      minStock: item.minStock,
      lowStock: item.lowStock === true || isLowStock(item),
      expiryDate: item.expiryDate || '',
    })),
  };
}

export function calculateRealAnalytics(context = {}) {
  const orders = take(context.orders, 500);
  const expenses = take(context.expenses, 500);

  if (orders.length === 0 && expenses.length === 0) {
    return {
      ok: false,
      message: INFORMATION_NOT_FOUND,
    };
  }

  const committedOrders = orders.filter((order) => {
    const status = String(order.status || '').toLowerCase();
    return status !== 'cancelled' && status !== 'inquiry';
  });
  const pending = calculatePendingPayments(committedOrders);
  const revenue = calculateTotalRevenue(committedOrders);
  const collected = calculateCollectedRevenue(committedOrders);
  const expenseTotal = expenses.reduce((sum, expense) => sum + safeNumber(expense.amount), 0);
  const lowStockItems = take(context.inventory).filter(isLowStock);

  const productTotals = new Map();
  orders.forEach((order) => {
    const status = String(order.status || '').toLowerCase();
    if (status === 'cancelled' || status === 'inquiry') return;
    const product = order.product || 'Custom order';
    productTotals.set(product, (productTotals.get(product) || 0) + safeNumber(order.total));
  });

  const topProduct = [...productTotals.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  return {
    ok: true,
    ordersCount: orders.length,
    revenue,
    collected,
    pendingPayments: pending.amount,
    pendingPaymentCount: pending.count,
    expenseTotal,
    netProfit: revenue - expenseTotal,
    lowStockCount: lowStockItems.length,
    topProduct: topProduct ? { name: topProduct[0], revenue: topProduct[1] } : null,
    latestOrderDate: orders.map(orderDate).filter(Boolean).sort().at(-1) || null,
  };
}
