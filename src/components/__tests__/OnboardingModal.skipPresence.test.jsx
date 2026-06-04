/**
 * Feature: onboarding-profile-sync, Property 1: Skip button is present on every onboarding step
 *
 * Property 1 (design.md):
 *   For any valid step index (0 through 6), rendering the OnboardingModal at that
 *   step SHALL produce a UI containing a "Skip for now" button that is clickable.
 *
 * Validates: Requirements 1.1
 *
 * The OnboardingModal keeps the current step in internal state (starting at 0) and
 * advances via the "Continue" button. To render the modal "at" an arbitrary step we
 * pre-fill the user/business props so the per-step required fields are satisfied
 * (steps 1, 2 and 4 gate navigation), then click "Continue" the required number of
 * times to reach the target step.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import fc from 'fast-check';

// ── Mocks ──
// Prevent the real Firebase app from initializing and stub the data layer so a
// stray click never reaches the network.
vi.mock('../../services/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  setDoc: vi.fn(async () => {}),
}));

vi.mock('../../services/db', () => ({
  updateBusinessInDB: vi.fn(async () => {}),
}));

vi.mock('../iOS', () => ({
  showToast: vi.fn(),
}));

import OnboardingModal from '../OnboardingModal.jsx';

// Titles rendered in the modal header for each step (outside the animated body),
// used to confirm we actually reached the target step before asserting.
const STEP_TITLES = [
  'Set up your bakery studio',
  'Owner details',
  'Bakery identity',
  'Social and contact',
  'Pickup and delivery',
  'Payments',
  'Personalize your dashboard',
];

const LAST_STEP = STEP_TITLES.length - 1; // 6

// Fully-populated props so canContinue() is satisfied on every gated step,
// allowing the "Continue" button to advance to any step 0–6.
const makeProps = () => ({
  user: {
    uid: 'test-uid',
    name: 'Test Baker',
    phone: '9999999999',
    email: 'baker@test.com',
    address: '123 Test Street',
  },
  business: {
    id: 'test-uid',
    name: 'Sweet Crumbs',
    username: 'sweetcrumbs',
    city: 'Bengaluru',
    pickupAddress: '123 Test Street',
    businessType: 'Cakes',
  },
  onComplete: vi.fn(),
});

describe('OnboardingModal — Property 1: "Skip for now" present on every step', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders a clickable "Skip for now" button on every step (0–6)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: LAST_STEP }), (targetStep) => {
        cleanup();
        const { getByRole, getByText, unmount } = render(<OnboardingModal {...makeProps()} />);

        // Advance from step 0 to targetStep. Each click happens on a non-last
        // step, so it always advances rather than triggering the finish action.
        for (let i = 0; i < targetStep; i++) {
          fireEvent.click(getByRole('button', { name: /continue/i }));
        }

        // Confirm we are actually on the intended step.
        expect(getByText(STEP_TITLES[targetStep])).toBeInTheDocument();

        // The property under test: a "Skip for now" button exists and is clickable.
        const skipButton = getByRole('button', { name: /skip for now/i });
        expect(skipButton).toBeInTheDocument();
        expect(skipButton).toBeEnabled();

        unmount();
      }),
      { numRuns: 100 }
    );
  }, 60000); // full framer-motion render per run; allow time for 100 iterations

  // Example-based sanity checks for the two boundary steps.
  it('shows "Skip for now" on the first step (step 0)', () => {
    const { getByRole, getByText } = render(<OnboardingModal {...makeProps()} />);
    expect(getByText(STEP_TITLES[0])).toBeInTheDocument();
    expect(getByRole('button', { name: /skip for now/i })).toBeEnabled();
  });

  it('shows "Skip for now" on the last step (step 6)', () => {
    const { getByRole, getByText } = render(<OnboardingModal {...makeProps()} />);
    for (let i = 0; i < LAST_STEP; i++) {
      fireEvent.click(getByRole('button', { name: /continue/i }));
    }
    expect(getByText(STEP_TITLES[LAST_STEP])).toBeInTheDocument();
    expect(getByRole('button', { name: /skip for now/i })).toBeEnabled();
  });
});
