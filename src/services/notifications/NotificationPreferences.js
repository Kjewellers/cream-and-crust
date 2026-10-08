/**
 * NotificationPreferences.js
 *
 * Enterprise Notification Preferences service.
 * Manages per-category controls, sounds, vibration, and Quiet Hours settings.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Preferences } from '@capacitor/preferences';

const PREFS_STORAGE_KEY = 'cc_notification_preferences_v2';

export const DEFAULT_PREFERENCES = {
  orders: true,
  orderStatus: true,
  lowInventory: true,
  aiUpdates: true,
  marketing: false,
  subscription: true,
  payment: true,
  system: true,
  sound: true,
  vibration: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00', // 10 PM
  quietHoursEnd: '07:00',   // 7 AM
};

let cachedPreferences = { ...DEFAULT_PREFERENCES };

export async function loadNotificationPreferences(userId) {
  try {
    // 1. Load from local cache first for instant access
    const local = await Preferences.get({ key: PREFS_STORAGE_KEY });
    if (local.value) {
      cachedPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(local.value) };
    }

    // 2. Fetch from Firestore if user is authenticated
    if (userId) {
      const docRef = doc(db, 'users', userId, 'settings', 'notificationPreferences');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remotePrefs = snap.data();
        cachedPreferences = { ...DEFAULT_PREFERENCES, ...remotePrefs };
        await Preferences.set({
          key: PREFS_STORAGE_KEY,
          value: JSON.stringify(cachedPreferences),
        });
      }
    }
  } catch (err) {
    console.error('[NotificationPreferences] Failed to load preferences:', err);
  }
  return cachedPreferences;
}

export async function updateNotificationPreferences(userId, updates) {
  cachedPreferences = { ...cachedPreferences, ...updates };

  try {
    // Save locally
    await Preferences.set({
      key: PREFS_STORAGE_KEY,
      value: JSON.stringify(cachedPreferences),
    });

    // Save remote if logged in
    if (userId) {
      const docRef = doc(db, 'users', userId, 'settings', 'notificationPreferences');
      await setDoc(docRef, cachedPreferences, { merge: true });
    }
  } catch (err) {
    console.error('[NotificationPreferences] Failed to save preferences:', err);
  }
  return cachedPreferences;
}

export function getCachedPreferences() {
  return cachedPreferences;
}

export function isQuietHoursNow(prefs = cachedPreferences) {
  if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [sH, sM] = prefs.quietHoursStart.split(':').map(Number);
  const startMinutes = sH * 60 + sM;

  const [eH, eM] = prefs.quietHoursEnd.split(':').map(Number);
  const endMinutes = eH * 60 + eM;

  if (startMinutes > endMinutes) {
    // Overnight range (e.g. 22:00 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Same day range (e.g. 13:00 to 15:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

export function shouldDeliverNotification(category, priority = 'NORMAL', prefs = cachedPreferences) {
  // CRITICAL priority notifications (e.g. security breach, payment failure) bypass quiet hours & category toggles
  if (priority === 'CRITICAL') return true;

  // Check category toggle
  if (category && prefs[category] === false) {
    return false;
  }

  // Check quiet hours
  if (isQuietHoursNow(prefs)) {
    return false;
  }

  return true;
}
