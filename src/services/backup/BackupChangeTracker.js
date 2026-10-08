/**
 * BackupChangeTracker.js — Dirty Record Queue
 *
 * Tracks which records have been modified/created/deleted since the last backup.
 * Enables true incremental backups — only changed data is included.
 *
 * Architecture:
 *  - Each write operation calls `markDirty(collection, recordId, operation)`
 *  - On backup, `getDirtyRecords()` returns only changed record IDs
 *  - After successful backup, `clearDirtyRecords()` resets the queue
 *  - Falls back to full backup if tracker state is corrupted or missing
 */

import { log } from '../../utils/logger';

const TRACKER_KEY = 'cc_backup_change_tracker';
const LAST_BACKUP_MANIFEST_KEY = 'cc_backup_last_manifest';

// All trackable collections
export const BACKUP_COLLECTIONS = [
  'orders',
  'customers',
  'products',
  'inventory',
  'recipes',
  'expenses',
  'settings',
];

/**
 * @typedef {Object} DirtyRecord
 * @property {string} collection
 * @property {string} recordId
 * @property {'create'|'update'|'delete'} operation
 * @property {number} timestamp
 */

/**
 * Read the current dirty record queue from localStorage.
 * @returns {DirtyRecord[]}
 */
function readQueue() {
  try {
    const raw = localStorage.getItem(TRACKER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Write the dirty record queue to localStorage.
 * @param {DirtyRecord[]} queue
 */
function writeQueue(queue) {
  try {
    localStorage.setItem(TRACKER_KEY, JSON.stringify(queue));
  } catch (e) {
    log.share.warn('[ChangeTracker] Failed to persist queue:', e?.message);
  }
}

/**
 * Mark a record as dirty (modified since last backup).
 * Deduplicates by collection + recordId — keeps the latest operation.
 *
 * @param {string} collectionName
 * @param {string} recordId
 * @param {'create'|'update'|'delete'} operation
 */
export function markDirty(collectionName, recordId, operation = 'update') {
  if (!collectionName || !recordId) return;

  const queue = readQueue();

  // Remove existing entry for same collection + recordId (dedup)
  const filtered = queue.filter(
    (r) => !(r.collection === collectionName && r.recordId === recordId)
  );

  filtered.push({
    collection: collectionName,
    recordId,
    operation,
    timestamp: Date.now(),
  });

  writeQueue(filtered);
}

/**
 * Mark multiple records as dirty in one batch.
 * @param {Array<{ collection: string, recordId: string, operation?: string }>} records
 */
export function markDirtyBatch(records) {
  if (!Array.isArray(records) || records.length === 0) return;

  const queue = readQueue();
  const keySet = new Set();

  // Build removal set
  for (const r of records) {
    keySet.add(`${r.collection}:${r.recordId}`);
  }

  // Remove existing entries for these records
  const filtered = queue.filter(
    (r) => !keySet.has(`${r.collection}:${r.recordId}`)
  );

  // Add new entries
  const now = Date.now();
  for (const r of records) {
    if (r.collection && r.recordId) {
      filtered.push({
        collection: r.collection,
        recordId: r.recordId,
        operation: r.operation || 'update',
        timestamp: now,
      });
    }
  }

  writeQueue(filtered);
}

/**
 * Get all dirty records since last backup.
 * @returns {{ records: DirtyRecord[], isFullBackup: boolean, totalDirty: number }}
 */
export function getDirtyRecords() {
  const queue = readQueue();

  // If no previous backup exists, force full backup
  const lastManifest = getLastBackupManifest();
  if (!lastManifest) {
    return { records: [], isFullBackup: true, totalDirty: 0 };
  }

  return {
    records: queue,
    isFullBackup: false,
    totalDirty: queue.length,
  };
}

/**
 * Get dirty record count per collection.
 * @returns {Object<string, number>}
 */
export function getDirtyCounts() {
  const queue = readQueue();
  const counts = {};
  for (const r of queue) {
    counts[r.collection] = (counts[r.collection] || 0) + 1;
  }
  return counts;
}

/**
 * Get total number of dirty records.
 * @returns {number}
 */
export function getDirtyCount() {
  return readQueue().length;
}

/**
 * Clear all dirty records after a successful backup.
 */
export function clearDirtyRecords() {
  writeQueue([]);
  log.share('[ChangeTracker] Cleared dirty record queue after successful backup');
}

/**
 * Check if a full backup is needed (no previous backup manifest).
 * @returns {boolean}
 */
export function needsFullBackup() {
  return !getLastBackupManifest();
}

// ── Backup Manifest ─────────────────────────────────────────────────────

/**
 * @typedef {Object} BackupManifest
 * @property {string} backupId
 * @property {number} timestamp
 * @property {Object<string, number>} collectionCounts
 * @property {number} totalRecords
 * @property {string} checksum
 * @property {string} provider - 'google_drive' | 'local'
 * @property {number} sizeBytes
 */

/**
 * Get the last backup manifest.
 * @returns {BackupManifest|null}
 */
export function getLastBackupManifest() {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_MANIFEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Save backup manifest after successful backup.
 * @param {BackupManifest} manifest
 */
export function saveBackupManifest(manifest) {
  try {
    localStorage.setItem(LAST_BACKUP_MANIFEST_KEY, JSON.stringify(manifest));
    log.share('[ChangeTracker] Saved backup manifest:', manifest.backupId);
  } catch (e) {
    log.share.warn('[ChangeTracker] Failed to save manifest:', e?.message);
  }
}

/**
 * Force the next backup to be a full backup (e.g., after restore).
 */
export function invalidateManifest() {
  localStorage.removeItem(LAST_BACKUP_MANIFEST_KEY);
  clearDirtyRecords();
  log.share('[ChangeTracker] Invalidated manifest — next backup will be full');
}
