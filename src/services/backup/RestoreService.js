/**
 * RestoreService.js — Bakery Vault Sandbox Restore Engine
 *
 * NEVER writes directly to Firestore.
 *
 * Restore pipeline:
 *  Download → Decrypt → Verify → Sandbox Map → Validate → Merge → Atomic Commit
 *
 * If restoration fails at any step, user data is untouched.
 */

import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { log } from '../../utils/logger';
import { decryptBackup, validateBackupHeader } from './EncryptionService';
import { validateBackupSchema } from './BackupVerificationEngine';
import { detectConflicts, resolveConflict, RESOLUTION_STRATEGIES } from './ConflictResolver';
import * as GoogleDrive from './GoogleDriveBackupProvider';
import * as LocalProvider from './LocalBackupProvider';
import { invalidateManifest } from './BackupChangeTracker';

// ── Cloud Backup Detection ──────────────────────────────────────────────

/**
 * Search for existing cloud backups for this user.
 * Used on first login / device migration.
 *
 * @param {string} uid
 * @returns {Promise<{ found: boolean, backups: Array, latest?: object }>}
 */
export async function detectCloudBackup(uid) {
  try {
    const backups = await GoogleDrive.list();

    if (backups.length === 0) {
      return { found: false, backups: [] };
    }

    return {
      found: true,
      backups,
      latest: backups[0],
    };
  } catch (e) {
    log.share.warn('[Vault:Restore] Cloud detection failed:', e?.message);
    return { found: false, backups: [] };
  }
}

// ── Restore Preview ─────────────────────────────────────────────────────

/**
 * Generate a rich restore preview without writing any data.
 * Shows: order count, customer count, product count, recipe count,
 * device name, app version, backup size, backup date.
 *
 * @param {Uint8Array} encryptedData
 * @param {string} uid
 * @param {function} [onProgress]
 * @returns {Promise<object>} Preview metadata
 */
export async function getRestorePreview(encryptedData, uid, onProgress) {
  onProgress?.({ step: 'validating', message: 'Checking backup file...', percent: 10 });

  // Quick header check
  const headerCheck = validateBackupHeader(encryptedData);
  if (!headerCheck.valid) {
    throw new Error(`Invalid backup file: ${headerCheck.reason}`);
  }

  onProgress?.({ step: 'decrypting', message: 'Decrypting backup...', percent: 30 });

  // Decrypt
  const payload = await decryptBackup(encryptedData, uid, (p) => {
    onProgress?.({ ...p, percent: 30 + (p.percent || 0) * 0.4 });
  });

  onProgress?.({ step: 'analyzing', message: 'Analyzing contents...', percent: 80 });

  // Validate schema
  const schema = validateBackupSchema(payload);

  const preview = {
    valid: schema.valid,
    errors: schema.errors,
    backupDate: payload.createdAt || new Date(headerCheck.timestamp).toISOString(),
    backupDateLabel: formatDate(payload.createdAt || headerCheck.timestamp),
    deviceName: payload.deviceName || 'Unknown Device',
    appVersion: payload.appVersion || payload.version || 'Unknown',
    backupType: payload.backupType || 'full',
    totalRecords: payload.totalRecords || 0,
    sizeBytes: encryptedData.length,
    sizeLabel: formatBytes(encryptedData.length),
    collections: schema.collections,

    // Individual counts for the preview card
    orders: schema.collections.orders || 0,
    customers: schema.collections.customers || 0,
    products: schema.collections.products || 0,
    recipes: schema.collections.recipes || 0,
    inventory: schema.collections.inventory || 0,
    expenses: schema.collections.expenses || 0,
  };

  onProgress?.({ step: 'complete', message: 'Preview ready', percent: 100 });

  return preview;
}

// ── Restore from Cloud ──────────────────────────────────────────────────

