import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { URL } from 'url';
import dns from 'dns/promises';
import net from 'net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
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

// ─── AUTH MIDDLEWARE (Firebase ID Token verification) ─────────
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase Admin not initialized — cannot verify tokens' });
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.uid = decodedToken.uid;
    next();
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
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

// Catch-all route to serve the frontend (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🧁 Cream & Crust server running on port ${PORT}`);
  console.log(`Serving static files from ${path.join(__dirname, 'dist')}`);
});
