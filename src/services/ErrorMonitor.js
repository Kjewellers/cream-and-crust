/**
 * ErrorMonitor.js — Production-grade Global Error Monitoring for Cream & Crust.
 *
 * Captures EVERY error source:
 *   - window.onerror (global JS)
 *   - window.onunhandledrejection (Promise)
 *   - React Error Boundary (component crash)
 *   - API failures (fetch interceptor)
 *   - Firebase errors (Firestore, Auth)
 *   - Capacitor plugin errors
 *   - AI request failures
 *   - Navigation failures
 *   - Permission failures
 *
 * Each error record contains rich metadata:
 *   timestamp, platform, appVersion, uid, deviceModel, androidVersion,
 *   currentRoute, module, apiEndpoint, httpStatus, firebaseCode,
 *   pluginName, stackTrace, message, severity
 *
 * Offline-first: stores in localStorage queue, auto-flushes to Firestore.
 * Also forwards to Firebase Crashlytics on Android for native crash reporting.
 */

import Platform from '../platform/Platform.js';

// ─── Constants ──────────────────────────────────────────────────
const MAX_QUEUE = 200;
const MAX_LOGS = 500;
const STORAGE_KEY = 'cc_error_queue';
const LOGS_KEY = 'cc_monitor_logs';
const FLUSH_INTERVAL = 30000; // 30 seconds
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.1.21';

// ─── Severity Levels ────────────────────────────────────────────
export const SEVERITY = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// ─── Error Categories ───────────────────────────────────────────
export const CATEGORY = {
  JS_ERROR: 'js_error',
  PROMISE_REJECTION: 'promise_rejection',
  REACT_CRASH: 'react_crash',
  API_FAILURE: 'api_failure',
  FIREBASE_ERROR: 'firebase_error',
  CAPACITOR_ERROR: 'capacitor_error',
  AI_FAILURE: 'ai_failure',
  NAVIGATION_ERROR: 'navigation_error',
  PERMISSION_ERROR: 'permission_error',
  DB_ERROR: 'db_error',
  AUTH_ERROR: 'auth_error',
  NETWORK_ERROR: 'network_error',
};

// ─── User-Friendly Messages ─────────────────────────────────────
const FRIENDLY_MESSAGES = {
  [CATEGORY.NETWORK_ERROR]: '📶 Connection lost. Please check your internet.',
  [CATEGORY.API_FAILURE]: '⚙️ Something went wrong. Please try again.',
  [CATEGORY.FIREBASE_ERROR]: '⚙️ We couldn\'t complete that action. Please retry.',
  [CATEGORY.AI_FAILURE]: '🤖 AI is temporarily busy. Try again in a moment.',
  [CATEGORY.PERMISSION_ERROR]: '🔐 Permission needed. Please allow access in settings.',
  [CATEGORY.AUTH_ERROR]: '🔑 Authentication issue. Please log in again.',
  [CATEGORY.DB_ERROR]: '💾 Data operation failed. Please try again.',
  default: '😔 Something unexpected happened. Please try again.',
};

// ─── In-Memory State ────────────────────────────────────────────
let _uid = null;
let _currentRoute = '/';
let _isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let _flushTimer = null;
let _initialized = false;
let _uidInterval = null;

// Ring buffer for live developer logs
const _liveLogs = [];
const _apiLogs = [];
const _aiLogs = [];

// ─── Device Info (cached once) ──────────────────────────────────
function getDeviceInfo() {
  const ua = navigator?.userAgent || 'unknown';
  const platform = Platform.isAndroid() ? 'android' : 'web';

  // Extract Android version
  let androidVersion = null;
  const androidMatch = ua.match(/Android\s([\d.]+)/);
  if (androidMatch) androidVersion = androidMatch[1];

  // Extract device model
  let deviceModel = null;
  const modelMatch = ua.match(/;\s([^;)]+)\sBuild/);
  if (modelMatch) deviceModel = modelMatch[1].trim();

  return { platform, androidVersion, deviceModel, userAgent: ua.slice(0, 300) };
}

