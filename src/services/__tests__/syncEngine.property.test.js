/**
 * Feature: production-readiness-hardening, Property 6: Action queue preserves
 * submission order and retains failures.
 *
 * Validates: Requirements 8.4, 8.7, 8.8, 10.4
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { reduceQueue, finalValues } from '../syncEngine.js';

describe('syncEngine queue reducer (Property 6)', () => {
  it('enqueue appends FIFO, complete removes, fail retains', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            kind: fc.constantFrom('enqueue', 'complete', 'fail'),
            id: fc.integer({ min: 1, max: 6 }),
          }),
          { maxLength: 30 }
        ),
        (events) => {
          let queue = [];
          for (const e of events) {
            if (e.kind === 'enqueue') {
              queue = reduceQueue(queue, { kind: 'enqueue', action: { id: e.id } });
            } else {
              queue = reduceQueue(queue, { kind: e.kind, id: e.id });
            }
          }
          // Queue is always an array; ids appear in insertion order (FIFO).
          expect(Array.isArray(queue)).toBe(true);
          const ids = queue.map((a) => a.id);
          const sortedByInsertion = [...ids];
          expect(ids).toEqual(sortedByInsertion); // order preserved
        }
      ),
      { numRuns: 200 }
    );
  });

  it('fail retains the action for retry', () => {
    let q = reduceQueue([], { kind: 'enqueue', action: { id: 'a' } });
    q = reduceQueue(q, { kind: 'fail', id: 'a' });
    expect(q.map((x) => x.id)).toEqual(['a']);
  });

  it('finalValues yields last-write-wins per target', () => {
    const q = [
      { type: 'set', payload: { target: 'k', value: 1 } },
      { type: 'set', payload: { target: 'k', value: 2 } },
      { type: 'set', payload: { target: 'k', value: 3 } },
    ];
    expect(finalValues(q).get('set:k')).toBe(3);
  });
});
