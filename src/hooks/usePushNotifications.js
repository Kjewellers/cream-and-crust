import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { log } from '../utils/logger';
import { setupNotificationChannels } from '../services/notifications/NotificationChannels';
import { loadNotificationPreferences, shouldDeliverNotification } from '../services/notifications/NotificationPreferences';
import { handleNotificationTap } from '../services/notifications/DeepLinkRouter';
import { useNavigate } from 'react-router-dom';

export function usePushNotifications() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser?.uid) return;

    let isSubscribed = true;

    const setupPush = async () => {
      try {
        // Load preferences
        await loadNotificationPreferences(currentUser.uid);

        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { globalRequirePermission } = await import('../context/PermissionContext');
        const { PERMISSION_TYPES } = await import('../services/PermissionManager');

        // Setup Android 13-16 Notification Channels
        await setupNotificationChannels();

        // Request permission via premium permission dialog
        const granted = await globalRequirePermission(PERMISSION_TYPES.NOTIFICATIONS);
        if (!granted) {
          log.warn('Push notification permission denied');
          return;
        }

        // Register with APNS / FCM
        await PushNotifications.register();

        // Registration Success: save to user fcmTokens array for multi-device push
        PushNotifications.addListener('registration', async (token) => {
          if (!isSubscribed) return;
          log.info('Push registration token: ' + token.value);

          try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
              fcmToken: token.value, // primary
              fcmTokens: arrayUnion(token.value), // multi-device array
              lastTokenUpdate: new Date().toISOString(),
            });
            log.info('FCM Token array updated in Firestore for user: ' + currentUser.uid);
          } catch (e) {
            log.error('Failed to save FCM token array to Firestore', e);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          log.error('Error on push registration: ' + JSON.stringify(error));
        });

        // Foreground notification handling (Silent sync & in-app live banner)
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          log.info('Push notification received in foreground: ' + JSON.stringify(notification));

          const data = notification.data || {};
          const category = data.category || data.type;

          if (shouldDeliverNotification(category, data.priority)) {
            // Trigger 60 FPS floating Cream & Crust live activity banner
            if (window.showCreamCrustBanner) {
              window.showCreamCrustBanner(notification);
            }
          }
        });

        // Push tap deep link handling
        PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
          log.info('Push notification action performed: ' + JSON.stringify(notificationAction));
          const data = notificationAction.notification?.data || {};
          handleNotificationTap(data, navigate);
        });
      } catch (e) {
        log.error('Failed to setup Push Notifications', e);
      }
    };

    setupPush();

    return () => {
      isSubscribed = false;
    };
  }, [currentUser, navigate]);
}