// ─── Build Error Record ─────────────────────────────────────────
function buildErrorRecord(error, category, severity, extra = {}) {
  const device = getDeviceInfo();
  const now = new Date();

  return {
    // Timing
    timestamp: now.toISOString(),
    epochMs: now.getTime(),

    // Identity
    uid: _uid,
    appVersion: APP_VERSION,

    // Device
    platform: device.platform,
    androidVersion: device.androidVersion,
    deviceModel: device.deviceModel,
    userAgent: device.userAgent,

    // Location
    currentRoute: _currentRoute,
    module: extra.module || deriveModule(_currentRoute),

    // Error
    category,
    severity,
    message: String(error?.message || error || 'Unknown error').slice(0, 500),
    stack: String(error?.stack || '').slice(0, 2000),
    name: error?.name || 'Error',

    // Context
    apiEndpoint: extra.apiEndpoint || null,
    httpStatus: extra.httpStatus || null,
    firebaseCode: extra.firebaseCode || null,
    pluginName: extra.pluginName || null,
    latencyMs: extra.latencyMs || null,
    payloadSize: extra.payloadSize || null,
    retryCount: extra.retryCount || 0,
    componentStack: extra.componentStack || null,

    // State
    isOnline: _isOnline,
    memoryUsage: performance?.memory?.usedJSHeapSize || null,

    // Flags
    uploaded: false,
  };
}

function deriveModule(route) {
  if (!route || route === '/') return 'dashboard';
  const seg = route.split('/').filter(Boolean)[0];
  return seg || 'unknown';
}

// ─── Local Storage Queue ────────────────────────────────────────
function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch { /* storage full — drop oldest */ }
}

function enqueueError(record) {
  const queue = loadQueue();
  queue.push(record);
  saveQueue(queue);
}

// ─── Live Logs Ring Buffer ──────────────────────────────────────
function pushLog(type, data) {
  const entry = { type, ts: new Date().toISOString(), ...data };
  _liveLogs.push(entry);
  if (_liveLogs.length > MAX_LOGS) _liveLogs.shift();

  // Also save to localStorage for persistence
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(_liveLogs.slice(-200)));
  } catch { /* best effort */ }
}

// ─── Flush to Firestore ─────────────────────────────────────────
async function flushToFirestore() {
  if (!_isOnline) return;

  const queue = loadQueue();
  const pending = queue.filter(r => !r.uploaded);
  if (pending.length === 0) return;

  try {
    const [{ db }, { collection, addDoc, serverTimestamp }] = await Promise.all([
      import('./firebase.js'),
      import('firebase/firestore'),
    ]);

    // Batch upload (max 10 at a time to avoid rate limits)
    const batch = pending.slice(0, 10);
    await Promise.allSettled(
      batch.map(record =>
        addDoc(collection(db, 'error_reports'), {
          ...record,
          uploaded: true,
          serverTimestamp: serverTimestamp(),
        })
      )
    );

    // Mark uploaded
    const uploadedIds = new Set(batch.map(r => r.epochMs));
    const updated = queue.map(r =>
      uploadedIds.has(r.epochMs) ? { ...r, uploaded: true } : r
    );
    saveQueue(updated);
  } catch {
    // Firestore flush failed — will retry next interval
  }
}

