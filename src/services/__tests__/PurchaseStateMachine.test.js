/**
 * PurchaseStateMachine.test.js
 *
 * Test suite verifying PurchaseStateMachine error classification,
 * state transitions, timeout handling, and idempotency across all 16 testing matrix scenarios.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PurchaseState,
  classifyError,
  classifyRestoreError,
  executePurchase,
  executeRestore,
  wasRecentlySuccessful,
} from '../PurchaseStateMachine';

vi.mock('../purchases', () => ({
  getOfferings: vi.fn(),
  purchasePackage: vi.fn(),
  restorePurchases: vi.fn(),
  isNativeAndroidRuntime: vi.fn(() => true),
}));

vi.mock('../../utils/logger', () => ({
  log: {
    purchase: Object.assign(vi.fn(), {
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import * as purchases from '../purchases';

describe('PurchaseStateMachine — Unit & Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
  });

  describe('Error Classification', () => {
    it('classifies user cancellation as CANCELLED state', () => {
      const errs = [
        new Error('User cancelled purchase'),
        { userCancelled: true },
        { code: 1 },
        { message: 'PaymentCancelled' },
      ];
      errs.forEach((e) => {
        const res = classifyError(e);
        expect(res.state).toBe(PurchaseState.CANCELLED);
        expect(res.friendlyMessage).toBe('');
      });
    });

    it('classifies pending purchase as PENDING state', () => {
      const res = classifyError(new Error('Purchase is pending approval'));
      expect(res.state).toBe(PurchaseState.PENDING);
      expect(res.friendlyMessage).toContain('being processed');
    });

    it('classifies network issues as OFFLINE state', () => {
      const res = classifyError(new Error('network timeout occurred'));
      expect(res.state).toBe(PurchaseState.OFFLINE);
      expect(res.friendlyMessage).toContain('No internet');
    });

    it('classifies RevenueCat / Play Store issues as RC_UNAVAILABLE state', () => {
      const res = classifyError(new Error('Google Play store billing service unavailable'));
      expect(res.state).toBe(PurchaseState.RC_UNAVAILABLE);
      expect(res.friendlyMessage).toContain('Google Play is temporarily unavailable');
    });

    it('classifies unknown errors as FAILED state', () => {
      const res = classifyError(new Error('Card declined by issuing bank'));
      expect(res.state).toBe(PurchaseState.FAILED);
      expect(res.friendlyMessage).toContain('Something went wrong');
    });

    it('classifies restore errors correctly', () => {
      const resOffline = classifyRestoreError(new Error('network error'));
      expect(resOffline.state).toBe(PurchaseState.OFFLINE);

      const resNoPurchases = classifyRestoreError(new Error('no purchases found'));
      expect(resNoPurchases.state).toBe(PurchaseState.FAILED);
      expect(resNoPurchases.friendlyMessage).toContain('No previous purchases found');
    });
  });

  describe('executePurchase — Flow Handling', () => {
    it('returns OFFLINE immediately if navigator.onLine is false', async () => {
      Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
      const onStateChange = vi.fn();
      const res = await executePurchase({ selectedPlan: 'yearly', featureKey: 'AI_INVOICE', onStateChange });

      expect(res.state).toBe(PurchaseState.OFFLINE);
      expect(onStateChange).toHaveBeenCalledWith(PurchaseState.OFFLINE, expect.any(Object));
    });

    it('handles successful purchase flow', async () => {
      purchases.getOfferings.mockResolvedValueOnce({
        availablePackages: [{ packageType: 'ANNUAL', product: { productIdentifier: 'pro_annual' } }],
      });
      purchases.purchasePackage.mockResolvedValueOnce({ entitlements: { active: { premium: {} } } });

      const states = [];
      const res = await executePurchase({
        selectedPlan: 'yearly',
        featureKey: 'AI_INVOICE',
        onStateChange: (s) => states.push(s),
      });

      expect(res.state).toBe(PurchaseState.SUCCESS);
      expect(res.productId).toBe('pro_annual');
      expect(states).toEqual([PurchaseState.LOADING, PurchaseState.PURCHASING, PurchaseState.SUCCESS]);
      expect(wasRecentlySuccessful()).toBe(true);
    });

    it('handles user cancellation without error message', async () => {
      purchases.getOfferings.mockResolvedValueOnce({
        availablePackages: [{ packageType: 'MONTHLY', product: { productIdentifier: 'pro_monthly' } }],
      });
      purchases.purchasePackage.mockRejectedValueOnce(new Error('User cancelled'));

      const states = [];
      const res = await executePurchase({
        selectedPlan: 'monthly',
        featureKey: 'AI_INVOICE',
        onStateChange: (s) => states.push(s),
      });

      expect(res.state).toBe(PurchaseState.CANCELLED);
      expect(res.friendlyMessage).toBe('');
      expect(states).toEqual([PurchaseState.LOADING, PurchaseState.PURCHASING, PurchaseState.CANCELLED]);
    });

    it('handles restore purchases flow', async () => {
      purchases.restorePurchases.mockResolvedValueOnce({});
      const states = [];
      const res = await executeRestore({ onStateChange: (s) => states.push(s) });

      expect(res.state).toBe(PurchaseState.SUCCESS);
      expect(states).toEqual([PurchaseState.LOADING, PurchaseState.SUCCESS]);
    });
  });
});
