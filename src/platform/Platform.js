/**
 * Platform.js
 * ───────────
 * Thin platform detection module for Cream & Crust.
 *
 * Used throughout the codebase to conditionally load Capacitor-only logic.
 * On web builds, all methods return false/web-appropriate values so that
 * no Android-specific code paths are triggered.
 *
 * Usage:
 *   import Platform from '../platform/Platform';
 *   if (Platform.isAndroid()) { ... }
 *
 *   // Image / video selection — ALWAYS use this, never Capacitor directly:
 *   const result = await Platform.PhotoPicker.pickImage();
 *   const results = await Platform.PhotoPicker.pickMultiple(5);
 *   const video = await Platform.PhotoPicker.pickVideo();
 */

import { Capacitor } from '@capacitor/core';

// ─── Platform detection ──────────────────────────────────────────────────────

const Platform = {
  /** Returns true when running as a compiled native Android APK/AAB. */
  isAndroid: () => Capacitor.getPlatform() === 'android',

  /** Returns true when running as a compiled native iOS app. */
  isIOS: () => Capacitor.getPlatform() === 'ios',

  /** Returns true on any native Capacitor platform (Android or iOS). */
  isNative: () => Capacitor.isNativePlatform(),

  /** Returns true when running in the browser (not a native app). */
  isWeb: () => !Capacitor.isNativePlatform(),

  /** Returns the platform name: 'android' | 'ios' | 'web' */
  name: () => Capacitor.getPlatform(),

  // ─── Photo Picker Router ────────────────────────────────────────────────────
  //
  // All UI components MUST call Platform.PhotoPicker.* — never import
  // AndroidPhotoPicker or WebPhotoPicker directly.
  //
  // Android  → AndroidPhotoPicker  (system Photo Picker, ZERO permissions)
  // Web/iOS  → WebPhotoPicker      (browser <input type="file">)
  //
  PhotoPicker: {
    /**
     * Pick a single photo.
     * Android: opens system Photo Picker (no permission required).
     * Web:     opens browser file chooser.
     *
     * @returns {Promise<{file: File, previewUrl: string} | null>}
     */
    async pickImage() {
      if (Capacitor.getPlatform() === 'android') {
        const { pickImage } = await import('./android/AndroidPhotoPicker.js');
        return pickImage();
      }
      const { pickImage } = await import('./web/WebPhotoPicker.js');
      return pickImage();
    },

    /**
     * Pick multiple photos.
     * Android: opens system multi-select Photo Picker (no permission required).
     * Web:     opens browser file chooser with multiple=true.
     *
     * @param {number} limit - Max photos (default 10)
     * @returns {Promise<Array<{file: File, previewUrl: string}>>}
     */
    async pickMultiple(limit = 10) {
      if (Capacitor.getPlatform() === 'android') {
        const { pickMultiple } = await import('./android/AndroidPhotoPicker.js');
        return pickMultiple(limit);
      }
      const { pickMultiple } = await import('./web/WebPhotoPicker.js');
      return pickMultiple(limit);
    },

    /**
     * Pick a single video.
     * Android: opens system Photo Picker (no permission required).
     * Web:     opens browser file chooser filtered to video/*.
     *
     * @returns {Promise<{file: File, previewUrl: string} | null>}
     */
    async pickVideo() {
      if (Capacitor.getPlatform() === 'android') {
        const { pickVideo } = await import('./android/AndroidPhotoPicker.js');
        return pickVideo();
      }
      const { pickVideo } = await import('./web/WebPhotoPicker.js');
      return pickVideo();
    },
  },
};

export default Platform;
