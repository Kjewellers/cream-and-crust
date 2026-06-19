# Requirements Document

## Introduction

This feature is a full pre-production audit and stability hardening initiative for Cream & Crust, a React + Vite + Firebase (Firestore) bakery management PWA shipped as an installable PWA/TWA and deployed on Vercel. The goal is to transform the app from a web-like prototype into a stable, scalable, smooth, native-feeling, production-grade bakery operating system for home bakers, who are often not highly technical and prefer warm, visual guidance over dense text.

The initiative builds on existing systems already in the codebase and must extend or harden them rather than duplicate them. The existing systems are: a global error boundary (`AppErrorBoundary.jsx`), offline Firestore persistence via `persistentLocalCache` (`firebase.js`), a PWA update toast (`PwaUpdateToast.jsx`), a unified modal system (`PremiumBottomSheet.jsx`), lazy-loaded pages with `manualChunks` code splitting (`vite.config.js`), an aggressive service worker cache (`skipWaiting`/`clientsClaim`), a native-feel CSS layer, an onboarding system (`AnimatedDemo.jsx`), and an order form with Quick/Detailed modes (`OrderForm.jsx`).

The work is organized into 20 hardening areas, captured below as numbered requirements. Each requirement has a user story and EARS-format acceptance criteria. The intent of every requirement is to specify observable, verifiable behavior (what the system must do) and to leave implementation detail to the design phase.

### Scope Constraints

- The work targets the existing React + Vite + Firebase/Firestore stack delivered as a PWA/TWA. No backend rewrite is in scope.
- Subscription billing uses Google Play Billing. Razorpay has been removed and is out of scope. UPI QR is baker-to-customer only.
- Firebase App Check is currently disabled in `firebase.js` because enabling it broke login; re-enabling App Check safely is in scope under security hardening.
- Tests use Vitest with fast-check for property-based testing, run on a Windows/PowerShell environment with CRLF line endings.
- User-facing copy must stay friendly and visual for non-technical home bakers, and JSX must use real characters rather than unicode escape sequences.

## Glossary

- **App**: The Cream & Crust client application as a whole (React PWA/TWA).
- **Error_Boundary**: The global error boundary component (`AppErrorBoundary.jsx`) that catches render-time crashes and renders a recoverable fallback screen.
- **Modal_System**: The unified bottom-sheet/modal component (`PremiumBottomSheet.jsx`) used for all overlays.
- **Order_Card**: The interactive card representing a single order in the Orders view.
- **Order_Form**: The order creation/editing form (`OrderForm.jsx`) with Quick and Detailed modes.
- **Bottom_Navigation**: The persistent bottom navigation bar and any floating action button (FAB).
- **WhatsApp_Service**: The modules that generate WhatsApp deep links and message text (`services/whatsapp.js`, `utils/whatsapp.js`).
- **Draft_Store**: The local persistence layer (localStorage/IndexedDB) that auto-saves and restores Order_Form drafts.
- **Sync_Engine**: The offline-first layer that queues write actions made while offline and synchronizes them to Firestore when connectivity returns, built on Firestore offline persistence.
- **Firestore_Rules**: The Firestore security rules (`firestore.rules`) that enforce authentication and per-bakery data isolation.
- **Bakery**: A single bakery business owned by one authenticated baker account, identified by the owner `uid`.
- **Baker**: An authenticated user who owns a Bakery.
- **State_Store**: The application state layer (React context and component state) including `AuthContext`, `CartContext`, and `DataContext`.
- **Image_Pipeline**: The modules responsible for image upload, conversion, sizing, thumbnail generation, and progressive loading.
- **Toast_System**: The reusable transient feedback component that displays floating, auto-dismissing messages.
- **State_View**: A non-content UI state shown in place of content, including empty, loading, skeleton, error, retry, success, and offline states.
- **Analytics_Service**: The instrumentation layer that records usage events and captures unhandled errors for monitoring.
- **Build_Pipeline**: The Vite production build configuration and its outputs (`vite.config.js`, `dist/`).
- **Design_System**: The shared set of design tokens and reusable UI primitives (spacing, typography, color, radius, shadow, animation timing).
- **Safe_Area**: The device safe-area insets exposed via `env(safe-area-inset-*)`.

## Requirements

### Requirement 1: Crash and Error Safety

**User Story:** As a baker, I want the app to stay usable when something goes wrong, so that I never lose access to my orders because of a blank screen or frozen loader.

