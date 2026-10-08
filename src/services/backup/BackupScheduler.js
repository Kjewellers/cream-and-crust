/**
 * BackupScheduler.js — Bakery Vault Opportunistic Scheduling
 *
 * Does NOT use setInterval (unreliable in PWAs).
 *
 * Instead uses:
 *  1. App foreground events (visibilitychange) — check if backup is due
 *  2. Data change triggers — after significant data writes, queue backup
 *  3. Native Capacitor background task (when available on Android)
 *  4. Manual trigger from BackupSettingsScreen
 *
 * Conditions checked before auto-backup:
 *  - Internet available
 *  - Battery > 20%
 *  - Device idle (no active payment/invoice flow)
 *  - Wi-Fi connected (if wifi-only setting)
 */

import { Capacitor } from '@capacitor/core';
import { log } from '../../utils/logger';
import { getBackupMeta, createBackup, PROVIDERS, performSilentVerification } from './BackupService';
import { getDirtyCount } from './BackupChangeTracker';

const SCHEDULER_KEY = 'cc_vault_scheduler';
const SIGNIFICANT_CHANGE_THRESHOLD = 10; // trigger after N dirty records
const ACTIVE_FLOW_KEY = 'cc_active_flow'; // set by payment/invoice flows

let _initialized = false;
let _visibilityHandler = null;

// ── Frequency Intervals ─────────────────────────────────────────────────

const FREQUENCY_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  manual: Infinity,
  never: Infinity,
};

// ── Scheduler State ─────────────────────────────────────────────────────

function getSchedulerState() {
  try {
    const raw = localStorage.getItem(SCHEDULER_KEY);
    return raw ? JSON.parse(raw) : { lastAutoBackup: null, lastCheck: null };
  } catch {
    return { lastAutoBackup: null, lastCheck: null };
  }
}

function saveSchedulerState(state) {
  try {
    localStorage.setItem(SCHEDULER_KEY, JSON.stringify(state));
  } catch {}
}

// ── Precondition Checks ─────────────────────────────────────────────────

/**
 * Check if all preconditions are met for an auto-backup.
 * @returns {{ canBackup: boolean, reason?: string }}
 */
export function checkPreconditions() {
  // Internet
  if (!navigator.onLine) {
    return { canBackup: false, reason: 'No internet connection' };
  }

  // Active flow (payment/invoice in progress)
  try {
    const activeFlow = sessionStorage.getItem(ACTIVE_FLOW_KEY);
    if (activeFlow) {
      return { canBackup: false, reason: 'Active payment/invoice flow' };
    }
  } catch {}

  // Wi-Fi only preference
  const meta = getBackupMeta();
  if (meta.wifiOnly) {
    // On web, we can only check NetworkInformation API
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.type === 'cellular') {
      return { canBackup: false, reason: 'Cellular network (Wi-Fi only preference)' };
    }
  }

  // Battery check
  if (navigator.getBattery) {
    // Battery API check is async, so we skip it in sync check
    // It's checked separately in shouldAutoBackup()
  }

  return { canBackup: true };
}

/**
 * Full async precondition check including battery.
 */
async function checkPreconditionsAsync() {
  const sync = checkPreconditions();
  if (!sync.canBackup) return sync;

  // Battery check
  try {
    if (navigator.getBattery) {
      const battery = await navigator.getBattery();
      const meta = getBackupMeta();

      if (battery.level < 0.2 && !battery.charging) {
        return { canBackup: false, reason: 'Battery below 20%' };
      }

      if (meta.chargingOnly && !battery.charging) {
        return { canBackup: false, reason: 'Not charging (charging-only preference)' };
      }
    }
  } catch {
    // Battery API not available — proceed anyway
  }

  return { canBackup: true };
}

// ── Auto-Backup Decision ────────────────────────────────────────────────

/**
 * Determine if an auto-backup should run now.
 * @returns {boolean}
 */
function isBackupDue() {
  const meta = getBackupMeta();
  const frequency = meta.frequency || 'weekly';
  const intervalMs = FREQUENCY_MS[frequency];

  if (intervalMs === Infinity) return false; // Manual only

  const lastBackup = meta.lastBackupTimestamp;
  if (!lastBackup) return true; // Never backed up

  return Date.now() - lastBackup > intervalMs;
}

