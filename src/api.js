// API client — all calls to Express backend
const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
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

  // File Upload
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      body: formData, // No Content-Type header; fetch handles it with boundaries
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Auth
  login: (password) => req('POST', '/auth/login', { password }),

  // Analytics
  getAnalytics: () => req('GET', '/analytics'),
};
