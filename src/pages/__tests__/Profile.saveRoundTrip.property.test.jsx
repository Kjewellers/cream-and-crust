/**
 * Feature: onboarding-profile-sync, Property 4: Profile save round-trip preserves field values
 *
 * For any non-empty subset of editable business fields with valid values,
 * saving from the Profile page and then reading the Business_Document back
 * returns the same field values, without altering fields that were not edited.
 *
 * Validates: Requirements 3.2, 5.2
 *
 * Strategy: mock `updateBusinessInDB` so the persisted payload is captured.
 * That payload IS the round-trip read of the Business_Document (it is exactly
 * what would be written to and read back from Firestore). We seed the business
 * subscription with a baseline document, enter edit mode, change a random
 * subset of fields, save, and assert the captured payload reflects the edited
 * values for edited fields and the baseline values for everything else.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fc from 'fast-check';

// ── Hoisted mock state (mutable between iterations) ──
const h = vi.hoisted(() => ({
  updateBusinessInDB: vi.fn(async () => {}),
  businessDoc: { id: 'biz-1' },
}));

const mockAuth = {
  currentUser: { uid: 'u1', email: 'baker@x.com', displayName: 'Baker' },
  userRole: 'admin',
  logout: vi.fn(),
};
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('../../services/db', () => ({
  subscribeToOrders: (cb) => {
    cb([]);
    return () => {};
  },
  subscribeToBusiness: (cb) => {
    cb(h.businessDoc);
    return () => {};
  },
  subscribeToProducts: (cb) => { cb([]); return () => {}; },
  subscribeToRecipes: (cb) => { cb([]); return () => {}; },
  updateBusinessInDB: (...args) => h.updateBusinessInDB(...args),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => ({}) })),
  updateDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn(() => vi.fn()),
}));

vi.mock('../../services/firebase', () => ({ db: {} }));

vi.mock('../../components/iOS', () => ({
  showToast: vi.fn(),
  triggerHaptic: vi.fn(),
}));

import Profile from '../Profile.jsx';

// Mirrors BUSINESS_TYPES in Profile.jsx (the <select> options).
const BUSINESS_TYPES = ['Home Baker', 'Bakery', 'Cafe', 'Cloud Kitchen', 'Catering', 'Other'];

// Placeholders the edit-form text inputs render with (from FIELD_PLACEHOLDERS).
const PLACEHOLDER = {
  name: 'e.g. Cream & Crust',
  ownerName: 'Your full name',
  tagline: 'A short, memorable line',
  city: 'e.g. Mumbai',
  pickupAddress: 'Full pickup address',
  instagram: 'username (without @)',
  website: 'https://yourbakery.com',
  upiId: 'yourname@upi',
  gstNumber: '22AAAAA0000A1Z5',
  deliveryAreas: 'Andheri, Bandra, Juhu',
};

// Plain-text editable fields driven via their (unique) placeholder.
const TEXT_KEYS = [
  'name',
  'ownerName',
  'tagline',
  'city',
  'pickupAddress',
  'instagram',
  'website',
  'upiId',
  'gstNumber',
];

// ── Generators (clean values that survive an exact string round-trip) ──
const word = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
    minLength: 1,
    maxLength: 10,
  })
  .map((a) => a.join(''));
const phrase = fc.array(word, { minLength: 1, maxLength: 3 }).map((a) => a.join(' '));
const areaArr = fc.array(word, { minLength: 1, maxLength: 4 });

// Baseline business document — every editable field plus a non-editable
// `username` (which the save path always re-persists and must not alter).
const baselineArb = fc.record({
  name: phrase,
  ownerName: phrase,
  tagline: phrase,
  city: phrase,
  pickupAddress: phrase,
  instagram: phrase,
  website: phrase,
  upiId: phrase,
  gstNumber: phrase,
  phone: phrase,
  whatsapp: phrase,
  businessType: fc.constantFrom(...BUSINESS_TYPES),
  deliveryAreas: areaArr,
  username: word,
});

// A random, at-least-one-field edit. `undefined` means "leave this field".
const editsArb = fc
  .record({
    name: fc.option(phrase, { nil: undefined }),
    ownerName: fc.option(phrase, { nil: undefined }),
    tagline: fc.option(phrase, { nil: undefined }),
    city: fc.option(phrase, { nil: undefined }),
    pickupAddress: fc.option(phrase, { nil: undefined }),
    instagram: fc.option(phrase, { nil: undefined }),
    website: fc.option(phrase, { nil: undefined }),
    upiId: fc.option(phrase, { nil: undefined }),
    gstNumber: fc.option(phrase, { nil: undefined }),
    businessType: fc.option(fc.constantFrom(...BUSINESS_TYPES), { nil: undefined }),
    deliveryAreas: fc.option(areaArr, { nil: undefined }),
  })
  .filter((e) => Object.values(e).some((v) => v !== undefined));

async function renderEditSaveAndCapture(baseline, edits) {
  cleanup();
  h.updateBusinessInDB.mockClear();
  h.businessDoc = { id: 'biz-1', ...baseline };

  const { container } = render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );

  // Enter edit mode — the form pre-populates from the business document.
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

  // Apply the random subset of edits.
  for (const key of TEXT_KEYS) {
    if (edits[key] !== undefined) {
      fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER[key]), {
        target: { value: edits[key] },
      });
    }
  }
  if (edits.businessType !== undefined) {
    const select = container.querySelector('select');
    fireEvent.change(select, { target: { value: edits.businessType } });
  }
  if (edits.deliveryAreas !== undefined) {
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER.deliveryAreas), {
      target: { value: edits.deliveryAreas.join(', ') },
    });
  }

  // Save.
  fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
  await waitFor(() => expect(h.updateBusinessInDB).toHaveBeenCalledTimes(1));

  const [businessId, payload] = h.updateBusinessInDB.mock.calls[0];
  return { businessId, payload };
}

function assertRoundTrip(baseline, edits, businessId, payload) {
  // Writes target the same business document.
  expect(businessId).toBe('biz-1');

  // Edited text fields round-trip the new value; unedited keep the baseline.
  for (const key of TEXT_KEYS) {
    const expected = edits[key] !== undefined ? edits[key] : baseline[key];
    expect(payload[key]).toBe(expected);
  }

  // businessType (select).
  const expectedType =
    edits.businessType !== undefined ? edits.businessType : baseline.businessType;
  expect(payload.businessType).toBe(expectedType);

  // deliveryAreas (string input <-> array document field).
  const expectedAreas =
    edits.deliveryAreas !== undefined ? edits.deliveryAreas : baseline.deliveryAreas;
  expect(payload.deliveryAreas).toEqual(expectedAreas);

  // Fields that were never touched must be preserved exactly.
  expect(payload.phone).toBe(baseline.phone);
  expect(payload.whatsapp).toBe(baseline.whatsapp);
  expect(payload.username).toBe(baseline.username);
}

describe('Profile save round-trip (Property 4)', () => {
  beforeEach(() => {
    cleanup();
    mockAuth.userRole = 'admin';
  });

  it('preserves edited and unedited field values across a save round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(baselineArb, editsArb, async (baseline, edits) => {
        const { businessId, payload } = await renderEditSaveAndCapture(baseline, edits);
        assertRoundTrip(baseline, edits, businessId, payload);
      }),
      { numRuns: 25 }
    );
  }, 60000);

  it('round-trips a representative example without altering other fields', async () => {
    const baseline = {
      name: 'Old Bakery',
      ownerName: 'Old Owner',
      tagline: 'old tagline',
      city: 'Pune',
      pickupAddress: 'old address',
      instagram: 'oldinsta',
      website: 'oldsite',
      upiId: 'old@upi',
      gstNumber: 'OLDGST',
      phone: '111',
      whatsapp: '222',
      businessType: 'Bakery',
      deliveryAreas: ['Kothrud', 'Baner'],
      username: 'oldbakery',
    };
    const edits = {
      tagline: 'fresh tagline',
      city: 'Mumbai',
      pickupAddress: 'new shop address',
      businessType: 'Cafe',
      deliveryAreas: ['Andheri', 'Bandra', 'Juhu'],
    };

    const { businessId, payload } = await renderEditSaveAndCapture(baseline, edits);

    assertRoundTrip(baseline, edits, businessId, payload);
    // Edited values present.
    expect(payload.tagline).toBe('fresh tagline');
    expect(payload.deliveryAreas).toEqual(['Andheri', 'Bandra', 'Juhu']);
    // Unedited values untouched.
    expect(payload.name).toBe('Old Bakery');
    expect(payload.phone).toBe('111');
  }, 20000);
});
