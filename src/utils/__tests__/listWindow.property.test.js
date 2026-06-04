/**
 * Feature: production-readiness-hardening, Property 9: Incremental list window
 * stays within bounds.
 *
 * Validates: Requirements 5.1
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { growWindow, initWindow } from '../listWindow.js';

describe('listWindow (Property 9)', () => {
  it('rendered count stays within [initial, total] and is non-decreasing', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 60 }),
        (total, step, reveals) => {
          const initial = initWindow(total, 20);
          expect(initial).toBeGreaterThanOrEqual(0);
          expect(initial).toBeLessThanOrEqual(total);

          let count = initial;
          for (let i = 0; i < reveals; i++) {
            const next = growWindow(count, { total, step });
            expect(next).toBeGreaterThanOrEqual(count); // non-decreasing
            expect(next).toBeLessThanOrEqual(total); // never above total
            count = next;
          }
        }
      ),
      { numRuns: 300 }
    );
  });

  it('eventually reaches total', () => {
    let count = initWindow(100, 20);
    for (let i = 0; i < 10; i++) count = growWindow(count, { total: 100, step: 20 });
    expect(count).toBe(100);
  });
});
