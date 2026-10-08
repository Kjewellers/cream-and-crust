// API client — all calls to Express backend (server-side operations)
// For direct Firestore access, use src/services/db.js instead.
import { getAuth } from 'firebase/auth';
import Platform from './platform/Platform';
import { captureAPIError, logAPISuccess, captureAIError, logAISuccess } from './services/ErrorMonitor.js';

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
      try { const parsed = JSON.parse(text); msg = parsed.error || parsed.message || parsed.response || text; } catch(e) {}
      
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

  // AI Chat Proxy - Robust Android implementation using Capacitor HTTP
  chatAI: async (data) => {
    const endpoint = '/ai/chat';
    const url = `${BASE}${endpoint}`;
    const token = await getAuthToken();
    const startTime = Date.now();
    
    // Robust Logging (Req 11)
    console.log(`[AI Request] ${Platform.isAndroid() ? 'Android' : 'Web'} | ${url}`);
    
    if (Platform.isAndroid()) {
      try {
        const { CapacitorHttp } = await import('@capacitor/core');
        const response = await CapacitorHttp.post({
          url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          data
        });
        
        const latencyMs = Date.now() - startTime;
        console.log(`[AI Response] Status: ${response.status} | ${latencyMs}ms`);

        if (response.status >= 400) {
          const error = new Error(response.data?.error || response.data?.message || 'Server unavailable');
          captureAIError(error, { endpoint, status: response.status, latencyMs });
          throw error;
        }

        logAISuccess({ endpoint, status: response.status, latencyMs, provider: 'openrouter' });
        return response.data;
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        if (!err._monitored) {
          captureAIError(err, { endpoint, status: 0, latencyMs });
        }
        console.error('[AI Error]', err);
        throw new Error(err.message || 'Network Error');
      }
    }
    
    // Web path
    try {
      const result = await req('POST', endpoint, data);
      const latencyMs = Date.now() - startTime;
      logAISuccess({ endpoint, status: 200, latencyMs, provider: 'openrouter' });
      return result;
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      captureAIError(err, { endpoint, status: 0, latencyMs });
      throw err;
    }
  },
  
  describeProduct: async (data) => {
    const endpoint = '/ai/describe';
    const url = `${BASE}${endpoint}`;
    const token = await getAuthToken();
    const startTime = Date.now();
    
    if (Platform.isAndroid()) {
      try {
        const { CapacitorHttp } = await import('@capacitor/core');
        const response = await CapacitorHttp.post({
          url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          data
        });
        const latencyMs = Date.now() - startTime;
        if (response.status >= 400) {
          const error = new Error(response.data?.error || response.data?.message || 'Server unavailable');
          captureAIError(error, { endpoint, status: response.status, latencyMs });
          throw error;
        }
        logAISuccess({ endpoint, status: response.status, latencyMs, provider: 'openrouter' });
        return response.data;
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        captureAIError(err, { endpoint, status: 0, latencyMs });
        throw new Error(err.message || 'Network Error');
      }
    }
    
    try {
      const result = await req('POST', endpoint, data);
      const latencyMs = Date.now() - startTime;
      logAISuccess({ endpoint, status: 200, latencyMs, provider: 'openrouter' });
      return result;
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      captureAIError(err, { endpoint, status: 0, latencyMs });
      throw err;
    }
  },
};
