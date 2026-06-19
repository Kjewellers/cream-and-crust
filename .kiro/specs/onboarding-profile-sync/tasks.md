# Implementation Plan: Onboarding Profile Sync

## Overview

This plan implements synchronization between the onboarding flow and the Profile/Settings page. It introduces a shared field configuration module, updates the OnboardingModal to show "Skip for now" on every step, extends the Profile page to display and edit all onboarding fields, and adds a shared completeness calculation. Testing uses vitest + fast-check for property-based tests.

## Tasks

- [x] 1. Set up shared utilities and testing infrastructure
  - [x] 1.1 Create `src/utils/profileFields.js` with BUSINESS_FIELDS config and calculateProfileCompleteness function
    - Define the canonical `BUSINESS_FIELDS` array with key, label, required, and doc properties for all 14 business fields
    - Implement `calculateProfileCompleteness(businessData)` as a pure function that returns an integer percentage 0–100
    - Handle edge cases: array fields check `.length > 0`, string fields check `Boolean(value && String(value).trim())`
    - Export both `BUSINESS_FIELDS` and `calculateProfileCompleteness`
    - _Requirements: 4.1, 4.2, 5.3_

  - [x] 1.2 Install vitest and fast-check, configure test environment
    - Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, and `fast-check` as dev dependencies
    - Add a `vitest.config.js` (or extend `vite.config.js`) with jsdom environment for React component tests
    - Add a `"test"` script to `package.json` pointing to `vitest --run`
    - _Requirements: Testing infrastructure for all properties_

  - [x]\* 1.3 Write property test for calculateProfileCompleteness (Property 5)
    - **Property 5: Completeness calculation accounts for all business fields**
    - Generate random business objects with arbitrary field presence (strings, arrays, empty values, undefined)
    - Assert result equals `Math.round((filledCount / 14) * 100)` for every generated input
    - **Validates: Requirements 4.1, 4.2, 5.3**

- [x] 2. Update OnboardingModal to show "Skip for now" on every step
  - [x] 2.1 Modify `src/components/OnboardingModal.jsx` to render "Skip for now" button on all steps (0–6)
    - Currently only step 0 shows "Skip setup" — update the button rendering logic so every step renders a visible "Skip for now" button
    - The skip button must call `saveSetup({ skipped: true })` which persists all data entered so far with `setupSkipped: true`
    - After successful skip, close the modal, navigate to dashboard, and show a toast: "Setup skipped — complete your profile anytime from Settings"
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x]\* 2.2 Write property test for skip button presence on every step (Property 1)
    - **Property 1: Skip button is present on every onboarding step**
    - Generate step indices 0–6, render OnboardingModal at that step, assert a "Skip for now" button exists and is clickable
    - **Validates: Requirements 1.1**

  - [x]\* 2.3 Write property test for skip action persisting partial data (Property 2)
    - **Property 2: Skip action persists partial data with setupSkipped flag**
    - Generate random partial form data at random steps (0–6), mock Firestore writes, trigger skip, verify persisted payload includes all non-empty values and `setupSkipped: true`
    - **Validates: Requirements 1.2**

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extend Profile page to display all onboarding fields
  - [x] 4.1 Update `src/pages/Profile.jsx` to read and display new business fields
    - Import `BUSINESS_FIELDS` from `src/utils/profileFields.js`
    - Read `tagline`, `businessType`, `city`, `deliveryAreas`, and `pickupAddress` from the business subscription data
    - Display all 14 business fields in the profile details section — show the value when present, or a placeholder (e.g., "Not set") when empty
    - Normalize `deliveryAreas` on read: if string, split by comma; if array, use directly
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1_

  - [x] 4.2 Update `src/pages/Profile.jsx` edit form to include new fields
    - When `editingDetails` is true, make tagline, businessType, city, deliveryAreas, and pickupAddress editable in the form
    - On save, persist all fields (including new ones) via `updateBusinessInDB`
    - Show success toast on save, error toast on failure while retaining edited values
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.2_

  - [x]\* 4.3 Write property test for Profile displaying all business fields (Property 3)
    - **Property 3: Profile displays all business fields from the document**
    - Generate random business documents with arbitrary field combinations, render Profile, assert each field's value or placeholder is present
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1**

  - [x]\* 4.4 Write property test for Profile save round-trip (Property 4)
    - **Property 4: Profile save round-trip preserves field values**
    - Generate random subsets of editable field values, mock Firestore, trigger save, verify round-trip returns same values without altering unedited fields
    - **Validates: Requirements 3.2, 5.2**

- [x] 5. Update profile completeness calculation
  - [x] 5.1 Replace inline completeness logic in `src/pages/Profile.jsx` with shared `calculateProfileCompleteness`
    - Import `calculateProfileCompleteness` from `src/utils/profileFields.js`
    - Replace any existing inline completeness calculation with the shared function
    - Ensure the completeness percentage reflects all 14 fields including tagline, businessType, city, deliveryAreas, and pickupAddress
    - For skipped-onboarding users, unfilled fields correctly reduce the percentage
    - _Requirements: 4.1, 4.2, 5.3_

  - [x]\* 5.2 Write unit tests for completeness edge cases
    - Test: all fields filled → 100%
    - Test: no fields filled → 0%
    - Test: only required fields filled → correct percentage
    - Test: deliveryAreas as empty array → counts as unfilled
    - Test: skipped user with partial data → correct percentage
    - _Requirements: 4.1, 4.2, 5.3_

- [x] 6. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses JavaScript (React + Vite) — all code should be written in JavaScript/JSX
- vitest + fast-check are used for property-based testing as specified in the design

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3"] },
    { "id": 4, "tasks": ["4.4", "5.1"] },
    { "id": 5, "tasks": ["5.2"] }
  ]
}
```
