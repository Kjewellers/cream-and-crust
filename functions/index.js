const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Scheduled Function: backupFirestore
 * Runs every day at 2:00 AM.
 * Exports the entire Firestore database to a dedicated Google Cloud Storage bucket.
 */
exports.backupFirestore = functions.pubsub
  .schedule('every day 02:00')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
      // You must create a GCS bucket named `gs://YOUR_PROJECT_ID-backups`
      const bucketName = `gs://${projectId}-backups`;
      const timestamp = new Date().toISOString();
      
      const client = new admin.firestore.v1.FirestoreAdminClient();
      const databaseName = client.databasePath(projectId, '(default)');
      
      const response = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: `${bucketName}/${timestamp}`,
        // Leave collectionIds empty to export all collections
        collectionIds: [] 
      });
      
      console.log(`Successfully initiated Firestore backup to ${bucketName}/${timestamp}`, response);
      return { success: true };
    } catch (err) {
      console.error('Failed to initiate Firestore backup', err);
      // We throw the error so it shows up in Google Cloud Error Reporting/Crashlytics
      throw new functions.https.HttpsError('internal', 'Backup Failed', err);
    }
  });

/**
 * HTTP Callable Function: validatePlaySubscription
 * Validates a Google Play Billing purchase token via the Google Play Developer API.
 * This is a highly secure endpoint invoked by the client after a purchase.
 */
exports.validatePlaySubscription = functions.https.onCall(async (data, context) => {
  // 1. Ensure user is authenticated (Firebase App Check enforces this if enabled)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to validate a subscription.');
  }

  const { purchaseToken, subscriptionId } = data;
  if (!purchaseToken || !subscriptionId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing purchase token or subscription ID.');
  }

  try {
    const uid = context.auth.uid;
    // In a production environment, you would use googleapis package:
    // const { google } = require('googleapis');
    // const androidPublisher = google.androidpublisher('v3');
    // await androidPublisher.purchases.subscriptions.get({ ... })
    
    // For local testing & scaffold, we simulate a successful Google API response
    // (A full implementation requires a Service Account Key with Google Play Console access)
    
    // TODO: Connect `googleapis` here when Play Console is active.
    const isMockValid = purchaseToken.length > 10; 
    
    if (isMockValid) {
      // 2. Mark subscription as active in Firestore user document
      const userRef = admin.firestore().collection('users').doc(uid);
      await userRef.set({
        subscription: {
          status: 'active',
          planId: subscriptionId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          // mock expiry date (+30 days)
          expiryDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
        }
      }, { merge: true });

      // Write to audit log
      await admin.firestore().collection('audit_logs').add({
        action: 'subscription_activated',
        uid: uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: { plan: subscriptionId }
      });

      return { status: 'success', active: true };
    } else {
      throw new functions.https.HttpsError('invalid-argument', 'Purchase token is invalid.');
    }
  } catch (error) {
    console.error('Subscription validation error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to validate subscription.', error);
  }
});

/**
 * RevenueCat Webhook — revenueCatWebhook
 *
 * RevenueCat calls this HTTPS endpoint on every billing event:
 *   INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION,
 *   BILLING_ISSUE, SUBSCRIBER_ALIAS, etc.
 *
 * Setup in RevenueCat dashboard:
 *   Project → Integrations → Webhooks → Add URL:
 *   https://us-central1-cream-and-crust.cloudfunctions.net/revenueCatWebhook
 *   Authorization header: set via `firebase functions:config:set revenuecat.webhook_secret="YOUR_SECRET"`
 *
 * The app_user_id in RevenueCat is the Firebase UID (set in initPurchases).
 */
