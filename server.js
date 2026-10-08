import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { URL } from 'url';
import dns from 'dns/promises';
import net from 'net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Apply global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

const PORT = process.env.PORT || 3001;

// Initialize Firebase Admin using Service Account JSON from ENV
let dbAdmin;
try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    if (Object.keys(serviceAccount).length > 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || 'cream-and-crust'
      });
      dbAdmin = admin.firestore();
      console.log('✅ Firebase Admin Initialized');
    } else {
      console.warn('⚠️ No Firebase Service Account found in ENV. Firestore features will be disabled.');
    }
  } else {
    dbAdmin = admin.firestore();
  }
} catch (e) {
  console.error('❌ Firebase Admin Init Error:', e.message);
}

// ─── CORS (restrict origins in production) ───────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    const allowed = [
      'http://localhost',
      'https://localhost',
      'capacitor://localhost',
      '.vercel.app',
      'creamandcrust.online',
      'creamandcrust.app'
    ];
    
    if (allowed.some(a => origin.includes(a))) {
      return callback(null, true);
    }
    
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// ── SECURITY HEADERS (helmet) ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",       // Required by Vite SPA in dev
        "https://apis.google.com",
        "https://*.firebaseapp.com",
        "https://*.firebase.com",
      ],
      connectSrc: [
        "'self'",
        "https://*.googleapis.com",
        "https://*.firebaseio.com",
        "https://*.firebase.com",
        "https://api.cloudinary.com",
        "https://b2b-api.rapido.bike",
        "wss://*.firebaseio.com",
      ],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://lh3.googleusercontent.com", "https://*.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for Firebase Auth popup
}));

app.use(express.json());

// ─── AUTH & ZERO-TRUST MIDDLEWARES ──────────────────────────────
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  
  try {
    if (!admin.apps.length) {
      console.warn('⚠️ Firebase Admin not initialized — bypassing auth verification for local development');
      req.uid = req.headers['x-dev-uid'] || 'local-dev-user';
      return next();
    }
    
    if (!idToken || idToken === 'undefined' || idToken === 'null') {
       throw new Error(`Token is invalid string: ${idToken}`);
    }
    
    const decodedToken = await admin.auth().verifyIdToken(idToken, true); // checkRevoked = true
    req.uid = decodedToken.uid;
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('[ZeroTrust Server] Auth verification failed:', error.message);
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ error: 'Unauthorized: Session has been revoked' });
    }
    return res.status(401).json({ error: 'Invalid or expired token', details: error.message });
  }
}

/**
 * Enforce Resource Ownership Middleware
 * Ensures req.uid matches the resource owner UID before returning data.
 */
