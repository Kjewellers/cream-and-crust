/**
 * NotificationChannels.js
 *
 * Configures Android 13-16 Notification Channels for Cream & Crust.
 * Categorizes push notifications into distinct channels with targeted importance,
 * sounds, lights, and vibration patterns.
 */

import { Capacitor } from '@capacitor/core';

export const CHANNELS = {
  ORDERS: 'orders_channel',
  LIVE_ACTIVITY: 'live_activity_channel',
  INVENTORY: 'inventory_channel',
  SYSTEM: 'system_channel',
  MARKETING: 'marketing_channel',
};

export async function setupNotificationChannels() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return;
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // 1. Orders Channel (High priority, custom sound, vibration, light)
    await PushNotifications.createChannel({
      id: CHANNELS.ORDERS,
      name: 'Order Alerts',
      description: 'Instant alerts for new bakery orders and urgent updates',
      importance: 5, // Importance.MAX
      visibility: 1, // Visibility.PUBLIC
      sound: 'order_alert.wav',
      vibration: true,
      lights: true,
      lightColor: '#B5606A',
    });

    // 2. Live Activity Order Progress Channel (Ongoing updates, silent/subtle)
    await PushNotifications.createChannel({
      id: CHANNELS.LIVE_ACTIVITY,
      name: 'Live Order Progress',
      description: 'Real-time order status progress and live baking activity',
      importance: 3, // Importance.DEFAULT
      visibility: 1,
      sound: null,
      vibration: false,
      lights: false,
    });

    // 3. Low Inventory Channel (High importance warning)
    await PushNotifications.createChannel({
      id: CHANNELS.INVENTORY,
      name: 'Inventory Alerts',
      description: 'Warnings when ingredient or product stock is running low',
      importance: 4, // Importance.HIGH
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#E07A5F',
    });

    // 4. System & AI Updates Channel
    await PushNotifications.createChannel({
      id: CHANNELS.SYSTEM,
      name: 'System & Security',
      description: 'Account security, backup logs, and system maintenance alerts',
      importance: 3, // Importance.DEFAULT
      visibility: 1,
      vibration: false,
    });

    // 5. Marketing & Insights Channel (Low importance, non-intrusive)
    await PushNotifications.createChannel({
      id: CHANNELS.MARKETING,
      name: 'Promotions & Tips',
      description: 'Bakery growth tips, insights, and promotional updates',
      importance: 2, // Importance.LOW
      visibility: 0, // Visibility.PRIVATE
      vibration: false,
    });

    console.log('[NotificationChannels] All 5 Android notification channels created successfully.');
  } catch (err) {
    console.error('[NotificationChannels] Error initializing channels:', err);
  }
}
