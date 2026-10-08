/**
 * AndroidPhotoPicker.js
 * ─────────────────────
 * Android platform implementation of the Photo Picker API.
 *
 * Uses Capacitor Camera plugin with CameraSource.Photos which invokes
 * the Android system Photo Picker (or the built-in picker on Android 11+).
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  ZERO PERMISSIONS REQUIRED                              │
 * │                                                         │
 * │  Android Photo Picker does NOT require:                 │
 * │  ✗ READ_MEDIA_IMAGES                                    │
 * │  ✗ READ_MEDIA_VIDEO                                     │
 * │  ✗ READ_EXTERNAL_STORAGE                                │
 * │  ✗ WRITE_EXTERNAL_STORAGE                               │
 * │                                                         │
 * │  It is the Google Play-recommended approach for         │
 * │  one-time or infrequent media selection.                │
 * │                                                         │
 * │  Back-ported to Android 4.4+ via Google Play Services.  │
 * └─────────────────────────────────────────────────────────┘
 *
 * NEVER call requestPermissions for gallery/photos in this file.
 * NEVER import or use PERMISSION_TYPES.GALLERY here.
 *
 * Conforms to the Platform.PhotoPicker interface:
 *   pickImage()     → Promise<{file: File, previewUrl: string} | null>
 *   pickMultiple()  → Promise<Array<{file: File, previewUrl: string}>>
 *   pickVideo()     → Promise<{file: File, previewUrl: string} | null>
 */

import { Capacitor } from '@capacitor/core';

/** Convert a Capacitor image result into {file, previewUrl}. */
async function processImage(image) {
  if (!image?.webPath) return null;
  try {
    const response = await fetch(image.webPath);
    const blob = await response.blob();
    const format = image.format || 'jpeg';
    const filename = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${format}`;
    const file = new File([blob], filename, { type: `image/${format}` });
    return { file, previewUrl: image.webPath };
  } catch (err) {
    console.warn('[AndroidPhotoPicker] processImage error:', err);
    return null;
  }
}

/** True when a Capacitor error is just user cancellation — not a real error. */
function isUserCancellation(error) {
  const msg = (error?.message ?? '').toLowerCase();
  return (
    msg.includes('cancel') ||
    msg.includes('dismissed') ||
    msg === 'user cancelled photos app'
  );
}

/**
 * Pick a single image using the Android Photo Picker.
 * No permission required.
 *
 * @returns {Promise<{file: File, previewUrl: string} | null>}
 */
export async function pickImage() {
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,   // ← Invokes Android Photo Picker
    });
    return processImage(image);
  } catch (error) {
    if (isUserCancellation(error)) return null;
    console.error('[AndroidPhotoPicker] pickImage error:', error);
    return null;
  }
}

/**
 * Pick multiple images using the Android Photo Picker.
 * No permission required.
 *
 * @param {number} limit - Maximum number of images (default 10)
 * @returns {Promise<Array<{file: File, previewUrl: string}>>}
 */
export async function pickMultiple(limit = 10) {
  try {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.pickImages({
      quality: 90,
      limit,          // ← Multi-select Photo Picker sheet
    });
    if (!result?.photos?.length) return [];
    const processed = [];
    for (const image of result.photos) {
      const item = await processImage(image);
      if (item) processed.push(item);
    }
    return processed;
  } catch (error) {
    if (isUserCancellation(error)) return [];
    console.error('[AndroidPhotoPicker] pickMultiple error:', error);
    return [];
  }
}

/**
 * Pick a single video using the Android Photo Picker.
 * No permission required.
 *
 * Note: Capacitor Camera plugin returns video via CameraSource.Photos
 * when mediaType is set to Video. The file MIME type will be video/*.
 *
 * @returns {Promise<{file: File, previewUrl: string} | null>}
 */
export async function pickVideo() {
  try {
    const { Camera, CameraResultType, CameraSource, CameraPluginCall } = await import('@capacitor/camera');
    // Capacitor Camera picks video using the same Photos source
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
    });
    if (!image?.webPath) return null;
    const response = await fetch(image.webPath);
    const blob = await response.blob();
    // Detect MIME from the blob; fallback to mp4
    const mime = blob.type || 'video/mp4';
    const ext = mime.split('/')[1] || 'mp4';
    const filename = `video_${Date.now()}.${ext}`;
    const file = new File([blob], filename, { type: mime });
    return { file, previewUrl: image.webPath };
  } catch (error) {
    if (isUserCancellation(error)) return null;
    console.error('[AndroidPhotoPicker] pickVideo error:', error);
    return null;
  }
}

/**
 * Returns true if the Android Photo Picker API is available.
 * It is always available on Android via Capacitor Camera plugin.
 */
export function isAvailable() {
  return Capacitor.getPlatform() === 'android';
}
