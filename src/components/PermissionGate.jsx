/**
 * PermissionGate — Wraps an action that requires a runtime permission.
 *
 * Before executing the action, checks/requests the permission.
 * If denied, shows a toast with a link to device settings.
 *
 * Usage:
 *   <PermissionGate
 *     permission="camera"
 *     reason="We need camera access to photograph your cakes"
 *     onGranted={() => takePhoto()}
 *     children={<button>Take Photo</button>}
 *   />
 */
import React, { useCallback } from 'react';
import { showToast } from './iOS';
import { log } from '../utils/logger';

export default function PermissionGate({ permission, reason, onGranted, onDenied, children }) {
  const handleClick = useCallback(async (e) => {
    e?.stopPropagation?.();

    try {
      const permissions = await import('../services/permissions');

      let status = 'granted';

      switch (permission) {
        case 'camera':
          status = await permissions.requestCameraPermission();
          break;
        case 'storage':
          status = await permissions.requestStoragePermission();
          break;
        case 'notification':
          status = await permissions.requestNotificationPermission();
          break;
        default:
          log.permission.warn('Unknown permission type:', permission);
      }

      log.permission(`${permission} permission result: ${status}`);

      if (status === 'granted') {
        onGranted?.();
      } else {
        showToast(
          `${permission} permission denied. Go to Settings → Apps → Cream & Crust to enable.`,
          'error'
        );

        // Try to open app settings on native
        try {
          const { openAppSettings } = await import('../services/permissions');
          // Only offer settings redirect, don't auto-open
          if (typeof onDenied === 'function') {
            onDenied(status);
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      log.permission.error('Permission gate error:', err?.message);
      // On error, try to proceed anyway (web env may not need permissions)
      onGranted?.();
    }
  }, [permission, reason, onGranted, onDenied]);

  // Clone the child element and attach the click handler
  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
    });
  }

  return <span onClick={handleClick}>{children}</span>;
}
