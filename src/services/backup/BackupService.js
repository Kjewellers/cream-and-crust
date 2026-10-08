/**
 * BackupService.js — Bakery Vault Central Orchestrator
 *
 * Coordinates backup creation across providers:
 *  - Collects data from Firestore (incremental via BackupChangeTracker)
 *  - Only backs up Cloudinary URLs for images (no binaries)
 *  - Encrypts via EncryptionService
 *  - Routes to GoogleDriveBackupProvider or LocalBackupProvider
 *  - Emits user-friendly progress messages
 *  - Updates backup manifest after success
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { log } from '../../utils/logger';
import { encryptBackup } from './EncryptionService';
import {
  getDirtyRecords,
  needsFullBackup,
  clearDirtyRecords,
  saveBackupManifest,
  getLastBackupManifest,
  BACKUP_COLLECTIONS,
} from './BackupChangeTracker';
import * as GoogleDrive from './GoogleDriveBackupProvider';
import * as LocalProvider from './LocalBackupProvider';
import { computeBackupHealthScore, isVerificationDue, recordVerification } from './BackupVerificationEngine';

const BACKUP_META_KEY = 'cc_vault_backup_meta';

// ── Provider Types ──────────────────────────────────────────────────────

export const PROVIDERS = Object.freeze({
  GOOGLE_DRIVE: 'google_drive',
  LOCAL: 'local',
  NONE: 'none',
});

// ── Backup Meta ─────────────────────────────────────────────────────────

const DEFAULT_META = {
  lastBackupTimestamp: null,
  backupSizeBytes: 0,
  provider: PROVIDERS.GOOGLE_DRIVE,
  frequency: 'weekly',
  wifiOnly: true,
  chargingOnly: false,
  lastVerificationPassed: true,
  deviceName: null,
  appVersion: '1.1.23',
  categories: {
    orders: true,
    customers: true,
    products: true,
    inventory: true,
    recipes: true,
    expenses: true,
    settings: true,
  },
};

export function getBackupMeta() {
  try {
    const raw = localStorage.getItem(BACKUP_META_KEY);
    return raw ? { ...DEFAULT_META, ...JSON.parse(raw) } : { ...DEFAULT_META };
  } catch {
    return { ...DEFAULT_META };
  }
}

export function updateBackupMeta(partial) {
  const current = getBackupMeta();
  const updated = { ...current, ...partial };
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(updated));
  return updated;
}

// ── Backup Status ───────────────────────────────────────────────────────

/**
 * Get comprehensive backup status for the UI.
 */
export function getBackupStatus() {
  const meta = getBackupMeta();
  const manifest = getLastBackupManifest();
  const health = computeBackupHealthScore({
    lastBackupTimestamp: meta.lastBackupTimestamp,
    backupSizeBytes: meta.backupSizeBytes,
    lastVerificationPassed: meta.lastVerificationPassed,
    provider: meta.provider,
  });

  return {
    ...meta,
    ...health,
    manifest,
    hasBackup: !!meta.lastBackupTimestamp,
    verificationDue: isVerificationDue(),
  };
}

// ── Data Collection ─────────────────────────────────────────────────────

/**
 * Fetch all documents from a user subcollection.
 */
async function fetchCollection(uid, collectionName) {
  try {
    const snap = await getDocs(collection(db, `users/${uid}/${collectionName}`));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    log.share.warn(`[Vault] Failed to fetch ${collectionName}:`, e?.message);
    return [];
  }
}

/**
 * Strip image binaries from records — keep only Cloudinary URLs + metadata.
 * This follows the "don't back up image binaries" directive.
 */
