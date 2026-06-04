/**
 * OfflineBanner — a slim banner shown while the device is offline.
 *
 * Appears within ~2s of going offline and is removed within ~2s of reconnect
 * (driven by useOnlineStatus). Fires a one-shot offline-mode toast on the
 * online -> offline transition. Mounted once near the app root.
 *
 * Requirements: 8.5 (banner on offline), 8.6 (remove on reconnect), 13.11
 * (offline-mode toast).
 */
import React, { useEffect, useRef } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync.js';
import { showToast } from './iOS.jsx';
import { AnimatePresence, motion } from 'framer-motion';

export default function OfflineBanner() {
  const syncState = useOfflineSync();
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (syncState === 'offline' && !wasOfflineRef.current) {
      showToast('You are offline. Your work is saved and will sync later.', 'info');
      wasOfflineRef.current = true;
    } else if (syncState === 'synced' && wasOfflineRef.current) {
      showToast('Back online! All changes synced.', 'success');
      wasOfflineRef.current = false;
    }
  }, [syncState]);

  return (
    <AnimatePresence>
      {syncState !== 'synced' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 'calc(var(--bottom-nav-clearance, 64px) + 12px)',
            zIndex: 9000,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: syncState === 'offline' ? 'rgba(74, 59, 50, 0.95)' : 'rgba(52, 168, 83, 0.95)',
              color: '#FFF7F2',
              borderRadius: 999,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {syncState === 'offline' ? (
              <>
                <WifiOff size={16} /> Offline — changes saved locally
              </>
            ) : (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Syncing pending changes...
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
