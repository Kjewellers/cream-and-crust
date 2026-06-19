# Design Document

## Overview

This feature synchronizes the onboarding flow (`OnboardingModal.jsx`) with the Profile/Settings page (`Profile.jsx`) so that every field collected during onboarding is visible and editable on the Profile page. It also ensures the "Skip for now" action is available at every onboarding step (0–6), allowing bakers to defer profile completion to the Settings page.

The design introduces:
- A persistent "Skip for now" button rendered on all onboarding steps (currently only on step 0)
- New business fields displayed and editable on the Profile page (tagline, businessType, city, deliveryAreas, pickupAddress)
- An updated profile completeness calculation that accounts for all onboarding fields
- A shared field-mapping configuration to keep onboarding and profile in sync

## Architecture

The feature touches two existing React components and the Firestore data layer. No new services or backend changes are required.

```mermaid
graph TD
    A[OnboardingModal.jsx] -->|writes| B[Firestore: business/{uid}]
    A -->|writes| C[Firestore: users/{uid}]
    D[Profile.jsx] -->|reads/writes| B
    D -->|reads/writes| C
    E[profileFields.js] -->|shared config| A
    E -->|shared config| D
    F[calculateCompleteness] -->|pure function| D
```

**Key architectural decisions:**

1. **Shared field configuration** — A new `src/utils/profileFields.js` module defines the canonical list of business fields, their Firestore paths, labels, and whether they are required. Both `OnboardingModal` and `Profile` import this to stay in sync.

2. **Pure completeness function** — The completeness calculation is extracted into a standalone pure function (`calculateProfileCompleteness`) in `src/utils/profileFields.js` so it can be unit-tested and property-tested independently of React rendering.

3. **No schema migration** — The Firestore documents already store all the fields written by onboarding (`tagline`, `businessType`, `city`, `deliveryAreas`, `pickupAddress`). The Profile page simply needs to read and write them.

## Components and Interfaces

### New Module: `src/utils/profileFields.js`

```javascript
/**
 * Canonical field definitions shared between Onboarding and Profile.
 * Each entry describes a business field, its Firestore key, display label,
 * whether it is required for completeness, and which document it lives in.
 */
export const BUSINESS_FIELDS = [
  { key: 'name', label: 'Bakery Name', required: true, doc: 'business' },
  { key: 'ownerName', label: 'Owner Name', required: true, doc: 'business' },
  { key: 'phone', label: 'Phone', required: true, doc: 'business' },
  { key: 'email', label: 'Email', required: false, doc: 'business' },
  { key: 'tagline', label: 'Tagline', required: false, doc: 'business' },
  { key: 'businessType', label: 'Business Type', required: false, doc: 'business' },
  { key: 'instagram', label: 'Instagram Handle', required: false, doc: 'business' },
  { key: 'whatsapp', label: 'WhatsApp Number', required: false, doc: 'business' },
  { key: 'website', label: 'Website', required: false, doc: 'business' },
  { key: 'pickupAddress', label: 'Pickup Address', required: true, doc: 'business' },
  { key: 'city', label: 'City', required: true, doc: 'business' },
  { key: 'deliveryAreas', label: 'Delivery Areas', required: false, doc: 'business' },
  { key: 'upiId', label: 'UPI ID', required: false, doc: 'business' },
  { key: 'gstNumber', label: 'GST Number', required: false, doc: 'business' },
];

/**
 * Calculate profile completeness as a percentage.
 * @param {object} businessData - The business document fields
 * @returns {number} Integer percentage 0–100
 */
export function calculateProfileCompleteness(businessData) {
  const total = BUSINESS_FIELDS.length;
  const filled = BUSINESS_FIELDS.filter(field => {
    const value = businessData?.[field.key];
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value && String(value).trim());
  }).length;
  return Math.round((filled / total) * 100);
}
```

### Modified: `src/components/OnboardingModal.jsx`

Changes:
- The "Skip setup" / "Back" button logic is updated so that **every step** renders a "Skip for now" button (currently only step 0 shows "Skip setup").
- The skip button calls `saveSetup({ skipped: true })` from any step, persisting all data entered so far.

### Modified: `src/pages/Profile.jsx`

Changes:
- Import `BUSINESS_FIELDS` and `calculateProfileCompleteness` from `profileFields.js`.
- Add new fields to the display section: tagline, businessType, city, deliveryAreas, pickupAddress.
- Add those fields to the edit form when `editingDetails` is true.
- Replace the inline `calculateCompleteness` function with the shared `calculateProfileCompleteness`.
- Read `tagline`, `businessType`, `city`, `deliveryAreas`, `pickupAddress` from the business subscription data.
- Persist those fields on save via `updateBusinessInDB`.

## Data Models

