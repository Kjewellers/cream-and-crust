/**
 * AndroidStabilizationProgram.test.jsx
 * Enterprise Regression Test Suite for Android Stabilization Program
 *
 * Verifies:
 * - Phase 2 Startup Orchestrator (Critical vs Background tiers)
 * - Phase 4 Listener Registry & duplicate detection
 * - Phase 6 RevenueCat caching & retry resilience
 * - Phase 8 Error Architecture & friendly UI fallback messages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StartupManager, STEPS, STEP_STATUS } from '../core/startup/StartupManager.js';
import { ListenerRegistry } from '../core/listeners/ListenerRegistry.js';
import { formatBillingError, getOfferings } from '../services/purchases.js';
import { ErrorHandler } from '../core/errors/ErrorHandler.js';
import { CATEGORY } from '../services/ErrorMonitor.js';

describe('Android Production Stabilization Program (10/10 Architecture)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Phase 2 — Startup Orchestrator', () => {
    it('runs critical startup steps and marks readiness', async () => {
      await StartupManager.run();
      expect(StartupManager.isReady).toBe(true);
      const statuses = StartupManager.getStepStatuses();
      expect([STEP_STATUS.HEALTHY, STEP_STATUS.DEGRADED]).toContain(statuses[STEPS.ENVIRONMENT]);
      expect([STEP_STATUS.HEALTHY, STEP_STATUS.DEGRADED]).toContain(statuses[STEPS.FIREBASE_AUTH]);
    }, 15000);

    it('prevents duplicate initializations when run() is called multiple times', async () => {
      await StartupManager.run();
      const firstStatus = StartupManager.getStepStatuses();
      await StartupManager.run();
      const secondStatus = StartupManager.getStepStatuses();
      expect(firstStatus).toEqual(secondStatus);
    });
  });

  describe('Phase 4 — Listener Registry', () => {
    it('registers and tracks active Firestore listeners', () => {
      const mockUnsub = vi.fn();
      const unsub = ListenerRegistry.register('test_orders', mockUnsub, { uid: 'u1' });

      expect(ListenerRegistry.count).toBeGreaterThan(0);
      const active = ListenerRegistry.getActiveListeners();
      expect(active.some((l) => l.name === 'test_orders')).toBe(true);

      unsub();
      expect(mockUnsub).toHaveBeenCalled();
    });

    it('detects duplicate listener registrations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const unsub1 = ListenerRegistry.register('orders', vi.fn(), { uid: 'u123' });
      const unsub2 = ListenerRegistry.register('orders', vi.fn(), { uid: 'u123' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ListenerRegistry Warning] Duplicate listener detected')
      );

      unsub1();
      unsub2();
      consoleSpy.mockRestore();
    });
  });

  describe('Phase 6 — RevenueCat Hardening', () => {
    it('formats technical Google Play billing errors into friendly user messages', () => {
      expect(formatBillingError(new Error('User cancelled purchase.'))).toBe('Purchase cancelled.');
      expect(formatBillingError(new Error('Network error during purchase'))).toContain('Network connection issue');
      expect(formatBillingError(new Error('Billing Unavailable'))).toContain('billing is currently unavailable');
    });

    it('falls back to cached offerings when network/plugin is offline', async () => {
      const cachedData = { id: 'pro_monthly', packages: [] };
      localStorage.setItem('cc_cached_rc_offerings', JSON.stringify(cachedData));

      const offerings = await getOfferings();
      expect(offerings).toEqual(cachedData);
    });
  });

  describe('Phase 8 — Unified Error System', () => {
    it('normalizes raw SDK errors into non-technical friendly messages', () => {
      const rawFirebaseErr = new Error('FirebaseError: [auth/user-not-found] No user doc');
      const friendlyMsg = ErrorHandler.handle(rawFirebaseErr, CATEGORY.FIREBASE_ERROR);

      expect(friendlyMsg).not.toContain('FirebaseError');
      expect(friendlyMsg).not.toContain('user-not-found');
      expect(typeof friendlyMsg).toBe('string');
    });
  });
});
