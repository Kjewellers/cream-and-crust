// API client — all calls to Express backend
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function req(method, path, body) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try { msg = JSON.parse(text).message || text; } catch(e) {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  // Products
  getProducts: () => req('GET', '/products'),
  createProduct: (data) => req('POST', '/products', data),
  updateProduct: (id, data) => req('PUT', `/products/${id}`, data),
  deleteProduct: (id) => req('DELETE', `/products/${id}`),

  // Orders
  getOrders: () => req('GET', '/orders'),
  createOrder: (data) => req('POST', '/orders', data),
  updateOrder: (id, data) => req('PUT', `/orders/${id}`, data),
  deleteOrder: (id) => req('DELETE', `/orders/${id}`),

  // Customers
  getCustomers: () => req('GET', '/customers'),
  updateCustomer: (id, data) => req('PUT', `/customers/${id}`, data),
  deleteCustomer: (id) => req('DELETE', `/customers/${id}`),

  // Auth
  login: (password) => req('POST', '/auth/login', { password }),

  // Analytics
  getAnalytics: () => req('GET', '/analytics'),
};
