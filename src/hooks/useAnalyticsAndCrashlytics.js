import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Platform from '../platform/Platform';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { useAuth } from '../context/AuthContext';
import { setCurrentRoute, setMonitorUID } from '../services/ErrorMonitor';

export function useAnalyticsAndCrashlytics() {
  const location = useLocation();
  const { currentUser } = useAuth();

  // Initialize Crashlytics + Analytics
  useEffect(() => {
    if (Platform.isAndroid()) {
      FirebaseCrashlytics.setCrashlyticsCollectionEnabled({ enabled: true }).catch((err) => {
        console.warn('Crashlytics initialization failed:', err);
      });
      FirebaseAnalytics.setCollectionEnabled({ enabled: true }).catch((err) => {
        console.warn('Analytics initialization failed:', err);
      });
    }
  }, []);

  // Associate user ID with crash reports and analytics + ErrorMonitor
  useEffect(() => {
    if (currentUser?.uid) {
      setMonitorUID(currentUser.uid);
      if (Platform.isAndroid()) {
        FirebaseCrashlytics.setUserId({ userId: currentUser.uid }).catch(() => {});
        FirebaseAnalytics.setUserId({ userId: currentUser.uid }).catch(() => {});
      }
    }
  }, [currentUser]);

  // Track screen views + update ErrorMonitor route
  useEffect(() => {
    setCurrentRoute(location.pathname);

    if (Platform.isAndroid()) {
      FirebaseAnalytics.setScreenName({
        screenName: location.pathname,
        screenClassOverride: 'ReactPage',
      }).catch(() => {});
    }
  }, [location]);

  // Forward global JS errors to Crashlytics on Android
  useEffect(() => {
    if (!Platform.isAndroid()) return;

    const onError = (event) => {
      const msg = event.error?.message || event.message || 'Unknown JS Error';
      FirebaseCrashlytics.log({ message: `[JS Error] ${msg}` }).catch(() => {});
      FirebaseCrashlytics.recordException({
        message: msg,
        stackTrace: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
      }).catch(() => {});
    };

    const onRejection = (event) => {
      const msg = event.reason?.message || String(event.reason || 'Unhandled Promise');
      FirebaseCrashlytics.log({ message: `[Promise Rejection] ${msg}` }).catch(() => {});
      FirebaseCrashlytics.recordException({ message: msg }).catch(() => {});
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
}