// ─── Forward to Crashlytics (Android) ───────────────────────────
async function forwardToCrashlytics(record) {
  if (!Platform.isAndroid()) return;

  try {
    const { FirebaseCrashlytics } = await import('@capacitor-firebase/crashlytics');

    // Set custom keys for rich context
    await FirebaseCrashlytics.setCustomKey({ key: 'category', value: record.category, type: 'string' }).catch(() => {});
    await FirebaseCrashlytics.setCustomKey({ key: 'route', value: record.currentRoute || '/', type: 'string' }).catch(() => {});
    await FirebaseCrashlytics.setCustomKey({ key: 'module', value: record.module || 'unknown', type: 'string' }).catch(() => {});
    if (record.apiEndpoint) {
      await FirebaseCrashlytics.setCustomKey({ key: 'apiEndpoint', value: record.apiEndpoint, type: 'string' }).catch(() => {});
    }
    if (record.httpStatus) {
      await FirebaseCrashlytics.setCustomKey({ key: 'httpStatus', value: String(record.httpStatus), type: 'string' }).catch(() => {});
    }

    // Log the message
    await FirebaseCrashlytics.log({ message: `[${record.category}] ${record.message}` }).catch(() => {});

    // Record non-fatal for errors, fatal crash for fatal
    if (record.severity === SEVERITY.FATAL) {
      await FirebaseCrashlytics.crash({ message: record.message }).catch(() => {});
    } else {
      await FirebaseCrashlytics.recordException({
        message: record.message,
        stackTrace: record.stack || undefined,
      }).catch(() => {});
    }
  } catch {
    // Crashlytics forwarding is best-effort
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize the global error monitoring system.
 * Call ONCE at app startup (in main.jsx), BEFORE React renders.
 */
export function initErrorMonitor(getUid) {
  if (_initialized) return;
  _initialized = true;

  // 1. Global JS Errors
  window.addEventListener('error', (event) => {
    if (!event.error && event.message === 'Script error.') return;

    const record = buildErrorRecord(
      event.error || new Error(event.message || 'Global JS Error'),
      CATEGORY.JS_ERROR,
      SEVERITY.ERROR,
      { module: deriveModule(_currentRoute) }
    );
    captureError(record);
  });

  // 2. Unhandled Promise Rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason ?? 'Unhandled Promise Rejection'));

    const record = buildErrorRecord(error, CATEGORY.PROMISE_REJECTION, SEVERITY.ERROR);
    captureError(record);
  });

  // 3. Online/Offline tracking
  window.addEventListener('online', () => {
    _isOnline = true;
    pushLog('network', { status: 'online' });
    // Auto-flush queued errors when back online
    flushToFirestore();
  });
  window.addEventListener('offline', () => {
    _isOnline = false;
    pushLog('network', { status: 'offline' });
  });

  // 4. UID resolver
  if (getUid) {
    try { _uid = getUid(); } catch { _uid = null; }
    // Re-check every 10s in case user logs in later
    _uidInterval = setInterval(() => {
      try { _uid = getUid(); } catch { _uid = null; }
    }, 10000);
  }

  // 5. Auto-flush timer
  _flushTimer = setInterval(flushToFirestore, FLUSH_INTERVAL);

  // 6. Flush on page unload
  window.addEventListener('beforeunload', () => {
    flushToFirestore();
  });

  pushLog('system', { message: 'ErrorMonitor initialized', version: APP_VERSION });
}

/**
 * Central capture function. All error paths converge here.
 */
export function captureError(record) {
  // Console output
  console.error(`[ErrorMonitor:${record.category}]`, record.message);

  // Push to live logs
  pushLog('error', {
    category: record.category,
    severity: record.severity,
    message: record.message,
    route: record.currentRoute,
    apiEndpoint: record.apiEndpoint,
    httpStatus: record.httpStatus,
  });

  // Enqueue for Firestore upload
  enqueueError(record);

  // Forward to Crashlytics on Android
  forwardToCrashlytics(record);
}

/**
 * Capture a React component crash (called from AppErrorBoundary).
 */
export function captureReactCrash(error, info, uid) {
  _uid = uid || _uid;
  const record = buildErrorRecord(error, CATEGORY.REACT_CRASH, SEVERITY.FATAL, {
    componentStack: info?.componentStack?.slice(0, 2000),
  });
  captureError(record);
}

/**
 * Capture an API failure with full request/response metadata.
 */
