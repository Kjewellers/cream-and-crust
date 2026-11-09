import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import Platform from '../platform/Platform';
import { getAppVersionInfo, parseSemver } from '../config/version';

export function useAppVersion() {
  const isAndroid = Platform.isAndroid();
  const appInfo = getAppVersionInfo();

  const [config, setConfig] = useState({
    platform: isAndroid ? 'android' : 'web',
    platformName: appInfo.name,
    currentVersion: appInfo.version,
    currentVersionCode: appInfo.versionCode || null,
    minVersionRequired: '1.0.0',
    needsUpdate: false,
    updateUrl: isAndroid ? appInfo.marketUrl : appInfo.storeUrl,
    updateType: isAndroid ? 'play_store' : 'web_reload',
    maintenanceMode: false,
    maintenanceMessage: '',
    loading: true,
  });

  useEffect(() => {
    // Safety timeout: never block the app for more than 5 seconds even if
    // the config/app document is unreachable (offline, permissions, etc.).
    const safetyTimer = setTimeout(() => {
      setConfig((prev) => {
        if (prev.loading) {
          console.warn('[useAppVersion] Safety timeout — forcing loading=false');
          return { ...prev, loading: false };
        }
        return prev;
      });
    }, 5000);

    let unsubscribe = () => {};
    try {
      const configRef = doc(db, 'config', 'app');

      unsubscribe = onSnapshot(
        configRef,
        (snapshot) => {
          clearTimeout(safetyTimer);
          if (snapshot.exists()) {
            const data = snapshot.data() || {};

            // ── Platform-Specific Version Resolution ────────────────────────
            // Android uses min_version_android or min_version_code_android
            // Web uses min_version_web
            // Both fall back to legacy data.min_version if platform key is not present.
            const minVersionRequired = isAndroid
              ? data.min_version_android || data.min_version || '1.0.0'
              : data.min_version_web || data.min_version || '1.0.0';

            let isOutdated = parseSemver(appInfo.version) < parseSemver(minVersionRequired);

            // Optional Android build code enforcement
            if (isAndroid && data.min_version_code_android && appInfo.versionCode) {
              if (Number(appInfo.versionCode) < Number(data.min_version_code_android)) {
                isOutdated = true;
              }
            }

            // ── Platform-Specific Maintenance Resolution ────────────────────
            const maintenanceMode = isAndroid
              ? data.maintenance_mode_android ?? !!data.maintenance_mode
              : data.maintenance_mode_web ?? !!data.maintenance_mode;

            const maintenanceMessage = isAndroid
              ? data.maintenance_message_android ||
                data.maintenance_message ||
                'Cream & Crust Android is currently undergoing maintenance. Please check back shortly.'
              : data.maintenance_message_web ||
                data.maintenance_message ||
                'Cream & Crust Web is currently undergoing scheduled maintenance. Please check back shortly.';

            setConfig({
              platform: isAndroid ? 'android' : 'web',
              platformName: appInfo.name,
              currentVersion: appInfo.version,
              currentVersionCode: appInfo.versionCode || null,
              minVersionRequired,
              needsUpdate: isOutdated,
              updateUrl: isAndroid ? appInfo.marketUrl : appInfo.storeUrl,
              updateType: isAndroid ? 'play_store' : 'web_reload',
              maintenanceMode: Boolean(maintenanceMode),
              maintenanceMessage,
              loading: false,
            });
          } else {
            setConfig((prev) => ({ ...prev, loading: false }));
          }
        },
        (error) => {
          clearTimeout(safetyTimer);
          console.error('[useAppVersion] Failed to fetch app config', error);
          setConfig((prev) => ({ ...prev, loading: false }));
        }
      );
    } catch (err) {
      clearTimeout(safetyTimer);
      console.warn('[useAppVersion] Firestore init error:', err?.message);
      setConfig((prev) => ({ ...prev, loading: false }));
    }

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [isAndroid, appInfo.version, appInfo.versionCode, appInfo.marketUrl, appInfo.storeUrl]);

  return config;
}