#### Acceptance Criteria

1. WHEN a render-time error occurs anywhere within the routed pages, THE Error_Boundary SHALL replace the crashed page content with a fallback screen that displays an error message, a retry action, and a return-home action.
2. WHEN a Baker activates the retry action on the Error_Boundary fallback screen, THE App SHALL re-mount and re-render the previously failed view without performing a full page reload.
3. IF a Firestore read returns no document or returns null, THEN THE App SHALL render the empty State_View with a user-readable message and SHALL NOT display a blank container.
4. IF order data is missing a required field or contains an invalid value, THEN THE App SHALL render the order using safe default values and SHALL display the remaining valid fields.
5. IF an image referenced by the App fails to load, THEN THE App SHALL display a placeholder image in place of the missing image.
6. IF the local Firestore cache is unreadable or corrupted, THEN THE App SHALL fall back to a memory-only data source and SHALL continue to load the requested view.
7. WHEN an asynchronous operation rejects, THE App SHALL surface a user-readable message through the Toast_System and SHALL keep the current view interactive.
8. WHILE an asynchronous operation is in progress, THE App SHALL display a loading indicator and SHALL replace that loading indicator with a success State_View or an error State_View within 15 seconds of the operation starting.
9. IF a view re-rendered through the Error_Boundary retry action throws a render-time error again, THEN THE Error_Boundary SHALL continue to display the fallback screen and SHALL keep the retry action and the return-home action available.
10. IF an asynchronous operation does not resolve within 15 seconds of starting, THEN THE App SHALL terminate the operation, replace the loading indicator with the error State_View, and surface a user-readable message through the Toast_System.

### Requirement 2: Scroll and Modal System Stability

**User Story:** As a baker, I want bottom sheets and modals to scroll smoothly without moving the page behind them, so that interacting with overlays feels like a native app.

#### Acceptance Criteria

1. WHILE the Modal_System is open, THE App SHALL lock background body scrolling so that the content behind the overlay does not move by more than 0 pixels in any direction in response to scroll or touch gestures over the overlay.
2. WHILE the Modal_System is open, THE Modal_System SHALL confine scrolling to its own internal content region and SHALL not propagate scroll gestures to the page behind it.
3. WHEN the Modal_System renders, THE Modal_System SHALL constrain its height to at most 85 percent of the dynamic viewport height (85dvh) so that the sheet, including its header and close control, remains fully visible within the visible viewport on iPhone Safari and Android Chrome without clipping.
4. WHEN the Modal_System renders its scrollable content region, THE Modal_System SHALL apply bottom padding of at least `env(safe-area-inset-bottom)` so that the final content item, after scrolling to the end of the content region, is fully visible above the Safe_Area.
5. WHEN a Baker activates the overlay area, the close control, or the Escape key, THE App SHALL close the Modal_System.
6. WHEN a Baker closes the Modal_System, THE App SHALL restore the background vertical scroll offset that was active immediately before the Modal_System opened, to within 0 pixels of that prior offset.
7. WHEN the Modal_System close transition completes, THE App SHALL re-enable background scrolling and tap interaction and SHALL remove the overlay so that it no longer intercepts pointer input, within 400 milliseconds of the close action.
8. THE App SHALL route all overlay, popup, expandable-card, and bottom-sheet interactions through the Modal_System or the inline expandable interaction pattern defined in Requirement 3.

### Requirement 3: Inline Expandable Order Card Interaction

**User Story:** As a baker, I want to update an order's status directly on its card, so that I can manage orders without opening hidden modals or losing my scroll position.

#### Acceptance Criteria

1. WHEN a Baker taps the primary expand control on an Order_Card, THE Order_Card SHALL expand in place to reveal status and action controls without navigating away from the Orders view, and SHALL NOT open the Modal_System.
2. WHILE an Order_Card is expanded, THE App SHALL keep the Orders list scroll position within 2 pixels of its position at the moment the Order_Card was expanded.
3. WHEN a Baker selects a status action on an expanded Order_Card, THE App SHALL apply the status change and SHALL display the new status on the Order_Card within 300 milliseconds.
4. IF applying a status change fails, THEN THE App SHALL retain the previous status on the Order_Card and SHALL present an error indication through the Toast_System indicating that the status update did not succeed.
5. WHEN a Baker expands an Order_Card while another Order_Card is already expanded, THE App SHALL collapse the previously expanded Order_Card so that at most one Order_Card is expanded at any time.
6. WHEN a Baker collapses an expanded Order_Card, THE Order_Card SHALL return to its summary layout.
7. THE Orders view SHALL present order status updates through the inline expandable Order_Card rather than through a separate hidden update card.
8. WHEN an Order_Card expands or collapses, THE Order_Card SHALL complete the transition within 350 milliseconds.

