/**
 * Feature: onboarding-profile-sync, Property 3: Profile displays all business fields from the document
 *
 * For any valid Business_Document containing any combination of filled and
 * empty fields, the Profile page renders each field's value when present, or a
 * placeholder when the field is empty.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fc from 'fast-check';
import { BUSINESS_FIELDS } from '../../utils/profileFields';

// ── Mocks ──
// A hoisted ref lets each fast-check iteration inject a fresh business document
// into the subscribeToBusiness callback before rendering.
const { businessRef } = vi.hoisted(() => ({ businessRef: { current: {} } }));

const EMAIL = 'owner.test@x.io';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'u1', email: 'owner.test@x.io', displayName: 'Baker', metadata: {} },
    userRole: 'admin',
    logout: vi.fn(),
  }),
}));

vi.mock('../../services/db', () => ({
  subscribeToOrders: (cb) => {
    cb([]);
    return () => {};
  },
  subscribeToBusiness: (cb) => {
    cb(businessRef.current);
    return () => {};
  },
  subscribeToProducts: (cb) => { cb([]); return () => {}; },
  subscribeToRecipes: (cb) => { cb([]); return () => {}; },
  updateBusinessInDB: vi.fn(),
}));

// users/{uid} doc does not exist → userDoc stays at its component defaults
// (name:'', phone:'', address:'India', everything else empty).
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

// The order in which Profile renders the 14 business fields (FIELD_GROUPS
// flattened). The read-only value node for each field is the only element in
// the page carrying a DOM `title` attribute, so querying `div[title]` yields
// exactly these nodes, in this order.
const FIELD_ORDER = [
  'name',
  'tagline',
  'businessType',
  'ownerName',
  'phone',
  'email',
  'instagram',
  'whatsapp',
  'website',
  'pickupAddress',
  'city',
  'deliveryAreas',
  'upiId',
  'gstNumber',
];

const PLACEHOLDER_REQUIRED = 'Required — add this';
const PLACEHOLDER_OPTIONAL = 'Not set';

// Mirrors Profile.getDisplayValue: business value with the same userDoc
// fallbacks the component applies (userDoc defaults: name/phone/etc. empty,
// address 'India', email from auth).
function resolveDisplay(key, biz) {
  const normalize = (areas) => {
    if (Array.isArray(areas)) return areas;
    if (typeof areas === 'string' && areas.trim()) {
      return areas
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
    }
    return [];
  };

  const map = {
    name: biz.name,
    ownerName: biz.ownerName || '',
    phone: biz.phone || '',
    email: EMAIL,
    tagline: biz.tagline,
    businessType: biz.businessType,
    instagram: biz.instagram || '',
    whatsapp: biz.whatsapp || '',
    website: biz.website || '',
    pickupAddress: biz.pickupAddress || 'India',
    city: biz.city,
    deliveryAreas: normalize(biz.deliveryAreas),
    upiId: biz.upiId || '',
    gstNumber: biz.gstNumber || '',
  };

  const value = map[key];
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '';
  return value && String(value).trim() ? String(value).trim() : '';
}

function expectedPlaceholder(key) {
  const def = BUSINESS_FIELDS.find((f) => f.key === key);
  return def?.required ? PLACEHOLDER_REQUIRED : PLACEHOLDER_OPTIONAL;
}

// Render Profile for the given business document and assert every field shows
// either its resolved value or the correct placeholder.
function assertFieldsRendered(biz) {
  businessRef.current = biz;
  const { container, unmount } = render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );

  try {
    const valueNodes = container.querySelectorAll('div[title]');
    expect(valueNodes.length).toBe(FIELD_ORDER.length);

    FIELD_ORDER.forEach((key, i) => {
      const node = valueNodes[i];
      const def = BUSINESS_FIELDS.find((f) => f.key === key);

      // The value node maps to the expected field (label is its sibling).
      const labelNode = node.previousElementSibling;
      expect(labelNode).toBeTruthy();
      expect(labelNode.textContent).toContain(def.label);

      const expected = resolveDisplay(key, biz);
      if (expected) {
        expect(node.textContent).toBe(expected);
        expect(node.getAttribute('title')).toBe(expected);
      } else {
        expect(node.textContent).toBe(expectedPlaceholder(key));
        expect(node.getAttribute('title')).toBe('');
      }
    });
  } finally {
    unmount();
    cleanup();
  }
}

// ── Generators ──
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

// A clean, non-colliding token: starts with 'X', length >= 4, alphanumeric.
// Guaranteed not to equal any label, placeholder, or the 'India' fallback.
const cleanWord = fc
  .array(fc.constantFrom(...ALPHABET), { minLength: 3, maxLength: 8 })
  .map((cs) => 'X' + cs.join(''));

// A string field is either filled with a clean token or one of several
// "empty" representations (missing, blank, whitespace-only).
const stringField = fc.oneof(cleanWord, fc.constantFrom(undefined, '', '   '));

const areaWords = fc.array(cleanWord, { minLength: 1, maxLength: 4 });
const deliveryAreasField = fc.oneof(
  areaWords, // array form (as written by onboarding)
  areaWords.map((a) => a.join(', ')), // comma-separated string form
  fc.constantFrom(undefined, '', []) // empty forms
);

const businessDocGen = fc.record({
  name: stringField,
  ownerName: stringField,
  phone: stringField,
  tagline: stringField,
  businessType: stringField,
  instagram: stringField,
  whatsapp: stringField,
  website: stringField,
  pickupAddress: stringField,
  city: stringField,
  deliveryAreas: deliveryAreasField,
  upiId: stringField,
  gstNumber: stringField,
});

describe('Profile — Property 3: displays all business fields from the document', () => {
  afterEach(() => cleanup());

  it('renders each field value when present, or a placeholder when empty (Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1)', () => {
    fc.assert(
      fc.property(businessDocGen, (biz) => {
        assertFieldsRendered(biz);
      }),
      { numRuns: 100 }
    );
  }, // Profile is a heavy component; 100 full renders can exceed the default 5s
  // timeout under full-suite parallel load. Give this property room to run.
  30000);

  it('example: a fully-populated document shows every value and no placeholders', () => {
    const biz = {
      name: 'Xname',
      ownerName: 'Xowner',
      phone: 'Xphone',
      tagline: 'Xtag',
      businessType: 'Xtype',
      instagram: 'Xinsta',
      whatsapp: 'Xwa',
      website: 'Xweb',
      pickupAddress: 'Xpickup',
      city: 'Xcity',
      deliveryAreas: ['Xa', 'Xb'],
      upiId: 'Xupi',
      gstNumber: 'Xgst',
    };
    assertFieldsRendered(biz);
  });

  it('example: an empty document shows required/optional placeholders (skipped user)', () => {
    assertFieldsRendered({});
  });
});
