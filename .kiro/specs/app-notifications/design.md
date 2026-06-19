# Design Document: App Notifications

## Overview

This design completes the end-to-end push notification system for Cream & Crust. The existing codebase has partial infrastructure: Firestore-based in-app notifications with a real-time subscription, a bell icon with unread count, an FCM send endpoint on the Express server, and a service worker with placeholder Firebase config. This design addresses the remaining gaps:

1. **Build-time config injection** into the service worker via a Vite plugin
2. **FCM token lifecycle management** (registration, refresh, cleanup, capacity limit)
3. **Server-side notification helper** that creates Firestore documents and dispatches push in one call
4. **Event triggers** wired into existing order/inventory/payment endpoints
5. **Notification preferences** stored per-user with per-category and global toggles
6. **24-hour deduplication** for inventory alerts with 60-second batching
7. **30-day auto-cleanup** of stale notifications

The system uses a "Firestore-first" approach: every notification is persisted to Firestore (ensuring in-app visibility), and push dispatch is best-effort on top. This guarantees the Baker never misses an alert even if push delivery fails.

## Architecture

```mermaid
flowchart TD
    subgraph Client ["Client (React PWA)"]
        A[AuthContext] -->|login/logout| B[useNotifications Hook]
        B -->|getToken| C[FCM SDK]
        B -->|save/remove token| D[Firestore users/{uid}]
        E[Notifications Page] -->|subscribe| F[Firestore notifications collection]
        G[Service Worker] -->|onBackgroundMessage| H[System Notification]
        H -->|notificationclick| I[App Window Focus/Open]
    end

    subgraph Server ["Express Server"]
        J[Order Endpoints] -->|event| K[notifyHelper Module]
        L[Inventory Update] -->|event| K
        M[Payment Update] -->|event| K
        K -->|1. check prefs| N[Firestore users/{uid}.notificationPreferences]
        K -->|2. write doc| O[Firestore notifications collection]
        K -->|3. send push| P[FCM Admin SDK]
        P -->|multicast| Q[FCM Service]
        Q --> G
    end

    subgraph Build ["Build Pipeline"]
        R[Vite Build] -->|injectFirebaseConfig plugin| S[firebase-messaging-sw.js with real config]
    end
```

### Key Design Decisions

1. **Vite plugin for SW config injection** rather than URL params or a separate bundler. The plugin reads `VITE_FIREBASE_*` env vars and performs string replacement in the SW file during build. This keeps the SW as a static file (required by browsers) while avoiding hardcoded secrets in source.

2. **Server-side notification creation** rather than client-side. The existing `addNotificationToDB` in `db.js` creates notifications from the client, which works for manual triggers but can't reliably fire for server events (order creation happens on the Express server). The new `notifyHelper` module on the server handles both Firestore write and FCM dispatch atomically.

3. **Token capacity limit of 10** with FIFO eviction. This prevents unbounded token accumulation from multiple devices/browsers while supporting realistic multi-device usage.

4. **Deduplication via a `lastNotifiedAt` field** on inventory documents rather than a separate dedup collection. This avoids extra reads and leverages the existing inventory document structure.

5. **60-second batching** for inventory alerts uses a simple in-memory debounce queue on the server. Since the Express server is a single process, this is sufficient without needing Redis or a message queue.

## Components and Interfaces

### 1. Vite Plugin: `injectFirebaseConfig`

**Location:** `vite.config.js` (inline plugin)

```javascript
function injectFirebaseConfig() {
  return {
    name: 'inject-firebase-config',
    transformIndexHtml: {
      order: 'pre',
      handler() { /* no-op, we only need generateBundle */ }
    },
    generateBundle(options, bundle) {
      // Read the SW source from public/firebase-messaging-sw.js
      // Replace placeholders with VITE_FIREBASE_* env values
      // Emit as an asset in the bundle root
    }
  };
}
```

The plugin replaces `API_KEY_PLACEHOLDER`, `AUTH_DOMAIN_PLACEHOLDER`, etc. with the corresponding `process.env.VITE_FIREBASE_*` values. If a value is missing, the placeholder remains, causing Firebase init to fail gracefully (the SW catches the error).

### 2. React Hook: `useNotificationPermission`

**Location:** `src/hooks/useNotificationPermission.js`