### Requirement 4: Footer and Navigation Stability

**User Story:** As a baker, I want the bottom navigation and action button to stay correctly positioned, so that I can always reach core actions without overlap or clipping.

#### Acceptance Criteria

1. THE Bottom_Navigation SHALL reserve space equal to `env(safe-area-inset-bottom)` so that navigation controls are not obscured by the device home indicator.
2. WHILE a Baker scrolls a page, THE Bottom_Navigation SHALL remain anchored to the bottom edge of the visible viewport, including when the iPhone Safari URL bar expands or collapses.
3. WHEN the on-screen keyboard is dismissed, THE Bottom_Navigation SHALL return to its anchored bottom position within 300 milliseconds.
4. THE App SHALL maintain page bottom spacing greater than or equal to the Bottom_Navigation height plus `env(safe-area-inset-bottom)` on every page so that no page content is hidden behind the Bottom_Navigation.
5. WHERE a floating action button is displayed, THE App SHALL position the floating action button fully within the visible viewport above the Bottom_Navigation and the Safe_Area such that it does not overlap any Bottom_Navigation controls.
6. WHILE the on-screen keyboard is visible, THE App SHALL hide the Bottom_Navigation so that it does not overlap the focused input.

### Requirement 5: Performance Optimization for Low-End Devices

**User Story:** As a baker using an older Android phone, I want the app to scroll and animate smoothly, so that the app feels responsive on my device.

#### Acceptance Criteria

1. WHEN a Baker scrolls a list containing more than 50 items, THE App SHALL render additional list items incrementally as they approach the visible viewport and SHALL keep the visible portion of the list free of blank placeholder gaps.
2. WHEN a Baker navigates to a lazy-loaded page, THE App SHALL display a loading State_View until the page code and required data are ready.
3. WHEN a rendered view receives input data that is equal by value to its previous input, THE App SHALL not re-render that view's subtree.
4. THE App SHALL render scrolling and animation on a low-end Android device at a frame time at or below 16.7 milliseconds (a target of 60 frames per second) and SHALL limit backdrop blur and shadow effects that cause the frame time to exceed that target.
5. WHEN an animated transition runs, THE App SHALL drive the animation using compositor-friendly properties and SHALL maintain a frame time at or below 16.7 milliseconds (a target of 60 frames per second) throughout the transition.
6. WHEN a Baker interacts with a control, THE App SHALL display a visible change to that control's visual state within 100 milliseconds of the interaction.
7. IF a lazy-loaded page's code or required data fails to load or does not become ready within 15 seconds, THEN THE App SHALL replace the loading State_View with an error State_View that provides a retry action and SHALL preserve the Baker's current navigation context.

### Requirement 6: WhatsApp Flow Stability

**User Story:** As a baker, I want WhatsApp messages to generate correctly every time, so that I can confirm orders with customers without broken links or garbled text.

#### Acceptance Criteria

1. WHEN a Baker initiates a WhatsApp share, THE WhatsApp_Service SHALL produce a wa.me link whose message text is percent-encoded with no unencoded spaces, line breaks, or reserved characters.
2. WHEN order text contains emojis, multiple lines, or special characters, THE WhatsApp_Service SHALL generate a link whose message parameter, when decoded, reproduces the source message text character-for-character with no added, omitted, or substituted characters.
3. WHEN a Baker provides a value that contains exactly 10 digits after non-digit characters are removed, THE WhatsApp_Service SHALL prepend the 91 country code before generating the link.
4. IF the provided number already contains a leading 91 country code (12 digits after removing non-digits), THEN THE WhatsApp_Service SHALL NOT add a second 91 prefix.
5. IF a phone number is missing, empty, or contains no digits, THEN THE WhatsApp_Service SHALL generate a message-only link without a recipient so the Baker can choose a contact in WhatsApp.
6. WHEN a Baker activates the WhatsApp share control, THE App SHALL open exactly one WhatsApp session and ignore repeat activations within a 1000 millisecond window.
7. IF WhatsApp does not open within 3000 milliseconds of activation, THEN THE App SHALL present a fallback through the Toast_System that lets the Baker copy the message text.

