# Requirements Document

## Introduction

This feature completes the end-to-end push notification system for the Cream & Crust bakery management app. The existing codebase has partial infrastructure (Firestore-based in-app notifications, a bell icon with unread count, an FCM send endpoint, and a service worker with placeholder config). This spec covers: configuring the Firebase Cloud Messaging service worker with real credentials, completing the FCM token registration lifecycle, adding server-triggered notifications for key business events (new orders, order status changes, low stock, payment received), and providing user-facing notification preferences.

## Glossary

- **FCM_Service_Worker**: The `firebase-messaging-sw.js` file that handles background push notifications via Firebase Cloud Messaging
- **Notification_System**: The combined in-app (Firestore) and push (FCM) notification delivery pipeline
- **FCM_Token**: A device-specific token issued by Firebase Cloud Messaging used to target push notifications to a specific browser/device
- **Token_Registry**: The `fcmTokens` array stored in the user's Firestore document that holds all registered device tokens
- **Notification_Preferences**: User-configurable settings that control which notification categories are enabled
- **Push_Dispatcher**: The Express server endpoint (`/api/notifications/send`) that sends FCM messages via Firebase Admin SDK
- **Event_Trigger**: A server-side function that creates a Firestore notification document and dispatches a push notification when a business event occurs
- **Baker**: The bakery owner/operator who uses the Cream & Crust management app

## Requirements

### Requirement 1: FCM Service Worker Configuration

**User Story:** As a Baker, I want the push notification service worker to use real Firebase credentials, so that my browser can receive background push notifications.

#### Acceptance Criteria

1. WHEN the application is built, THE FCM_Service_Worker SHALL contain the Firebase project configuration values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) injected from environment variables prefixed with VITE_FIREBASE_
2. IF any required Firebase configuration environment variable is missing or empty at build time, THEN THE FCM_Service_Worker SHALL retain a placeholder value that causes Firebase initialization to fail gracefully without crashing the service worker
3. WHEN a background push message is received, THE FCM_Service_Worker SHALL display a system notification using the title from the message payload (defaulting to "New Notification" if absent), the body from the message payload, and the app icon located at /logo.png
4. WHEN a user clicks a displayed system notification, THE FCM_Service_Worker SHALL focus an existing app window if one is open, or open a new app window, and navigate to the URL path specified in the notification data payload
5. IF a user clicks a displayed system notification that contains no URL path in its data payload, THEN THE FCM_Service_Worker SHALL navigate to the application root path

### Requirement 2: FCM Token Registration Lifecycle

**User Story:** As a Baker, I want my device to be automatically registered for push notifications after I grant permission, so that I receive alerts on all my logged-in devices.

#### Acceptance Criteria

1. WHEN a Baker logs in and the browser Notification permission is "granted", THE Notification_System SHALL retrieve the current FCM_Token using the VAPID key and save it to the Token_Registry, skipping the save if the token already exists in the array
2. WHEN a Baker grants notification permission for the first time, THE Notification_System SHALL request an FCM_Token using the VAPID key and save it to the Token_Registry
3. IF the FCM_Token request or save operation fails during login or permission grant, THEN THE Notification_System SHALL log the error and not block the login flow
4. WHEN the FCM SDK emits a token refresh event, THE Notification_System SHALL replace the previous token with the new token in the Token_Registry
5. WHEN an FCM_Token becomes invalid (indicated by a "messaging/registration-token-not-registered" or "messaging/invalid-registration-token" error during send), THE Push_Dispatcher SHALL remove the stale token from the Token_Registry
6. WHEN a Baker logs out, THE Notification_System SHALL remove the current device FCM_Token from the Token_Registry before completing the sign-out
7. THE Token_Registry SHALL store a maximum of 10 FCM_Tokens per user; WHEN a new token would exceed this limit, THE Notification_System SHALL remove the oldest token before saving the new one

### Requirement 3: Server-Triggered Order Notifications

**User Story:** As a Baker, I want to receive push notifications when new orders arrive and when order statuses change, so that I can respond to customers promptly without constantly checking the app.

#### Acceptance Criteria

1. WHEN a new order is created via the API, THE Event_Trigger SHALL create a Firestore notification document with type "order", the order ID, customer name, and order total formatted in the Baker's currency (₹), and dispatch a push notification to all tokens in the Baker's Token_Registry within 30 seconds of order creation
2. WHEN an order status is updated to "ready" or "delivered", THE Event_Trigger SHALL create a Firestore notification document with the new status and order ID, and dispatch a push notification to all tokens in the Baker's Token_Registry within 30 seconds of the status change
3. WHEN a new order arrives via the public menu (WhatsApp order click) and a product is selected, THE Event_Trigger SHALL create a Firestore notification with type "order" containing the product name and dispatch a push notification to the Baker
4. WHEN a new order arrives via the public menu (WhatsApp order click) and no specific product is selected, THE Event_Trigger SHALL create a Firestore notification with type "order" containing a generic message indicating menu interest and dispatch a push notification to the Baker
5. IF the push notification dispatch fails due to an unreachable endpoint or network error, THEN THE Event_Trigger SHALL still persist the Firestore notification document so the Baker can view it in-app

