import { describe, it, expect } from 'vitest';
import { BUSINESS_FIELDS, calculateProfileCompleteness } from '../profileFields.js';

// Required fields per the canonical BUSINESS_FIELDS config:
// name, ownerName, phone, pickupAddress, city (5 of 14 total).
const REQUIRED_FIELDS = BUSINESS_FIELDS.filter((f) => f.required).map((f) => f.key);

// A fully populated business document covering all 14 fields.
const FULLY_FILLED = {
  name: 'Sweet Studio',
  ownerName: 'Anita Rao',
  phone: '9876543210',
  email: 'hello@sweetstudio.in',
  tagline: 'Baked with joy',
  businessType: 'Home Bakery',
  instagram: 'sweetstudio',
  whatsapp: '9876543210',
  website: 'https://sweetstudio.in',
  pickupAddress: '12 Baker Street, Bandra',
  city: 'Mumbai',
  deliveryAreas: ['Bandra', 'Juhu'],
  upiId: 'anita@upi',
  gstNumber: '27AAAAA0000A1Z5',
};

describe('calculateProfileCompleteness — edge cases', () => {
  it('returns 100% when every business field is filled', () => {
    expect(calculateProfileCompleteness(FULLY_FILLED)).toBe(100);
  });

  it('returns 0% when no fields are filled', () => {
    expect(calculateProfileCompleteness({})).toBe(0);
    expect(calculateProfileCompleteness(undefined)).toBe(0);
    expect(calculateProfileCompleteness(null)).toBe(0);
  });

  it('returns the correct percentage when only required fields are filled', () => {
    const onlyRequired = {};
    for (const key of REQUIRED_FIELDS) {
      onlyRequired[key] = key === 'deliveryAreas' ? ['Area'] : 'value';
    }
    // 5 required of 14 total → round(5 / 14 * 100) = 36
    expect(REQUIRED_FIELDS).toHaveLength(5);
    expect(calculateProfileCompleteness(onlyRequired)).toBe(36);
  });

  it('treats an empty deliveryAreas array as unfilled', () => {
    // All 5 required filled, deliveryAreas as an empty array.
    const withEmptyAreas = {
      name: 'Sweet Studio',
      ownerName: 'Anita Rao',
      phone: '9876543210',
      pickupAddress: '12 Baker Street',
      city: 'Mumbai',
      deliveryAreas: [],
    };
    // Empty array must not count → still 5 of 14 → 36%
    expect(calculateProfileCompleteness(withEmptyAreas)).toBe(36);

    // Contrast: a non-empty deliveryAreas array does count → 6 of 14 → 43%
    const withAreas = { ...withEmptyAreas, deliveryAreas: ['Bandra'] };
    expect(calculateProfileCompleteness(withAreas)).toBe(43);
  });

  it('returns the correct percentage for a skipped user with partial data', () => {
    // A user who skipped onboarding after entering only contact basics.
    const partial = {
      name: 'Sweet Studio',
      ownerName: 'Anita Rao',
      phone: '9876543210',
      email: 'hello@sweetstudio.in',
      setupSkipped: true,
    };
    // 4 filled of 14 → round(4 / 14 * 100) = 29
    expect(calculateProfileCompleteness(partial)).toBe(29);
  });
});