exports.revenueCatWebhook = functions.https.onRequest(async (req, res) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Verify the shared secret header RevenueCat sends
  const secret = functions.config().revenuecat?.webhook_secret;
  if (secret) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== secret) {
      console.warn('[webhook] Unauthorized request — bad secret');
      return res.status(401).send('Unauthorized');
    }
  }

  try {
    const event = req.body?.event;
    if (!event) {
      return res.status(400).send('Missing event body');
    }

    const {
      type,                    // e.g. "INITIAL_PURCHASE", "RENEWAL", "CANCELLATION"
      app_user_id,             // This is the Firebase UID we set in initPurchases()
      product_id,              // e.g. "pro_monthly"
      expiration_at_ms,        // Unix ms — when the entitlement expires
      store,                   // "PLAY_STORE"
    } = event;

    // app_user_id is the Firebase UID
    const uid = app_user_id;
    if (!uid) {
      return res.status(400).send('Missing app_user_id');
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);

    const ACTIVE_EVENTS = ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE'];
    const INACTIVE_EVENTS = ['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE'];

    if (ACTIVE_EVENTS.includes(type)) {
      const expiryDate = expiration_at_ms
        ? admin.firestore.Timestamp.fromMillis(expiration_at_ms)
        : null;

      await userRef.set({
        subscription: {
          status: 'active',
          planId: product_id || 'pro_monthly',
          expiryDate,
          store: store || 'PLAY_STORE',
          activatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          rcEventType: type,
        }
      }, { merge: true });

      console.log(`[webhook] ${type} → uid=${uid} plan=${product_id} active until ${expiration_at_ms}`);

    } else if (INACTIVE_EVENTS.includes(type)) {
      await userRef.set({
        subscription: {
          status: type === 'BILLING_ISSUE' ? 'billing_issue' : 'expired',
          planId: product_id || 'pro_monthly',
          expiryDate: expiration_at_ms
            ? admin.firestore.Timestamp.fromMillis(expiration_at_ms)
            : null,
          store: store || 'PLAY_STORE',
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          rcEventType: type,
        }
      }, { merge: true });

      console.log(`[webhook] ${type} → uid=${uid} — subscription deactivated`);

      // 🚨 Add Billing Issue / Expiration Notification 🚨
      if (type === 'BILLING_ISSUE') {
        await db.collection('notifications').add({
          userId: uid,
          type: 'billing_alert',
          title: 'Action Required: Billing Issue',
          message: 'There is a billing issue with your Pro subscription. Please update your payment method.',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else if (type === 'EXPIRATION' || type === 'CANCELLATION') {
        await db.collection('notifications').add({
          userId: uid,
          type: 'billing_alert',
          title: 'Subscription Ended',
          message: 'Your Pro subscription has ended. You can renew at any time from Settings.',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

    } else {
      // Non-critical events (e.g. SUBSCRIBER_ALIAS) — log and ignore
      console.log(`[webhook] Unhandled event type: ${type} for uid=${uid}`);
    }

    // Write to audit log for every event
    await db.collection('audit_logs').add({
      action: `rc_${type.toLowerCase()}`,
      uid,
      planId: product_id,
      store,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).send('OK');
  } catch (err) {
    console.error('[webhook] Error processing RevenueCat event:', err);
    return res.status(500).send('Internal Server Error');
  }
});

/**
 * Firestore Trigger: onNotificationCreated
 * Listens for new documents in the `notifications` collection and sends a
 * Firebase Cloud Messaging (FCM) push notification to the targeted user.
 */
exports.onNotificationCreated = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    // The notification must target a specific user (the bakery owner)
    const userId = data.userId || data.uid;
    if (!userId) {
      console.log('No userId found in notification, skipping push.');
      return null;
    }

    try {
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.log(`User ${userId} not found, skipping push.`);
        return null;
      }

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;
      
      if (!fcmToken) {
        console.log(`User ${userId} does not have an fcmToken registered, skipping push.`);
        return null;
      }

      const payload = {
        notification: {
          title: data.title || 'Cream & Crust',
          body: data.message || data.body || 'You have a new notification'
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          type: data.type || 'general',
          // Optional payload data
          link: data.link || '',
          orderId: data.orderId || ''
        },
        token: fcmToken
      };

      const response = await admin.messaging().send(payload);
      console.log(`Successfully sent push notification to user ${userId}:`, response);
      return { success: true, response };
      
    } catch (error) {
      console.error('Error sending push notification:', error);
      return null;
    }
  });

/**
 * HTTP Callable Function: resetPasswordWithPhone
 * Allows users who have verified their phone number via Firebase Phone Auth
 * to reset the password of their main Email/Password account.
 */
exports.resetPasswordWithPhone = functions.https.onCall(async (data, context) => {
  // 1. Ensure the user is authenticated (they must be signed in via Phone Auth)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to reset your password.'
    );
  }

  // 2. Extract their verified phone number from their Auth token
  const phoneNumber = context.auth.token.phone_number;
  if (!phoneNumber) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You must verify your phone number first.'
    );
  }

  const { newPassword } = data;
  if (!newPassword || newPassword.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Password must be at least 6 characters long.'
    );
  }

  const tempUid = context.auth.uid;

  try {
    const db = admin.firestore();
    
    // 3. Find the main user account associated with this phone number
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone', '==', phoneNumber).limit(1).get();

    if (snapshot.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'No account is linked to this verified phone number.'
      );
    }

    const mainUserDoc = snapshot.docs[0];
    const mainUid = mainUserDoc.id;

    // 4. Update the password of the main account
    await admin.auth().updateUser(mainUid, {
      password: newPassword,
    });

    // 5. Optional cleanup: delete the temporary Phone Auth account to keep Firebase clean
    if (mainUid !== tempUid) {
      try {
        await admin.auth().deleteUser(tempUid);
        console.log(`Cleaned up temporary phone auth user: ${tempUid}`);
      } catch (cleanupErr) {
        console.warn(`Failed to cleanup temp user ${tempUid}:`, cleanupErr);
      }
    }

    console.log(`Successfully reset password via Phone Auth for main UID: ${mainUid}`);
    return { success: true, mainUid };

  } catch (error) {
    console.error('Error resetting password with phone:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Failed to reset password.',
      error
    );
  }
});

