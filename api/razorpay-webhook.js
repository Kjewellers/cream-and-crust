import crypto from 'crypto';
import admin from 'firebase-admin';

// Initialize Firebase Admin using Service Account JSON from ENV
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    // Fix for potential multiline private key issues in Vercel
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.error('Firebase Admin Init Error:', e);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { event, payload } = req.body;

  try {
    if (event === 'subscription.activated' || event === 'subscription.charged') {
      const subscription = payload.subscription.entity;
      const userId = subscription.notes.userId;

      if (userId) {
        await db.collection('subscriptions').doc(userId).set({
          plan: 'pro',
          status: 'active',
          subscriptionId: subscription.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log(`User ${userId} subscription activated: ${subscription.id}`);
      }
    } else if (event === 'subscription.cancelled' || event === 'subscription.expired') {
      const subscription = payload.subscription.entity;
      const userId = subscription.notes.userId;

      if (userId) {
        await db.collection('subscriptions').doc(userId).update({
          status: 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
}