// ── Trigger Points ──────────────────────────────────────────────────────

/**
 * Called when the app returns to foreground.
 * Checks if auto-backup is due and conditions are met.
 */
async function onAppForeground() {
  const state = getSchedulerState();
  const now = Date.now();

  // Don't check more than once per 5 minutes
  if (state.lastCheck && now - state.lastCheck < 5 * 60 * 1000) return;
  saveSchedulerState({ ...state, lastCheck: now });

  // Check if backup is due
  if (!isBackupDue()) {
    // Still check for silent verification
    try {
      await performSilentVerification();
    } catch {}
    return;
  }

  // Check preconditions
  const conditions = await checkPreconditionsAsync();
  if (!conditions.canBackup) {
    log.share(`[Vault:Scheduler] Auto-backup skipped: ${conditions.reason}`);
    return;
  }

  // Get current user UID
  const { auth } = await import('../firebase');
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  log.share('[Vault:Scheduler] Triggering auto-backup');

  try {
    await createBackup(uid, {
      provider: getBackupMeta().provider || PROVIDERS.GOOGLE_DRIVE,
      onProgress: (p) => {
        log.share(`[Vault:Scheduler] Auto-backup: ${p.message} (${p.percent}%)`);
      },
    });

    saveSchedulerState({ ...state, lastAutoBackup: Date.now(), lastCheck: now });
    log.share('[Vault:Scheduler] Auto-backup completed');
  } catch (e) {
    log.share.warn('[Vault:Scheduler] Auto-backup failed:', e?.message);
  }
}

/**
 * Called after significant data changes (e.g., bulk order import).
 * Queues a backup if dirty record count exceeds threshold.
 */
export function onSignificantDataChange() {
  const dirtyCount = getDirtyCount();
  if (dirtyCount < SIGNIFICANT_CHANGE_THRESHOLD) return;

  // Don't trigger immediately — wait for user to finish their work
  // Schedule a check in 60 seconds
  if (typeof window !== 'undefined') {
    clearTimeout(window._vaultChangeTimeout);
    window._vaultChangeTimeout = setTimeout(async () => {
      const conditions = await checkPreconditionsAsync();
      if (conditions.canBackup && isBackupDue()) {
        onAppForeground();
      }
    }, 60000);
  }
}

// ── Flow Guards ─────────────────────────────────────────────────────────

/**
 * Mark that a critical flow (payment, invoice) is active.
 * Auto-backup will not trigger during this time.
 */
export function setActiveFlow(flowName) {
  try {
    sessionStorage.setItem(ACTIVE_FLOW_KEY, flowName);
  } catch {}
}

/**
 * Clear the active flow guard.
 */
export function clearActiveFlow() {
  try {
    sessionStorage.removeItem(ACTIVE_FLOW_KEY);
  } catch {}
}

// ── Initialize / Teardown ───────────────────────────────────────────────

/**
 * Initialize the backup scheduler.
 * Attaches visibility change listener for opportunistic backups.
 */
export function initScheduler() {
  if (_initialized) return;

  if (typeof document !== 'undefined') {
    _visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // Use setTimeout to avoid blocking UI on app resume
        setTimeout(onAppForeground, 2000);
      }
    };
    document.addEventListener('visibilitychange', _visibilityHandler);
  }

  _initialized = true;
  log.share('[Vault:Scheduler] Initialized (opportunistic mode)');

  // Initial check
  setTimeout(onAppForeground, 5000);
}

/**
 * Destroy the scheduler and remove listeners.
 */
export function destroyScheduler() {
  if (_visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', _visibilityHandler);
    _visibilityHandler = null;
  }
  _initialized = false;
}

/**
 * Get scheduler info for debug/display.
 */
export function getSchedulerInfo() {
  const meta = getBackupMeta();
  const state = getSchedulerState();

  return {
    frequency: meta.frequency,
    wifiOnly: meta.wifiOnly,
    chargingOnly: meta.chargingOnly,
    lastAutoBackup: state.lastAutoBackup,
    isBackupDue: isBackupDue(),
    dirtyRecordCount: getDirtyCount(),
    preconditions: checkPreconditions(),
  };
}
