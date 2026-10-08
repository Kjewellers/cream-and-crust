/**
 * useNotificationPermission.js
 * ─────────────────────────────
 * JIT notification permission request — triggered AFTER successful login,
 * never on app launch or splash screen.
 *
 * Flow:
 *   Login success
 *     → 3-second grace delay (let the user settle into the app)
 *       → Custom "Enable Notifications" modal (PermissionContext)
 *         → Android POST_NOTIFICATIONS dialog
 *           → Granted → FCM token saved to Firestore
 *           → Denied  → Silently skip (user can enable later from Settings)
 *
 * The permission is only requested ONCE per install. If the user has already
 * granted or denied it, the hook skips silently.
 */

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { log } from '../utils/logger';

const NOTIF_REQUESTED_KEY = 'cc_notif_permission_requested';

/**
 * @param {Function} requirePermission - From usePermissions() context
 */
export function useNotificationPermission(requirePermission) {
  const { currentUser } = useAuth();
  const hasRequested = useRef(false);

  useEffect(() => {
    // Only run on native Android/iOS
    if (!Capacitor.isNativePlatform()) return;
    // Only run when user is logged in
    if (!currentUser?.uid) return;
    // Only request once per session (already requested this session)
    if (hasRequested.current) return;
    // Only request once per install (persisted in localStorage)
    if (localStorage.getItem(NOTIF_REQUESTED_KEY) === 'true') return;

    hasRequested.current = true;

    let timer;

    const requestAfterDelay = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { PERMISSION_TYPES } = await import('../services/PermissionManager');

        // Wait 3 seconds after login so the user settles into the app
        await new Promise((resolve) => {
          timer = setTimeout(resolve, 3000);
        });

        // Show custom Cream & Crust modal first, then Android dialog
        const granted = await requirePermission(PERMISSION_TYPES.NOTIFICATIONS);

        // Mark as requested regardless of outcome (don't spam the user)
        localStorage.setItem(NOTIF_REQUESTED_KEY, 'true');

        if (!granted) {
          log.warn('[useNotificationPermission] Permission denied by user');
          return;
        }

        // Register with FCM
        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          log.info('[useNotificationPermission] FCM token:', token.value);
          try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
              fcmToken: token.value,
              lastTokenUpdate: new Date().toISOString(),
            });
          } catch (e) {
            log.error('[useNotificationPermission] Failed to save FCM token:', e);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          log.error('[useNotificationPermission] FCM registration error:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          log.info('[useNotificationPermission] Push received:', notification.title);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          log.info('[useNotificationPermission] Push tapped:', notification.actionId);
        });
      } catch (e) {
        log.error('[useNotificationPermission] Setup failed:', e);
      }
    };

    requestAfterDelay();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentUser, requirePermission]);
}