### Requirement 7: Order Form Draft Persistence

**User Story:** As a baker, I want my in-progress order to be saved automatically, so that I do not lose my work if I close the app or it refreshes by accident.

#### Acceptance Criteria

1. WHILE a Baker is editing the Order_Form, THE Draft_Store SHALL save the current Order_Form field values to local device storage no later than 1 second after the most recent change, performing at most one save per 1-second window.
2. WHEN the Order_Form opens AND an unsubmitted draft exists in the Draft_Store following a refresh, an accidental close, or process death, THE App SHALL populate the Order_Form fields with the saved draft values.
3. WHEN the App restores a draft, THE App SHALL display the message "Draft restored ✨" through the Toast_System within 1 second of restoring the draft.
4. WHEN the App restores a previously saved Order_Form draft, THE App SHALL set each restored field value equal to the corresponding saved field value for every field in the Order_Form.
5. WHEN a Baker successfully submits an order, THE Draft_Store SHALL delete the draft associated with that Order_Form within 1 second.
6. IF the stored draft data is missing, corrupted, or unparseable, THEN THE App SHALL open the Order_Form with empty fields rather than failing to render.
7. IF the stored draft data is unreadable, THEN THE Draft_Store SHALL remove the unreadable draft data so that it is not loaded on subsequent openings of the Order_Form.

### Requirement 8: Offline-First Support

**User Story:** As a baker, I want to keep working when my internet drops, so that I never lose an order because of a weak connection.

#### Acceptance Criteria

1. WHILE the device is offline, THE App SHALL allow a Baker to create an order.
2. WHILE the device is offline, WHEN a Baker creates an order, THE App SHALL persist the order to local device storage.
3. WHILE the device is offline, THE App SHALL allow a Baker to save an Order_Form draft to the Draft_Store.
4. WHEN connectivity returns, THE Sync_Engine SHALL synchronize locally queued write actions to Firestore within 10 seconds of reconnection, applying them in first-in-first-out submission order.
5. WHEN the device transitions from online to offline, THE App SHALL display an offline banner indicating offline mode within 2 seconds of the transition.
6. WHEN connectivity returns, THE App SHALL remove the offline banner within 2 seconds of reconnection.
7. WHEN a Baker performs a write action while the device is offline, THE App SHALL retain the action data until the Sync_Engine confirms successful synchronization of that action to Firestore.
8. IF synchronization of a queued write action fails, THEN THE Sync_Engine SHALL retain the action in the queue and retry it on the next connectivity event.

### Requirement 9: Firebase Security and Per-Bakery Data Isolation

**User Story:** As a baker, I want my customer and business data to be private to my bakery, so that no other bakery can ever read or change my information.

#### Acceptance Criteria

1. IF a Baker requests to read a document in a private owner-scoped collection (orders, customers, inventory, recipes, expenses, invoices, or analytics) whose stored owner `uid` field does not equal the requesting Baker `uid`, THEN THE Firestore_Rules SHALL deny the read and return no document data.
2. WHEN a Baker creates a document in an owner-scoped collection (orders, customers, products, inventory, recipes, expenses, invoices, or analytics), THE Firestore_Rules SHALL require the new document's owner `uid` field to be present and equal to the requesting Baker `uid`.
3. IF a create request for an owner-scoped document omits the owner `uid` field or sets the owner `uid` to a value other than the requesting Baker `uid`, THEN THE Firestore_Rules SHALL deny the create and persist no document.
4. IF an update or delete request targets an owner-scoped document whose stored owner `uid` field does not equal the requesting Baker `uid`, THEN THE Firestore_Rules SHALL deny the request and leave the stored document unchanged.
5. IF an update request to an owner-scoped document changes the owner `uid` field to any value other than its stored value, THEN THE Firestore_Rules SHALL deny the update and leave the stored document unchanged.
6. IF a request carries no authenticated Baker `uid`, THEN THE Firestore_Rules SHALL deny every read of a private owner-scoped collection (orders, customers, inventory, recipes, expenses, invoices, or analytics) and deny every create, update, and delete across all owner-scoped collections (including products).
7. WHERE a collection is intentionally publicly readable (the business profile and product catalog), THE Firestore_Rules SHALL permit read requests from any requester, including unauthenticated requesters, and SHALL deny any create, update, or delete request whose authenticated Baker `uid` is absent or does not equal the document's owner `uid`.
8. THE App SHALL include automated security-rules tests that execute against the Firestore security rules running on the local Firebase emulator via the Firestore rules test SDK, and these tests SHALL assert that a Baker authenticated as bakery A is denied read, create, update, and delete operations on documents owned by bakery B across the orders, customers, products, inventory, recipes, expenses, invoices, and analytics collections, with every such denial assertion required to pass on each test run.

