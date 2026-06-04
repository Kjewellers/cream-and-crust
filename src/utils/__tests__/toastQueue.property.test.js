/**
 * Feature: production-readiness-hardening, Property 11: Toast system caps
 * visible messages and preserves order.
 *
 * Validates: Requirements 13.6, 13.7
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { reduceToasts, initToastState, MAX_VISIBLE } from '../toastQueue.js';

describe('toast queue reducer (Property 11)', () => {
  it('never shows more than MAX_VISIBLE at once and keeps visible ids unique', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            op: fc.constantFrom('add', 'remove'),
            id: fc.integer({ min: 1, max: 8 }),
          }),
          { maxLength: 40 }
        ),
        (events) => {
          let state = initToastState();
          for (const e of events) {
            if (e.op === 'add') {
              const known =
                state.visible.some((t) => t.id === e.id) ||
                state.pending.some((t) => t.id === e.id);
              if (!known) {
                state = reduceToasts(state, {
                  kind: 'add',
                  toast: { id: e.id, message: `m${e.id}` },
                });
              }
            } else {
              state = reduceToasts(state, { kind: 'remove', id: e.id });
            }
            // Cap invariant.
            expect(state.visible.length).toBeLessThanOrEqual(MAX_VISIBLE);
            // No id appears twice across visible + pending.
            const allIds = [...state.visible, ...state.pending].map((t) => t.id);
            expect(new Set(allIds).size).toBe(allIds.length);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('promotes a queued toast (FIFO) when a visible one is removed', () => {
    let s = initToastState();
    s = reduceToasts(s, { kind: 'add', toast: { id: 1 } });
    s = reduceToasts(s, { kind: 'add', toast: { id: 2 } });
    s = reduceToasts(s, { kind: 'add', toast: { id: 3 } });
    s = reduceToasts(s, { kind: 'add', toast: { id: 4 } }); // queued
    expect(s.visible.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(s.pending.map((t) => t.id)).toEqual([4]);
    s = reduceToasts(s, { kind: 'remove', id: 1 });
    expect(s.visible.map((t) => t.id)).toEqual([2, 3, 4]);
    expect(s.pending).toEqual([]);
  });
});
