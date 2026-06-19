import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';

export function useAppRetention() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let stateChangeListener;

    const setupAppRetention = async () => {
      // Make sure we have permission to show local notifications
      let permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display === 'prompt') {
        permStatus = await LocalNotifications.requestPermissions();
      }

      // If permissions are not granted, we can't schedule local notifications
      if (permStatus.display !== 'granted') return;

      stateChangeListener = await App.addListener('appStateChange', async ({ isActive }) => {
        try {
          if (!isActive) {
            // App went to background: Schedule sequence of retention notifications
            const now = new Date().getTime();
            
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: "Cream & Crust 🧁",
                  body: "Check in on your pending orders!",
                  id: 101,
                  schedule: { at: new Date(now + 1000 * 60 * 60 * 2) }, // 2 hours
                },
                {
                  title: "Cream & Crust 📋",
                  body: "Don't forget to update your inventory for tomorrow.",
                  id: 102,
                  schedule: { at: new Date(now + 1000 * 60 * 60 * 5) }, // 5 hours
                },
                {
                  title: "Cream & Crust 📈",
                  body: "Your dashboard is waiting! Tap to see today's summary.",
                  id: 103,
                  schedule: { at: new Date(now + 1000 * 60 * 60 * 8) }, // 8 hours
                }
              ]
            });
          } else {
            // App came to foreground: Cancel pending retention notifications
            await LocalNotifications.cancel({
              notifications: [{ id: 101 }, { id: 102 }, { id: 103 }]
            });
          }
        } catch (e) {
          console.warn('App Retention Notification Error:', e);
        }
      });
    };

    setupAppRetention();

    return () => {
      if (stateChangeListener) {
        stateChangeListener.remove();
      }
    };
  }, []);
}
