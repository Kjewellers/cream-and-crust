/**
 * Feature: production-readiness-hardening, Property 7: At most one Order_Card
 * is expanded.
 *
 * Validates: Requirements 3.5, 3.6
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { toggleExpand } from '../expandState.js';

describe('expandState toggle (Property 7)', () => {
  it('expanded state holds at most one id for any toggle sequence', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ minLength: 1, maxLength: 4 }), { maxLength: 40 }), (ids) => {
        let current = null;
        for (const id of ids) {
          current = toggleExpand(current, id);
          // current is always either null or a single id string.
          expect(current === null || typeof current === 'string').toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('toggling the same id twice collapses it', () => {
    let s = toggleExpand(null, 'a');
    expect(s).toBe('a');
    s = toggleExpand(s, 'a');
    expect(s).toBeNull();
  });

  it('expanding a different id replaces the open one', () => {
    let s = toggleExpand(null, 'a');
    s = toggleExpand(s, 'b');
    expect(s).toBe('b');
  });
});
