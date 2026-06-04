/**
 * Feature: production-readiness-hardening, Property 8: Modal scroll-offset
 * restore round-trip.
 *
 * Validates: Requirements 2.6
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { captureScroll, restoreScroll } from '../scrollLock.js';

describe('scrollLock capture/restore (Property 8)', () => {
  it('restoreScroll returns exactly the captured offset', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100000 }), (y) => {
        const captured = captureScroll({ scrollY: y });
        expect(captured).toBe(y);
        expect(restoreScroll(captured)).toBe(y);
      }),
      { numRuns: 200 }
    );
  });

  it('falls back to 0 for non-finite values', () => {
    expect(captureScroll({ scrollY: NaN })).toBe(0);
    expect(restoreScroll(undefined)).toBe(0);
  });
});
