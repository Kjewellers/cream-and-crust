/**
 * PermissionManager.js
 * ────────────────────
 * Thin wrapper used by PermissionContext and all screens.
 *
 * Every call delegates to the canonical AndroidPermissions module so
 * there is exactly ONE place where native Capacitor permission APIs are called.
 *
 * Web builds: all methods return 'granted' / succeed silently.
 *
 * Usage:
 *   import { PermissionManager, PERMISSION_TYPES } from '../services/PermissionManager';
 *
 *   // Check silently
 *   const status = await PermissionManager.checkPermission(PERMISSION_TYPES.CAMERA);
 *
 *   // Trigger native dialog (call ONLY after showing custom rationale modal)
 *   const result = await PermissionManager.requestPermission(PERMISSION_TYPES.CAMERA);
 *   if (result === 'granted') { ... }
 */

import * as AndroidPermissions from '../platform/android/AndroidPermissions.js';

// ─── Permission type constants ────────────────────────────────────────────────

export const PERMISSION_TYPES = {
  CAMERA: 'camera',
  GALLERY: 'gallery',
  NOTIFICATIONS: 'notifications',
  MICROPHONE: 'microphone',
  LOCATION: 'location',
  FILE_ACCESS: 'file_access',
};

// ─── PermissionManager ────────────────────────────────────────────────────────

export const PermissionManager = {
  /**
   * Check the current permission status without showing any UI.
   * Returns: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
   */
  async checkPermission(type) {
    return AndroidPermissions.checkPermission(type);
  },

  /**
   * Trigger the native OS permission dialog.
   * This must ONLY be called after the user has tapped "Continue" on the
   * custom Cream & Crust rationale modal (handled by PermissionContext).
   *
   * Returns: 'granted' | 'denied'
   */
  async requestPermission(type) {
    const result = await AndroidPermissions.requestPermission(type);
    return result.status;
  },

  /**
   * Check if a permission is permanently denied (user ticked "Don't ask again").
   * When true, the only path forward is opening device Settings.
   */
  async isDeniedForever(type) {
    const result = await AndroidPermissions.requestPermission(type);
    return result.isDeniedForever;
  },

  /**
   * Open the app's system settings page so the user can manually grant
   * a permanently-denied permission.
   */
  async openSettings() {
    return AndroidPermissions.openSettings();
  },

  // ─── Convenience camera helpers ─────────────────────────────────────────────

  /**
   * Pick a single photo via Android Photo Picker (no permission needed).
   * Returns { file, previewUrl } or null if cancelled.
   *
   * @deprecated Use Platform.PhotoPicker.pickImage() directly.
   */
  async pickImage() {
    const Platform = (await import('../platform/Platform')).default;
    return Platform.PhotoPicker.pickImage();
  },

  /**
   * Pick multiple photos via Android Photo Picker (no permission needed).
   * Returns an array of { file, previewUrl } objects.
   *
   * @deprecated Use Platform.PhotoPicker.pickMultiple() directly.
   */
  async pickMultipleImages(limit = 5) {
    const Platform = (await import('../platform/Platform')).default;
    return Platform.PhotoPicker.pickMultiple(limit);
  },
};
