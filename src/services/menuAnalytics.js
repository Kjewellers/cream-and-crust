import { db } from './firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════
// MENU ANALYTICS SERVICE
// Centralized event tracking for the public menu website.
// Every event writes to `analytics_events` in Firestore.
// ═══════════════════════════════════════════════════════════════════

/** All supported menu analytics event types. */
export const MENU_EVENTS = Object.freeze({
  MENU_VIEW: 'menu_view',
  CATEGORY_VIEW: 'category_view',
  PRODUCT_VIEW: 'product_view',
  PRODUCT_EXPAND: 'product_expand',
  PRODUCT_IMAGE_VIEW: 'product_image_view',
  PRODUCT_SHARE: 'product_share',
  WHATSAPP_CLICK: 'whatsapp_click',
  INSTAGRAM_CLICK: 'instagram_click',
  CALL_CLICK: 'call_click',
  ORDER_STARTED: 'order_started',
  ORDER_COMPLETED: 'order_completed',
  CHECKOUT_ABANDONED: 'checkout_abandoned',
  MENU_PUBLISHED: 'menu_published',
  MENU_UPDATED: 'menu_updated',
});

const VALID_EVENT_TYPES = new Set(Object.values(MENU_EVENTS));

// ═══════════════════════════════════════════════════════════════════
// VISITOR / SESSION IDENTIFICATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Persistent visitor ID stored in localStorage.
 * Persists across sessions, only generated once per device/browser.
 */
export function getVisitorId() {
  if (typeof window === 'undefined') return 'unknown';
  let vid = localStorage.getItem('cc_visitor_id');
  if (!vid) {
    vid = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('cc_visitor_id', vid);
  }
  return vid;
}

/**
 * Session ID stored in sessionStorage.
 * New session on every tab/window open.
 */
export function getSessionId() {
  if (typeof window === 'undefined') return 'unknown';
  let sid = sessionStorage.getItem('cc_session_id');
  if (!sid) {
    sid = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('cc_session_id', sid);
  }
  return sid;
}

/**
 * Detect traffic source from URL params or document.referrer.
 */
export function getTrafficSource() {
  if (typeof window === 'undefined') return 'unknown';
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref') || urlParams.get('utm_source');

  if (ref) return ref.toLowerCase();

  const referrer = document.referrer.toLowerCase();
  if (referrer.includes('instagram.com')) return 'instagram';
  if (referrer.includes('facebook.com')) return 'facebook';
  if (referrer.includes('whatsapp.com') || referrer.includes('wa.me')) return 'whatsapp';
  if (referrer.includes('google.com') || referrer.includes('google.co.in')) return 'google';
  if (referrer.includes('youtube.com')) return 'youtube';
  if (referrer.includes('twitter.com') || referrer.includes('x.com')) return 'twitter';

  if (referrer && !referrer.includes(window.location.hostname)) return 'referral';

  return 'direct';
}

function getDevicePlatform() {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
  return 'desktop';
}

function getDeviceOS() {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)) return 'macos';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Win32|Win64|Windows|WinCE/.test(ua)) return 'windows';
  if (/Android/.test(ua)) return 'android';
  if (/Linux/.test(ua)) return 'linux';
  return 'other';
}

// ═══════════════════════════════════════════════════════════════════
// GEOLOCATION (best-effort, IP-based)
// ═══════════════════════════════════════════════════════════════════

let _geoCache = null;

/**
 * Attempt to detect city/state/country from IP.
 * Uses free ipapi.co API. Result is cached for the session.
 */
