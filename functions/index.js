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
 * Deprecated: purchases are validated by RevenueCat and mirrored by
 * revenueCatWebhook only. This endpoint must not grant premium access.
 */
exports.validatePlaySubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to validate a subscription.');
  }

  await admin.firestore().collection('audit_logs').add({
    action: 'deprecated_validate_play_subscription_called',
    uid: context.auth.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  throw new functions.https.HttpsError(
    'failed-precondition',
    'Google Play purchases are validated by RevenueCat CustomerInfo/webhooks only.'
  );
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
      expiration_at_ms,
      purchased_at_ms,
      store,
      entitlement_ids,
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
    const expiryDate = expiration_at_ms > 0
      ? admin.firestore.Timestamp.fromMillis(expiration_at_ms)
      : null;
    const purchaseDate = purchased_at_ms > 0
      ? admin.firestore.Timestamp.fromMillis(purchased_at_ms)
      : null;
    const entitlementName = Array.isArray(entitlement_ids) && entitlement_ids.length
      ? entitlement_ids[0]
      : 'premium';

    if (ACTIVE_EVENTS.includes(type)) {

      await userRef.set({
        subscription: {
          status: 'active',
          productId: product_id || null,
          planId: product_id || 'pro_monthly',
          purchaseDate,
          expiryDate,
          store: store || 'PLAY_STORE',
          entitlementName,
          source: 'revenuecat_webhook',
          activatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSync: admin.firestore.FieldValue.serverTimestamp(),
          rcEventType: type,
        }
      }, { merge: true });

      console.log(`[webhook] ${type} → uid=${uid} plan=${product_id} active until ${expiration_at_ms}`);

    } else if (INACTIVE_EVENTS.includes(type)) {
      await userRef.set({
        subscription: {
          status: type === 'BILLING_ISSUE' ? 'billing_issue' : 'not_subscribed',
          productId: product_id || null,
          planId: product_id || 'pro_monthly',
          purchaseDate,
          expiryDate,
          store: store || 'PLAY_STORE',
          entitlementName,
          source: 'revenuecat_webhook',
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSync: admin.firestore.FieldValue.serverTimestamp(),
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
 * ── Enterprise Notification Engine v2.0 (Cloud Functions) ───────────────────
 */

/** Helper: Check Quiet Hours (10 PM - 7 AM default) */
function isQuietHoursNowServer(prefs) {
  if (!prefs || !prefs.quietHoursEnabled) return false;
  const now = new Date();
  const hours = now.getHours();
  return hours >= 22 || hours < 7;
}

/** Helper: Send Push Notification to Multi-Device FCM Tokens */
async function sendMultiDevicePush(userId, payload, category = 'system', priority = 'NORMAL') {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return null;

    const userData = userDoc.data();
    const tokens = userData.fcmTokens && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0
      ? userData.fcmTokens
      : (userData.fcmToken ? [userData.fcmToken] : []);

    if (tokens.length === 0) {
      console.log(`[PushEngine] No tokens registered for user ${userId}`);
      return null;
    }

    // Check User Notification Preferences & Quiet Hours
    const prefSnap = await db.collection('users').doc(userId).collection('settings').doc('notificationPreferences').get();
    const prefs = prefSnap.exists() ? prefSnap.data() : {};

    if (priority !== 'CRITICAL') {
      if (category && prefs[category] === false) {
        console.log(`[PushEngine] Category ${category} muted by user ${userId}`);
        return null;
      }
      if (isQuietHoursNowServer(prefs)) {
        console.log(`[PushEngine] Quiet hours active for user ${userId}, suppressing push`);
        return null;
      }
    }

    const multicastMessage = {
      tokens: tokens,
      notification: payload.notification,
      data: {
        ...payload.data,
        category: category,
        priority: priority,
      },
      android: {
        priority: priority === 'CRITICAL' ? 'high' : 'normal',
        notification: {
          channelId: payload.channelId || 'orders_channel',
          sound: prefs.sound !== false ? 'default' : null,
          color: '#B5606A',
          icon: 'ic_stat_notification',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: prefs.sound !== false ? 'default' : null,
            badge: 1,
          },
        },
      },
    };

    if (payload.collapseKey) {
      multicastMessage.android.collapseKey = payload.collapseKey;
      multicastMessage.apns.headers = { 'apns-collapse-id': payload.collapseKey };
    }

    const response = await admin.messaging().sendEachForMulticast(multicastMessage);
    console.log(`[PushEngine] Sent push to ${tokens.length} devices for user ${userId}:`, response.successCount, 'successes');
    return response;
  } catch (err) {
    console.error('[PushEngine] Error sending multi-device push:', err);
    return null;
  }
}

/**
 * Firestore Trigger: onOrderCreated
 * Fires when a new order document is created in `orders/{orderId}`.
 */
exports.onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;
    const userId = order.bakeryId || order.userId || order.ownerId;
    if (!userId) return null;

    const payload = {
      notification: {
        title: '🧁 New Order Received!',
        body: `Order #${orderId.slice(-4)} • ${order.customerName || 'Customer'} • ₹${order.total || 0}`,
      },
      data: {
        type: 'NEW_ORDER',
        orderId: orderId,
        total: String(order.total || 0),
        customerName: String(order.customerName || ''),
      },
      channelId: 'orders_channel',
    };

    // Save notification to Firestore notification center
    await admin.firestore().collection('notifications').add({
      userId: userId,
      title: payload.notification.title,
      message: payload.notification.body,
      type: 'NEW_ORDER',
      orderId: orderId,
      read: false,
      archived: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return sendMultiDevicePush(userId, payload, 'orders', 'CRITICAL');
  });

/**
 * Firestore Trigger: onOrderStatusUpdated (Update-in-Place & Live Activity Progress)
 * Fires on `orders/{orderId}` mutations. Uses collapse_key to update notification in place.
 */
exports.onOrderStatusUpdated = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === after.status) return null;

    const orderId = context.params.orderId;
    const userId = after.bakeryId || after.userId || after.ownerId;
    if (!userId) return null;

    const STAGE_LABELS = {
      pending: 'Order Received 📋',
      preparing: 'Prepping Ingredients 🥣',
      baking: 'Baking in Oven 🧁',
      out_for_delivery: 'Out for Delivery 🛵',
      ready: 'Ready for Pickup 🛍️',
      completed: 'Completed ✨',
    };

    const statusText = STAGE_LABELS[after.status] || after.status;

    const payload = {
      notification: {
        title: `Order #${orderId.slice(-4)} Progress`,
        body: `${statusText} • ${after.customerName || 'Customer'}`,
      },
      data: {
        type: 'ORDER_STATUS',
        orderId: orderId,
        status: after.status,
      },
      channelId: 'live_activity_channel',
      collapseKey: `order_status_${orderId}`, // Updates existing notification in place
    };

    // Log notification in Notification Center
    await admin.firestore().collection('notifications').add({
      userId: userId,
      title: payload.notification.title,
      message: payload.notification.body,
      type: 'ORDER_STATUS',
      orderId: orderId,
      read: false,
      archived: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return sendMultiDevicePush(userId, payload, 'orderStatus', 'NORMAL');
  });

/**
 * Firestore Trigger: onLowStockDetected (Anti-Spam Grouping)
 * Fires when inventory document is updated with low stock.
 */
exports.onLowStockDetected = functions.firestore
  .document('inventory/{itemId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data();
    const isLow = Number(after.stock) <= Number(after.minStock || 0);
    if (!isLow) return null;

    const userId = after.userId || after.ownerId;
    if (!userId) return null;

    const payload = {
      notification: {
        title: '⚠️ Low Stock Alert',
        body: `"${after.item}" is down to ${after.stock} ${after.unit || 'units'}!`,
      },
      data: {
        type: 'LOW_STOCK',
        itemId: context.params.itemId,
        itemName: String(after.item || ''),
      },
      channelId: 'inventory_channel',
      collapseKey: 'low_stock_group', // Group multiple inventory alerts together
    };

    return sendMultiDevicePush(userId, payload, 'lowInventory', 'NORMAL');
  });

/**
 * General Trigger: onNotificationCreated
 */
exports.onNotificationCreated = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const userId = data.userId || data.uid;
    if (!userId) return null;

    const payload = {
      notification: {
        title: data.title || 'Cream & Crust',
        body: data.message || data.body || 'New notification',
      },
      data: {
        type: data.type || 'general',
        link: data.link || '',
        orderId: data.orderId || '',
      },
      channelId: data.channelId || 'system_channel',
    };

    return sendMultiDevicePush(userId, payload, data.category || 'system', data.priority || 'NORMAL');
  });

/**
 * Delivery Analytics Tracker
 */
exports.trackNotificationDelivery = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { notificationId, action } = data; // 'delivered' | 'opened' | 'dismissed'
  await admin.firestore().collection('notification_analytics').add({
    userId: context.auth.uid,
    notificationId,
    action,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { success: true };
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