### Requirement 10: State Management Cleanup

**User Story:** As a baker, I want the app to remember what I was doing as I move around, so that switching tabs or reopening a modal does not reset my work.

#### Acceptance Criteria

1. THE State_Store SHALL maintain exactly one authoritative stored value for each shared data item (including authentication session, cart contents, and loaded business data), such that every view or component reading that item reflects the same value within 500 milliseconds of any committed change.
2. WHEN a Baker switches to another browser tab and returns to the App, THE App SHALL display the most recent committed state for the active view within 1 second of the active view regaining focus, where committed state is the latest value written to the State_Store.
3. WHEN a Baker reopens a modal after closing it, THE Modal_System SHALL display the most recent committed state for that modal's data, matching the value currently held in the State_Store, with no values retained from the previous open session.
4. IF two or more updates target the same data item within the same interaction, THEN THE State_Store SHALL apply the updates in submission order so that the final committed value equals the value of the most recently submitted update, and no earlier-submitted update overwrites a later-submitted update.
5. WHEN the App resumes after the operating system reclaims memory from a backgrounded session, THE App SHALL restore the active route and all draft data persisted in the Draft_Store at the time the session was backgrounded within 3 seconds of the App regaining focus.
6. WHEN a Baker reloads or refreshes the App, THE App SHALL restore the active route and all draft data persisted in the Draft_Store within 3 seconds of the reload completing.
7. WHEN a Baker changes draft data within a modal or form, THE Draft_Store SHALL persist the changed draft data within 1 second of the change so that the data survives refresh, tab switch, and modal reopen.
8. IF restoring persisted draft data from the Draft_Store fails or the persisted data is missing or unreadable, THEN THE App SHALL load the active route with default empty state and display a message indicating that the draft could not be restored, without blocking further interaction.

### Requirement 11: Image and Media Optimization

**User Story:** As a baker, I want product photos to load quickly and reliably, so that my menu looks polished without crashing the app on large images.

#### Acceptance Criteria

1. WHEN a Baker uploads an image, THE Image_Pipeline SHALL convert the image to WebP format before storing the image.
2. WHEN the App displays an image in a list or grid, THE App SHALL load a thumbnail variant whose longest edge does not exceed 480 pixels.
3. WHEN an image enters the viewport, THE Image_Pipeline SHALL first render a low-resolution placeholder variant and then replace it with the full-resolution variant.
4. WHEN the App renders an image whose nearest edge is more than 250 pixels from the viewport, THE App SHALL defer loading the image until the image is within 250 pixels of the viewport.
5. IF an uploaded image's longest edge exceeds 2048 pixels, THEN THE Image_Pipeline SHALL downscale the image so that its longest edge does not exceed 2048 pixels before the image is rendered, preventing oversized images from crashing iPhone Safari.
6. IF conversion of an uploaded image to WebP fails or the uploaded file is not a supported image format, THEN THE Image_Pipeline SHALL reject the upload, store no partial image, and return an error indicating that the image could not be processed.

### Requirement 12: Empty, Loading, and Status States

**User Story:** As a baker, I want every screen to show me something helpful even when there is no data, so that I am never left looking at a blank area.

#### Acceptance Criteria

1. WHEN a data load for a view completes and the resulting collection contains zero items, THE App SHALL display an empty State_View containing an explanatory message and at least one suggested next action in place of the content container, and SHALL NOT render a blank container.
2. WHILE a data load for a view is in progress, THE App SHALL display a skeleton or loading State_View in place of the content within 300 milliseconds of the load starting.
3. IF a data load fails due to a network error, a server error, or no response within 30 seconds, THEN THE App SHALL display an error State_View that includes an indication describing the failure and a retry action, and SHALL retain the previously displayed view state without rendering partial or corrupted data.
4. WHEN a Baker activates the retry action on an error State_View, THE App SHALL re-attempt the failed data load and display the loading State_View during the re-attempt.
5. IF a re-attempted data load fails 3 consecutive times, THEN THE App SHALL continue to display the error State_View with the retry action remaining available.
6. WHILE the device is offline and the requested view has no cached data, THE App SHALL display an offline State_View indicating that a network connection is required.
7. WHEN an action completes successfully, THE App SHALL display a success indication as either a success State_View or a success Toast_System message.
8. WHEN the App displays a success Toast_System message, THE App SHALL automatically dismiss the message after a duration of 3 to 5 seconds.

