/**
 * WhatsAppBackupManager.js
 * Compatibility wrapper bridging WhatsApp-style backup calls with Bakery Vault system.
 */

import {
  getBackupMeta as vaultGetBackupMeta,
  updateBackupMeta as vaultUpdateBackupMeta,
  PROVIDERS,
} from './backup/BackupService';
import { restoreFromLocal } from './backup/RestoreService';

export const STORAGE_MODES = Object.freeze({
  CLOUD_SYNC: 'cloud_sync',
  LOCAL_ONLY: 'local_only',
  OFFLINE: 'offline',
});

export const BACKUP_FREQUENCIES = Object.freeze({
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  OFF: 'off',
});

export function getBackupMeta() {
  const meta = vaultGetBackupMeta();
  return {
    storageMode: meta.storageMode || STORAGE_MODES.CLOUD_SYNC,
    frequency: meta.frequency || BACKUP_FREQUENCIES.WEEKLY,
    ...meta,
  };
}

export function updateBackupMeta(partial) {
  const updated = vaultUpdateBackupMeta(partial);
  return {
    storageMode: updated.storageMode || STORAGE_MODES.CLOUD_SYNC,
    frequency: updated.frequency || BACKUP_FREQUENCIES.WEEKLY,
    ...updated,
  };
}

export async function compileBackupPayload(uid) {
  return {
    app: 'Cream & Crust',
    uid,
    version: '1.1.23',
    timestamp: new Date().toISOString(),
    data: {
      orders: [],
      customers: [],
      inventory: [],
      products: [],
      recipes: [],
      expenses: [],
    },
  };
}

export async function restoreBackupData(uid, backupData) {
  if (!backupData || backupData.invalid || !backupData.app) {
    throw new Error('Invalid backup file');
  }
  return restoreFromLocal(uid, backupData);
}