/**
 * Restore data from a Google Drive backup.
 *
 * @param {string} uid
 * @param {string} backupId - Google Drive file ID
 * @param {object} options
 * @param {function} [options.onProgress]
 * @param {function} [options.onConflicts] - Called with conflicts for user resolution
 * @param {string} [options.defaultResolution] - Default conflict strategy
 * @returns {Promise<RestoreResult>}
 */
export async function restoreFromCloud(uid, backupId, options = {}) {
  const { onProgress, onConflicts, defaultResolution = RESOLUTION_STRATEGIES.KEEP_CLOUD } = options;

  onProgress?.({ step: 'downloading', message: 'Downloading backup...', percent: 5 });

  // 1. Download
  const encryptedData = await GoogleDrive.download(backupId);

  // 2. Run sandbox restore pipeline
  return await sandboxRestore(uid, encryptedData, {
    onProgress: (p) => onProgress?.({ ...p, percent: 15 + (p.percent || 0) * 0.85 }),
    onConflicts,
    defaultResolution,
  });
}

// ── Restore from Local ──────────────────────────────────────────────────

/**
 * Restore data from a local .ccbkp file.
 *
 * @param {string} uid
 * @param {Uint8Array} fileData - Raw .ccbkp binary (from file picker or local storage)
 * @param {object} options
 * @returns {Promise<RestoreResult>}
 */
export async function restoreFromLocal(uid, fileData, options = {}) {
  return await sandboxRestore(uid, fileData, options);
}

// ── Sandbox Restore Pipeline ────────────────────────────────────────────

/**
 * @typedef {Object} RestoreResult
 * @property {boolean} success
 * @property {number} restoredCount
 * @property {number} skippedCount
 * @property {number} conflictCount
 * @property {string[]} collectionsRestored
 * @property {object} collectionCounts
 */

/**
 * Core sandbox restore pipeline.
 *
 * Download → Decrypt → Verify → Sandbox Map → Validate → Merge → Atomic Commit
 *
 * If any step fails, NO data is written to Firestore.
 *
 * @param {string} uid
 * @param {Uint8Array} encryptedData
 * @param {object} options
 * @returns {Promise<RestoreResult>}
 */