### Requirement 13: Toast and Feedback System

**User Story:** As a baker, I want clear, friendly confirmations for my actions, so that I always know what just happened.

#### Acceptance Criteria

1. THE Toast_System SHALL present messages as a floating element anchored at the top-center of the viewport and rendered above all other page content.
2. WHEN the Toast_System displays a message, THE Toast_System SHALL automatically dismiss that message after a fixed visible duration of 4 seconds.
3. WHEN the Toast_System shows a message, THE Toast_System SHALL play an enter animation that completes within 150 to 400 milliseconds.
4. WHEN the Toast_System dismisses a message, THE Toast_System SHALL play an exit animation that completes within 150 to 400 milliseconds before removing the message from the viewport.
5. WHEN a Baker activates the dismiss control on a visible message, THE Toast_System SHALL begin dismissing that message immediately regardless of the remaining auto-dismiss duration.
6. WHILE one or more messages are already visible, WHEN an additional message is triggered, THE Toast_System SHALL display up to a maximum of 3 messages simultaneously, stacked vertically in the order received.
7. IF a message is triggered while 3 messages are already visible, THEN THE Toast_System SHALL queue the additional message and display it in first-in-first-out order once a visible message is dismissed.
8. WHEN a Baker confirms an order, THE App SHALL display an order-confirmed message through the Toast_System.
9. WHEN a WhatsApp message is ready to send, THE App SHALL display a WhatsApp-ready message through the Toast_System.
10. WHEN the Draft_Store saves a draft, THE App SHALL display a draft-saved message through the Toast_System.
11. WHEN the App enters offline mode, THE App SHALL display an offline-mode message through the Toast_System.

### Requirement 14: Analytics and Error Monitoring

**User Story:** As a product owner, I want to see how bakers use the app and when it fails, so that I can prioritize fixes and improvements.

#### Acceptance Criteria

1. WHEN a Baker opens a screen, THE Analytics_Service SHALL record a screen-open event whose payload includes a non-empty screen identifier naming the opened screen.
2. WHEN a Baker creates an order, THE Analytics_Service SHALL record an order-creation event identified by a defined event name, whose payload excludes customer personally identifiable information.
3. WHEN a Baker sends a WhatsApp message, THE Analytics_Service SHALL record a WhatsApp-send event identified by a defined event name, whose payload excludes recipient contact details and message content.
4. WHEN a Baker completes onboarding, THE Analytics_Service SHALL record an onboarding-completion event identified by a defined event name.
5. IF an action fails, THEN THE Analytics_Service SHALL record a failed-action event whose payload includes a non-empty action identifier naming the failed action.
6. IF an unhandled error is caught by the Error_Boundary, THEN THE Analytics_Service SHALL record an error event whose payload includes an error-message field truncated to a maximum of 1000 characters and excluding customer personally identifiable information.
7. WHEN the Analytics_Service records any event, THE Analytics_Service SHALL record it with a non-empty event name drawn from a defined set of event names.
8. THE Analytics_Service SHALL record every event with a payload that contains no customer personally identifiable information, where customer personally identifiable information includes customer name, phone number, email address, delivery address, and message content.

### Requirement 15: Security Hardening

**User Story:** As a product owner, I want secrets and infrastructure to be locked down, so that the app cannot be abused or have its data exposed.

#### Acceptance Criteria

