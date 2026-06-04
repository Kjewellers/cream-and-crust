import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const CURRENT_APP_VERSION = '1.0.0';

/**
 * Parses version strings like "1.0.2" into comparable numbers.
 */
function parseVersion(versionString) {
  if (!versionString) return 0;
  const parts = versionString.split('.').map(Number);
  return parts[0] * 10000 + parts[1] * 100 + parts[2];
}

export function useAppVersion() {
  const [config, setConfig] = useState({
    needsUpdate: false,
    maintenanceMode: false,
    maintenanceMessage: '',
    loading: true,
  });

  useEffect(() => {
    const configRef = doc(db, 'config', 'app');
    
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
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
      console.error("Failed to fetch app config", error);
      setConfig(prev => ({ ...prev, loading: false }));
    });

    return () => unsubscribe();
  }, []);

  return config;
}