/**
 * Scheduled Function: dailyMorningBriefing
 * Runs every day at 8:00 AM Asia/Kolkata
 */
exports.dailyMorningBriefing = functions.pubsub
  .schedule('every day 08:00')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];

    try {
      // Find all users who have an FCM token
      const usersSnap = await db.collection('users').where('fcmToken', '!=', null).get();
      
      const batch = db.batch();
      let notificationCount = 0;

      for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        
        // Count orders due today for this user
        const ordersSnap = await db.collection('orders')
          .where('userId', '==', uid)
          .where('deliveryDate', '==', todayStr)
          .where('status', 'not-in', ['completed', 'cancelled'])
          .get();

        if (!ordersSnap.empty) {
          const count = ordersSnap.size;
          const notifRef = db.collection('notifications').doc();
          batch.set(notifRef, {
            userId: uid,
            type: 'daily_briefing',
            title: 'Good morning! ☀️',
            message: `You have ${count} order${count > 1 ? 's' : ''} due today. Tap to view your schedule.`,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          notificationCount++;
        }
      }

      if (notificationCount > 0) {
        await batch.commit();
      }
      console.log(`Dispatched ${notificationCount} morning briefings.`);
      return null;
    } catch (e) {
      console.error('Error in dailyMorningBriefing:', e);
      return null;
    }
  });

/**
 * Scheduled Function: weeklyAnalyticsDigest
 * Runs every Monday at 9:00 AM Asia/Kolkata
 */
exports.weeklyAnalyticsDigest = functions.pubsub
  .schedule('every monday 09:00')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const usersSnap = await db.collection('users').where('fcmToken', '!=', null).get();
      const batch = db.batch();
      let notificationCount = 0;

      for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        
        // Get completed orders in last 7 days
        // Note: Requires a composite index on (userId, status, createdAt)
        const ordersSnap = await db.collection('orders')
          .where('userId', '==', uid)
          .where('status', '==', 'completed')
          .where('createdAt', '>=', sevenDaysAgo.toISOString())
          .get();

        if (!ordersSnap.empty) {
          const count = ordersSnap.size;
          let totalRevenue = 0;
          ordersSnap.forEach(doc => {
            const data = doc.data();
            totalRevenue += Number(data.total) || 0;
          });

          if (totalRevenue > 0) {
            const notifRef = db.collection('notifications').doc();
            batch.set(notifRef, {
              userId: uid,
              type: 'weekly_digest',
              title: 'Weekly Analytics 📈',
              message: `Great work! You completed ${count} orders and earned ₹${totalRevenue.toLocaleString()} last week.`,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            notificationCount++;
          }
        }
      }

      if (notificationCount > 0) {
        await batch.commit();
      }
      console.log(`Dispatched ${notificationCount} weekly digests.`);
      return null;
    } catch (e) {
      console.error('Error in weeklyAnalyticsDigest:', e);
      return null;
    }
  });

/**
 * Firestore Trigger: onInventoryUpdated
 * Monitors inventory stock and sends low-stock alerts.
 */