1. THE App SHALL exclude secret credentials (service account keys and server-side private API keys) from the production client bundle, such that a text scan of all deployed client bundle artifacts returns zero service account keys and zero server-side private keys.
2. THE App SHALL load Firebase web configuration values from environment variables rather than hard-coded literals in source files.
3. THE App SHALL classify Firebase web configuration values (the public client config restricted by the authorized domain allowlist and Firestore_Rules) as non-secret and permitted in the client bundle, and SHALL classify service account keys and server-side private keys as secret credentials excluded from the client bundle.
4. WHEN the App receives a request over an insecure HTTP connection, THE App SHALL redirect the request to the equivalent HTTPS URL.
5. IF a request to Firebase services originates from a domain that is not in the approved application domain allowlist, THEN THE App SHALL cause the Firebase web API key to reject the request.
6. THE Firestore_Rules SHALL deny all read and write access to any collection or document path that is not explicitly granted access by a matching rule.
7. WHERE Firebase App Check is enabled, WHEN a registered Baker submits valid login credentials, THE App SHALL complete the authentication login flow successfully within 10 seconds.
8. WHERE Firebase App Check is enabled, IF App Check attestation fails during the login flow, THEN THE App SHALL deny sign-in, display an error message indicating that verification could not be completed, and preserve the unauthenticated state without storing a session.
9. WHEN an authenticated Baker submits an image upload, THE Image_Pipeline SHALL accept the upload to the storage bucket.
10. IF an unauthenticated request or a request from a non-Baker account attempts to write to the storage bucket, THEN THE Image_Pipeline SHALL reject the write and return an error indicating that authentication as a Baker is required, leaving the bucket contents unchanged.

### Requirement 16: Production Build Review

**User Story:** As a product owner, I want the production build to behave like the dev build, so that bakers get the same experience I tested.

#### Acceptance Criteria

1. WHEN the Build_Pipeline produces a production build, THE Build_Pipeline SHALL minify all emitted JavaScript and CSS in the dist/ output such that the emitted files contain no source-level comments and no non-essential whitespace.
2. WHEN the Build_Pipeline produces a production build, THE Build_Pipeline SHALL exclude all console.log, console.debug, and console.info statements from the emitted JavaScript in the dist/ output, while retaining console.error and console.warn statements.
3. WHEN a Baker navigates away from a mounted view in a production build, THE App SHALL release the event listeners, timers, and subscriptions registered by that view within 1 second of the view unmounting.
4. WHEN a Baker repeats a navigation cycle between two views 20 consecutive times in a production build, THE App SHALL keep the retained JavaScript heap measured after the final cycle within 10 percent of the retained JavaScript heap measured after the first completed cycle.
5. WHEN a Baker opens any route that is reachable in the development build, THE production build SHALL render that route's primary screen without uncaught runtime errors and without displaying a blank screen.
6. WHERE source map generation is enabled, THE Build_Pipeline SHALL emit source maps for the minified JavaScript and CSS in the dist/ output that map each minified position to its original source file, line, and column.
7. IF minification or source map generation fails during a production build, THEN THE Build_Pipeline SHALL halt the build, SHALL NOT emit a partial dist/ output, and SHALL report an error indicating which step failed.

### Requirement 17: Responsive Device Compatibility

**User Story:** As a baker, I want the app to work correctly on my specific phone, so that I get a consistent experience regardless of device or network.

#### Acceptance Criteria

1. WHEN the App renders on iPhone Safari, Android Chrome, or Samsung Internet at a viewport width of at least 320 CSS pixels, THE App SHALL display all content within the viewport boundary with 0 pixels of horizontal overflow and without requiring horizontal scrolling.
2. WHEN the on-screen keyboard opens over a focused input field, THE App SHALL keep the entire focused input field and its text caret visible above the keyboard with 0 pixels obscured.
3. WHEN the on-screen keyboard opens over a focused input field, THE App SHALL complete the resulting layout adjustment within 300 milliseconds.
4. WHEN the on-screen keyboard closes, THE App SHALL restore the prior layout within 300 milliseconds.
5. WHEN the visible viewport size changes due to a URL bar expand or collapse or a device orientation change, THE App SHALL recompute the layout to fit the visible viewport within 300 milliseconds.
6. WHEN the App renders the Modal_System on a viewport width of at least 320 CSS pixels, THE App SHALL keep the Modal_System header and close control fully visible with 0 pixels clipped, using dynamic viewport units and the Safe_Area insets.
7. WHILE the device is on a slow network and the requested content is not yet ready, THE App SHALL display a loading State_View.
8. WHEN the App begins loading content while the device is on a slow network, THE App SHALL display the loading State_View within 1 second.
9. WHEN a Baker taps a control on a touch device, THE App SHALL perform the control's action on the first tap without requiring a second tap caused by hover emulation.
10. WHEN a Baker taps a control on a touch device, THE App SHALL display visual feedback for the tap within 100 milliseconds.
11. WHERE the device requests reduced motion or battery saver mode, THE App SHALL reduce or disable non-essential animations while keeping all controls usable.

