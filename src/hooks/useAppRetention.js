import { useEffect } from 'react';
import Platform from '../platform/Platform';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';

export function useAppRetention() {
  useEffect(() => {
    if (!Platform.isAndroid()) return;

    let stateChangeListener;

    const setupAppRetention = async () => {
      const { globalRequirePermission } = await import('../context/PermissionContext');
      const { PERMISSION_TYPES } = await import('../services/PermissionManager');
      
      // Make sure we have permission to show local notifications
      const granted = await globalRequirePermission(PERMISSION_TYPES.NOTIFICATIONS);

      // If permissions are not granted, we can't schedule local notifications
      if (!granted) return;

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
