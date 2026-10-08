import { useState, useEffect, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { waitForPendingWrites } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [syncState, setSyncState] = useState('synced'); // 'synced' | 'offline' | 'syncing'
  // Track the previous online state with a ref to avoid putting syncState
  // in the dependency array (which caused an infinite re-render loop:
  // offline → syncing → synced → triggers effect → syncing → synced → ...).
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setSyncState('offline');
      return;
    }

    let isMounted = true;

    // When we come back online after being offline, wait for pending writes.
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setSyncState('syncing');

      waitForPendingWrites(db)
        .then(() => {
          if (isMounted) setSyncState('synced');
        })
        .catch(() => {
          // If it fails, we assume we might still be struggling with connection
          if (isMounted) setSyncState('synced');
        });
    } else {
      setSyncState('synced');
    }

    return () => { isMounted = false; };
  }, [isOnline]); // Only depend on isOnline — never on syncState

  return syncState;
}