### Firestore: `business/{uid}`

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| name | string | Onboarding step 2 | Bakery name |
| ownerName | string | Onboarding step 1 | Owner's full name |
| tagline | string | Onboarding step 2 | Short bakery tagline |
| businessType | string | Onboarding step 2 | One of predefined types |
| phone | string | Onboarding step 1 | Primary phone |
| email | string | Onboarding step 1 | Contact email |
| instagram | string | Onboarding step 3 | Instagram handle (without @) |
| whatsapp | string | Onboarding step 3 | WhatsApp number |
| website | string | Onboarding step 3 | Website URL |
| pickupAddress | string | Onboarding step 4 | Full pickup address |
| city | string | Onboarding step 4 | Delivery city |
| deliveryAreas | string[] | Onboarding step 4 | Array of area names |
| upiId | string | Onboarding step 5 | UPI payment ID |
| gstNumber | string | Onboarding step 5 | GST registration number |
| setupSkipped | boolean | Skip action | true if user skipped onboarding |
| onboardingComplete | boolean | Completion/Skip | true after finish or skip |

### Firestore: `users/{uid}`

| Field | Type | Notes |
|-------|------|-------|
| name | string | Owner name |
| phone | string | Phone number |
| email | string | Email address |
| address | string | Mirrors pickupAddress |
| setupSkipped | boolean | true if onboarding was skipped |
| onboardingComplete | boolean | true after finish or skip |
| mainGoal | string | Selected primary goal |

No schema changes are needed — these fields already exist in the Firestore documents as written by the current `OnboardingModal.saveSetup()` function.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Skip button is present on every onboarding step

*For any* valid step index (0 through 6), rendering the OnboardingModal at that step SHALL produce a UI containing a "Skip for now" button that is clickable.

**Validates: Requirements 1.1**

### Property 2: Skip action persists partial data with setupSkipped flag

*For any* combination of form field values entered up to any step, activating the skip action SHALL persist all non-empty field values to the Business_Document and User_Document with `setupSkipped: true`, and reading those documents back SHALL return the same values.

**Validates: Requirements 1.2**

### Property 3: Profile displays all business fields from the document

*For any* valid Business_Document containing any combination of filled and empty fields, the Profile page SHALL render each field's value when present, or a placeholder when the field is empty.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1**

### Property 4: Profile save round-trip preserves field values

*For any* non-empty subset of editable business fields with valid values, saving from the Profile page and then reading the Business_Document back SHALL return the same field values, without altering fields that were not edited.

**Validates: Requirements 3.2, 5.2**

### Property 5: Completeness calculation accounts for all business fields

*For any* Business_Document with any combination of filled and empty fields from the canonical field list, the completeness percentage SHALL equal `round((filledCount / totalFields) * 100)` where `totalFields` includes tagline, businessType, city, deliveryAreas, and pickupAddress alongside existing fields.

**Validates: Requirements 4.1, 4.2, 5.3**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Firestore write fails on skip | Show error toast "Setup failed: {message}", keep modal open, do not navigate away |
| Firestore write fails on profile save | Show error toast, retain edited values in form so user can retry (Requirement 3.4) |
| Business document does not exist yet | `subscribeToBusiness` already handles this by returning a default object; Profile renders placeholders |
| `deliveryAreas` is a string instead of array | Normalize on read: if string, split by comma; if array, use directly. The OnboardingModal already does this conversion on save. |
| User has no `setupSkipped` field | Treat as `false` (normal completed onboarding). Profile still shows all fields. |

## Testing Strategy

### Property-Based Tests (using fast-check)

The project uses Vite + React. We will use `fast-check` with `vitest` for property-based testing.

Each property test runs a minimum of 100 iterations and is tagged with its design property reference.

| Property | Test Target | Generator Strategy |
|----------|-------------|-------------------|
| Property 1 | OnboardingModal render | Generate step indices 0–6, render component, assert skip button exists |
| Property 2 | `saveSetup({ skipped: true })` | Generate random partial form data at random steps, mock Firestore, verify persisted payload |
| Property 3 | Profile render | Generate random business documents with arbitrary field combinations, render Profile, assert all values/placeholders present |
| Property 4 | `handleUpdateDetails` | Generate random subsets of field edits, mock Firestore, verify round-trip |
| Property 5 | `calculateProfileCompleteness` | Generate random business objects with arbitrary field presence, verify percentage formula |

**Tag format:** `Feature: onboarding-profile-sync, Property {N}: {title}`

### Unit Tests (example-based)

- Skip button triggers navigation to dashboard (Requirement 1.3)
- Skip action shows correct toast message (Requirement 1.4)
- Save success shows success toast (Requirement 3.3)
- Save failure shows error toast and retains form values (Requirement 3.4)
- Edit button toggles fields to editable state (Requirement 3.1)
- Skipped user sees empty placeholders (Requirement 5.1 — specific example)
- Filling all required fields updates completeness (Requirement 5.3 — specific example)

### Integration Tests

- End-to-end: complete onboarding → verify Profile shows all entered data
- End-to-end: skip onboarding → navigate to Profile → fill fields → save → verify persistence