```typescript
interface UseNotificationPermissionReturn {
  permissionState: 'default' | 'granted' | 'denied';
  requestPermission: () => Promise<void>;
  isRegistering: boolean;
}
```

**Responsibilities:**
- On mount (when user is authenticated): check `Notification.permission`
- If "granted": call `getToken()` with VAPID key, save to Firestore via `saveFCMToken`
- Expose `requestPermission()` for the "Enable Now" CTA button
- Listen for `onMessage` (foreground notifications) and show in-app toast
- On token refresh: replace old token in Firestore
- On logout (via AuthContext): remove current device token from Firestore

**Integration point:** Called in `App.jsx` or a layout wrapper component that renders after authentication is confirmed.

### 3. Server Module: `server/notifyHelper.js`

**Location:** `server/notifyHelper.js` (imported by `server.js`)

```javascript
/**
 * Creates a Firestore notification and dispatches FCM push.
 * @param {object} params
 * @param {string} params.uid - Target user ID
 * @param {string} params.type - 'order' | 'inventory' | 'payment'
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification body
 * @param {object} [params.data] - Additional data (orderId, route, etc.)
 * @returns {Promise<{notificationId: string, pushResult: object|null}>}
 */
export async function notify({ uid, type, title, message, data }) { ... }

/**
 * Formats a number as INR currency string.
 * @param {number} amount
 * @returns {string} e.g., "₹1,500"
 */
export function formatINR(amount) { ... }

/**
 * Determines the navigation route for a notification.
 * @param {object} notification - {type, data}
 * @returns {string} URL path
 */
export function getNotificationRoute(notification) { ... }

/**
 * Formats unread count for badge display.
 * @param {number} count
 * @returns {string} "0" | "1"-"99" | "99+"
 */
export function formatBadgeCount(count) { ... }
```

**Flow inside `notify()`:**
1. Read user's `notificationPreferences` from Firestore
2. If category is disabled, return early (no Firestore doc, no push)
3. Write notification document to `notifications` collection
4. Read user's `fcmTokens` array
5. If global push is disabled or no tokens, skip push
6. Send FCM multicast; on `messaging/registration-token-not-registered` errors, remove stale tokens
7. Return notification ID and push result

### 4. Server Module: `server/inventoryNotifier.js`

**Location:** `server/inventoryNotifier.js`

```javascript
/**
 * Checks if a low-stock notification should be sent and handles batching.
 * @param {string} uid - User ID
 * @param {object} item - {id, item, stock, unit, minStock, lastNotifiedAt}
 * @param {number} previousStock - Stock value before update
 * @returns {Promise<void>}
 */
export async function checkLowStock(uid, item, previousStock) { ... }
```

**Deduplication logic:**
- Each inventory document gets a `lastNotifiedAt` timestamp field
- Before creating a notification, check if `Date.now() - lastNotifiedAt < 24 * 60 * 60 * 1000`
- If within window, skip
- If stock didn't change (`previousStock === item.stock`), skip

**Batching logic:**
- In-memory map: `pendingAlerts: Map<uid, {items: [], timer: NodeJS.Timeout}>`
- When a low-stock event fires, add to the user's pending list
- Set a 60-second debounce timer
- When timer fires, if multiple items accumulated, send one summary notification
- If only one item, send individual notification

### 5. Notification Preferences API

**New endpoints on Express server:**

```
GET  /api/notifications/preferences   → returns user's preferences
PUT  /api/notifications/preferences   → updates user's preferences
```

### 6. Notification Cleanup

**Location:** Client-side in `useNotificationPermission` hook or a dedicated `useNotificationCleanup` hook.

On app session start (after auth), query notifications older than 30 days and delete them in a batch. This runs once per session using a `sessionStorage` flag to avoid repeated queries.

## Data Models

### Firestore: `users/{uid}` (extended fields)

```javascript
{
  // ... existing fields ...
  fcmTokens: [
    { token: "fcm_token_string", createdAt: "2024-01-15T10:00:00Z" }
    // Max 10 entries, FIFO eviction
  ],
  notificationPreferences: {
    pushEnabled: true,          // Global push toggle
    categories: {
      orders: true,             // New order, status change notifications
      inventory: true,          // Low stock alerts
      payments: true            // Payment received notifications
    }
  }
}
```

