/**
 * WhatsAppBackup.test.jsx
 * Vitest Unit Test Suite for WhatsApp-Style Data Backup & Storage Settings
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBackupMeta,
  updateBackupMeta,
  compileBackupPayload,
  restoreBackupData,
  STORAGE_MODES,
  BACKUP_FREQUENCIES,
} from '../services/WhatsAppBackupManager';

describe('WhatsApp-Style Data Backup & Storage Settings Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('manages backup metadata and frequency settings cleanly', () => {
    const meta = getBackupMeta();
    expect(meta.storageMode).toBe(STORAGE_MODES.CLOUD_SYNC);

    const updated = updateBackupMeta({
      frequency: BACKUP_FREQUENCIES.DAILY,
      storageMode: STORAGE_MODES.LOCAL_ONLY,
    });

    expect(updated.frequency).toBe(BACKUP_FREQUENCIES.DAILY);
    expect(updated.storageMode).toBe(STORAGE_MODES.LOCAL_ONLY);

    const reloaded = getBackupMeta();
    expect(reloaded.frequency).toBe(BACKUP_FREQUENCIES.DAILY);
    expect(reloaded.storageMode).toBe(STORAGE_MODES.LOCAL_ONLY);
  });

  it('compiles full database JSON payload with metadata and collections', async () => {
    const payload = await compileBackupPayload('user_test_123');

    expect(payload.app).toBe('Cream & Crust');
    expect(payload.uid).toBe('user_test_123');
    expect(payload.data).toHaveProperty('orders');
    expect(payload.data).toHaveProperty('customers');
    expect(payload.data).toHaveProperty('inventory');
    expect(payload.data).toHaveProperty('products');
    expect(payload.data).toHaveProperty('recipes');
    expect(payload.data).toHaveProperty('expenses');
  });

  it('validates backup file structure during restore', async () => {
    await expect(restoreBackupData('user_123', { invalid: true })).rejects.toThrow(
      'Invalid backup file'
    );
  });
});