function stripImageBinaries(records) {
  return records.map((record) => {
    const cleaned = { ...record };

    // Replace any base64 image data with just the URL reference
    for (const [key, value] of Object.entries(cleaned)) {
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        // This is a base64 image — strip it, keep only a placeholder
        cleaned[key] = null;
        cleaned[`${key}_stripped`] = true;
      }
    }

    // Keep Cloudinary URLs as-is (they're just URL strings)
    // Keep image metadata if present
    if (cleaned.image && typeof cleaned.image === 'string' && cleaned.image.startsWith('http')) {
      cleaned._imageRef = {
        url: cleaned.image,
        source: 'cloudinary',
      };
    }

    return cleaned;
  });
}

/**
 * Collect backup data from Firestore.
 * Uses incremental strategy when possible.
 *
 * @param {string} uid
 * @param {object} categories - Which categories to include
 * @param {function} [onProgress]
 * @returns {Promise<object>} Backup payload
 */
async function collectBackupData(uid, categories, onProgress) {
  onProgress?.({ step: 'collecting', message: 'Preparing backup...', percent: 5 });

  const isIncremental = !needsFullBackup();
  const dirtyInfo = getDirtyRecords();

  const data = {};
  const collectionCounts = {};
  const enabledCollections = BACKUP_COLLECTIONS.filter((c) => categories[c] !== false);

  let completed = 0;
  const total = enabledCollections.length;

  for (const col of enabledCollections) {
    const pct = Math.round(5 + (completed / total) * 35);
    onProgress?.({ step: 'collecting', message: `Reading ${col}...`, percent: pct });

    if (isIncremental && dirtyInfo.totalDirty > 0) {
      // Incremental: fetch only dirty records for this collection
      const dirtyIds = dirtyInfo.records
        .filter((r) => r.collection === col)
        .map((r) => r.recordId);

      if (dirtyIds.length === 0) {
        completed++;
        continue; // Nothing changed in this collection
      }

      // Fetch all and filter to dirty (Firestore doesn't support IN queries > 30 items reliably)
      const allRecords = await fetchCollection(uid, col);
      const dirtySet = new Set(dirtyIds);
      data[col] = stripImageBinaries(allRecords.filter((r) => dirtySet.has(r.id)));
    } else {
      // Full backup
      const records = await fetchCollection(uid, col);
      data[col] = stripImageBinaries(records);
    }

    collectionCounts[col] = data[col]?.length || 0;
    completed++;
  }

  // Detect device info
  let deviceName = 'Unknown Device';
  try {
    const ua = navigator.userAgent;
    if (ua.includes('SM-')) deviceName = ua.match(/SM-[^\s;)]+/)?.[0] || 'Samsung Device';
    else if (ua.includes('Pixel')) deviceName = 'Google Pixel';
    else if (ua.includes('Android')) deviceName = 'Android Device';
    else if (ua.includes('iPhone')) deviceName = 'iPhone';
    else deviceName = navigator.platform || 'Web Browser';
  } catch {}

  const totalRecords = Object.values(collectionCounts).reduce((a, b) => a + b, 0);

  return {
    version: '2.0.0',
    app: 'Cream & Crust',
    backupType: isIncremental ? 'incremental' : 'full',
    createdAt: new Date().toISOString(),
    uid,
    deviceName,
    appVersion: DEFAULT_META.appVersion,
    collectionCounts,
    totalRecords,
    data,
  };
}

// ── Create Backup ───────────────────────────────────────────────────────

/**
 * Create a backup — the main entry point.
 *
 * @param {string} uid
 * @param {object} options
 * @param {'google_drive'|'local'} [options.provider]
 * @param {function} [options.onProgress] - ({ step, message, percent }) => void
 * @returns {Promise<{ success: boolean, fileName: string, sizeBytes: number, provider: string }>}
 */
