# Requirements Document

## Introduction

This feature synchronizes the onboarding flow with the Profile/Settings page so that all fields collected during onboarding are visible and editable in Profile. It also makes the "Skip for now" option accessible at every onboarding step, allowing users to complete their profile later from the Settings page.

## Glossary

- **Onboarding_Modal**: The multi-step modal (`OnboardingModal.jsx`) that collects bakery owner details after first sign-in
- **Profile_Page**: The Profile/Settings page (`Profile.jsx`) where users view and edit their account and business information
- **Business_Document**: The Firestore document at `business/{uid}` storing business-related fields
- **User_Document**: The Firestore document at `users/{uid}` storing user-related fields
- **Skip_Action**: The action of bypassing remaining onboarding steps, saving `setupSkipped: true` to Firestore
- **Baker**: A user with role `admin` or `baker` who owns a bakery business on the platform

## Requirements

### Requirement 1: Skip Option Available at Every Onboarding Step

**User Story:** As a baker, I want to skip the onboarding at any step, so that I can start using the app immediately and fill in my details later from Profile.

#### Acceptance Criteria

1. WHILE the Onboarding_Modal is displayed on any step (steps 0 through 6), THE Onboarding_Modal SHALL render a visible "Skip for now" button
2. WHEN a baker activates the "Skip for now" button on any step, THE Onboarding_Modal SHALL save all data entered so far to the User_Document and Business_Document with `setupSkipped: true`
3. WHEN a baker activates the "Skip for now" button, THE Onboarding_Modal SHALL close and navigate the baker to the dashboard
4. WHEN a baker activates the "Skip for now" button, THE Onboarding_Modal SHALL display a toast message indicating that setup was skipped and can be completed from Profile

### Requirement 2: Profile Page Displays All Onboarding Fields

**User Story:** As a baker, I want to see all the details I entered during onboarding on my Profile page, so that I can review and update them in one place.

#### Acceptance Criteria

1. THE Profile_Page SHALL display the following business fields for baker users: bakery name, tagline, business type, owner name, phone, email, instagram handle, whatsapp number, website, pickup address, city, delivery areas, UPI ID, and GST number
2. THE Profile_Page SHALL read tagline from the Business_Document `tagline` field
3. THE Profile_Page SHALL read business type from the Business_Document `businessType` field
4. THE Profile_Page SHALL read city from the Business_Document `city` field
5. THE Profile_Page SHALL read delivery areas from the Business_Document `deliveryAreas` array field
6. THE Profile_Page SHALL read pickup address from the Business_Document `pickupAddress` field

### Requirement 3: Profile Page Allows Editing All Onboarding Fields

**User Story:** As a baker, I want to edit all business fields from my Profile page, so that I can keep my information up to date without re-running onboarding.

#### Acceptance Criteria

1. WHEN a baker activates the edit button on the Profile_Page, THE Profile_Page SHALL make the following fields editable: tagline, business type, city, delivery areas, and pickup address (in addition to existing editable fields)
2. WHEN a baker saves edited details on the Profile_Page, THE Profile_Page SHALL persist tagline, business type, city, delivery areas, and pickup address to the Business_Document
3. WHEN a baker saves edited details on the Profile_Page, THE Profile_Page SHALL display a success toast confirming the update
4. IF the save operation fails, THEN THE Profile_Page SHALL display an error toast and retain the edited values in the form

### Requirement 4: Profile Completeness Reflects All Fields

**User Story:** As a baker, I want the profile completeness indicator to account for all business fields, so that I know which details are still missing.

#### Acceptance Criteria

1. THE Profile_Page SHALL include tagline, business type, city, delivery areas, and pickup address in the profile completeness percentage calculation
2. WHEN a baker who skipped onboarding views the Profile_Page, THE Profile_Page SHALL show the completeness percentage reflecting unfilled fields from onboarding

### Requirement 5: Skipped Onboarding Users Can Complete Profile from Settings

**User Story:** As a baker who skipped onboarding, I want to fill in all my business details from the Profile page, so that I do not need to re-trigger the onboarding flow.

#### Acceptance Criteria

1. WHEN a baker with `setupSkipped: true` navigates to the Profile_Page, THE Profile_Page SHALL display all business fields with empty placeholders for unfilled data
2. THE Profile_Page SHALL allow the baker to fill in and save any combination of business fields without requiring all fields to be completed at once
3. WHEN a baker with `setupSkipped: true` fills in all required fields (bakery name, owner name, phone, pickup address, city), THE Profile_Page SHALL update the completeness indicator to reflect the new state
