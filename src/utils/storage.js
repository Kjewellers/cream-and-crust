// localStorage utility helpers for Cream & Crust

const KEYS = {
  PRODUCTS: 'cc_products',
  ORDERS: 'cc_orders',
  CUSTOMERS: 'cc_customers',
  CART: 'cc_cart',
  SETTINGS: 'cc_settings',
};

export const storage = {
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  // Products
  getProducts() {
    return this.get(KEYS.PRODUCTS) || [];
  },
  setProducts(products) {
    this.set(KEYS.PRODUCTS, products);
  },

  // Orders
  getOrders() {
    return this.get(KEYS.ORDERS) || [];
  },
  setOrders(orders) {
    this.set(KEYS.ORDERS, orders);
  },
  addOrder(order) {
    const orders = this.getOrders();
    orders.unshift(order);
    this.setOrders(orders);
    return order;
  },
  updateOrder(orderId, updates) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx >= 0) {
      orders[idx] = { ...orders[idx], ...updates };
      this.setOrders(orders);
      return orders[idx];
    }
    return null;
  },

  // Customers
  getCustomers() {
    return this.get(KEYS.CUSTOMERS) || [];
  },
  setCustomers(customers) {
    this.set(KEYS.CUSTOMERS, customers);
  },
  addOrUpdateCustomer(customer) {
    const customers = this.getCustomers();
    const idx = customers.findIndex(c => c.phone === customer.phone);
    if (idx >= 0) {
      customers[idx] = {
        ...customers[idx],
        ...customer,
        totalOrders: (customers[idx].totalOrders || 0) + 1,
        totalSpent: (customers[idx].totalSpent || 0) + (customer.orderTotal || 0),
        lastOrder: new Date().toISOString().split('T')[0],
      };
    } else {
      customers.push({
        id: Date.now(),
        ...customer,
        totalOrders: 1,
        totalSpent: customer.orderTotal || 0,
        lastOrder: new Date().toISOString().split('T')[0],
      });
    }
    this.setCustomers(customers);
  },

  // Cart
  getCart() {
    return this.get(KEYS.CART) || [];
  },
  setCart(cart) {
    this.set(KEYS.CART, cart);
  },
  clearCart() {
    this.remove(KEYS.CART);
  },

  // Generate Order ID
  generateOrderId() {
    const orders = this.getOrders();
    const num = orders.length + 1;
    return `CC-${String(num).padStart(3, '0')}`;
  },
};

export default storage;