function requireOwnership(uidSource = 'params', paramName = 'id') {
  return async (req, res, next) => {
    if (!req.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    let requestedUid = null;
    if (uidSource === 'params') requestedUid = req.params[paramName];
    else if (uidSource === 'body') requestedUid = req.body[paramName];
    else if (uidSource === 'query') requestedUid = req.query[paramName];

    if (requestedUid && requestedUid !== req.uid) {
      console.warn(`[ZeroTrust 403 Forbidden] User ${req.uid} attempted to access data for ${requestedUid}`);
      return res.status(403).json({ error: 'Forbidden: You do not have permission to access another bakery\'s data' });
    }

    next();
  };
}

// ─── SSRF PROTECTION HELPER ─────────────────────────────────
function isPrivateIP(ip) {
  // Check for private, loopback, link-local, and metadata IPs
  return (
    net.isIP(ip) &&
    (ip.startsWith('10.') ||
     ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') ||
     ip.startsWith('172.19.') || ip.startsWith('172.20.') || ip.startsWith('172.21.') ||
     ip.startsWith('172.22.') || ip.startsWith('172.23.') || ip.startsWith('172.24.') ||
     ip.startsWith('172.25.') || ip.startsWith('172.26.') || ip.startsWith('172.27.') ||
     ip.startsWith('172.28.') || ip.startsWith('172.29.') || ip.startsWith('172.30.') ||
     ip.startsWith('172.31.') ||
     ip.startsWith('192.168.') ||
     ip.startsWith('127.') ||
     ip === '0.0.0.0' ||
     ip.startsWith('169.254.') ||
     ip === '::1' ||
     ip.startsWith('fc00:') || ip.startsWith('fd00:') ||
     ip.startsWith('fe80:'))
  );
}

async function validateUrlForScraping(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  // Resolve hostname and check for private IPs
  const addresses = await dns.resolve4(parsed.hostname).catch(() => []);
  const addresses6 = await dns.resolve6(parsed.hostname).catch(() => []);
  const allAddresses = [...addresses, ...addresses6];

  if (allAddresses.length === 0) {
    throw new Error('Could not resolve hostname');
  }

  for (const addr of allAddresses) {
    if (isPrivateIP(addr)) {
      throw new Error('URL resolves to a private/internal IP address');
    }
  }

  return parsed;
}

// Serve static files from the 'dist' directory (Vite build)
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ─── RAPIDO LOGISTICS API ────────────────────────────────────
app.post('/api/rapido/book', requireAuth, async (req, res) => {
  try {
    const order = req.body;
    const RAPIDO_API_KEY = process.env.RAPIDO_API_KEY;
    const RAPIDO_URL = process.env.RAPIDO_URL || 'https://b2b-api.rapido.bike/api/v2/deliveries';

    const pickupAddress = "cream.and.crust gyan bagh colony";
    const dropAddress = order.deliveryAddress;
    const customerPhone = typeof order.customer === 'object' ? order.customer?.phone : order.phone;
    const customerName = typeof order.customer === 'object' ? order.customer?.name : (order.customerName || order.customer);

    if (!RAPIDO_API_KEY) {
      console.log('⚠️ RAPIDO_API_KEY not found in .env. Returning simulated success for UI testing.');
      return res.json({ 
        success: true, 
        simulated: true,
        orderId: `RAP-${Date.now()}`,
        trackingUrl: `https://track.rapido.bike/simulated/${Date.now()}`,
        pickup: pickupAddress,
        drop: dropAddress
      });
    }

    const response = await fetch(RAPIDO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RAPIDO_API_KEY}`
      },
      body: JSON.stringify({
        pickup: { address: pickupAddress },
        drop: { address: dropAddress, name: customerName, phone: customerPhone },
        amount: order.total || order.totalAmount
      })
    });

    const data = await response.json();
    if (response.ok) {
      res.json({ success: true, ...data });
    } else {
      res.status(400).json({ success: false, error: data.message || 'Rapido API failed' });
    }
  } catch (error) {
    console.error('Rapido Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error booking Rapido' });
  }
});

// ─── PRODUCTS ────────────────────────────────────────────────
app.get('/api/products', requireAuth, async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    const snapshot = await dbAdmin.collection('products').where('uid', '==', req.uid).get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', requireAuth, async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    const docRef = await dbAdmin.collection('products').add({
      ...req.body,
      uid: req.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ id: docRef.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', requireAuth, async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    // Verify ownership before update
    const docRef = dbAdmin.collection('products').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists() || docSnap.data().uid !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { uid, ...updateData } = req.body; // Prevent uid override
    await docRef.update(updateData);
    res.json({ id: req.params.id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', requireAuth, async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    const docRef = dbAdmin.collection('products').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists() || docSnap.data().uid !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await docRef.delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── ORDERS ──────────────────────────────────────────────────
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    const snapshot = await dbAdmin.collection('orders')
      .where('uid', '==', req.uid)
      .orderBy('createdAt', 'desc')
      .get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    
    // Per-user order counter with transaction
    const counterRef = dbAdmin.collection('metadata').doc(`counters_${req.uid}`);
    let orderCount = 1;
    await dbAdmin.runTransaction(async (transaction) => {
      const countSnapshot = await transaction.get(counterRef);
      if (countSnapshot.exists()) {
        orderCount = (countSnapshot.data().orderCount || 0) + 1;
      }
      transaction.set(counterRef, { orderCount }, { merge: true });
    });
    
    const orderId = `CC-${String(orderCount).padStart(3, '0')}`;
    const orderData = {
      ...req.body,
      uid: req.uid,
      orderId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const docRef = await dbAdmin.collection('orders').add(orderData);
    
    // Upsert customer — scoped to this user's customers
    if (orderData.customer?.phone) {
      const customersRef = dbAdmin.collection('customers');
      const customerSnapshot = await customersRef
        .where('uid', '==', req.uid)
        .where('phone', '==', orderData.customer.phone)
        .get();
      
      if (!customerSnapshot.empty) {
        const customerDoc = customerSnapshot.docs[0];
        await customerDoc.ref.update({
          totalOrders: admin.firestore.FieldValue.increment(1),
          totalSpent: admin.firestore.FieldValue.increment(orderData.total || 0),
          lastOrder: new Date().toISOString().split('T')[0]
        });
      } else {
        await customersRef.add({
          uid: req.uid,
          name: orderData.customer.name || '',
          phone: orderData.customer.phone,
          address: orderData.customer.address || '',
          totalOrders: 1,
          totalSpent: orderData.total || 0,
          lastOrder: new Date().toISOString().split('T')[0],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    res.json({ id: docRef.id, ...orderData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    const docRef = dbAdmin.collection('orders').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists() || docSnap.data().uid !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { uid, ...updateData } = req.body;
    await docRef.update(updateData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    const docRef = dbAdmin.collection('orders').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists() || docSnap.data().uid !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await docRef.delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── CUSTOMERS ───────────────────────────────────────────────
app.get('/api/customers', requireAuth, async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    const snapshot = await dbAdmin.collection('customers').where('uid', '==', req.uid).get();
    const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── ANALYTICS ───────────────────────────────────────────────
app.get('/api/analytics', requireAuth, async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    
    const ordersSnapshot = await dbAdmin.collection('orders').where('uid', '==', req.uid).get();
    const orders = ordersSnapshot.docs.map(doc => doc.data());
    const customersSnapshot = await dbAdmin.collection('customers').where('uid', '==', req.uid).get();
    const productsSnapshot = await dbAdmin.collection('products').where('uid', '==', req.uid).get();

    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => {
      const created = o.createdAt?.toDate ? o.createdAt.toDate().toISOString() : (o.createdAt || '');
      return created.startsWith(today);
    });

    const totalRevenue = orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + (o.total || 0), 0);

    // last 7 days revenue
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOrders = orders.filter(o => {
        const created = o.createdAt?.toDate ? o.createdAt.toDate().toISOString() : (o.createdAt || '');
        return created.startsWith(dateStr);
      });
      last7.push({
        date: dateStr,
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
        count: dayOrders.length,
      });
    }

    res.json({
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.reduce((s, o) => s + (o.total || 0), 0),
      totalOrders: orders.length,
      totalRevenue,
      totalCustomers: customersSnapshot.size,
      totalProducts: productsSnapshot.size,
      pendingOrders: orders.filter(o => o.status === 'new' || o.status === 'confirmed').length,
      last7,
      ordersByStatus: {
        new: orders.filter(o => o.status === 'new').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        'in-progress': orders.filter(o => o.status === 'in-progress').length,
        ready: orders.filter(o => o.status === 'ready').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── RECIPE SCRAPER (WEB IMPORTER) — SSRF-protected ─────────
app.post('/api/scrape-recipe', requireAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // Validate URL: must be HTTPS, must not resolve to private IP
    await validateUrlForScraping(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error('Failed to fetch the URL');
    
    // Limit response size to 5MB
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      throw new Error('Response too large');
    }

    const html = await response.text();
    
    const jsonLdRegex = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let recipeData = null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
        for (const item of items) {
          if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
            recipeData = item;
            break;
          }
        }
        if (recipeData) break;
      } catch (e) {
        // Ignore JSON parse errors for invalid scripts
      }
    }

    if (!recipeData) {
      return res.status(404).json({ error: 'No standard recipe data (Schema.org JSON-LD) found on this page.' });
    }

    const name = recipeData.name || '';
    const ingredientsRaw = recipeData.recipeIngredient || [];
    
    const ingredients = ingredientsRaw.map(ing => {
      const parts = ing.split(' ');
      const qty = parseFloat(parts[0]) ? parts[0] : '1';
      return { name: ing, qty, unit: 'unit', cost: 0 };
    });

    const stepsRaw = recipeData.recipeInstructions || [];
    let steps = [];
    if (typeof stepsRaw === 'string') {
      steps = [{ title: 'Instructions', desc: stepsRaw }];
    } else {
      steps = stepsRaw.map(s => ({
        title: s.name || 'Step',
        desc: s.text || s
      }));
    }

    let imageUrl = '';
    if (recipeData.image) {
      if (typeof recipeData.image === 'string') imageUrl = recipeData.image;
      else if (Array.isArray(recipeData.image)) imageUrl = recipeData.image[0];
      else if (recipeData.image.url) imageUrl = recipeData.image.url;
    }

    res.json({
      success: true,
      data: {
        name,
        imageUrl,
        prepTime: recipeData.prepTime ? recipeData.prepTime.replace('PT', '') : '',
        bakeTime: recipeData.cookTime ? recipeData.cookTime.replace('PT', '') : '',
        yield: recipeData.recipeYield || '1 batch',
        ingredients,
        steps,
        category: recipeData.recipeCategory || 'Other',
        status: 'Draft'
      }
    });

  } catch (error) {
    console.error('Recipe scrape error:', error.message);
    if (error.message.includes('private') || error.message.includes('HTTPS') || error.message.includes('Invalid URL')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error scraping recipe' });
  }
});

// ─── PUSH NOTIFICATIONS (FCM) ───────────────────────────────
app.post('/api/notifications/send', requireAuth, async (req, res) => {
  try {
    const { token, tokens, title, body, data } = req.body;
    
    const targetTokens = tokens || (token ? [token] : []);
    
    if (targetTokens.length === 0) return res.status(400).json({ error: 'FCM token(s) are required' });
    if (!admin.apps.length) return res.status(500).json({ error: 'Firebase Admin not initialized' });

    // ── TOKEN OWNERSHIP VERIFICATION ────────────────────────
    // Only allow sending to FCM tokens that belong to the requesting user.
    // This prevents a malicious user from sending pushes to other users' devices.
    const userDoc = await dbAdmin.collection('users').doc(req.uid).get();
    if (!userDoc.exists) return res.status(403).json({ error: 'User not found' });
    const ownedTokens = userDoc.data().fcmTokens || (userDoc.data().fcmToken ? [userDoc.data().fcmToken] : []);
    const allowedTokens = targetTokens.filter(t => ownedTokens.includes(t));
    if (allowedTokens.length === 0) {
      return res.status(403).json({ error: 'None of the provided tokens belong to the authenticated user' });
    }
    // ────────────────────────────────────────────────────────

    const message = {
      notification: {
        title: title || 'New Notification',
        body: body || ''
      },
      data: data || {},
      tokens: allowedTokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    res.json({ success: true, successCount: response.successCount, failureCount: response.failureCount });
  } catch (error) {
    console.error('FCM Push Notification error:', error);
    res.status(500).json({ error: 'Failed to send push notification' });
  }
});

// ─── AI CHAT PROXY (OpenRouter) ──────────────────────────────
const AI_KEYS = [
  process.env.OPENROUTER_API_KEY_1,
  process.env.OPENROUTER_API_KEY_2,
].filter(Boolean);
const AI_MODEL_PRIMARY = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free';
const AI_MODEL_FALLBACK = 'meta-llama/llama-3.1-8b-instruct:free';
const AI_RATE_LIMIT = parseInt(process.env.AI_RATE_LIMIT_PER_DAY || '500', 10);

// In-memory rate limiter (resets on server restart — fine for free tier)
const aiRateLimits = new Map(); // uid -> { count, resetAt }
let aiKeyIndex = 0;

function getNextAIKey() {
  if (AI_KEYS.length === 0) return null;
  const key = AI_KEYS[aiKeyIndex % AI_KEYS.length];
  aiKeyIndex++;
  return key;
}

function checkAIRateLimit(uid) {
  const now = Date.now();
  const entry = aiRateLimits.get(uid);
  if (!entry || now > entry.resetAt) {
    aiRateLimits.set(uid, { count: 1, resetAt: now + 86400000 }); // 24 hours
    return true;
  }
  if (entry.count >= AI_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

app.post('/api/ai/chat', requireAuth, async (req, res) => {
  try {
    const apiKey = getNextAIKey();
    if (!apiKey) {
      return res.status(503).json({ error: 'AI service not configured — no API keys found' });
    }

    if (!checkAIRateLimit(req.uid)) {
      return res.status(429).json({
        error: 'Rate limit reached',
        response: 'Aap ne aaj ki AI limit (' + AI_RATE_LIMIT + '/day) poori kar li hai. Kal try karein.',
      });
    }

    const { message, feature, context, history } = req.body;
    if (!message && !feature) {
      return res.status(400).json({ error: 'Message or feature is required' });
    }

    // Build the system prompt based on the requested feature
    const systemPrompt = buildSystemPrompt(feature, context);
    
    // Define buildFeatureMessage logic inline or as a helper
    let userMessage = message;
    if (!userMessage) {
      if (feature === 'inventory_check') userMessage = 'Please run an inventory stock check.';
      else if (feature === 'coach_me') userMessage = 'Give me a business health check and advice.';
      else if (feature === 'briefing') userMessage = 'Give me my morning briefing.';
      else if (feature === 'generate_recipe') userMessage = 'Generate a new creative bakery recipe.';
      else if (feature === 'predictive_inventory') userMessage = 'Analyze predictive inventory restock needs.';
      else if (feature === 'run_bakery') userMessage = 'What are my top priorities to run the bakery today?';
      else if (feature === 'customer_retention') userMessage = 'Analyze customer retention and VIP churn risks.';
      else userMessage = `Execute feature: ${feature}`;
    }

    const buildMsgs = () => [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-8).map(h => ({
        role: h.role === 'ai' ? 'assistant' : 'user',
        content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content),
      })),
      { role: 'user', content: userMessage },
    ];

    const orFetch = (key, model) => fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://creamandcrust.app',
        'X-Title': 'Cream & Crust AI',
      },
      body: JSON.stringify({ model, messages: buildMsgs(), temperature: 0.65, max_tokens: 800, provider: { sort: 'throughput' } }),
    });

    let response = await orFetch(apiKey, AI_MODEL_PRIMARY);
    if (!response.ok && response.status !== 401) {
      response = await orFetch(apiKey, AI_MODEL_FALLBACK);
    }
    if (!response.ok && AI_KEYS.length > 1) {
      const key2 = getNextAIKey();
      response = await orFetch(key2, AI_MODEL_PRIMARY);
      if (!response.ok) response = await orFetch(key2, AI_MODEL_FALLBACK);
    }

    if (!response.ok) {
      console.error('OpenRouter all models exhausted:', response.status);
      return res.status(502).json({
        error: 'AI service temporarily unavailable',
        response: 'AI abhi busy hai, thodi der mein try karein.',
      });
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';

    res.json(parseAIResponse(aiText));
  } catch (error) {
    console.error('AI Chat error:', error.message);
    res.status(500).json({
      error: 'AI service error',
      response: 'Kuch technical problem aa gayi. Please try again.',
    });
  }
});

app.post('/api/ai/describe', requireAuth, async (req, res) => {
  try {
    const { name, category, image } = req.body;
    
    let contentMessage;
    if (image) {
      contentMessage = [
        { type: "text", text: `Write a short, mouth-watering, premium 2-sentence description for this bakery product based on its name (${name}), category (${category}), and the attached picture. Do not include quotes.` },
        { type: "image_url", image_url: { url: image } }
      ];
    } else {
      contentMessage = `Write a short, mouth-watering, premium 2-sentence description for this bakery product based on its name (${name}) and category (${category}). Do not include quotes.`;
    }

    const apiKey = getNextAIKey();
    if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://creamandcrust.app',
        'X-Title': 'Cream & Crust AI',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free',
        messages: [
          { role: 'user', content: contentMessage },
        ],
        temperature: 0.7,
        max_tokens: 150,
        provider: { sort: 'throughput' }
      }),
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';

    res.json({ description: aiText.replace(/["']/g, '').trim() });
  } catch (error) {
    console.error('AI Describe error:', error.message);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Parse AI response — try to extract JSON, fallback to plain text
function parseAIResponse(text) {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      return {
        response: parsed.response || parsed.message || text,
        action: parsed.action || null,
        insights: parsed.insights || null,
        state: parsed.state || 'ready',
        agent: parsed.agent || 'General',
        thoughtProcess: Array.isArray(parsed.thoughtProcess) ? parsed.thoughtProcess : (parsed.thoughtProcess ? [parsed.thoughtProcess] : null),
        extracted: parsed.extracted || {},
        missing: parsed.missing || [],
        buttons: Array.isArray(parsed.buttons) ? parsed.buttons : [],
        question: parsed.question || ''
      };
    }
  } catch (e) {
    // JSON parse failed — return as plain text
  }
  return { 
    response: text, action: null, insights: null, thoughtProcess: null,
    state: 'ready', agent: 'General', extracted: {}, missing: [], buttons: []
  };
}

// Pre-compute analytics summary from context to give the LLM richer data
function computeContextSummary(context) {
  if (!context) return null;
  const orders = context.orders || [];
  const inventory = context.inventory || [];
  const expenses = context.expenses || [];
  const today = new Date().toISOString().split('T')[0];
  const totalRevenue = orders.filter(o => o.paymentStatus === 'paid' || o.isPaid).reduce((s, o) => s + (o.total || 0), 0);
  const pendingPayments = orders.filter(o => o.paymentStatus !== 'paid' && !o.isPaid && o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);
  const todayOrders = orders.filter(o => (o.deliveryDate || '').startsWith(today));
  const lowStockItems = inventory.filter(i => (i.stock || 0) <= (i.minStock || 0) && i.minStock > 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const productTotals = {};
  orders.forEach(o => {
    if (o.status !== 'cancelled' && o.product) {
      productTotals[o.product] = (productTotals[o.product] || 0) + (o.total || 0);
    }
  });
  const topProduct = Object.entries(productTotals).sort((a, b) => b[1] - a[1])[0];
  return {
    totalOrders: orders.length,
    totalRevenue,
    pendingPayments,
    pendingOrdersCount: orders.filter(o => ['new','confirmed','in-progress'].includes(o.status)).length,
    todayDeliveries: todayOrders.length,
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.map(i => ({ item: i.item, stock: i.stock, unit: i.unit, minStock: i.minStock })),
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    topProduct: topProduct ? { name: topProduct[0], revenue: topProduct[1] } : null,
  };
}

function buildSystemPrompt(feature, context) {
  const summary = computeContextSummary(context);
  const basePrompt = `You are "Cream AI" — an autonomous Bakery Business Agent and Orchestrator.
Your mission is to operate the entire bakery application through natural conversation, acting as a highly experienced human bakery manager.

IDENTITY & TONE:
- You are a highly sophisticated Bakery Business Agent.
- Your tone is premium, professional, encouraging, and elegant.
- You understand Hindi, English, and Hinglish perfectly.
- Currency is always INR (use the ₹ symbol).
- Today's date is: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

CONVERSATIONAL STATE MACHINE PROTOCOL (CRITICAL):
You must behave as an intelligent agent. When a user asks to perform an action (e.g., create an order, add inventory):
1. Detect the Intent (e.g., "create_order").
2. Determine Required Fields (e.g., Customer, Product, Weight, Date, Time, Address).
3. Extract Known Fields from the user's message and chat history.
4. Detect Missing Fields.
5. IF MISSING FIELDS EXIST: Set state to "gathering". ALWAYS ask for exactly ONE missing field at a time. NEVER ask multiple questions at once.
6. IF ALL FIELDS GATHERED: Set state to "ready", formulate the final action payload, and present the preview.

RESPONSE FORMAT — ALWAYS return valid JSON exactly matching this schema:
{
  "state": "gathering" | "ready",
  "agent": "Order Agent" | "Inventory Agent" | "Product Agent" | "Recipe Agent" | "Business Coach" | "Marketing Agent" | "General",
  "thoughtProcess": ["✓ Step one done", "✓ Step two done", "✓ Result ready"],
  "extracted": { "field1": "value1" },
  "missing": ["field2"],
  "response": "Your conversational reply here",
  "buttons": [
    { "label": "View Orders", "action": "navigate", "value": "/orders" },
    { "label": "Generate Invoice", "action": "dispatch", "value": "send_whatsapp_invoice" },
    { "label": "Copy", "action": "copy", "value": "text to copy" }
  ],
  "action": null,
  "insights": null
}

BUTTON RULES (MANDATORY):
- EVERY response must include a "buttons" array with 1-3 contextual actions.
- Order actions: always include [View Orders] (navigate /orders) + [Generate Invoice] (dispatch send_whatsapp_invoice) after order creation.
- Inventory actions: always include [Open Inventory] (navigate /inventory) + [Generate Purchase List] (dispatch inventory_check).
- Product/menu actions: always include [Open Products] (navigate /products) + [Copy] for any generated text.
- Recipe actions: include [Save to Recipes] (dispatch add_recipe) + [Copy Ingredients] (copy).
- Analytics actions: include [View Analytics] (navigate /analytics).
- Empty state responses: always include an [Open Module] navigate button.

CRITICAL RULES (ZERO HALLUCINATION):
1. ALWAYS respond in valid JSON — no markdown outside the JSON block.
2. NEVER ASK MULTIPLE QUESTIONS. Ask for ONE missing field at a time.
3. Once state is "ready", set action.confirmRequired: true for data-write actions.
4. NEVER FABRICATE DATA. Use only what is in CURRENT APP DATA. If empty, say so helpfully.
5. MEMORY: "remember X" → add_memory action. "forget X" → delete_memory action.
6. MEMORY RECALL: Check context.memories and auto-fill fields from stored preferences.
7. EMPTY STATES: Never say "No data found." Instead explain what to do and provide action buttons.
8. thoughtProcess MUST be an array of short completed steps, e.g. ["✓ Read 12 orders", "✓ Found 3 unpaid", "✓ Calculated ₹4,200 pending"].`;

  const summaryStr = summary ? `\n\nCOMPUTED BUSINESS SUMMARY (use these real numbers):\n${JSON.stringify(summary)}` : '';
  const contextStr = context ? `\n\nCURRENT APP DATA:\n${JSON.stringify(context, null, 0).slice(0, 6000)}` : '';

  const featurePrompts = {
    companion: `\n\nMODE: Autonomous Business Agent
You are the Global Orchestrator and expert bakery manager. Identify which specialized agent should handle the request and set the "agent" field accordingly.

SPECIALIZED AGENT PERSONAS:

🛎 ORDER AGENT (agent: "Order Agent") — triggered by: create order, book order, invoice, delivery
- Look up existing customers in context.customers by name/phone before asking.
- Auto-calculate price from context.products if not provided.
- After order creation success: buttons MUST be [{label:"View Orders",action:"navigate",value:"/orders"},{label:"Generate Invoice",action:"dispatch",value:"send_whatsapp_invoice"}].
- Show pending deliveries today proactively if COMPUTED BUSINESS SUMMARY shows todayDeliveries > 0.

📦 INVENTORY AGENT (agent: "Inventory Agent") — triggered by: stock, inventory, low stock, expiry, purchase list
- Use COMPUTED BUSINESS SUMMARY.lowStockItems for immediate accuracy.
- If inventory is EMPTY: respond "I couldn’t find any inventory records yet. To start forecasting, add ingredients like Flour, Sugar, Eggs, Butter. Would you like a starter template?" with buttons [{label:"Open Inventory",action:"navigate",value:"/inventory"},{label:"Add Item",action:"navigate",value:"/inventory"}].
- For purchase list: generate a shopping list based on low stock items. buttons: [{label:"Add to Shopping List",action:"dispatch",value:"add_shopping_item"},{label:"Open Inventory",action:"navigate",value:"/inventory"}].

🍰 PRODUCT AGENT (agent: "Product Agent") — triggered by: menu, products, description, SEO
- When generating descriptions: read ALL items in context.products and generate one premium description per product.
- Each response MUST include buttons: [{label:"Open Products",action:"navigate",value:"/products"}] + a copy button for the generated text.
- Never say "Analysis complete". Always return actual descriptions.

📖 RECIPE AGENT (agent: "Recipe Agent") — triggered by: recipe, scale, ingredients, bake
- Always return precise ingredient weights, steps, yield, estimated cost.
- Include buttons: [{label:"Save to Recipes",action:"navigate",value:"/recipes"},{label:"Copy Ingredients",action:"copy",value:"[ingredients list]"}].

💼 BUSINESS COACH (agent: "Business Coach") — triggered by: revenue, profit, business, analytics, trends
- ALWAYS use numbers from COMPUTED BUSINESS SUMMARY (totalRevenue, netProfit, topProduct, pendingPayments).
- Provide specific pricing recommendations with estimated monthly impact in ₹.
- Include buttons: [{label:"View Analytics",action:"navigate",value:"/analytics"},{label:"See Orders",action:"navigate",value:"/orders"}].

📣 MARKETING AGENT (agent: "Marketing Agent") — triggered by: campaign, WhatsApp, caption, Instagram, promote
- Generate platform-specific content based on top-selling products from context.
- Include buttons: [{label:"Copy Caption",action:"copy",value:"[generated caption]"},{label:"Open Products",action:"navigate",value:"/products"}].

AVAILABLE ACTIONS:
- create_order: { customerName, phone, product, size, price, qty, deliveryDate, deliveryTime, deliveryAddress, deliveryType, notes }
- update_order_status: { orderId, status } (statuses: "new"|"confirmed"|"in-progress"|"baking"|"ready"|"delivered"|"cancelled") — NO confirm needed for status-only changes
- mark_paid: { orderId } — mark order payment as paid — NO confirm needed
- batch_status_update: { status, orderIds: [] } — update multiple orders at once
- delete_order: { orderId }
- add_inventory: { item, stock, unit, minStock, expiryDate, cost }
- update_inventory_stock: { itemId, stock } — itemId must be exact Firestore ID from context
- add_customer: { name, phone, address, dob }
- add_expense: { title, amount, category, date, vendor, notes }
- add_shopping_item: { item, qty, unit, estimatedCost }
- add_product: { name, price, category, description }
- add_recipe: { name, category, yield, prepTime, bakeTime, ingredients: [{name, qty, unit}], steps: [{title, desc}] }
- navigate: { to } — navigate without confirmation
- add_memory: { note } / delete_memory: { memoryId }
- send_whatsapp_invoice: { orderId }
- export_data: { target: "orders"|"expenses"|"customers" }
- change_theme: { theme: "dark"|"light" }
- multi_action: { actions: [{ type, data }] } — run multiple actions in sequence

INSIGHTS PROTOCOL — For analytical/generative requests set state=ready, action=null, populate insights:
1. Recipe: { type:"recipe_generator", recipe:{ name, yield, cost, prepTime, bakeTime, ingredients:[{item,qty,unit}], steps:[] } }
2. Inventory: { type:"inventory_assistant", summary, shortages:[{item,stock,reason}], expiring:[{item,date}] }
3. Coach: { type:"bakery_coach", revenue, profit, bestSellers:[], weakProducts:[], advice } — use COMPUTED BUSINESS SUMMARY numbers.
4. Marketing: { type:"marketing_campaign", message, target, hashtags:[] }
5. Payments: { type:"payment_status", pendingAmount, pendingOrders:[{customer,amount,orderId,id}] }
6. Charts: { type:"chart", chartType:"bar"|"line", data:[{name,value}] }
7. Product descriptions: { type:"product_descriptions", items:[{id,name,description}] }
8. Orders list: { type:"orders_list", orders:[{id,orderId,customerName,product,total,status,paymentStatus,deliveryDate}] }
9. Customers list: { type:"customers_list", customers:[{id,name,phone,totalOrders}] }
10. Run My Bakery: { type:"run_bakery", priorities:[{task,reason,urgency,action}], summary: "..." }
11. Predictive Inventory: { type:"predictive_inventory", analysis:"...", shortagesToOrder:[{item, currentStock, neededStock, reason}], actionReady: true }
12. Customer Retention: { type:"customer_retention", analysis:"...", vipChurnRisks:[{name, lastOrder, totalOrders}], suggestedMessage:"...", actionReady: true }

IMPORTANT — For "show me orders", "list unpaid orders", "find Priya's orders" etc: use type:"orders_list" and populate with REAL order data from context. NEVER say you can't show data — just render it.

QUICK ACTION RULES (no confirmation needed, execute immediately):
- "Mark CC-001 as delivered" → action: { type:"update_order_status", data:{ orderId:"<id>", status:"delivered" }, confirmRequired: false }
- "Mark CC-001 as paid" → action: { type:"mark_paid", data:{ orderId:"<id>" }, confirmRequired: false }
- "Go to orders" / "Open inventory" → action: { type:"navigate", data:{ to:"/orders" }, confirmRequired: false }
- "Dark mode" / "Light mode" → action: { type:"change_theme", data:{ theme:"dark" }, confirmRequired: false }
- "Show unpaid orders" → insights: { type:"orders_list", orders:[...filtered from context] }

OrderId resolution: ALWAYS look up the order ID from context.orders by orderId field (like "CC-001") and use the Firestore document id field.

Example: User says "Create order for Priya, 1kg chocolate cake, tomorrow"
You: { "state":"gathering", "agent":"Order Agent", "extracted":{"customerName":"Priya","product":"Chocolate Cake","size":"1kg","deliveryDate":"tomorrow"}, "missing":["phone"], "response":"Got it! What is Priya's phone number?", "buttons":[{"label":"View Orders","action":"navigate","value":"/orders"}], "action":null, "insights":null, "thoughtProcess":["✓ Detected create order intent","✓ Extracted 4 fields from message","✓ Phone number missing"] }`,



    generate_recipe: `\n\nMODE: Recipe Generator
Generate a creative, detailed, professional bakery recipe. If the user didn't specify a flavor, invent a highly premium, trending seasonal cake recipe (e.g. Pistachio Rose, Earl Grey Lavender, etc).
ALWAYS respond with a JSON object. Set state to "ready", action to null.
Populate the "insights" object exactly like this:
{ "type": "recipe_generator", "recipe": { "name": "...", "yield": "...", "cost": ..., "prepTime": "...", "bakeTime": "...", "ingredients": [{"item": "...", "qty": "...", "unit": "..."}], "steps": ["..."] } }`,

    inventory_check: `\n\nMODE: Inventory Assistant
Analyze the current inventory context. Identify items low in stock or expiring soon. If no inventory is provided, generate a realistic hypothetical low-stock report for a bakery.
ALWAYS respond with a JSON object. Set state to "ready", action to null.
Populate the "insights" object exactly like this:
{ "type": "inventory_assistant", "summary": "...", "shortages": [{"item": "...", "stock": "...", "reason": "..."}], "expiring": [{"item": "...", "date": "..."}] }`,

    coach_me: `\n\nMODE: Bakery Coach
Analyze the financial and order data in the context to provide actionable business advice. If context is empty, generate realistic hypothetical advice for a bakery.
ALWAYS respond with a JSON object. Set state to "ready", action to null.
Populate the "insights" object exactly like this:
{ "type": "bakery_coach", "revenue": ..., "profit": ..., "bestSellers": ["..."], "weakProducts": ["..."], "advice": "..." }`,

    briefing: `\n\nMODE: Daily Bakery Briefing
Generate a comprehensive morning briefing covering:
- Today's orders count and expected revenue (use COMPUTED BUSINESS SUMMARY)
- Pending payments total (use COMPUTED BUSINESS SUMMARY)
- Low stock items (inventory items below minimum)
- Best selling product this week
- Top prioritized recommendations for today
Return insights as: { "type": "run_bakery", "summary": "...", "priorities": [{"task": "...", "reason": "...", "urgency": "high|medium|low"}] }`,

    predictive_inventory: `\n\nMODE: Predictive Inventory Ordering
Analyze the current inventory against recent or upcoming orders. Predict which ingredients will run out soon based on the products being baked.
ALWAYS respond with a JSON object. Set state to "ready", action to null. Include a button to add shortages to the shopping list.
Populate the "insights" object exactly like this:
{ "type": "predictive_inventory", "analysis": "...", "shortagesToOrder": [{"item": "...", "currentStock": "...", "neededStock": "...", "reason": "..."}] }`,

    customer_retention: `\n\nMODE: Customer Sentiment & Retention
Analyze the context.customers and context.orders. Identify VIP customers (high totalOrders or high totalSpent) who haven't ordered recently.
Draft a highly personalized, warm WhatsApp message ("We miss you") to send them, offering a small discount or highlighting a new product.
ALWAYS respond with a JSON object. Set state to "ready", action to null. Include a button to copy the message.
Populate the "insights" object exactly like this:
{ "type": "customer_retention", "analysis": "...", "vipChurnRisks": [{"name": "...", "lastOrder": "...", "totalOrders": "..."}], "suggestedMessage": "..." }`,

    health_score: `\n\nMODE: Business Health Score
Analyze the bakery's health and return a score out of 100.
Evaluate: Revenue trends, expense control, inventory waste, customer retention, pending payments, portfolio completeness.
Return insights as: { score, breakdown: { revenue, expenses, inventory, customers, payments, portfolio }, suggestions: [...] }`,

    customer_insight: `\n\nMODE: Customer Intelligence
Analyze the customer and their order history.
Return insights as: { lifetimeValue, totalOrders, favoriteProduct, avgOrderValue, repeatProbability, suggestedAction, lastOrderDate }`,

    revenue_forecast: `\n\nMODE: Revenue Forecast
Predict revenue for 7, 30, and 90 days based on historical data.
Return insights as: { forecast7d, forecast30d, forecast90d, reasoning, seasonalFactors }`,

    financial_advisor: `\n\nMODE: Financial Advisor
Analyze profitability and expenses.
Return insights as: { mostProfitable, leastProfitable, expenseLeaks, optimizations, overallMargin }`,

    order_risk: `\n\nMODE: Order Acceptance Engine
Analyze if a new order can be accepted based on workload, schedule, and inventory.
Return insights as: { recommendation: "accept"|"reject"|"caution", reasons: [...], conflicts: [...], missingIngredients: [...] }`,

    inventory_intel: `\n\nMODE: Inventory Intelligence
Analyze current inventory levels and predict needs.
Return insights as: { healthScore, lowStockItems: [...], purchaseSuggestions: [...], consumptionForecast: [...] }`,

    expiry_guardian: `\n\nMODE: Expiry Guardian
Track and alert about expiring inventory items.
Return insights as: { expiringItems: [{ item, expiresIn, quantity, moneyAtRisk }], totalRisk, urgentItems }`,

    waste_prevention: `\n\nMODE: Waste Prevention
Suggest products to make with soon-expiring ingredients.
Return insights as: { expiringIngredients: [...], suggestedProducts: [...], estimatedWasteReduction }`,

    smart_search: `\n\nMODE: Smart Search
Parse the natural language query and filter the provided data.
Return matching results in insights as: { results: [...], resultType: "orders"|"customers"|"products"|"expenses", totalCount }`,

    sales_coach: `\n\nMODE: Sales Coach
Analyze sales trends and provide coaching.
Return insights as: { risingProducts: [...], fallingProducts: [...], seasonalOpportunities: [...], promotionIdeas: [...] }`,

    menu_optimizer: `\n\nMODE: Menu Optimizer
Analyze menu performance and suggest changes.
Return insights as: { removeProducts: [...], promoteProducts: [...], addProducts: [...], reasoning }`,

    portfolio_coach: `\n\nMODE: Portfolio Coach
Analyze bakery portfolio completeness.
Return insights as: { completionPercent, missingCategories: [...], missingPhotos: [...], improvements: [...] }`,

    content_studio: `\n\nMODE: Content Studio
Generate social media content for bakery products.
Return insights as: { caption, hashtags: [...], reelScript, storyIdeas: [...], campaignIdea }`,

    run_bakery: `\n\nMODE: Run My Bakery (Flagship)
Analyze EVERYTHING and generate a prioritized daily task list.
Return insights as: { priorities: [{ task, reason, urgency: "high"|"medium"|"low" }], summary }`,
  };

  return basePrompt + (featurePrompts[feature] || featurePrompts.companion) + summaryStr + contextStr;
}

// Build user message for auto-triggered features (briefing, health score, etc.)
function buildFeatureMessage(feature, context) {
  const messages = {
    briefing: 'Generate my daily bakery briefing for today.',
    health_score: 'Calculate my bakery business health score.',
    revenue_forecast: 'Forecast my revenue for the next 7, 30, and 90 days.',
    financial_advisor: 'Analyze my bakery finances and profitability.',
    inventory_intel: 'Analyze my current inventory health.',
    expiry_guardian: 'Check for any expiring inventory items.',
    waste_prevention: 'Suggest products to make with expiring ingredients.',
    sales_coach: 'Give me sales coaching based on my recent trends.',
    menu_optimizer: 'Analyze my menu and suggest optimizations.',
    portfolio_coach: 'Evaluate my bakery portfolio completeness.',
    run_bakery: 'What should I focus on today? Give me my prioritized task list.',
  };
  return messages[feature] || 'Help me with my bakery.';
}

// Catch-all route to serve the frontend (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🧁 Cream & Crust server running on port ${PORT}`);
    console.log(`Serving static files from ${path.join(__dirname, 'dist')}`);
  });
}

export default app;
