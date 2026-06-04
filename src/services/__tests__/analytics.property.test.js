/**
 * Feature: production-readiness-hardening, Property 12: Analytics payloads
 * contain no customer PII; Property 13: Error-event message is truncated;
 * Property 14: Analytics records only allowlisted, non-empty event names.
 *
 * Validates: Requirements 14.1, 14.2, 14.3, 14.6, 14.7, 14.8
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sanitizePayload, track, EVENTS, PII_KEYS } from '../analytics.js';

function collectKeys(obj, acc = []) {
  if (obj == null || typeof obj !== 'object') return acc;
  for (const [k, v] of Object.entries(obj)) {
    acc.push(k);
    if (v && typeof v === 'object') collectKeys(v, acc);
  }
  return acc;
}

describe('sanitizePayload (Property 12)', () => {
  it('strips every PII key at any nesting depth', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string(),
          phone: fc.string(),
          email: fc.string(),
          channel: fc.string(),
          nested: fc.record({ customerName: fc.string(), itemCount: fc.integer() }),
        }),
        (payload) => {
          const out = sanitizePayload(payload);
          const keys = collectKeys(out);
          for (const piiKey of PII_KEYS) {
            expect(keys).not.toContain(piiKey);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('truncates long string fields to 1000 chars', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1001, maxLength: 5000 }), (long) => {
        const out = sanitizePayload({ detail: long });
        expect(out.detail.length).toBeLessThanOrEqual(1000);
      }),
      { numRuns: 50 }
    );
  });
});

describe('track allowlist (Property 14)', () => {
  it('rejects names not in the EVENTS set', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        const isKnown = Object.values(EVENTS).includes(name);
        expect(track(name, {})).toBe(isKnown);
      }),
      { numRuns: 200 }
    );
  });

  it('accepts every allowlisted event name', () => {
    for (const name of Object.values(EVENTS)) {
      expect(track(name, { channel: 'x' })).toBe(true);
    }
  });

  it('rejects empty/non-string names', () => {
    expect(track('', {})).toBe(false);
    expect(track(null, {})).toBe(false);
    expect(track(undefined, {})).toBe(false);
  });
});