export function captureAPIError(error, details = {}) {
  const record = buildErrorRecord(error, CATEGORY.API_FAILURE, SEVERITY.ERROR, {
    apiEndpoint: details.endpoint,
    httpStatus: details.status,
    latencyMs: details.latencyMs,
    payloadSize: details.payloadSize,
    retryCount: details.retryCount || 0,
  });
  captureError(record);

  // Also push to API logs
  _apiLogs.push({
    ts: new Date().toISOString(),
    endpoint: details.endpoint,
    method: details.method,
    status: details.status,
    latencyMs: details.latencyMs,
    error: record.message,
  });
  if (_apiLogs.length > 100) _apiLogs.shift();
}

/**
 * Log a successful API call (for the developer console).
 */
export function logAPISuccess(details = {}) {
  _apiLogs.push({
    ts: new Date().toISOString(),
    endpoint: details.endpoint,
    method: details.method,
    status: details.status,
    latencyMs: details.latencyMs,
    success: true,
  });
  if (_apiLogs.length > 100) _apiLogs.shift();

  pushLog('api', {
    endpoint: details.endpoint,
    status: details.status,
    latencyMs: details.latencyMs,
  });
}

/**
 * Capture a Firebase/Firestore error.
 */
export function captureFirebaseError(error, context = {}) {
  const code = error?.code || error?.message || '';
  const record = buildErrorRecord(error, CATEGORY.FIREBASE_ERROR, SEVERITY.ERROR, {
    firebaseCode: code,
    module: context.module || 'firestore',
  });
  captureError(record);
}

/**
 * Capture a Capacitor plugin error.
 */
export function capturePluginError(error, pluginName) {
  const record = buildErrorRecord(error, CATEGORY.CAPACITOR_ERROR, SEVERITY.WARNING, {
    pluginName,
  });
  captureError(record);
}

/**
 * Capture an AI request failure.
 */
export function captureAIError(error, details = {}) {
  const record = buildErrorRecord(error, CATEGORY.AI_FAILURE, SEVERITY.ERROR, {
    apiEndpoint: details.endpoint || '/api/ai/chat',
    httpStatus: details.status,
    latencyMs: details.latencyMs,
  });
  captureError(record);

  _aiLogs.push({
    ts: new Date().toISOString(),
    endpoint: details.endpoint,
    status: details.status,
    latencyMs: details.latencyMs,
    provider: details.provider,
    error: record.message,
  });
  if (_aiLogs.length > 50) _aiLogs.shift();
}

/**
 * Log a successful AI call.
 */
export function logAISuccess(details = {}) {
  _aiLogs.push({
    ts: new Date().toISOString(),
    endpoint: details.endpoint,
    status: details.status || 200,
    latencyMs: details.latencyMs,
    provider: details.provider,
    success: true,
  });
  if (_aiLogs.length > 50) _aiLogs.shift();

  pushLog('ai', {
    endpoint: details.endpoint,
    latencyMs: details.latencyMs,
    provider: details.provider,
  });
}

/**
 * Capture an auth error.
 */
export function captureAuthError(error, context = {}) {
  const record = buildErrorRecord(error, CATEGORY.AUTH_ERROR, SEVERITY.ERROR, {
    firebaseCode: error?.code,
    module: 'auth',
  });
  captureError(record);
}

/**
 * Capture a permission error.
 */
export function capturePermissionError(error, permissionType) {
  const record = buildErrorRecord(error, CATEGORY.PERMISSION_ERROR, SEVERITY.WARNING, {
    pluginName: permissionType,
  });
  captureError(record);
}

/**
 * Update the current route (call from router listener).
 */
export function setCurrentRoute(route) {
  _currentRoute = route;
}

/**
 * Update the current user UID.
 */
export function setMonitorUID(uid) {
  _uid = uid;
}

/**
 * Get a user-friendly error message for a given category.
 */
export function getFriendlyMessage(category) {
  return FRIENDLY_MESSAGES[category] || FRIENDLY_MESSAGES.default;
}

/**
 * Get all live logs (for Developer Debug Screen).
 */
export function getLiveLogs() {
  return [..._liveLogs];
}

/**
 * Get API call logs (for Developer Debug Screen).
 */
