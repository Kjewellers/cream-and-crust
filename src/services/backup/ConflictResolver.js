/**
 * ConflictResolver.js — Bakery Vault Conflict Resolution Engine
 *
 * Detects and resolves conflicts when restoring data where local records
 * and cloud/backup records diverge.
 *
 * Resolution strategies:
 *  - KEEP_LOCAL: Preserve the local version
 *  - KEEP_CLOUD: Use the backup/cloud version
 *  - MERGE: Newer timestamp wins per-field
 *  - Auto-resolve: Non-conflicting records applied silently
 */

import { log } from '../../utils/logger';

export const RESOLUTION_STRATEGIES = Object.freeze({
  KEEP_LOCAL: 'keep_local',
  KEEP_CLOUD: 'keep_cloud',
  MERGE: 'merge',
});

/**
 * @typedef {Object} Conflict
 * @property {string} collection
 * @property {string} recordId
 * @property {object} localVersion
 * @property {object} cloudVersion
 * @property {'modified'|'deleted_local'|'deleted_cloud'} conflictType
 * @property {number} localTimestamp
 * @property {number} cloudTimestamp
 * @property {string[]} changedFields
 */

/**
 * Extract a comparable timestamp from a record.
 * Handles Firestore Timestamp objects, ISO strings, and epoch numbers.
 */
function getRecordTimestamp(record) {
  const ts = record?.updatedAt || record?.modifiedAt || record?.createdAt;
  if (!ts) return 0;

  // Firestore Timestamp
  if (ts?.seconds) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6;
  if (ts?.toMillis) return ts.toMillis();

  // ISO string
  if (typeof ts === 'string') return new Date(ts).getTime();

  // Epoch number
  if (typeof ts === 'number') return ts;

  return 0;
}

/**
 * Find fields that differ between two records.
 * Ignores metadata fields like id, restoredAt, _backupMeta.
 */
function findChangedFields(local, cloud) {
  const ignore = new Set(['id', 'restoredAt', '_backupMeta', 'updatedAt', 'modifiedAt', 'createdAt']);
  const allKeys = new Set([
    ...Object.keys(local || {}),
    ...Object.keys(cloud || {}),
  ]);

  const changed = [];
  for (const key of allKeys) {
    if (ignore.has(key)) continue;
    if (JSON.stringify(local?.[key]) !== JSON.stringify(cloud?.[key])) {
      changed.push(key);
    }
  }
  return changed;
}

/**
 * Detect conflicts between local Firestore data and backup data.
 *
 * @param {Object<string, object[]>} localData - Current Firestore records by collection
 * @param {Object<string, object[]>} cloudData - Backup records by collection
 * @returns {{ conflicts: Conflict[], autoResolved: object[], newRecords: object[] }}
 */
export function detectConflicts(localData, cloudData) {
  const conflicts = [];
  const autoResolved = [];
  const newRecords = [];

  for (const [collection, cloudRecords] of Object.entries(cloudData || {})) {
    if (!Array.isArray(cloudRecords)) continue;

    const localRecords = localData?.[collection] || [];
    const localMap = new Map(localRecords.map((r) => [r.id, r]));

    for (const cloudRecord of cloudRecords) {
      if (!cloudRecord.id) continue;

      const localRecord = localMap.get(cloudRecord.id);

      if (!localRecord) {
        // New record from backup — no conflict
        newRecords.push({ collection, record: cloudRecord });
        continue;
      }

      const localTs = getRecordTimestamp(localRecord);
      const cloudTs = getRecordTimestamp(cloudRecord);
      const changedFields = findChangedFields(localRecord, cloudRecord);

      if (changedFields.length === 0) {
        // Records are identical — skip
        continue;
      }

      if (localTs === cloudTs || Math.abs(localTs - cloudTs) < 1000) {
        // Timestamps nearly identical — auto-resolve with cloud (backup) version
        autoResolved.push({ collection, record: cloudRecord, strategy: RESOLUTION_STRATEGIES.KEEP_CLOUD });
        continue;
      }

      // Both have changes with different timestamps — true conflict
      conflicts.push({
        collection,
        recordId: cloudRecord.id,
        localVersion: localRecord,
        cloudVersion: cloudRecord,
        conflictType: 'modified',
        localTimestamp: localTs,
        cloudTimestamp: cloudTs,
        changedFields,
      });
    }
  }

  log.share(
    `[ConflictResolver] Detected: ${conflicts.length} conflicts, ` +
    `${autoResolved.length} auto-resolved, ${newRecords.length} new records`
  );

  return { conflicts, autoResolved, newRecords };
}

/**
 * Resolve a single conflict.
 *
 * @param {Conflict} conflict
 * @param {string} strategy - 'keep_local' | 'keep_cloud' | 'merge'
 * @returns {object} The resolved record
 */
export function resolveConflict(conflict, strategy) {
  switch (strategy) {
    case RESOLUTION_STRATEGIES.KEEP_LOCAL:
      return { ...conflict.localVersion };

    case RESOLUTION_STRATEGIES.KEEP_CLOUD:
      return { ...conflict.cloudVersion };

    case RESOLUTION_STRATEGIES.MERGE: {
      // Field-level merge: for each changed field, pick the newer version
      const merged = { ...conflict.localVersion };

      for (const field of conflict.changedFields) {
        if (conflict.cloudTimestamp > conflict.localTimestamp) {
          // Cloud is newer — use cloud value for this field
          merged[field] = conflict.cloudVersion[field];
        }
        // Otherwise keep local (already in merged)
      }

      merged.mergedAt = new Date().toISOString();
      merged.mergeSource = 'conflict_resolution';
      return merged;
    }

    default:
      return { ...conflict.localVersion };
  }
}

/**
 * Resolve all conflicts with a batch strategy.
 *
 * @param {Conflict[]} conflicts
 * @param {string} strategy - Applied to all
 * @returns {Array<{ collection: string, recordId: string, resolved: object }>}
 */
export function resolveAllConflicts(conflicts, strategy) {
  return conflicts.map((conflict) => ({
    collection: conflict.collection,
    recordId: conflict.recordId,
    resolved: resolveConflict(conflict, strategy),
  }));
}

/**
 * Generate a human-readable summary of a conflict for the UI.
 *
 * @param {Conflict} conflict
 * @returns {{ title: string, subtitle: string, localLabel: string, cloudLabel: string }}
 */
export function getConflictSummary(conflict) {
  const localDate = conflict.localTimestamp
    ? new Date(conflict.localTimestamp).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : 'Unknown';

  const cloudDate = conflict.cloudTimestamp
    ? new Date(conflict.cloudTimestamp).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : 'Unknown';

  // Derive a readable name from the record
  const name =
    conflict.localVersion?.name ||
    conflict.localVersion?.customerName ||
    conflict.localVersion?.item ||
    conflict.localVersion?.title ||
    conflict.recordId;

  return {
    title: `${conflict.collection}: ${name}`,
    subtitle: `${conflict.changedFields.length} field${conflict.changedFields.length !== 1 ? 's' : ''} differ`,
    localLabel: `This device · ${localDate}`,
    cloudLabel: `Backup · ${cloudDate}`,
  };
}
