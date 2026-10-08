/**
 * WebPhotoPicker.js
 * ─────────────────
 * Web platform implementation of the Photo Picker API.
 *
 * Uses the native browser <input type="file"> element which shows
 * the OS file chooser on desktop and the media picker on mobile browsers.
 *
 * No Capacitor plugins are used. No permissions are requested.
 * This is the fallback for the web/PWA platform only.
 *
 * Conforms to the Platform.PhotoPicker interface:
 *   pickImage()     → Promise<{file: File, previewUrl: string} | null>
 *   pickMultiple()  → Promise<Array<{file: File, previewUrl: string}>>
 *   pickVideo()     → Promise<{file: File, previewUrl: string} | null>
 */

/**
 * Show a browser file chooser and wait for the user's selection.
 *
 * @param {string} accept     - MIME type filter (e.g. "image/*")
 * @param {boolean} multiple  - Allow multiple selection
 * @returns {Promise<FileList | null>}
 */
function openFilePicker(accept, multiple = false) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';

    // Resolve with null when the dialog is dismissed without selection
    let resolved = false;
    const finish = (files) => {
      if (resolved) return;
      resolved = true;
      document.body.removeChild(input);
      resolve(files && files.length > 0 ? files : null);
    };

    input.addEventListener('change', () => finish(input.files));
    // focus event fires when the dialog closes (even if cancelled)
    window.addEventListener('focus', () => setTimeout(() => finish(null), 300), { once: true });

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Convert a File to a blob URL preview.
 * The caller is responsible for revoking the URL when done.
 *
 * @param {File} file
 * @returns {{ file: File, previewUrl: string }}
 */
function toResult(file) {
  const previewUrl = URL.createObjectURL(file);
  return { file, previewUrl };
}

/**
 * Pick a single image using the browser file chooser.
 *
 * @returns {Promise<{file: File, previewUrl: string} | null>}
 */
export async function pickImage() {
  try {
    const files = await openFilePicker('image/*', false);
    if (!files) return null;
    return toResult(files[0]);
  } catch (err) {
    console.warn('[WebPhotoPicker] pickImage error:', err);
    return null;
  }
}

/**
 * Pick multiple images using the browser file chooser.
 *
 * @param {number} limit - Maximum number of files (enforced by slicing)
 * @returns {Promise<Array<{file: File, previewUrl: string}>>}
 */
export async function pickMultiple(limit = 10) {
  try {
    const files = await openFilePicker('image/*', true);
    if (!files) return [];
    return Array.from(files)
      .slice(0, limit)
      .map(toResult);
  } catch (err) {
    console.warn('[WebPhotoPicker] pickMultiple error:', err);
    return [];
  }
}

/**
 * Pick a single video using the browser file chooser.
 *
 * @returns {Promise<{file: File, previewUrl: string} | null>}
 */
export async function pickVideo() {
  try {
    const files = await openFilePicker('video/*', false);
    if (!files) return null;
    return toResult(files[0]);
  } catch (err) {
    console.warn('[WebPhotoPicker] pickVideo error:', err);
    return null;
  }
}

/** Web picker is always available. */
export function isAvailable() {
  return true;
}
