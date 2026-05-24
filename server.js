import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import admin from 'firebase-admin';
import Razorpay from 'razorpay';

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

// Razorpay Config
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_oHh2O0wW2w2w2w',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'W2w2w2w2w2w2w2w2w2w2w2w2'
});
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'creamandcrust_secret_123';

app.use(cors());
app.use(express.json());

// Serve static files from the 'dist' directory (Vite build)
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'public/uploads'))); // Dual path for flexibility

// ─── PAYMENTS ────────────────────────────────────────────────
app.post('/api/payments/create-subscription', async (req, res) => {
  try {
    const { userId, planId } = req.body;
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId || process.env.RAZORPAY_PLAN_ID,
      customer_notify: 1,
      total_count: 12,
      notes: { userId }
    });
    res.json(subscription);
  } catch (error) {
    console.error('Razorpay subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

app.post('/api/payments/webhook', async (req, res) => {
  const secret = WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (signature === digest) {
    const { event, payload } = req.body;

    if (event === 'subscription.activated' || event === 'subscription.charged') {
      const subscription = payload.subscription.entity;
      const userId = subscription.notes?.userId;

      if (userId && dbAdmin) {
        await dbAdmin.collection('subscriptions').doc(userId).set({
          plan: 'pro',
          status: 'active',
          subscriptionId: subscription.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`User ${userId} upgraded to PRO via webhook`);
      }
    }
    res.json({ status: 'ok' });
  } else {
    res.status(400).json({ status: 'invalid signature' });
  }
});

// ─── RAPIDO LOGISTICS API ────────────────────────────────────
app.post('/api/rapido/book', async (req, res) => {
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

    // Call Real Rapido API
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
app.get('/api/products', async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    const snapshot = await dbAdmin.collection('products').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    const docRef = await dbAdmin.collection('products').add({ ...req.body, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ id: docRef.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    await dbAdmin.collection('products').doc(req.params.id).update(req.body);
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    await dbAdmin.collection('products').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── ORDERS ──────────────────────────────────────────────────
app.get('/api/orders', async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    const snapshot = await dbAdmin.collection('orders').orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    
    // Generate order ID
    const countSnapshot = await dbAdmin.collection('metadata').doc('counters').get();
    let orderCount = 1;
    if (countSnapshot.exists()) {
      orderCount = (countSnapshot.data().orderCount || 0) + 1;
    }
    await dbAdmin.collection('metadata').doc('counters').set({ orderCount }, { merge: true });
    
    const orderId = `CC-${String(orderCount).padStart(3, '0')}`;
    const orderData = {
      ...req.body,
      orderId, // Display ID
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const docRef = await dbAdmin.collection('orders').add(orderData);
    
    // Upsert customer
    const customersRef = dbAdmin.collection('customers');
    const customerSnapshot = await customersRef.where('phone', '==', orderData.customer.phone).get();
    
    if (!customerSnapshot.empty) {
      const customerDoc = customerSnapshot.docs[0];
      await customerDoc.ref.update({
        totalOrders: admin.firestore.FieldValue.increment(1),
        totalSpent: admin.firestore.FieldValue.increment(orderData.total),
        lastOrder: new Date().toISOString().split('T')[0]
      });
    } else {
      await customersRef.add({
        name: orderData.customer.name,
        phone: orderData.customer.phone,
        address: orderData.customer.address || '',
        totalOrders: 1,
        totalSpent: orderData.total,
        lastOrder: new Date().toISOString().split('T')[0],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.json({ id: docRef.id, ...orderData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    await dbAdmin.collection('orders').doc(req.params.id).update(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    await dbAdmin.collection('orders').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── CUSTOMERS ───────────────────────────────────────────────
app.get('/api/customers', async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    const snapshot = await dbAdmin.collection('customers').get();
    const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── AUTH ────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === 'creamandcrust2026') {
    res.json({ success: true, token: 'admin-token-cc' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// ─── ANALYTICS ───────────────────────────────────────────────
app.get('/api/analytics', async (req, res) => {
  try {
    if (!dbAdmin) return res.status(500).json({ error: 'Database not initialized' });
    
    const ordersSnapshot = await dbAdmin.collection('orders').get();
    const orders = ordersSnapshot.docs.map(doc => doc.data());
    const customersSnapshot = await dbAdmin.collection('customers').get();
    const productsSnapshot = await dbAdmin.collection('products').get();

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

// ─── RECIPE SCRAPER (WEB IMPORTER) ─────────────────────────
app.post('/api/scrape-recipe', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // Fetch the HTML of the target URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch the URL');
    
    const html = await response.text();
    
    // Naive regex to extract JSON-LD (Schema.org) blocks
    // In production, use cheerio, but this is extremely fast and effective for JSON-LD.
    const jsonLdRegex = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let recipeData = null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        // Handle array or object
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

    // Extract standardized data
    const name = recipeData.name || '';
    const ingredientsRaw = recipeData.recipeIngredient || [];
    
    // Parse ingredients to fit our DB schema { name, qty, unit }
    const ingredients = ingredientsRaw.map(ing => {
      // Basic heuristic: first number is qty, second word is unit
      const parts = ing.split(' ');
      const qty = parseFloat(parts[0]) ? parts[0] : '1';
      return {
        name: ing,
        qty,
        unit: 'unit',
        cost: 0
      };
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

    // Handle image URLs (can be string or object/array)
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
    console.error('Recipe scrape error:', error);
    res.status(500).json({ error: 'Internal server error scraping recipe' });
  }
});

// Catch-all route to serve the frontend (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🧁 Cream & Crust SaaS server running on port ${PORT}`);
  console.log(`Serving static files from ${path.join(__dirname, 'dist')}`);
});

