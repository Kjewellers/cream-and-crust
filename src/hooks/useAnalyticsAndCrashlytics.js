import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { useAuth } from '../context/AuthContext';

export function useAnalyticsAndCrashlytics() {
  const location = useLocation();
  const { currentUser } = useAuth();

  // Initialize Crashlytics
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      FirebaseCrashlytics.setCrashlyticsCollectionEnabled({ enabled: true }).catch((err) => {
        console.warn('Crashlytics initialization failed:', err);
      });
      FirebaseAnalytics.setCollectionEnabled({ enabled: true }).catch((err) => {
        console.warn('Analytics initialization failed:', err);
      });
    }
  }, []);

  // Associate user ID with crash reports and analytics
  useEffect(() => {
    if (Capacitor.isNativePlatform() && currentUser?.uid) {
      FirebaseCrashlytics.setUserId({ userId: currentUser.uid }).catch(() => {});
      FirebaseAnalytics.setUserId({ userId: currentUser.uid }).catch(() => {});
    }
  }, [currentUser]);

  // Track screen views
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      FirebaseAnalytics.setScreenName({
        screenName: location.pathname,
        screenClassOverride: 'ReactPage',
      }).catch(() => {});
    }
  }, [location]);
}