**Design note:** `fcmTokens` changes from a flat string array to an array of objects with `createdAt` timestamps. This enables FIFO eviction for the 10-token cap and supports "remove oldest" logic. The migration is backward-compatible: the `saveFCMToken` function checks for the old format and upgrades on write.

### Firestore: `notifications/{id}`

```javascript
{
  uid: "user_id",
  type: "order" | "inventory" | "payment",
  title: "New Order Received! 🎉",
  message: "Order CC-042 from Priya — ₹1,500",
  data: {
    orderId: "firestore_doc_id",    // for order/payment types
    items: [                         // for batched inventory alerts
      { name: "Flour", stock: 2, unit: "kg" }
    ],
    route: "/orders/firestore_doc_id" // pre-computed navigation target
  },
  read: false,
  createdAt: "2024-01-15T10:30:00.000Z"
}
```

### Firestore: `inventory/{id}` (extended fields)

```javascript
{
  // ... existing fields (item, stock, unit, minStock, uid) ...
  lastNotifiedAt: "2024-01-15T08:00:00.000Z"  // Dedup timestamp
}
```

### In-Memory: Inventory Batch Queue

```javascript
// server/inventoryNotifier.js
const pendingAlerts = new Map();
// Key: uid
// Value: { items: [{name, stock, unit}], timer: setTimeout ref }
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Background message notification construction

*For any* valid FCM message payload containing a title and body, the service worker notification construction logic SHALL produce a notification object with the payload's title (defaulting to "New Notification" if absent), the payload's body, and the icon path "/logo.png".

**Validates: Requirements 1.3**

### Property 2: Token save idempotence

*For any* token registry (array of token objects) and any FCM token string, saving that token when it already exists in the registry SHALL result in an unchanged registry (same length, same contents).

**Validates: Requirements 2.1**

### Property 3: Token refresh replacement

*For any* token registry containing an old token and any new token string, the token refresh operation SHALL produce a registry that contains the new token, does not contain the old token, and preserves all other tokens unchanged.

**Validates: Requirements 2.4**

### Property 4: Token removal preserves unaffected tokens

*For any* token registry and any token to remove, after removal the registry SHALL not contain the removed token AND all other tokens that were present before removal SHALL still be present.

**Validates: Requirements 2.5, 2.6**

### Property 5: Token array capacity invariant

*For any* token registry, after any save operation the registry length SHALL never exceed 10. When a save would exceed this limit, the token with the oldest `createdAt` timestamp SHALL be evicted.

**Validates: Requirements 2.7**

### Property 6: Notification document field correctness

*For any* order with a numeric total and a customer name, the generated notification document SHALL contain: type matching the event source ("order", "inventory", or "payment"), a title string, a message string containing the currency amount formatted as "₹" followed by en-IN locale number grouping (commas at thousand and lakh boundaries), and a data object with the relevant resource ID.

**Validates: Requirements 3.1, 3.2, 5.1, 5.2**

### Property 7: Low-stock threshold detection

*For any* inventory item where the updated stock value is less than or equal to its minStock value AND the previous stock was above minStock, the system SHALL trigger a low-stock notification. For any item where stock remains above minStock, no notification SHALL be triggered.

**Validates: Requirements 4.1**

### Property 8: Notification deduplication within time window

*For any* inventory item with a `lastNotifiedAt` timestamp, if the current time minus `lastNotifiedAt` is less than 24 hours, no new low-stock notification SHALL be created for that item. If the time difference is 24 hours or greater, a new notification SHALL be permitted.

**Validates: Requirements 4.2, 4.4**

### Property 9: Low-stock event batching

*For any* set of N (where N ≥ 2) low-stock events for the same user occurring within a 60-second window, the system SHALL produce exactly one summary notification listing all N affected items rather than N individual notifications.

**Validates: Requirements 4.3**

### Property 10: Preference filtering suppresses disabled categories

*For any* notification type and user preference configuration, if the category corresponding to that notification type is disabled in preferences, the system SHALL not create a Firestore notification document and SHALL not dispatch a push notification.

**Validates: Requirements 6.2**

### Property 11: Global push disable suppresses all push dispatch

*For any* user with `pushEnabled: false` in their notification preferences, regardless of per-category settings, the system SHALL not dispatch any FCM push notifications. Firestore notification documents SHALL still be created if the per-category setting is enabled.

**Validates: Requirements 6.3**

### Property 12: Preferences persistence round-trip

*For any* valid notification preferences object, saving it to the user's Firestore document and reading it back SHALL produce an object equal to the original.

**Validates: Requirements 6.4**

### Property 13: Notification type to route mapping

*For any* notification with type "order" and a data.orderId, the route SHALL be `/orders/{orderId}`. For type "inventory", the route SHALL be `/inventory`. For type "payment" with a data.orderId, the route SHALL be `/orders/{orderId}`.

**Validates: Requirements 7.1**

### Property 14: Unread count badge formatting

*For any* non-negative integer count, the badge display function SHALL return the count as a string for values 1 through 99, return "99+" for values greater than 99, and return an empty string (hidden badge) for 0.

**Validates: Requirements 7.4**

### Property 15: 30-day cleanup correctness

*For any* set of notifications with various `createdAt` timestamps, the cleanup function SHALL delete exactly those notifications where `now - createdAt > 30 days` and SHALL preserve all notifications where `now - createdAt ≤ 30 days`.

**Validates: Requirements 7.5**

## Error Handling

| Scenario | Handling Strategy |
|----------|-------------------|
| FCM `getToken()` fails on login | Log error, continue login flow. User sees in-app notifications but no push. |
| FCM send returns `messaging/registration-token-not-registered` | Remove stale token from user's `fcmTokens` array automatically. |
| FCM send returns network error | Log error, Firestore notification is already persisted (write happens first). |
| Firestore notification write fails | Log error, attempt push anyway (best-effort). Show error toast if triggered from client. |
| Service worker Firebase init fails (bad config) | SW catches error, logs it. Background push won't work but app functions normally. |
| `Notification.requestPermission()` returns "denied" | Hide "Enable Now" CTA, show informational message about enabling in browser settings. |
| Token refresh race condition | Use Firestore `arrayRemove` + `arrayUnion` in a single `updateDoc` call for atomicity. |
| Preferences read fails during notification dispatch | Default to "all enabled" — never silently drop notifications due to a read error. |
| Cleanup query fails | Log error, skip cleanup for this session. Will retry next session. |
| Batch write exceeds 500 docs (mark all read) | Split into chunks of 500, process sequentially. |

## Testing Strategy

### Property-Based Tests

**Library:** [fast-check](https://github.com/dubzzz/fast-check) (JavaScript PBT library)

Each correctness property above will be implemented as a property-based test with a minimum of 100 iterations. Tests will be tagged with the format:

```
Feature: app-notifications, Property {N}: {property_text}
```

**Test targets (pure functions extracted for testability):**
- `formatINR(amount)` — Property 6, 14
- `formatBadgeCount(count)` — Property 14
- `getNotificationRoute(notification)` — Property 13
- `buildNotificationPayload(event)` — Property 1, 6
- `shouldEvictToken(tokens, newToken)` — Property 5
- `saveTokenIdempotent(tokens, token)` — Property 2
- `refreshToken(tokens, oldToken, newToken)` — Property 3
- `removeToken(tokens, tokenToRemove)` — Property 4
- `shouldNotifyLowStock(item, previousStock)` — Property 7
- `isWithinDedupWindow(lastNotifiedAt, now)` — Property 8
- `batchLowStockEvents(events)` — Property 9
- `shouldSuppressNotification(type, preferences)` — Property 10, 11
- `identifyStaleNotifications(notifications, now)` — Property 15

### Unit Tests (Example-Based)

- Service worker notification click handling (with/without URL in data)
- Permission request flow (granted, denied, default states)
- Token registration on login (happy path)
- Error handling: FCM token request failure doesn't block login
- Notification preferences defaults for new users
- Mark-all-as-read batch operation
- Navigation to non-existent resource shows error

### Integration Tests

- End-to-end: create order via API → verify Firestore notification created
- End-to-end: update inventory below minStock → verify notification with dedup
- End-to-end: update payment status to "paid" → verify notification
- FCM multicast with stale token → verify token cleanup
- Preferences update → verify subsequent notifications respect new settings

### Test Configuration

```javascript
// vitest.config.js or jest equivalent
{
  testMatch: ['**/*.property.test.js', '**/*.test.js'],
  // Property tests run 100+ iterations by default via fast-check
}
```
