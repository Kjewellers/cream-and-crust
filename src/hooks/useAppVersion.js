import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

// Read from Vite env or fall back to a sensible default.
// The version is injected at build time via vite.config.js define or .env.
const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.1.21';

/**
 * Parses version strings like "1.0.2" into comparable numbers.
 */
function parseVersion(versionString) {
  if (!versionString) return 0;
  const parts = String(versionString).split('.').map(Number);
  return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}

export function useAppVersion() {
  const [config, setConfig] = useState({
    needsUpdate: false,
    maintenanceMode: false,
    maintenanceMessage: '',
    loading: true,
  });

  useEffect(() => {
    // Safety timeout: never block the app for more than 5 seconds even if
    // the config/app document is unreachable (offline, permissions, etc.).
    const safetyTimer = setTimeout(() => {
      setConfig(prev => {
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

      unsubscribe = onSnapshot(configRef, (snapshot) => {
        clearTimeout(safetyTimer);
        if (snapshot.exists()) {
          const data = snapshot.data();

          const minVersionRequired = data.min_version || '1.0.0';
          const isOutdated = parseVersion(CURRENT_APP_VERSION) < parseVersion(minVersionRequired);

          setConfig({
            needsUpdate: isOutdated,
            maintenanceMode: !!data.maintenance_mode,
            maintenanceMessage: data.maintenance_message || 'We are currently under maintenance. Please check back shortly.',
            loading: false,
          });
        } else {
          setConfig(prev => ({ ...prev, loading: false }));
        }
      }, (error) => {
        clearTimeout(safetyTimer);
        console.error("Failed to fetch app config", error);
        setConfig(prev => ({ ...prev, loading: false }));
      });
    } catch (err) {
      // Firestore may not be initialized yet (e.g. config doc missing).
      clearTimeout(safetyTimer);
      console.warn('[useAppVersion] Firestore init error:', err?.message);
      setConfig(prev => ({ ...prev, loading: false }));
    }

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  return config;
}

