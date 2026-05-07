import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Initialize Firebase Admin using Service Account JSON from ENV
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: Object.keys(serviceAccount).length ? admin.credential.cert(serviceAccount) : undefined,
      projectId: 'cream-and-crust'
    });
  } catch (e) {
    console.error('Firebase Admin Init Error:', e.message);
  }
}
const dbAdmin = admin.firestore();

// Razorpay Config
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_oHh2O0wW2w2w2w',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'W2w2w2w2w2w2w2w2w2w2w2w2'
});
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'creamandcrust_secret_123';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

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

      if (userId) {
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

// ─── MULTER CONFIG ───────────────────────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public/uploads'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// DB helpers
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// ─── PRODUCTS ────────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const db = readDB();
  res.json(db.products);
});

app.post('/api/products', (req, res) => {
  const db = readDB();
  const product = { ...req.body, id: Date.now() };
  db.products.push(product);
  writeDB(db);
  res.json(product);
});

app.put('/api/products/:id', (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  db.products = db.products.map(p => p.id === id ? { ...p, ...req.body } : p);
  writeDB(db);
  res.json(db.products.find(p => p.id === id));
});

app.delete('/api/products/:id', (req, res) => {
  const db = readDB();
  db.products = db.products.filter(p => p.id !== Number(req.params.id));
  writeDB(db);
  res.json({ success: true });
});

// ─── ORDERS ──────────────────────────────────────────────────
app.get('/api/orders', (req, res) => {
  const db = readDB();
  res.json(db.orders);
});

app.post('/api/orders', (req, res) => {
  const db = readDB();
  const order = {
    ...req.body,
    id: `CC-${String(db.orders.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
  };
  db.orders.unshift(order);

  // upsert customer
  const ci = db.customers.findIndex(c => c.phone === order.customer.phone);
  if (ci >= 0) {
    db.customers[ci].totalOrders += 1;
    db.customers[ci].totalSpent += order.total;
    db.customers[ci].lastOrder = order.createdAt.split('T')[0];
  } else {
    db.customers.push({
      id: Date.now(),
      name: order.customer.name,
      phone: order.customer.phone,
      address: order.customer.address || '',
      totalOrders: 1,
      totalSpent: order.total,
      lastOrder: order.createdAt.split('T')[0],
    });
  }

  writeDB(db);
  res.json(order);
});

app.put('/api/orders/:id', (req, res) => {
  const db = readDB();
  db.orders = db.orders.map(o => o.id === req.params.id ? { ...o, ...req.body } : o);
  writeDB(db);
  res.json(db.orders.find(o => o.id === req.params.id));
});

app.delete('/api/orders/:id', (req, res) => {
  const db = readDB();
  db.orders = db.orders.filter(o => o.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// ─── CUSTOMERS ───────────────────────────────────────────────
app.get('/api/customers', (req, res) => {
  const db = readDB();
  res.json(db.customers);
});

app.put('/api/customers/:id', (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  db.customers = db.customers.map(c => c.id === id ? { ...c, ...req.body } : c);
  writeDB(db);
  res.json(db.customers.find(c => c.id === id));
});

app.delete('/api/customers/:id', (req, res) => {
  const db = readDB();
  db.customers = db.customers.filter(c => c.id !== Number(req.params.id));
  writeDB(db);
  res.json({ success: true });
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
app.get('/api/analytics', (req, res) => {
  const db = readDB();
  const orders = db.orders;
  const today = new Date().toISOString().split('T')[0];

  const todayOrders = orders.filter(o => (o.createdAt || o.date || '').startsWith(today));
  const totalRevenue = orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);

  // last 7 days revenue
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOrders = orders.filter(o => (o.createdAt || o.date || '').startsWith(dateStr));
    last7.push({
      date: dateStr,
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      count: dayOrders.length,
    });
  }

  // top products
  const productCount = {};
  orders.forEach(o => {
    o.items?.forEach(item => {
      productCount[item.name] = (productCount[item.name] || 0) + item.qty;
    });
  });
  const topProducts = Object.entries(productCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  res.json({
    todayOrders: todayOrders.length,
    todayRevenue: todayOrders.reduce((s, o) => s + o.total, 0),
    totalOrders: orders.length,
    totalRevenue,
    totalCustomers: db.customers.length,
    totalProducts: db.products.length,
    pendingOrders: orders.filter(o => o.status === 'new' || o.status === 'confirmed').length,
    last7,
    topProducts,
    ordersByStatus: {
      new: orders.filter(o => o.status === 'new').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      'in-progress': orders.filter(o => o.status === 'in-progress').length,
      ready: orders.filter(o => o.status === 'ready').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
    },
  });
});

app.listen(PORT, () => console.log(`🧁 Cream & Crust server running on http://localhost:${PORT}`));