export function getAPILogs() {
  return [..._apiLogs];
}

/**
 * Get AI request logs (for Developer Debug Screen).
 */
export function getAILogs() {
  return [..._aiLogs];
}

/**
 * Get error queue (for Developer Debug Screen).
 */
export function getErrorQueue() {
  return loadQueue();
}

/**
 * Get crash history (errors only, sorted newest first).
 */
export function getCrashHistory() {
  return loadQueue()
    .filter(r => r.severity === SEVERITY.FATAL || r.severity === SEVERITY.ERROR)
    .sort((a, b) => b.epochMs - a.epochMs)
    .slice(0, 50);
}

/**
 * Clear all local error data.
 */
export function clearErrorData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LOGS_KEY);
    _liveLogs.length = 0;
    _apiLogs.length = 0;
    _aiLogs.length = 0;
  } catch { /* best effort */ }
}

/**
 * Force flush pending errors to Firestore.
 */
export { flushToFirestore as forceFlush };

/**
 * Tear down the error monitor (for tests and hot-reload cleanup).
 * Clears the flush interval and UID polling interval.
 */
export function destroyErrorMonitor() {
  if (_flushTimer) { clearInterval(_flushTimer); _flushTimer = null; }
  if (_uidInterval) { clearInterval(_uidInterval); _uidInterval = null; }
  _initialized = false;
}

// ═══════════════════════════════════════════════════════════════
// BACKWARDS-COMPAT SHIMS (previously in crashReporting.js)
//
// These allow AppErrorBoundary and other callers to continue
// importing from their existing import paths while the source of
// truth is now ErrorMonitor.js.  crashReporting.js is a thin
// re-export layer that will be removed in a future cleanup.
// ═══════════════════════════════════════════════════════════════

/**
 * Write a crash report directly to the `crash_reports` Firestore collection.
 * Used by AppErrorBoundary for React render crashes.
 *
 * This replaces the identically-named function in crashReporting.js.
 * All errors are now also captured by the standard ErrorMonitor pipeline
 * so there is no duplication.
 *
 * @param {Error|null} error
 * @param {{ type?: string, componentStack?: string, uid?: string }} context
 */
export async function logCrashToFirestore(error, context = {}) {
  // Route through the unified captureError pipeline
  const record = buildErrorRecord(
    error || new Error('Unknown render crash'),
    CATEGORY.REACT_CRASH,
    SEVERITY.ERROR,
    { componentStack: context.componentStack }
  );
  // Override uid from context if provided (boundary may have fresher value)
  if (context.uid) record.uid = context.uid;
  captureError(record);

  // Also write directly to crash_reports collection for backwards compat
  // with DevConsole queries that read that collection.
  try {
    const [{ db }, { collection, addDoc, serverTimestamp }] = await Promise.all([
      import('./firebase.js'),
      import('firebase/firestore'),
    ]);
    await addDoc(collection(db, 'crash_reports'), {
      message: record.message.slice(0, 500),
      stack: record.stack.slice(0, 2000),
      type: context.type || 'react_boundary',
      url: window.location?.pathname || 'unknown',
      userAgent: navigator?.userAgent?.slice(0, 300) || 'unknown',
      timestamp: serverTimestamp(),
      uid: context.uid || _uid || null,
      appVersion: APP_VERSION,
      resolved: false,
    });
  } catch {
    // Crash reporter itself must never throw
  }
}

/**
 * No-op shim. ErrorMonitor.initErrorMonitor() already attaches these
 * listeners. Calling this a second time would create duplicate handlers.
 *
 * Kept for backwards compat with main.jsx — the call is safe and silent.
 * Remove once main.jsx is updated to not call this.
 *
 * @deprecated — use initErrorMonitor() instead (already called by StartupManager)
 */
export function attachGlobalCrashListeners(_getUid) {
  // Intentionally empty — listeners are already registered by initErrorMonitor.
  // This shim prevents a "not a function" error if old code still calls it.
}

