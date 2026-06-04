/**
 * Feature: production-readiness-hardening — payment toggle regression guard.
 *
 * Locks in the fix for the "toggle only turns on, never off" bug: an explicit
 * isPaid:false must be respected even when advance >= total.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isOrderPaid, nextPaymentState } from '../paymentStatus.js';

describe('isOrderPaid', () => {
  it('respects an explicit isPaid flag over the advance heuristic', () => {
    // The exact bug: fully advanced but explicitly marked pending.
    expect(isOrderPaid({ isPaid: false, total: 1000, advance: 1000 })).toBe(false);
    expect(isOrderPaid({ isPaid: true, total: 1000, advance: 0 })).toBe(true);
  });

  it('falls back to advance >= total only when isPaid is undefined', () => {
    expect(isOrderPaid({ total: 1000, advance: 1000 })).toBe(true);
    expect(isOrderPaid({ total: 1000, advance: 400 })).toBe(false);
    expect(isOrderPaid({ total: 0, advance: 0 })).toBe(false);
  });
});

describe('nextPaymentState toggling', () => {
  it('toggling twice returns to the original paid-state (in -> out -> in)', () => {
    fc.assert(
      fc.property(
        fc.record({
          isPaid: fc.boolean(),
          total: fc.integer({ min: 0, max: 100000 }),
          advance: fc.integer({ min: 0, max: 100000 }),
        }),
        (order) => {
          const start = isOrderPaid(order);
          const afterOne = nextPaymentState(order);
          expect(afterOne.isPaid).toBe(!start);
          // Apply the toggle, then toggle again — must flip back.
          const afterTwo = nextPaymentState({ ...order, ...afterOne });
          expect(afterTwo.isPaid).toBe(start);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('marks balanceDue 0 when paid', () => {
    expect(nextPaymentState({ isPaid: false, total: 500, advance: 0 }).balanceDue).toBe(0);
  });
});
