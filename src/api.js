// API client — all calls to Express backend (server-side operations)
// For direct Firestore access, use src/services/db.js instead.
import { getAuth } from 'firebase/auth';
import Platform from './platform/Platform';
import { captureAPIError, logAPISuccess, captureAIError, logAISuccess } from './services/ErrorMonitor.js';
import { dispatchSubscriptionRequired } from './services/subscriptionEvents';

let BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
// Ensure native apps hit the production backend instead of localhost (unless overridden)
if (Platform.isAndroid()) {
  const envUrl = import.meta.env.VITE_API_URL;
  BASE = (envUrl && envUrl.startsWith('http')) ? envUrl : 'https://cream-and-crust.vercel.app/api';
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
  const startTime = Date.now();

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try {
        const parsed = JSON.parse(text);
        msg = parsed.message || parsed.response || parsed.error || text;
        if (res.status === 402 && parsed.error === 'subscription_required') {
          dispatchSubscriptionRequired(parsed.featureKey);
        }
      } catch(e) {}
      
      const error = new Error(msg);
      captureAPIError(error, {
        endpoint: path,
        method,
        status: res.status,
        latencyMs,
        payloadSize: body ? JSON.stringify(body).length : 0,
      });
      throw error;
    }

    // Log successful call
    logAPISuccess({
      endpoint: path,
      method,
      status: res.status,
      latencyMs,
    });

    return res.json();
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    // Only capture if not already captured (non-HTTP errors like network failures)
    if (!err._monitored) {
      captureAPIError(err, {
        endpoint: path,
        method,
        status: 0,
        latencyMs,
        payloadSize: body ? JSON.stringify(body).length : 0,
      });
    }
    throw err;
  }
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

  // Recipe scraper
  scrapeRecipe: (url) => req('POST', '/scrape-recipe', { url }),

  // AI endpoints (disabled)
  chatAI: async () => {
    throw new Error('AI features have been removed from this application.');
  },
  
  describeProduct: async () => {
    throw new Error('AI features have been removed from this application.');
  },
};