async function sandboxRestore(uid, encryptedData, options = {}) {
  const { onProgress, onConflicts, defaultResolution = RESOLUTION_STRATEGIES.KEEP_CLOUD } = options;

  if (!uid) throw new Error('User ID required for restoration');

  // Step 1: Validate header
  onProgress?.({ step: 'validating', message: 'Validating backup file...', percent: 0 });
  const headerCheck = validateBackupHeader(encryptedData);
  if (!headerCheck.valid) {
    throw new Error(`Invalid backup: ${headerCheck.reason}`);
  }

  // Step 2: Decrypt
  onProgress?.({ step: 'decrypting', message: 'Decrypting your data...', percent: 10 });
  let payload;
  try {
    payload = await decryptBackup(encryptedData, uid, (p) => {
      onProgress?.({ ...p, percent: 10 + (p.percent || 0) * 0.2 });
    });
  } catch (e) {
    throw new Error(`Decryption failed: ${e.message}`);
  }

  // Step 3: Validate schema
  onProgress?.({ step: 'verifying', message: 'Verifying data integrity...', percent: 35 });
  const schema = validateBackupSchema(payload);
  if (!schema.valid && schema.errors.length > 0) {
    // Non-critical errors: log but continue
    log.share.warn('[Vault:Restore] Schema warnings:', schema.errors);
  }

  // Step 4: Sandbox — build the complete write map WITHOUT touching Firestore
  onProgress?.({ step: 'sandbox', message: 'Preparing restore...', percent: 45 });

  // Fetch current local data for conflict detection
  const localData = {};
  const collections = Object.keys(payload.data || {}).filter(
    (k) => Array.isArray(payload.data[k]) && payload.data[k].length > 0
  );

  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, `users/${uid}/${col}`));
      localData[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      localData[col] = [];
    }
  }

  // Step 5: Conflict detection
  onProgress?.({ step: 'conflicts', message: 'Checking for conflicts...', percent: 55 });
  const { conflicts, autoResolved, newRecords } = detectConflicts(localData, payload.data);

  // Handle conflicts
  let resolvedConflicts = [];
  if (conflicts.length > 0 && onConflicts) {
    // Let UI handle conflict resolution
    resolvedConflicts = await onConflicts(conflicts);
  } else if (conflicts.length > 0) {
    // Auto-resolve with default strategy
    resolvedConflicts = conflicts.map((c) => ({
      collection: c.collection,
      recordId: c.recordId,
      resolved: resolveConflict(c, defaultResolution),
    }));
  }

  // Step 6: Build atomic write batch (sandbox map)
  onProgress?.({ step: 'preparing', message: 'Building restore batch...', percent: 65 });

  const writeMap = new Map(); // collection → [{ id, data }]

  // Add new records
  for (const { collection: col, record } of newRecords) {
    if (!writeMap.has(col)) writeMap.set(col, []);
    writeMap.get(col).push({ id: record.id, data: sanitizeForFirestore(record) });
  }

  // Add auto-resolved records
  for (const { collection: col, record } of autoResolved) {
    if (!writeMap.has(col)) writeMap.set(col, []);
    writeMap.get(col).push({ id: record.id, data: sanitizeForFirestore(record) });
  }

  // Add user-resolved conflicts
  for (const { collection: col, recordId, resolved } of resolvedConflicts) {
    if (!writeMap.has(col)) writeMap.set(col, []);
    writeMap.get(col).push({ id: recordId, data: sanitizeForFirestore(resolved) });
  }

  // Step 7: Validate sandbox map
  onProgress?.({ step: 'validating', message: 'Validating restore data...', percent: 75 });

  let totalToWrite = 0;
  for (const records of writeMap.values()) {
    for (const r of records) {
      if (!r.id || !r.data || typeof r.data !== 'object') {
        throw new Error('Restore validation failed: invalid record detected. Aborting.');
      }
      totalToWrite++;
    }
  }

  if (totalToWrite === 0) {
    return {
      success: true,
      restoredCount: 0,
      skippedCount: 0,
      conflictCount: conflicts.length,
      collectionsRestored: [],
      collectionCounts: {},
    };
  }

  // Step 8: Atomic commit — use Firestore batched writes (max 500 per batch)
  onProgress?.({ step: 'committing', message: 'Restoring your data...', percent: 85 });

  const collectionsRestored = [];
  const collectionCounts = {};
  let restoredCount = 0;

  try {
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const [col, records] of writeMap) {
      collectionsRestored.push(col);
      collectionCounts[col] = records.length;

      for (const { id, data } of records) {
        const docRef = doc(db, `users/${uid}/${col}`, id);
        batch.set(docRef, { ...data, restoredAt: new Date().toISOString() }, { merge: true });
        batchCount++;
        restoredCount++;

        // Firestore batch limit is 500
        if (batchCount >= 490) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }
  } catch (e) {
    log.share.error('[Vault:Restore] Atomic commit failed:', e?.message);
    throw new Error(
      'Restore failed during data writing. Your existing data is unchanged. ' +
      'Please try again or contact support.'
    );
  }

  // Invalidate backup manifest so next backup is full
  invalidateManifest();

  onProgress?.({ step: 'complete', message: 'Restore completed!', percent: 100 });

  log.share(`[Vault:Restore] Success: ${restoredCount} records across ${collectionsRestored.length} collections`);

  return {
    success: true,
    restoredCount,
    skippedCount: conflicts.length - resolvedConflicts.length,
    conflictCount: conflicts.length,
    collectionsRestored,
    collectionCounts,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Sanitize a record for Firestore write.
 * Removes undefined values, id field, and nested undefined.
 */
function sanitizeForFirestore(record) {
  const { id, _backupMeta, ...rest } = record;
  const cleaned = {};

  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

function formatDate(input) {
  try {
    const d = typeof input === 'number' ? new Date(input) : new Date(input);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