exports.onInventoryUpdated = functions.firestore
  .document('inventory/{itemId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    const lowStockThreshold = 5; // Default threshold

    const beforeStock = Number(beforeData.stock || 0);
    const afterStock = Number(afterData.stock || 0);

    // Only alert if it JUST crossed the threshold downwards
    if (beforeStock >= lowStockThreshold && afterStock < lowStockThreshold) {
      const db = admin.firestore();
      const uid = afterData.uid || afterData.userId;
      const itemName = afterData.item || afterData.name || 'An item';

      if (!uid) return null;

      try {
        await db.collection('notifications').add({
          userId: uid,
          type: 'inventory_alert',
          title: '⚠️ Low Stock Alert',
          message: `You only have ${afterStock} left of ${itemName}. Time to restock!`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Low stock alert sent for ${itemName} (uid: ${uid})`);
      } catch (e) {
        console.error('Error sending inventory alert:', e);
      }
    }
    return null;
  });

// ═══════════════════════════════════════════════════════════════════
// MENU ANALYTICS — Real-time Aggregation
// ═══════════════════════════════════════════════════════════════════

/**
 * Firestore Trigger: onMenuEventCreated
 * Fires on every new document in `menu_events`.
 * Incrementally updates aggregation collections so the dashboard
 * reads pre-computed data instead of scanning all raw events.
 */
exports.onMenuEventCreated = functions.firestore
  .document('analytics_events/{eventId}')
  .onCreate(async (snap, context) => {
    const event = snap.data();
    const bakeryId = event.uid || event.bakeryId;
    if (!bakeryId) {
      console.warn('[analytics] Event missing bakeryId/uid, skipping aggregation.');
      return null;
    }

    const db = admin.firestore();
    const eventType = event.eventType || '';
    const productId = event.productId || null;
    const productName = event.productName || null;
    const visitorId = event.visitorId || null;
    const source = event.source || 'unknown';
    const city = event.city || null;
    const state = event.state || null;
    const country = event.country || null;
    const revenue = Number(event.revenue) || 0;
    const devicePlatform = event.devicePlatform || 'unknown';

    // Get hour from timestamp or createdAt
    let hour = 0;
    if (event.timestamp && event.timestamp.toDate) {
      hour = event.timestamp.toDate().getHours();
    } else if (event.createdAt) {
      hour = new Date(event.createdAt).getHours();
    }

    const increment = admin.firestore.FieldValue.increment(1);
    const incrementRevenue = admin.firestore.FieldValue.increment(revenue);
    const arrayUnion = admin.firestore.FieldValue.arrayUnion;
    const now = admin.firestore.FieldValue.serverTimestamp();

    const batch = db.batch();

    // ── 1. Summary Collection ────────────────────────────────────────
    const summaryRef = db.collection('analytics_summary').doc(bakeryId);
    const summaryUpdate = {
      bakeryId,
      uid: bakeryId,
      lastUpdated: now,
      totalEvents: increment,
    };

    if (eventType === 'menu_view') {
      summaryUpdate.totalMenuViews = increment;
      summaryUpdate[`devices.${devicePlatform}`] = increment;
    }
    if (eventType === 'product_view') summaryUpdate.totalProductViews = increment;
    if (eventType === 'product_expand') summaryUpdate.totalProductOpens = increment;
    if (eventType === 'whatsapp_click') summaryUpdate.totalWhatsappClicks = increment;
    if (eventType === 'instagram_click') summaryUpdate.totalInstagramClicks = increment;
    if (eventType === 'call_click') summaryUpdate.totalCallClicks = increment;
    if (eventType === 'order_started') summaryUpdate.totalOrdersStarted = increment;
    if (eventType === 'order_completed') {
      summaryUpdate.totalOrdersCompleted = increment;
      summaryUpdate.totalRevenue = incrementRevenue;
    }
    if (eventType === 'checkout_abandoned') summaryUpdate.totalCheckoutsAbandoned = increment;

    // Track unique visitors via array (for small-medium bakeries)
    if (visitorId && eventType === 'menu_view') {
      summaryUpdate.uniqueVisitors = arrayUnion(visitorId);
    }

    batch.set(summaryRef, summaryUpdate, { merge: true });

    // ── 2. Product Analytics ─────────────────────────────────────────
    if (productId && ['product_view', 'product_expand', 'whatsapp_click', 'instagram_click', 'order_completed'].includes(eventType)) {
      const productDocId = `${bakeryId}_${productId}`;
      const productRef = db.collection('analytics_products').doc(productDocId);
      const productUpdate = {
        bakeryId,
        uid: bakeryId,
        productId,
        lastUpdated: now,
      };
      if (productName) productUpdate.productName = productName;

      if (eventType === 'product_view') productUpdate.views = increment;
      if (eventType === 'product_expand') productUpdate.opens = increment;
      if (eventType === 'whatsapp_click') productUpdate.whatsappClicks = increment;
      if (eventType === 'instagram_click') productUpdate.instagramClicks = increment;
      if (eventType === 'order_completed') {
        productUpdate.orders = increment;
        productUpdate.revenue = incrementRevenue;
      }

      batch.set(productRef, productUpdate, { merge: true });
    }

    // ── 3. Peak Hours ────────────────────────────────────────────────
    if (['menu_view', 'order_completed', 'whatsapp_click'].includes(eventType)) {
      const hoursRef = db.collection('analytics_peak_hours').doc(bakeryId);
      const hourField = `hours.${hour}`;
      batch.set(hoursRef, {
        bakeryId,
        uid: bakeryId,
        [hourField]: increment,
        lastUpdated: now,
      }, { merge: true });
    }

    // ── 4. Cities / Geo ──────────────────────────────────────────────
    if (city && eventType === 'menu_view') {
      const cityDocId = `${bakeryId}_${city.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
      const cityRef = db.collection('analytics_cities').doc(cityDocId);
      batch.set(cityRef, {
        bakeryId,
        uid: bakeryId,
        city,
        state: state || null,
        country: country || null,
        views: increment,
        lastUpdated: now,
      }, { merge: true });
    }

    // ── 5. Traffic Sources ───────────────────────────────────────────
    if (eventType === 'menu_view' && source) {
      const sourcesRef = db.collection('analytics_sources').doc(bakeryId);
      const sourceField = `sources.${source.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const sourceUpdateObj = {
        bakeryId,
        uid: bakeryId,
        [sourceField]: increment,
        lastUpdated: now,
      };
      // Also track source-level orders and revenue
      if (eventType === 'order_completed') {
        sourceUpdateObj[`orders.${source.replace(/[^a-zA-Z0-9]/g, '_')}`] = increment;
        sourceUpdateObj[`revenue.${source.replace(/[^a-zA-Z0-9]/g, '_')}`] = incrementRevenue;
      }
      batch.set(sourcesRef, sourceUpdateObj, { merge: true });
    }
    // Track source for order events too
    if (eventType === 'order_completed' && source) {
      const sourcesRef = db.collection('analytics_sources').doc(bakeryId);
      batch.set(sourcesRef, {
        bakeryId,
        uid: bakeryId,
        [`orders.${source.replace(/[^a-zA-Z0-9]/g, '_')}`]: increment,
        [`revenue.${source.replace(/[^a-zA-Z0-9]/g, '_')}`]: incrementRevenue,
        lastUpdated: now,
      }, { merge: true });
    }

    // ── 6. Customer Insights ─────────────────────────────────────────
    if (visitorId && eventType === 'menu_view') {
      const customerRef = db.collection('analytics_customers').doc(bakeryId);
      batch.set(customerRef, {
        bakeryId,
        uid: bakeryId,
        allVisitors: arrayUnion(visitorId),
        lastUpdated: now,
      }, { merge: true });
    }

    // ── 7. Daily Snapshot ────────────────────────────────────────────
    let dateStr = 'unknown';
    if (event.timestamp && event.timestamp.toDate) {
      dateStr = event.timestamp.toDate().toISOString().split('T')[0];
    } else if (event.createdAt) {
      dateStr = event.createdAt.split('T')[0];
    }
    if (dateStr !== 'unknown') {
      const dailyDocId = `${bakeryId}_${dateStr}`;
      const dailyRef = db.collection('analytics_daily').doc(dailyDocId);
      const dailyUpdate = {
        bakeryId,
        uid: bakeryId,
        date: dateStr,
        lastUpdated: now,
      };
      if (eventType === 'menu_view') dailyUpdate.views = increment;
      if (eventType === 'product_view') dailyUpdate.productViews = increment;
      if (eventType === 'whatsapp_click') dailyUpdate.whatsappClicks = increment;
      if (eventType === 'instagram_click') dailyUpdate.instagramClicks = increment;
      if (eventType === 'order_completed') {
        dailyUpdate.orders = increment;
        dailyUpdate.revenue = incrementRevenue;
      }
      if (visitorId && eventType === 'menu_view') {
        dailyUpdate.uniqueVisitors = arrayUnion(visitorId);
      }
      batch.set(dailyRef, dailyUpdate, { merge: true });
    }

    try {
      await batch.commit();
      console.log(`[analytics] Aggregated ${eventType} for bakery ${bakeryId}`);
    } catch (err) {
      console.error('[analytics] Aggregation batch failed:', err);
    }

    return null;
  });