### Requirement 4: Server-Triggered Inventory Notifications

**User Story:** As a Baker, I want to receive push notifications when inventory items fall below their minimum stock level, so that I can restock before running out of ingredients.

#### Acceptance Criteria

1. WHEN an inventory item stock quantity is updated to a value at or below its minStock threshold, THE Event_Trigger SHALL create a Firestore notification with type "inventory", the item name, current stock, and unit, and dispatch a push notification to the Baker
2. IF a low-stock notification has already been sent for a specific inventory item within the preceding 24-hour rolling window, THEN THE Event_Trigger SHALL skip creating a new notification for that item until the 24-hour period has elapsed
3. WHEN two or more inventory items fall at or below their minStock threshold within a 60-second window, THE Event_Trigger SHALL batch them into a single summary notification listing each affected item's name, current stock, and unit
4. IF an inventory item's stock is already at or below its minStock threshold and a subsequent update does not change the stock value, THEN THE Event_Trigger SHALL NOT create a duplicate notification

### Requirement 5: Server-Triggered Payment Notifications

**User Story:** As a Baker, I want to receive a push notification when a payment is recorded for an order, so that I have immediate confirmation of revenue.

#### Acceptance Criteria

1. WHEN an order's paymentStatus is updated to "paid", THE Event_Trigger SHALL create a Firestore notification with type "payment", the order ID, and the order total amount, and dispatch a push notification to the Baker within 5 seconds of the status change
2. THE Notification_System SHALL format the currency amount in the notification body using the ₹ symbol with en-IN locale grouping (e.g., "₹1,500")
3. IF the push notification dispatch fails, THEN THE Event_Trigger SHALL retain the Firestore notification document so the Baker can view it in-app on next access

### Requirement 6: Notification Preferences

**User Story:** As a Baker, I want to control which types of notifications I receive, so that I only get alerts that are relevant to my workflow.

#### Acceptance Criteria

1. THE Notification_Preferences SHALL provide toggles for each notification category: orders, inventory, and payments, with all categories enabled by default for new users
2. WHEN a Baker disables a notification category, THE Event_Trigger SHALL skip creating Firestore notifications and push notifications for that category
3. WHEN a Baker disables push notifications globally, THE Notification_System SHALL unregister the FCM_Token and suppress all push notifications regardless of per-category settings; WHEN a Baker re-enables push notifications globally, THE Notification_System SHALL register the FCM_Token and resume push delivery for categories that are individually enabled
4. THE Notification_Preferences SHALL persist in the Baker's Firestore user document and apply across all devices within the latency of a Firestore document update
5. IF a Baker disables a notification category while notifications for that category are in transit, THEN THE Event_Trigger SHALL not retroactively remove already-delivered notifications but SHALL suppress any new notifications generated after the preference change is persisted

### Requirement 7: Notification Interaction and Management

**User Story:** As a Baker, I want to manage my notifications efficiently, so that I can keep track of what needs attention and dismiss resolved items.

#### Acceptance Criteria

1. WHEN a Baker taps a notification in the notification list, THE Notification_System SHALL mark it as read and navigate to the resource determined by notification type: "order" type navigates to the order detail page for that order ID, "inventory" type navigates to the inventory page, and "payment" type navigates to the order detail page for the associated order ID
2. IF marking a notification as read fails due to a network or Firestore error, THEN THE Notification_System SHALL display an error message indicating the operation failed and retain the notification's unread state
3. WHEN a Baker taps "Mark all as read", THE Notification_System SHALL update all unread notifications to read status in a single batch operation of up to 500 documents
4. THE Notification_System SHALL display an unread notification count badge on the bell icon that reflects the current unread count from the existing Firestore subscription, showing the numeric count for values 1 through 99 and displaying "99+" for counts exceeding 99
5. WHEN a notification is older than 30 days, THE Notification_System SHALL automatically delete it from Firestore on the next app session start or notification list load to prevent unbounded storage growth
6. IF a Baker taps a notification whose linked resource no longer exists, THEN THE Notification_System SHALL navigate to the notification list and display an error message indicating the referenced item is unavailable
