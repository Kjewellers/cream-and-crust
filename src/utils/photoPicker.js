/**
 * photoPicker.js
 * ──────────────
 * Convenience re-exports that delegate to Platform.PhotoPicker.
 *
 * ARCHITECTURE:
 *  - pickPhoto()          → Platform.PhotoPicker.pickImage()
 *  - capturePhoto()       → Capacitor Camera (requires CAMERA permission JIT)
 *  - pickMultiplePhotos() → Platform.PhotoPicker.pickMultiple()
 *
 * Android Photo Picker (all pickPhoto/pickMultiple paths):
 *   ✅ NO READ_MEDIA_IMAGES permission
 *   ✅ NO READ_MEDIA_VIDEO permission
 *   ✅ NO READ_EXTERNAL_STORAGE permission
 *   ✅ NO permission popup of any kind
 *   ✅ Google Play Photo & Video Permissions policy: COMPLIANT
 *
 * Camera capture (capturePhoto only):
 *   Requires CAMERA permission — obtained JIT via PermissionManager.
 *
 * Web: routes to WebPhotoPicker (browser <input type="file">).
 */

import Platform from '../platform/Platform';
import { log } from './logger';
import { compressImage } from './imageCompressor';

// ─── Photo Picker (Gallery / Photo Picker) ────────────────────────────────────

/**
 * Pick a single photo using the Android Photo Picker system UI.
 *
 * NO permission is requested or needed.
 * On web, opens the browser file chooser.
 *
 * Automatically compresses and converts the picked photo to WebP format.
 *
 * @returns {Promise<{file: File, previewUrl: string} | null>}
 */
export async function pickPhoto() {
  try {
    const result = await Platform.PhotoPicker.pickImage();
    if (!result || !result.file) return result;

    const compressed = await compressImage(result.file);
    return {
      ...result,
      file: compressed,
      previewUrl: URL.createObjectURL(compressed),
    };
  } catch (error) {
    log.error('[photoPicker] pickPhoto error:', error);
    return null;
  }
}

// ─── Camera Capture (with JIT permission gate) ────────────────────────────────

/**
 * Capture a photo using the device camera.
 *
 * Requires CAMERA permission. Calls PermissionManager which will show the
 * custom Cream & Crust rationale modal before triggering the native dialog.
 *
 * Do NOT call this for gallery/photo picker — use pickPhoto() instead.
 *
 * @param {Function} requirePermissionFn - The requirePermission function from usePermissions()
 * @returns {Promise<{file: File, previewUrl: string} | null>}
 */
export async function capturePhoto(requirePermissionFn) {
  // Android JIT: show custom rationale → then native dialog → then open camera
  if (Platform.isAndroid() && typeof requirePermissionFn === 'function') {
    const { PERMISSION_TYPES } = await import('../services/PermissionManager');
    const granted = await requirePermissionFn(PERMISSION_TYPES.CAMERA);
    if (!granted) {
      log.warn('[photoPicker] Camera permission not granted, skipping capture');
      return null;
    }
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const source = Platform.isAndroid() ? CameraSource.Camera : CameraSource.Prompt;
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source,
    });
    if (!image?.webPath) return null;
    const response = await fetch(image.webPath);
    const blob = await response.blob();
    const format = image.format || 'jpeg';
    const file = new File([blob], `capture_${Date.now()}.${format}`, { type: `image/${format}` });
    return { file, previewUrl: image.webPath };
  } catch (error) {
    const msg = (error?.message ?? '').toLowerCase();
    if (msg.includes('cancel') || msg.includes('dismissed')) return null;
    log.error('[photoPicker] Camera capture error:', error);
    return null;
  }
}

// ─── Multiple Photo Picker ────────────────────────────────────────────────────

/**
 * Pick multiple photos using the Android Photo Picker.
 * NO permission is requested or needed.
 * On web, opens the browser file chooser with multiple=true.
 *
 * @param {number} limit - Maximum number of photos (default 5)
 * @returns {Promise<Array<{file: File, previewUrl: string}>>}
 */
export async function pickMultiplePhotos(limit = 5) {
  try {
    return await Platform.PhotoPicker.pickMultiple(limit);
  } catch (error) {
    log.error('[photoPicker] pickMultiplePhotos error:', error);
    return [];
  }
}
