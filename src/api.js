// API client — all calls to Express backend (server-side operations)
// For direct Firestore access, use src/services/db.js instead.
import { getAuth } from 'firebase/auth';

let BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
  BASE = 'https://www.creamandcrust.online/api';
}
async function getAuthToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function req(method, path, body) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const token = await getAuthToken();
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try { const parsed = JSON.parse(text); msg = parsed.error || parsed.message || parsed.response || text; } catch(e) {}
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

  // Analytics
  getAnalytics: () => req('GET', '/analytics'),

  // Recipe scraper
  scrapeRecipe: (url) => req('POST', '/scrape-recipe', { url }),

  // AI Chat Proxy
  chatAI: (data) => req('POST', '/ai/chat', data),
  describeProduct: (data) => req('POST', '/ai/describe', data),
};