export async function createBackup(uid, options = {}) {
  if (!uid) throw new Error('Please sign in to create a backup');

  const meta = getBackupMeta();
  const provider = options.provider || meta.provider || PROVIDERS.GOOGLE_DRIVE;
  const onProgress = options.onProgress;

  log.share(`[Vault] Starting ${provider} backup for UID:`, uid);

  try {
    // 1. Collect data
    const payload = await collectBackupData(uid, meta.categories, onProgress);

    // 2. Encrypt
    onProgress?.({ step: 'encrypting', message: 'Encrypting your bakery data...', percent: 45 });
    const encrypted = await encryptBackup(payload, uid, (p) => {
      onProgress?.({ ...p, percent: 45 + (p.percent || 0) * 0.25 });
    });

    // 3. Generate file name
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '');
    const fileName = `bakery-vault-${dateStr}-${timeStr}.ccbkp`;

    // 4. Upload to provider
    let result;
    if (provider === PROVIDERS.GOOGLE_DRIVE) {
      onProgress?.({ step: 'uploading', message: 'Uploading securely...', percent: 75 });
      result = await GoogleDrive.upload(encrypted, fileName, (p) => {
        onProgress?.({ ...p, percent: 75 + (p.percent || 0) * 0.2 });
      });
    } else {
      onProgress?.({ step: 'saving', message: 'Saving to device...', percent: 80 });
      result = await LocalProvider.save(encrypted, fileName);
      result.sizeBytes = encrypted.length;
    }

    // 5. Update metadata & manifest
    const sizeBytes = result.sizeBytes || encrypted.length;
    updateBackupMeta({
      lastBackupTimestamp: Date.now(),
      backupSizeBytes: sizeBytes,
      provider,
      deviceName: payload.deviceName,
      lastVerificationPassed: true,
    });

    saveBackupManifest({
      backupId: result.fileId || fileName,
      timestamp: Date.now(),
      collectionCounts: payload.collectionCounts,
      totalRecords: payload.totalRecords,
      provider,
      sizeBytes,
    });

    // 6. Clear dirty records queue
    clearDirtyRecords();

    onProgress?.({ step: 'complete', message: 'Backup finished!', percent: 100 });

    log.share(`[Vault] Backup complete: ${fileName} (${formatBytes(sizeBytes)})`);

    return {
      success: true,
      fileName,
      sizeBytes,
      sizeLabel: formatBytes(sizeBytes),
      provider,
      totalRecords: payload.totalRecords,
      collectionCounts: payload.collectionCounts,
      backupType: payload.backupType,
    };
  } catch (e) {
    log.share.error('[Vault] Backup failed:', e?.message);

    // If cloud backup fails, don't affect app usage — offer local fallback
    if (provider === PROVIDERS.GOOGLE_DRIVE) {
      onProgress?.({ step: 'error', message: 'Cloud backup failed. Try local backup.', percent: 0 });
    }

    throw e;
  }
}

// ── Cancel ──────────────────────────────────────────────────────────────

let _cancelFlag = false;

export function cancelBackup() {
  _cancelFlag = true;
}

export function isCancelled() {
  return _cancelFlag;
}

export function resetCancelFlag() {
  _cancelFlag = false;
}

// ── Silent Verification ─────────────────────────────────────────────────

/**
 * Perform silent 30-day verification of the latest cloud backup.
 * Downloads metadata only, verifies checksum and encryption.
 */
export async function performSilentVerification() {
  if (!isVerificationDue()) return { skipped: true };

  try {
    const backups = await GoogleDrive.list();
    if (backups.length === 0) {
      recordVerification();
      return { verified: false, reason: 'No cloud backups found' };
    }

    // Download the latest backup
    const latest = backups[0];
    const data = await GoogleDrive.download(latest.id);

    // Import verification engine
    const { verifyBackup } = await import('./BackupVerificationEngine');
    const result = await verifyBackup(data);

    recordVerification();
    updateBackupMeta({ lastVerificationPassed: result.valid });

    if (!result.valid) {
      log.share.warn('[Vault] Silent verification FAILED for:', latest.name);
    } else {
      log.share('[Vault] Silent verification passed for:', latest.name);
    }

    return { verified: true, result };
  } catch (e) {
    log.share.warn('[Vault] Silent verification error:', e?.message);
    recordVerification(); // Still record so we don't retry immediately
    return { verified: false, reason: e?.message };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
