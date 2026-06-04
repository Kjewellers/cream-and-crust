/**
 * Feature: onboarding-profile-sync, Property 2: Skip action persists partial data with setupSkipped flag
 *
 * Validates: Requirements 1.2
 *
 * For any combination of form field values entered up to any step (0–6),
 * activating the "Skip for now" action SHALL persist all non-empty entered
 * values to the User_Document and Business_Document with `setupSkipped: true`.
 *
 * Strategy: generate a random partial set of onboarding field values plus a
 * random target step. We navigate the modal to that step (filling required
 * gate fields so navigation is possible), enter the generated values, then
 * click "Skip for now". Firestore writes are mocked so we can capture the
 * exact persisted payloads and assert every entered value is present.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import fc from 'fast-check';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Capture the users-doc write performed directly by the component.
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  setDoc: vi.fn(async () => {}),
}));

// Capture the business-doc write performed via the db service.
vi.mock('../../services/db', () => ({
  updateBusinessInDB: vi.fn(async () => {}),
}));

// Avoid real Firebase initialization (no env vars in test env).
vi.mock('../../services/firebase', () => ({ db: {} }));

// Toast is a side effect we don't care about here.
vi.mock('../iOS', () => ({ showToast: vi.fn() }));

// Render framer-motion deterministically and synchronously so step
// transitions (AnimatePresence mode="wait") resolve immediately in jsdom.
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const ANIM_PROPS = [
    'initial',
    'animate',
    'exit',
    'transition',
    'variants',
    'whileHover',
    'whileTap',
    'whileInView',
    'whileFocus',
    'whileDrag',
    'viewport',
    'layout',
    'layoutId',
    'drag',
    'dragConstraints',
    'onAnimationStart',
    'onAnimationComplete',
  ];
  const clean = (props) => {
    const p = { ...props };
    ANIM_PROPS.forEach((k) => delete p[k]);
    return p;
  };
  const motion = new Proxy(
    {},
    {
      get: (_t, tag) =>
        React.forwardRef(({ children, ...props }, ref) =>
          React.createElement(
            typeof tag === 'string' ? tag : 'div',
            { ref, ...clean(props) },
            children
          )
        ),
    }
  );
  return {
    __esModule: true,
    motion,
    AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});

import OnboardingModal from '../OnboardingModal.jsx';
import { setDoc } from 'firebase/firestore';
import { updateBusinessInDB } from '../../services/db';

// ── Field model ──────────────────────────────────────────────────────────────

const businessTypes = ['Cakes', 'Brownies', 'Desserts', 'Breads', 'All bakery items'];

// Canonical step index for each editable text field.
const FIELD_STEP = {
  ownerName: 1,
  phone: 1,
  email: 1,
  bakeryName: 2,
  tagline: 2,
  instagram: 3,
  whatsapp: 3,
  website: 3,
  pickupAddress: 4,
  city: 4,
  deliveryAreas: 4,
  upiId: 5,
  gstNumber: 5,
};

// Text inputs rendered on each step, located by placeholder.
const STEP_TEXT_FIELDS = {
  1: [
    ['ownerName', 'e.g. Priya Sharma'],
    ['phone', '10-digit number'],
    ['email', 'you@example.com'],
  ],
  2: [
    ['bakeryName', 'e.g. Sweet Crumbs'],
    ['tagline', 'Fresh bakes for every celebration'],
  ],
  3: [
    ['instagram', '@yourbakery'],
    ['whatsapp', '+91...'],
    ['website', 'https://...'],
  ],
  4: [
    ['pickupAddress', 'Full pickup address'],
    ['city', 'e.g. Bengaluru'],
    ['deliveryAreas', 'Indiranagar, Koramangala, Whitefield'],
  ],
  5: [
    ['upiId', 'yourbakery@upi'],
    ['gstNumber', 'Optional'],
  ],
};

// ── Generators ──────────────────────────────────────────────────────────────

// Non-empty alphanumeric token: survives .trim() and contains no comma, so
// deliveryAreas splitting yields a single, predictable element.
const token = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
    minLength: 1,
    maxLength: 10,
  })
  .map((chars) => chars.join(''));

// A field is either entered (token) or left untouched (null).
const maybe = fc.option(token, { nil: null });

const fieldsArb = fc.record({
  ownerName: maybe,
  phone: maybe,
  email: maybe,
  bakeryName: maybe,
  tagline: maybe,
  instagram: maybe,
  whatsapp: maybe,
  website: maybe,
  pickupAddress: maybe,
  city: maybe,
  deliveryAreas: maybe,
  upiId: maybe,
  gstNumber: maybe,
});

const caseArb = fc.record({
  fields: fieldsArb,
  targetStep: fc.integer({ min: 0, max: 6 }),
  chosenBusinessType: fc.option(fc.constantFrom(...businessTypes), { nil: null }),
});

// ── Property test ────────────────────────────────────────────────────────────

describe('OnboardingModal skip persistence (Property 2)', () => {
  it('persists all non-empty entered values with setupSkipped:true from any step', async () => {
    await fc.assert(
      fc.asyncProperty(caseArb, async ({ fields, targetStep, chosenBusinessType }) => {
        cleanup();
        setDoc.mockClear();
        updateBusinessInDB.mockClear();

        // Force the fields required to ADVANCE past gating steps that lie
        // strictly before the target step (steps 1, 2 and 4 are gated).
        const f = { ...fields };
        if (targetStep > 1) {
          f.ownerName = f.ownerName ?? 'rqowner';
          f.phone = f.phone ?? 'rqphone';
        }
        if (targetStep > 2) {
          f.bakeryName = f.bakeryName ?? 'rqbakery';
        }
        if (targetStep > 4) {
          f.pickupAddress = f.pickupAddress ?? 'rqpickup';
          f.city = f.city ?? 'rqcity';
        }

        // The user can only have entered values on steps they actually saw.
        const entered = {};
        for (const name of Object.keys(FIELD_STEP)) {
          if (FIELD_STEP[name] <= targetStep && f[name] != null && f[name] !== '') {
            entered[name] = f[name];
          }
        }

        const onComplete = vi.fn();
        render(
          <OnboardingModal user={{ uid: 'test-uid' }} business={{}} onComplete={onComplete} />
        );

        try {
          for (let s = 0; s <= targetStep; s++) {
            const textFields = STEP_TEXT_FIELDS[s] || [];
            for (const [name, placeholder] of textFields) {
              const value = f[name];
              if (value != null && value !== '') {
                fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
              }
            }
            if (s === 2 && chosenBusinessType) {
              fireEvent.click(screen.getByRole('button', { name: chosenBusinessType }));
            }
            if (s < targetStep) {
              fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
            }
          }

          fireEvent.click(screen.getByText('Skip for now'));

          await waitFor(() => expect(updateBusinessInDB).toHaveBeenCalledTimes(1));
          await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));

          const usersPayload = setDoc.mock.calls.at(-1)[1];
          const businessPayload = updateBusinessInDB.mock.calls.at(-1)[1];

          // Skip flag + onboarding completion on both documents.
          expect(usersPayload.setupSkipped).toBe(true);
          expect(businessPayload.setupSkipped).toBe(true);
          expect(usersPayload.onboardingComplete).toBe(true);
          expect(businessPayload.onboardingComplete).toBe(true);

          // Every entered value must be present in the persisted payloads.
          if ('ownerName' in entered) {
            expect(usersPayload.name).toBe(entered.ownerName);
            expect(businessPayload.ownerName).toBe(entered.ownerName);
          }
          if ('phone' in entered) {
            expect(usersPayload.phone).toBe(entered.phone);
            expect(businessPayload.phone).toBe(entered.phone);
          }
          if ('email' in entered) {
            expect(usersPayload.email).toBe(entered.email);
            expect(businessPayload.email).toBe(entered.email);
          }
          if ('bakeryName' in entered) {
            expect(businessPayload.name).toBe(entered.bakeryName);
          }
          if ('tagline' in entered) {
            expect(businessPayload.tagline).toBe(entered.tagline);
          }
          if ('instagram' in entered) {
            expect(businessPayload.instagram).toBe(entered.instagram);
          }
          if ('whatsapp' in entered) {
            expect(businessPayload.whatsapp).toBe(entered.whatsapp);
          }
          if ('website' in entered) {
            expect(businessPayload.website).toBe(entered.website);
          }
          if ('pickupAddress' in entered) {
            expect(usersPayload.address).toBe(entered.pickupAddress);
            expect(businessPayload.pickupAddress).toBe(entered.pickupAddress);
            expect(businessPayload.address).toBe(entered.pickupAddress);
          }
          if ('city' in entered) {
            expect(businessPayload.city).toBe(entered.city);
          }
          if ('deliveryAreas' in entered) {
            expect(businessPayload.deliveryAreas).toEqual([entered.deliveryAreas]);
          }
          if ('upiId' in entered) {
            expect(businessPayload.upiId).toBe(entered.upiId);
          }
          if ('gstNumber' in entered) {
            expect(businessPayload.gstNumber).toBe(entered.gstNumber);
          }
          if (chosenBusinessType && targetStep >= 2) {
            expect(businessPayload.businessType).toBe(chosenBusinessType);
          }
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 }
    );
  }, 60000);
});
