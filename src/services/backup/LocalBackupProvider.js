/**
 * LocalBackupProvider.js — Bakery Vault Local Storage Provider
 *
 * Handles local backup operations:
 *  - Save encrypted .ccbkp to device (Capacitor Filesystem or browser download)
 *  - List local backups from device storage
 *  - Read local backup files
 *  - Export via share sheet for manual transfer
 *  - Import from file picker
 */

import { Capacitor } from '@capacitor/core';
import { log } from '../../utils/logger';

const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

const BACKUP_DIR = 'CreamCrustBackups';

// ── Save ────────────────────────────────────────────────────────────────

/**
 * Save an encrypted .ccbkp backup to local device storage.
 *
 * Native: Saves to Documents/CreamCrustBackups/ via Capacitor Filesystem
 * Web: Triggers browser download
 *
 * @param {Uint8Array} encryptedData
 * @param {string} fileName - e.g., "bakery-vault-2026-07-31.ccbkp"
 * @returns {Promise<{ success: boolean, filePath?: string }>}
 */
export async function save(encryptedData, fileName) {
  if (isNative()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      // Ensure directory exists
      try {
        await Filesystem.mkdir({
          path: BACKUP_DIR,
          directory: Directory.Documents,
          recursive: true,
        });
      } catch {
        // Directory may already exist
      }

      // Convert Uint8Array to base64
      let binary = '';
      for (let i = 0; i < encryptedData.length; i++) {
        binary += String.fromCharCode(encryptedData[i]);
      }
      const base64Data = btoa(binary);

      const result = await Filesystem.writeFile({
        path: `${BACKUP_DIR}/${fileName}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      log.share('[Vault:Local] Saved backup to:', result.uri);
      return { success: true, filePath: result.uri };
    } catch (e) {
      log.share.error('[Vault:Local] Failed to save locally:', e?.message);

      // Fallback: try share sheet
      return await exportViaShareSheet(encryptedData, fileName);
    }
  }

  // Web: trigger browser download
  return triggerBrowserDownload(encryptedData, fileName);
}

/**
 * Trigger a browser file download.
 */
function triggerBrowserDownload(data, fileName) {
  try {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { success: true, filePath: null };
  } catch (e) {
    log.share.error('[Vault:Local] Browser download failed:', e?.message);
    return { success: false };
  }
}

// ── List ────────────────────────────────────────────────────────────────

/**
 * List local .ccbkp backup files.
 * @returns {Promise<Array<{ name: string, path: string, size: number, modifiedTime: string }>>}
 */
export async function listLocal() {
  if (!isNative()) {
    // Web: cannot list local filesystem — return empty
    return [];
  }

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');

    const result = await Filesystem.readdir({
      path: BACKUP_DIR,
      directory: Directory.Documents,
    });

    const backups = (result.files || [])
      .filter((f) => f.name?.endsWith('.ccbkp'))
      .map((f) => ({
        name: f.name,
        path: `${BACKUP_DIR}/${f.name}`,
        size: f.size || 0,
        modifiedTime: f.mtime ? new Date(f.mtime).toISOString() : null,
      }))
      .sort((a, b) => (b.modifiedTime || '').localeCompare(a.modifiedTime || ''));

    return backups;
  } catch (e) {
    log.share.warn('[Vault:Local] Failed to list local backups:', e?.message);
    return [];
  }
}

// ── Read ────────────────────────────────────────────────────────────────

/**
 * Read a local .ccbkp backup file.
 * @param {string} filePath - Relative path within Documents
 * @returns {Promise<Uint8Array>}
 */
export async function read(filePath) {
  if (!isNative()) {
    throw new Error('Local file reading requires the native app');
  }

  const { Filesystem, Directory } = await import('@capacitor/filesystem');

  const result = await Filesystem.readFile({
    path: filePath,
    directory: Directory.Documents,
  });

  // result.data is base64
  const binary = atob(result.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Export (Share Sheet) ────────────────────────────────────────────────

/**
 * Export a backup via the native share sheet for manual transfer.
 * @param {Uint8Array} encryptedData
 * @param {string} fileName
 * @returns {Promise<{ success: boolean }>}
 */
export async function exportViaShareSheet(encryptedData, fileName) {
  if (!isNative()) {
    // Web: just download
    return triggerBrowserDownload(encryptedData, fileName);
  }

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    // Write to cache first
    let binary = '';
    for (let i = 0; i < encryptedData.length; i++) {
      binary += String.fromCharCode(encryptedData[i]);
    }
    const base64Data = btoa(binary);

    const writeResult = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title: 'Bakery Vault Backup',
      text: 'Cream & Crust encrypted backup file',
      url: writeResult.uri,
      dialogTitle: 'Export Backup',
    });

    return { success: true };
  } catch (e) {
    log.share.warn('[Vault:Local] Share sheet export failed:', e?.message);
    return { success: false };
  }
}

// ── Import (File Picker) ────────────────────────────────────────────────

/**
 * Import a .ccbkp file from a File object (from <input type="file">).
 * @param {File} file
 * @returns {Promise<Uint8Array>}
 */
export async function importFromFile(file) {
  if (!file) throw new Error('No file selected');

  if (!file.name?.endsWith('.ccbkp') && !file.name?.endsWith('.json')) {
    throw new Error('Please select a valid Bakery Vault backup file (.ccbkp)');
  }

  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

// ── Delete ──────────────────────────────────────────────────────────────

/**
 * Delete a local backup file.
 * @param {string} filePath
 */
export async function deleteLocal(filePath) {
  if (!isNative()) return;

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    await Filesystem.deleteFile({
      path: filePath,
      directory: Directory.Documents,
    });
    log.share('[Vault:Local] Deleted local backup:', filePath);
  } catch (e) {
    log.share.warn('[Vault:Local] Failed to delete:', e?.message);
  }
}
