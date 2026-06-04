import { useState, useEffect } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { waitForPendingWrites } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [syncState, setSyncState] = useState('synced'); // 'synced' | 'offline' | 'syncing'

  useEffect(() => {
    if (!isOnline) {
      setSyncState('offline');
      return;
    }

    let isMounted = true;
    
    // When we come back online, we might have pending writes.
    // We optimistically show 'syncing' and wait for Firestore to clear the queue.
    if (syncState === 'offline') {
      setSyncState('syncing');
      
      waitForPendingWrites(db)
        .then(() => {
          if (isMounted) setSyncState('synced');
        })
        .catch(() => {
          // If it fails, we assume we might still be struggling with connection
          if (isMounted) setSyncState('synced'); 
        });
    }

    return () => { isMounted = false; };
  }, [isOnline, syncState]);

  return syncState;
}
