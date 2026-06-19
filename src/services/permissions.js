/**
 * permissions.js — Centralized Permission Manager for Capacitor Android
 *
 * Handles all runtime permission checks and requests for:
 *  - Storage read/write (Android ≤ 12)
 *  - Media images/video (Android 13+)
 *  - Camera
 *
 * On web/browser: all methods return 'granted' so they're no-ops.
 * On native Android: requests are issued via @capacitor/camera and
 * @capacitor/filesystem using the plugin's built-in permission APIs.
 *
 * Usage:
 *   const status = await PermissionManager.requestStoragePermission();
 *   if (status !== 'granted') { showToast('Permission denied', 'error'); return; }
 */

import { Capacitor } from '@capacitor/core';
import { log } from '../utils/logger';

// ─── Helpers ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether we are running as a native Capacitor app (APK/AAB).
 * Returns false on web/browser builds.
 */
export const isNative = () => Capacitor.isNativePlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isIOS = () => Capacitor.getPlatform() === 'ios';

// ─── Storage / Filesystem Permissions ────────────────────────────────────────

/**
 * Request permission to write files to external/shared storage.
 *
 * Android 13+ (API 33):  READ_MEDIA_IMAGES  — handled by Camera plugin
 * Android ≤12 (API ≤32): READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE
 *
 * For our use-case (saving to the CACHE directory and sharing) we don't
 * technically need WRITE_EXTERNAL_STORAGE on Android 13+. But we still
 * request it gracefully so sharing to Gallery works on older devices.
 *
 * @returns {Promise<'granted'|'denied'|'prompt'>}
 */
export async function requestStoragePermission() {
  if (!isNative()) {
    log.permission('Not native — storage permission auto-granted');
    return 'granted';
  }

  try {
    // @capacitor/filesystem 6+ exposes checkPermissions / requestPermissions
    const { Filesystem } = await import('@capacitor/filesystem');

    let status = await Filesystem.checkPermissions();
    log.permission('Storage check result:', JSON.stringify(status));

    if (status.publicStorage === 'granted') return 'granted';

    // Request if not yet granted
    const requested = await Filesystem.requestPermissions();
    log.permission('Storage request result:', JSON.stringify(requested));
    return requested.publicStorage;
  } catch (e) {
    log.permission.warn('Filesystem permission error:', e?.message || e);
    // On Cache directory writes, no permission is needed — treat as granted
    return 'granted';
  }
}

// ─── Camera Permissions ───────────────────────────────────────────────────────

/**
 * Request Camera + Photo library permissions.
 * Needed for image capture and gallery uploads.
 *
 * @returns {Promise<'granted'|'denied'|'prompt'>}
 */
export async function requestCameraPermission() {
  if (!isNative()) {
    log.permission('Not native — camera permission auto-granted');
    return 'granted';
  }

  try {
    const { Camera } = await import('@capacitor/camera');

    let status = await Camera.checkPermissions();
    log.permission('Camera check result:', JSON.stringify(status));

    const allGranted =
      status.camera === 'granted' && status.photos === 'granted';
    if (allGranted) return 'granted';

    const requested = await Camera.requestPermissions({
      permissions: ['camera', 'photos'],
    });
    log.permission('Camera request result:', JSON.stringify(requested));

    const granted =
      requested.camera === 'granted' && requested.photos === 'granted';
    return granted ? 'granted' : 'denied';
  } catch (e) {
    log.permission.warn('Camera permission error:', e?.message || e);
    return 'denied';
  }
}

// ─── Combined startup check ───────────────────────────────────────────────────

/**
 * Run all permission checks on app startup (best-effort, silent).
 * Logs current status but does NOT show user-facing dialogs.
 * Call this from your App.jsx or main entry point.
 */
export async function checkPermissionsOnStartup() {
  if (!isNative()) return;

  try {
    const { Filesystem } = await import('@capacitor/filesystem');
    const { Camera } = await import('@capacitor/camera');

    const [fs, cam] = await Promise.all([
      Filesystem.checkPermissions().catch(() => ({ publicStorage: 'unknown' })),
      Camera.checkPermissions().catch(() => ({ camera: 'unknown', photos: 'unknown' })),
    ]);

    log.permission('Startup status:', JSON.stringify({
      filesystem: fs.publicStorage,
      camera: cam.camera,
      photos: cam.photos,
      platform: Capacitor.getPlatform(),
    }));
  } catch (e) {
    log.permission.warn('Startup check error:', e?.message || e);
  }
}

// ─── Notification Permissions ────────────────────────────────────────────────────────

