/**
 * Bakery Vault — Barrel Exports
 *
 * Central entry point for the backup system.
 */

// Core services
export {
  createBackup,
  getBackupStatus,
  getBackupMeta,
  updateBackupMeta,
  cancelBackup,
  performSilentVerification,
  PROVIDERS,
} from './BackupService';

export {
  detectCloudBackup,
  getRestorePreview,
  restoreFromCloud,
  restoreFromLocal,
} from './RestoreService';

// Encryption
export {
  encryptBackup,
  decryptBackup,
  validateBackupHeader,
  getOrCreateBackupKey,
} from './EncryptionService';

// Providers
export {
  getConnectedAccount as getGDriveAccount,
  connect as connectGoogleDrive,
  disconnect as disconnectGoogleDrive,
  isGoogleSignedIn,
  isPhoneOnlyUser,
  list as listGDriveBackups,
  download as downloadGDriveBackup,
  getQuota as getGDriveQuota,
} from './GoogleDriveBackupProvider';

export {
  save as saveLocalBackup,
  listLocal as listLocalBackups,
  read as readLocalBackup,
  exportViaShareSheet,
  importFromFile,
} from './LocalBackupProvider';

// Change tracking
export {
  markDirty,
  markDirtyBatch,
  getDirtyCount,
  getDirtyCounts,
  needsFullBackup,
  getLastBackupManifest,
  BACKUP_COLLECTIONS,
} from './BackupChangeTracker';

// Verification
export {
  verifyBackup,
  validateBackupSchema,
  isCorrupted,
  computeBackupHealthScore,
  isVerificationDue,
} from './BackupVerificationEngine';

// Conflict resolution
export {
  detectConflicts,
  resolveConflict,
  resolveAllConflicts,
  getConflictSummary,
  RESOLUTION_STRATEGIES,
} from './ConflictResolver';

// Scheduler
export {
  initScheduler,
  destroyScheduler,
  checkPreconditions,
  onSignificantDataChange,
  setActiveFlow,
  clearActiveFlow,
  getSchedulerInfo,
} from './BackupScheduler';