### Requirement 18: Design System Consistency

**User Story:** As a baker, I want the whole app to look and feel like one polished product, so that it feels trustworthy and premium.

#### Acceptance Criteria

1. THE Design_System SHALL define a finite, named set of reusable tokens for each of the six categories — spacing, typography, color, border radius, shadow, and animation timing — where every token resolves to exactly one concrete value and each animation-timing token specifies a duration between 150 and 400 milliseconds.
2. THE App SHALL render the brand color tokens using the exact hex values rose #B5606A, gold #D4A050, and cream #FAF7F5, with no substitute color value applied in place of these brand tokens.
3. THE App SHALL render all heading text using the Playfair Display typography token and all body text using the Inter typography token.
4. WHEN a new UI surface is rendered, THE App SHALL source every spacing, border radius, shadow, and animation-timing value from the Design_System token set and SHALL use no value outside that defined set.
5. THE App SHALL present all user-facing copy in plain language understandable by non-technical home bakers, containing no unexplained technical jargon, raw error codes, or developer terminology.
6. IF a Design_System web font (Playfair Display or Inter) fails to load, THEN THE App SHALL render the affected text using its defined fallback font (serif for headings, sans-serif for body) and SHALL keep the text content visible.

### Requirement 19: Codebase Cleanup and Refactoring

**User Story:** As a developer, I want the codebase free of dead and duplicated code, so that the app is easier to maintain and ship reliably.

#### Acceptance Criteria

1. WHEN a source-wide reference search returns zero usages of a component, state value, or module from any rendered view, THE App SHALL remove that component, state value, or module from the codebase.
2. THE App SHALL route every overlay, popup, and bottom-sheet surface through the Modal_System, retaining zero overlay implementations that bypass the Modal_System.
3. WHEN a superseded modal system or experimental leftover module is not reachable from any rendered view, THE App SHALL remove it from the codebase so that it is excluded from the production build.
4. WHERE two or more components implement an identical UI pattern (matching DOM structure and behavior, differing only by props or content), THE App SHALL provide exactly one shared reusable component for that pattern and remove the duplicate components.
5. WHEN a production build runs after cleanup, THE App SHALL complete the build with zero errors.
6. WHEN the existing test suite runs after cleanup, THE App SHALL produce a result in which 100 percent of the existing tests pass.
7. IF removing a module would break a reference that is still used by a rendered view, THEN THE App SHALL retain or replace that reference so that the affected functionality remains operational and unchanged in observable behavior.

### Requirement 20: Production-Grade Quality Bar

**User Story:** As a product owner, I want the app to meet a production-grade quality bar, so that I can confidently release it as a premium installable bakery operating system.

#### Acceptance Criteria

1. THE App SHALL NOT be released until every acceptance criterion of Requirement 1 (Crash and Error Safety), Requirement 2 (Scroll and Modal System Stability), Requirement 8 (Offline-First Support), and Requirement 9 (Firebase Security and Per-Bakery Data Isolation) passes with zero failing criteria.
2. WHEN a Baker launches the App installed as a PWA or TWA, THE App SHALL display in standalone mode with no browser address bar and no browser navigation chrome visible.
3. WHEN a Baker completes the core flow of creating an order, confirming the order, and sharing the order through the WhatsApp_Service, THE App SHALL display rendered content or a State_View at each step and SHALL NOT display a blank container, a frozen overlay, or an unresolved loader.
4. THE App SHALL NOT be deployed to production until the full project test suite, including the fast-check property-based tests, runs on the Windows test environment with zero failing tests.
5. WHEN the production build is deployed, THE App SHALL produce the same observable outcomes for the order-creation, order-confirmation, and WhatsApp_Service-share core flows that were verified in the development environment, such that no core flow that passes in development fails in production.
6. WHILE the core flow runs, THE App SHALL resolve any loading indicator to a success State_View or an error State_View within 15 seconds of the loading indicator appearing, and SHALL dismiss any closed overlay within 400 milliseconds of the close action.
7. IF any step of the core flow fails, THEN THE App SHALL surface a user-readable message through the Toast_System, retain the entered order data, and keep the current view interactive.
