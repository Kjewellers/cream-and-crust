/**
 * Feature: onboarding-profile-sync, Property 5: Completeness calculation accounts for all business fields
 *
 * Validates: Requirements 4.1, 4.2, 5.3
 *
 * For any Business_Document with any combination of filled and empty fields from
 * the canonical field list, the completeness percentage SHALL equal
 * round((filledCount / totalFields) * 100), where totalFields is the full
 * BUSINESS_FIELDS set (14 fields) including tagline, businessType, city,
 * deliveryAreas, and pickupAddress.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BUSINESS_FIELDS, calculateProfileCompleteness } from '../profileFields.js';

const TOTAL_FIELDS = BUSINESS_FIELDS.length;

/**
 * Values that are unambiguously "filled" under the production fill rules:
 *  - arrays  -> filled when length > 0
 *  - strings -> filled when Boolean(value && String(value).trim())
 * Prefixing with 'x' guarantees a non-whitespace, non-empty string.
 */
const filledArb = fc.oneof(
  fc.string({ minLength: 1 }).map((s) => `x${s}`),
  fc.array(fc.string(), { minLength: 1, maxLength: 5 })
);

/**
 * Values that are unambiguously "empty" under the production fill rules:
 *  - undefined / null
 *  - empty or whitespace-only strings
 *  - empty arrays
 */
const emptyArb = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(''),
  fc.constantFrom('   ', '\t', '\n', '  \t  '),
  fc.constant([])
);

// Each entry carries both its value and whether it counts as filled, so the
// expected filledCount is known by construction (not re-derived from the
// production rule).
const entryArb = fc.oneof(
  filledArb.map((value) => ({ value, filled: true })),
  emptyArb.map((value) => ({ value, filled: false }))
);

describe('calculateProfileCompleteness (Property 5)', () => {
  it('sanity: canonical field set has 14 fields', () => {
    expect(TOTAL_FIELDS).toBe(14);
  });

  it('equals round((filledCount / 14) * 100) for arbitrary field presence', () => {
    fc.assert(
      fc.property(fc.tuple(...BUSINESS_FIELDS.map(() => entryArb)), (entries) => {
        const businessData = {};
        let filledCount = 0;
        entries.forEach((entry, index) => {
          businessData[BUSINESS_FIELDS[index].key] = entry.value;
          if (entry.filled) filledCount += 1;
        });

        const expected = Math.round((filledCount / TOTAL_FIELDS) * 100);
        expect(calculateProfileCompleteness(businessData)).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });

  it('returns an integer in [0, 100] for any generated input', () => {
    fc.assert(
      fc.property(fc.tuple(...BUSINESS_FIELDS.map(() => entryArb)), (entries) => {
        const businessData = {};
        entries.forEach((entry, index) => {
          businessData[BUSINESS_FIELDS[index].key] = entry.value;
        });

        const result = calculateProfileCompleteness(businessData);
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
      }),
      { numRuns: 200 }
    );
  });
});
