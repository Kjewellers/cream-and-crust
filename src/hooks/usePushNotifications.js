import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { log } from '../utils/logger';

export function usePushNotifications() {
  const { currentUser } = useAuth();

  useEffect(() => {
    // Only run on native Android/iOS
    if (!Capacitor.isNativePlatform()) return;
    if (!currentUser?.uid) return;

    let isSubscribed = true;

    const setupPush = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Request permission to use push notifications
        let permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          log.warn('Push notification permission denied');
          return;
        }

        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();

        // Listen for registration success
        PushNotifications.addListener('registration', async (token) => {
          if (!isSubscribed) return;
          log.info('Push registration success, token: ' + token.value);
          
          try {
            // Save the token to the user's Firestore document
            const userRef = doc(db, 'users', currentUser.uid);
            // We use arrayUnion in a real app, but for simplicity we'll just save fcmToken string
            await updateDoc(userRef, {
              fcmToken: token.value,
              lastTokenUpdate: new Date().toISOString()
            });
            log.info('FCM Token saved to Firestore for user: ' + currentUser.uid);
          } catch (e) {
            log.error('Failed to save FCM token to Firestore', e);
          }
        });

        // Listen for registration error
        PushNotifications.addListener('registrationError', (error) => {
          log.error('Error on registration: ' + JSON.stringify(error));
        });

        // Listen for notifications received while app is in foreground
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          log.info('Push received: ' + JSON.stringify(notification));
        });

        // Listen for notification taps
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          log.info('Push action performed: ' + JSON.stringify(notification));
        });

      } catch (e) {
        log.error('Failed to setup Push Notifications', e);
      }
    };

    setupPush();

    return () => {
      isSubscribed = false;
      // We don't remove listeners here because we want them to stay active
      // as long as the user is logged in. 
    };
  }, [currentUser]);
}