async function getGeoLocation() {
  if (_geoCache) return _geoCache;
  try {
    // Check session cache first
    const cached = sessionStorage.getItem('cc_geo');
    if (cached) {
      _geoCache = JSON.parse(cached);
      return _geoCache;
    }
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    _geoCache = {
      city: data.city || null,
      state: data.region || null,
      country: data.country_name || null,
      countryCode: data.country_code || null,
    };
    sessionStorage.setItem('cc_geo', JSON.stringify(_geoCache));
    return _geoCache;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// EVENT TRACKING
// ═══════════════════════════════════════════════════════════════════

/**
 * Track a menu-related event.
 * @param {string} eventType e.g., 'menu_view', 'product_view', 'whatsapp_click'
 * @param {string} bakeryId The bakery owner's UID (required for multi-tenant isolation)
 * @param {string} menuId The ID of the menu being viewed
 * @param {string} productId Optional ID of the product being interacted with
 * @param {Object} extraPayload Additional data (revenue, source, etc.)
 * @returns {Promise<boolean>} Whether the event was successfully queued
 */
export async function trackEvent(eventType, bakeryId, menuId, productId = null, extraPayload = {}) {
  console.log('[Analytics Event]', eventType, bakeryId, menuId, productId, extraPayload);
  if (!bakeryId) {
    console.warn('trackEvent: bakeryId is required');
    return false;
  }

  if (!VALID_EVENT_TYPES.has(eventType)) {
    console.warn(`trackEvent: unknown event type "${eventType}"`);
    return false;
  }

  try {
    const eventsRef = collection(db, 'analytics_events');
    const source = extraPayload.source || getTrafficSource();
    const visitorId = getVisitorId();
    const sessionId = getSessionId();

    // Attempt geo lookup (non-blocking, best-effort)
    let geo = _geoCache;
    if (!geo) {
      // Fire geo lookup in background, don't block event
      getGeoLocation().catch(() => {});
    }

    const eventDoc = {
      // CRITICAL: 'uid' field is required by Firestore security rules
      uid: bakeryId,
      bakeryId,
      menuId: menuId || 'default',
      productId: productId || null,
      eventType,
      visitorId,
      sessionId,
      source,
      devicePlatform: getDevicePlatform(),
      deviceOS: getDeviceOS(),
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
      // Geo data (may be null on first event of session)
      city: geo?.city || extraPayload.city || null,
      state: geo?.state || extraPayload.state || null,
      country: geo?.country || extraPayload.country || null,
      // Spread any additional payload (revenue, etc.)
      ...extraPayload,
    };

    // Remove any undefined values (Firestore rejects them)
    Object.keys(eventDoc).forEach(key => eventDoc[key] === undefined && delete eventDoc[key]);

    // Write to Firestore with error logging
    addDoc(eventsRef, eventDoc).catch((err) => {
      console.error(`[MenuAnalytics] Failed to write ${eventType} event:`, err?.code || err?.message);
    });

    return true;
  } catch (error) {
    console.error('[MenuAnalytics] Failed to track event:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// DATA FETCHING — RAW EVENTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch raw analytics events for a bakery.
 * Used as fallback when aggregated data is not available.
 */
export async function getMenuEvents(bakeryId) {
  try {
    const q = query(
      collection(db, 'analytics_events'),
      where('bakeryId', '==', bakeryId),
    );

    const snap = await getDocs(q);
    const events = [];
    snap.forEach(d => {
      const data = d.data();
      events.push({
        id: d.id,
        ...data,
        date: data.timestamp?.toDate ? data.timestamp.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
      });
    });

    return events;
  } catch (error) {
    console.error('[MenuAnalytics] Failed to get events:', error);
    return [];
  }
}

/**
 * Fetch last N raw events for debug panel.
 */
export async function getRecentMenuEvents(bakeryId, count = 100) {
  try {
    const q = query(
      collection(db, 'analytics_events'),
      where('bakeryId', '==', bakeryId),
      orderBy('timestamp', 'desc'),
      limit(count),
    );

    const snap = await getDocs(q);
    const events = [];
    snap.forEach(d => {
      const data = d.data();
      events.push({
        id: d.id,
        ...data,
        date: data.timestamp?.toDate ? data.timestamp.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
      });
    });

    return events;
  } catch (error) {
    console.error('[MenuAnalytics] Failed to get recent events:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// DATA FETCHING — AGGREGATED COLLECTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Subscribe to the analytics summary document for a bakery.
 * Returns an unsubscribe function.
 */
export function subscribeToAnalyticsSummary(bakeryId, callback) {
  const docRef = doc(db, 'analytics_summary', bakeryId);
  return onSnapshot(docRef, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  }, (err) => {
    console.error('[MenuAnalytics] Summary subscription error:', err);
    callback(null);
  });
}

/**
 * Get aggregated product analytics for a bakery.
 */
export async function getProductAnalytics(bakeryId) {
  try {
    const q = query(
      collection(db, 'analytics_products'),
      where('bakeryId', '==', bakeryId),
    );
    const snap = await getDocs(q);
    const products = [];
    snap.forEach(d => products.push({ id: d.id, ...d.data() }));
    return products;
  } catch (error) {
    console.error('[MenuAnalytics] Failed to get product analytics:', error);
    return [];
  }
}

/**
 * Get analytics health status for a bakery.
 * Checks if events are being received and aggregation is working.
 */
export async function getAnalyticsHealth(bakeryId) {
  const health = {
    menuTracking: false,
    productTracking: false,
    whatsappTracking: false,
    orderAttribution: false,
    aggregation: false,
    dashboardQueries: false,
    lastEventAt: null,
    totalEvents: 0,
  };

  try {
    // Check if any events exist
    const recentQ = query(
      collection(db, 'analytics_events'),
      where('bakeryId', '==', bakeryId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const recentSnap = await getDocs(recentQ);
    if (!recentSnap.empty) {
      const lastEvent = recentSnap.docs[0].data();
      health.lastEventAt = lastEvent.timestamp?.toDate ? lastEvent.timestamp.toDate() : null;
      health.menuTracking = true;
    }

    // Count total events
    const allQ = query(
      collection(db, 'analytics_events'),
      where('bakeryId', '==', bakeryId),
    );
    const allSnap = await getDocs(allQ);
    health.totalEvents = allSnap.size;

    // Check for different event types
    const eventTypes = new Set();
    allSnap.forEach(d => eventTypes.add(d.data().eventType));
    health.productTracking = eventTypes.has('product_view') || eventTypes.has('product_expand');
    health.whatsappTracking = eventTypes.has('whatsapp_click');
    health.orderAttribution = eventTypes.has('order_completed');

    // Check if aggregation doc exists
    const summaryRef = doc(db, 'analytics_summary', bakeryId);
    const summarySnap = await getDoc(summaryRef);
    health.aggregation = summarySnap.exists();

    // If we got this far, queries work
    health.dashboardQueries = true;

  } catch (error) {
    console.error('[MenuAnalytics] Health check failed:', error);
  }

  return health;
}
