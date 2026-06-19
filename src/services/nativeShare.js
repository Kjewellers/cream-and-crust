/**
 * nativeShare.js — Capacitor-native file sharing helper
 *
 * Replaces browser-only blob URL tricks (navigator.share with blobs,
 * anchor clicks, clipboard writes) with proper Capacitor APIs that work
 * reliably inside an Android APK/AAB WebView.
 *
 * Strategy:
 *  1. Convert ArrayBuffer/Blob/base64 → base64 string
 *  2. Write to the CACHE directory via @capacitor/filesystem
 *     (no permissions needed for the cache dir on any Android version)
 *  3. Share via @capacitor/share which produces the native share sheet,
 *     letting the user pick WhatsApp, Gmail, Telegram, etc.
 *
 * On web/browser: falls back to navigator.share → anchor-click download.
 */

import { Capacitor } from '@capacitor/core';
import { log } from '../utils/logger';

const isNative = () => Capacitor.isNativePlatform();

// ─── Blob → base64 ────────────────────────────────────────────────────────────

/**
 * Convert a Blob to a base64 data string (without the data: prefix).
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is "data:application/pdf;base64,XXXXX"
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Write file to Capacitor cache ───────────────────────────────────────────

/**
 * Write a base64 string to the Capacitor CACHE directory and return
 * the native URI that can be passed to Share.share({ url }).
 *
 * CACHE dir requires NO permissions on Android 10+ or iOS.
 *
 * @param {string} base64Data  Raw base64 (no data: prefix)
 * @param {string} fileName    e.g. "Invoice_001.pdf"
 * @returns {Promise<string>}  Native URI (file:// path)
 */
async function writeFileToCache(base64Data, fileName) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');

  // Retry once on failure (some devices flake on first write)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      log.share('writeFileToCache: success on attempt', attempt + 1, result.uri);
      return result.uri;
    } catch (e) {
      log.share.warn('writeFileToCache: attempt', attempt + 1, 'failed:', e?.message);
      if (attempt === 1) throw e;
      // Wait briefly before retry
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

// ─── Native share via @capacitor/share ───────────────────────────────────────

/**
 * Share a file natively on Android/iOS, with web fallback.
 *
 * @param {Object} opts
 * @param {Blob}   opts.blob       The file blob to share
 * @param {string} opts.fileName   File name with extension
 * @param {string} opts.title      Share sheet title
 * @param {string} opts.text       Optional text shown in share sheet
 * @param {string} [opts.mimeType] MIME type override (auto-detected if omitted)
 * @returns {Promise<{shared: boolean, uri?: string}>}
 */
export async function nativeShareFile({ blob, fileName, title, text, mimeType }) {
  log.share('nativeShareFile: starting share for', fileName);

  if (isNative()) {
    try {
      const base64 = await blobToBase64(blob);
      const uri = await writeFileToCache(base64, fileName);

      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: title || fileName,
        text: text || '',
        url: uri,
        dialogTitle: title || 'Share file',
      });

      log.share('nativeShareFile: native share succeeded');

      // Cleanup: delete cached file after a short delay
      setTimeout(async () => {
        try {
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          await Filesystem.deleteFile({
            path: fileName,
            directory: Directory.Cache,
          });
          log.share('nativeShareFile: cleaned up cached file', fileName);
        } catch {
          // Cleanup is best-effort
        }
      }, 5000);

      return { shared: true, uri };
    } catch (e) {
      // User cancellation is not an error
      if (e?.message?.includes('cancel') || e?.message?.includes('dismissed')) {
        log.share('nativeShareFile: user cancelled sharing');
        return { shared: false };
      }
      log.share.error('nativeShareFile: native share failed:', e?.message || e);
      throw e;
    }
  }

  // ── Web fallback ─────────────────────────────────────────────────────────────
  log.share('nativeShareFile: using web fallback');

  const fileObj = new File([blob], fileName, {
    type: mimeType || blob.type || 'application/octet-stream',
  });

  // Try Web Share API Level 2 (works on some Android Chrome / iOS Safari)
  if (navigator.share && navigator.canShare?.({ files: [fileObj] })) {
    try {
      await navigator.share({
        files: [fileObj],
        title: title || fileName,
        text: text || '',
      });
      log.share('nativeShareFile: web share API succeeded');
      return { shared: true };
    } catch (e) {
      if (e?.name !== 'AbortError') {
        log.share.warn('nativeShareFile: web share API failed, falling back to download:', e?.message);
      }
    }
  }

  // Anchor-click download as last resort
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);

  log.share('nativeShareFile: triggered download via anchor click');
  return { shared: false };
}

// ─── Save file to cache (no share dialog) ────────────────────────────────────

/**
 * Write a blob to the cache directory without opening the share sheet.
 * Returns the native file URI on native, or triggers a download on web.
 *
 * @param {Object} opts
 * @param {Blob}   opts.blob
 * @param {string} opts.fileName
 * @returns {Promise<string|null>}  URI on native, null on web
 */
export async function saveFileToCache({ blob, fileName }) {
  if (isNative()) {
    const base64 = await blobToBase64(blob);
    return writeFileToCache(base64, fileName);
  }

  // Web: trigger download
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  return null;
}

/**
 * Save a file to the user's public Documents directory on native, or download on web.
 */
export async function saveFileToDocuments({ blob, fileName }) {
  if (isNative()) {
    try {
      const { requestStoragePermission } = await import('./permissions');
      const perm = await requestStoragePermission();
      if (perm !== 'granted') {
        throw new Error('Storage permission denied');
      }

      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const base64 = await blobToBase64(blob);

      // Write to Directory.Documents
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });

      log.share('saveFileToDocuments: saved to', writeResult.uri);
      return { success: true, uri: writeResult.uri };
    } catch (e) {
      log.share.error('saveFileToDocuments failed:', e?.message);
      return { success: false, error: e?.message };
    }
  }

  // Web fallback: download
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  return { success: true, uri: null };
}