/**
 * Request notification permission.
 * On Android 13+ this triggers the POST_NOTIFICATIONS runtime dialog.
 * On older Android, notifications are allowed by default.
 * On web, uses the standard Notification API.
 *
 * @returns {Promise<'granted'|'denied'|'prompt'>}
 */
export async function requestNotificationPermission() {
  if (!isNative()) {
    // Web: use Notification API
    if (typeof Notification === 'undefined') return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    try {
      const result = await Notification.requestPermission();
      log.permission('Web notification permission:', result);
      return result;
    } catch {
      return 'denied';
    }
  }

  try {
    // Android 13+ requires POST_NOTIFICATIONS as a runtime permission.
    // The browser Notification API is not reliable inside a Capacitor WebView,
    // so use Capacitor's native permission bridge.
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const current = await LocalNotifications.checkPermissions();
    log.permission('Native notification check:', JSON.stringify(current));

    if (current.display === 'granted') return 'granted';

    const requested = await LocalNotifications.requestPermissions();
    log.permission('Native notification request:', JSON.stringify(requested));
    return requested.display === 'granted' ? 'granted' : 'denied';
  } catch (e) {
    log.permission.warn('Notification permission error:', e?.message);
    return 'denied';
  }
}

// ─── Open App Settings ───────────────────────────────────────────────────────────

/**
 * Open the device's app settings page so the user can manually enable
 * a permission that was permanently denied.
 *
 * On web, this is a no-op (browsers don't support opening settings).
 */
export async function openAppSettings() {
  if (!isNative()) {
    log.permission('openAppSettings: not supported on web');
    return;
  }

  try {
    // Use @capacitor/browser to open the app settings intent on Android
    const { Browser } = await import('@capacitor/browser');
    if (isAndroid()) {
      // Android app settings deep link
      await Browser.open({
        url: `package:com.creamandcrust.app`,
        windowName: '_system',
      });
    }
    log.permission('Opened app settings');
  } catch (e) {
    log.permission.warn('openAppSettings failed:', e?.message);
  }
}

// ─── Comprehensive Permission Status ────────────────────────────────────────────

/**
 * Check ALL permissions and return a complete status map.
 * Useful for debugging and displaying a permissions dashboard.
 *
 * @returns {Promise<{camera: string, photos: string, storage: string, notifications: string}>}
 */
export async function checkAllPermissions() {
  const result = {
    camera: 'unknown',
    photos: 'unknown',
    storage: 'unknown',
    notifications: 'unknown',
    platform: Capacitor.getPlatform(),
    isNative: isNative(),
  };

  if (!isNative()) {
    result.camera = 'granted';
    result.photos = 'granted';
    result.storage = 'granted';
    result.notifications = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    return result;
  }

  try {
    const { Camera } = await import('@capacitor/camera');
    const cam = await Camera.checkPermissions().catch(() => ({}));
    result.camera = cam.camera || 'unknown';
    result.photos = cam.photos || 'unknown';
  } catch { /* ignore */ }

  try {
    const { Filesystem } = await import('@capacitor/filesystem');
    const fs = await Filesystem.checkPermissions().catch(() => ({}));
    result.storage = fs.publicStorage || 'unknown';
  } catch { /* ignore */ }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const notif = await LocalNotifications.checkPermissions().catch(() => ({}));
    result.notifications = notif.display || 'unknown';
  } catch { /* ignore */ }

  log.permission('checkAllPermissions result:', JSON.stringify(result));
  return result;
}

export function hasAllRequiredPermissions(status) {
  if (!status?.isNative) return true;

  return (
    status.camera === 'granted' &&
    status.photos === 'granted' &&
    status.storage === 'granted' &&
    status.notifications === 'granted'
  );
}

export async function requestAllRequiredPermissions() {
  if (!isNative()) {
    return {
      camera: 'granted',
      photos: 'granted',
      storage: 'granted',
      notifications: typeof Notification !== 'undefined' ? Notification.permission : 'granted',
      platform: Capacitor.getPlatform(),
      isNative: false,
    };
  }

  await requestCameraPermission();
  await requestStoragePermission();
  await requestNotificationPermission();

  return checkAllPermissions();
}

// ─── User-facing permission gate ─────────────────────────────────────────────────

/**
 * Gate a file-sharing action behind a storage permission request.
 * Shows a descriptive error toast if denied.
 *
 * @param {Function} action  Async function to run when permission is granted
 * @param {Function} onDenied  Optional callback when permission is denied
 */
export async function withStoragePermission(action, onDenied) {
  const status = await requestStoragePermission();
  if (status === 'granted') {
    return action();
  }

  log.permission.warn('Storage permission denied:', status);
  if (typeof onDenied === 'function') {
    onDenied(status);
  }
  return null;
}
