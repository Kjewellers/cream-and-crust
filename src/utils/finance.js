/**
 * Unified financial calculations for Cream & Crust
 */

export const calculateOrderBalance = (order) => {
  if (!order) return 0;
  
  const total = Number(order.total || order.totalAmount || 0);
  const advance = Number(order.advance || 0);
  const balance = Math.max(0, total - advance);
  
  // If explicitly marked as paid, balance is 0
  if (order.isPaid === true || String(order.paymentStatus).toLowerCase() === 'paid') {
    return 0;
  }
  
  return balance;
};

export const isOrderPendingPayment = (order) => {
  if (!order) return false;
  
  const status = String(order.status || 'inquiry').toLowerCase();
  
  // EXCLUDE inquiries and cancelled orders from pending payments
  if (status === 'inquiry' || status === 'cancelled') return false;
  
  const balance = calculateOrderBalance(order);
  return balance > 0;
};

export const calculatePendingPayments = (orders) => {
  if (!orders || !Array.isArray(orders)) return { amount: 0, count: 0 };
  
  const pendingOrders = orders.filter(isOrderPendingPayment);
  const amount = pendingOrders.reduce((sum, o) => sum + calculateOrderBalance(o), 0);
  
  return {
    amount,
    count: pendingOrders.length,
    orders: pendingOrders
  };
};

export const calculateTotalRevenue = (orders) => {
  if (!orders || !Array.isArray(orders)) return 0;
  
  return orders
    .filter(o => {
      const status = String(o.status || '').toLowerCase();
      return status !== 'inquiry' && status !== 'cancelled';
    })
    .reduce((sum, o) => sum + (Number(o.total || o.totalAmount) || 0), 0);
};

export const calculateCollectedRevenue = (orders) => {
  if (!orders || !Array.isArray(orders)) return 0;
  
  return orders
    .filter(o => {
      const status = String(o.status || '').toLowerCase();
      return status !== 'inquiry' && status !== 'cancelled';
    })
    .reduce((sum, o) => sum + (Number(o.advance) || 0), 0);
};
