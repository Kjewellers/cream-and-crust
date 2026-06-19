# Implementation Plan: Production Readiness Hardening

## Overview

This plan hardens the existing Cream & Crust app (React 18 + Vite 6 + Firebase/Firestore PWA) into a production-grade bakery operating system. It is additive and backward-compatible: each of the nine design subsystems ships independently without breaking the others.

The work sequences the pure, property-tested cores first (`safeData.js`, `whatsappLink.js`, `draftStore.js`, `imagePipeline.fitWithin`, `analytics` sanitize, `tokens.js`, the `syncEngine` queue reducer, and the toast manager), since they unblock everything else. Then come the hooks and components that consume them, then page integration (inline `OrderCard` replacing `StatusUpdateModal`, `OrderForm` draft wiring, `OfflineBanner`, `StateView` usage), and finally platform tasks (guarded App Check, Vite build config, Firestore rules tests, design tokens/font restore, dead-code cleanup).

Constraints honored throughout: incremental and backward-compatible changes; reuse `PremiumBottomSheet` and `showToast`; App Check stays guarded and never breaks login; JavaScript/JSX only; vitest + fast-check for tests; CRLF line endings; Windows/PowerShell commands (no `&&` chaining); real characters (rose, em-dash, ✨) in JSX rather than unicode escapes.

Manual-only verification items from the design (real-device 60fps, Safari memory, TWA standalone display, production bundle secret scans, HTTPS/domain config, heap profiling) are intentionally NOT coding tasks and are out of scope for this checklist.

## Tasks

- [ ] 1. Build the error & safety core (Error & Safety layer)
  - [x] 1.1 Create `src/utils/safeData.js` with safe accessors
    - Implement `safeGet(obj, path, fallback)`, `safeNumber`, `safeString`, `safeArray`, and `normalizeOrder(raw)` as pure functions that never throw on null/garbage input
    - `normalizeOrder` supplies safe defaults for every field the Orders UI reads and passes valid present fields through unchanged
    - _Requirements: 1.3, 1.4_

  - [x]\* 1.2 Write property test for safe data access (Property 1)
    - **Property 1: Safe data access never throws and yields a well-formed order**
    - Use fast-check `fc.anything()` plus arbitrary partial/garbage order objects; assert no accessor throws and `normalizeOrder` returns every UI field defined with a valid-typed value
    - Tag: `Feature: production-readiness-hardening, Property 1`; run `{ numRuns: 100 }`
    - **Validates: Requirements 1.3, 1.4**

  - [ ] 1.3 Create `src/hooks/useAsyncOperation.js` with `withTimeout` helper
    - Implement the pure `withTimeout(promise, ms = 15000)` helper (Promise.race + timer cleanup, rejects with a TimeoutError)
    - Implement `useAsyncOperation({ timeoutMs })` returning `{ run, status, error }` with idle/pending/success/error transitions; on rejection or timeout surface an error State_View status and keep the view interactive
    - _Requirements: 1.7, 1.8, 1.10, 20.6, 20.7_

  - [ ]\* 1.4 Write unit tests for `withTimeout` and `useAsyncOperation`
    - Use fake timers to assert rejection at 15000ms and standard pending → success/error transitions
    - _Requirements: 1.8, 1.10, 20.6_

- [ ] 2. Build the WhatsApp link core (WhatsApp layer)
  - [x] 2.1 Create `src/utils/whatsappLink.js`
    - Implement `normalizePhone(raw)` (strip non-digits; 10 digits → prepend `91`; 12 digits starting `91` → unchanged; empty/no digits → `''`)
    - Implement `buildWhatsAppLink({ phone, message })` using `encodeURIComponent`, generating a message-only link when there is no recipient
    - Implement `buildOrderMessage(order, business)` returning the branded confirmation text
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x]\* 2.2 Write property test for WhatsApp encode/decode round-trip (Property 2)
    - **Property 2: WhatsApp message encode/decode round-trip**
    - Generate `fc.string()` including emojis, multi-line (`\r\n` preserved exactly, no newline normalization), and reserved characters; assert the `text` param has no unencoded space/line-break/reserved char and `decodeURIComponent` reproduces the source character-for-character
    - **Validates: Requirements 6.1, 6.2**

  - [x]\* 2.3 Write property test for phone normalization (Property 3)
    - **Property 3: Phone normalization rules**
    - Generate digit strings of varied length with separators and empty inputs; assert the prepend-`91`, no-double-`91`, and empty-string-recipient rules hold
    - **Validates: Requirements 6.3, 6.4, 6.5**

  - [x] 2.4 Create `src/hooks/useWhatsAppShare.js`
    - Leading-edge debounce so exactly one wa.me session opens per 1000ms window; start a 3000ms fallback timer that shows a copy-text toast via `showToast` if WhatsApp did not open
    - _Requirements: 6.6, 6.7_

  - [ ]\* 2.5 Write unit tests for `useWhatsAppShare`
    - Assert one session per 1s (repeat activations ignored) and the 3s fallback toast fires
    - _Requirements: 6.6, 6.7_

- [ ] 3. Build the draft store core (Draft & Offline layer)
  - [x] 3.1 Create `src/utils/draftStore.js`
    - Implement `saveDraft(key, data)`, `loadDraft(key)`, and `removeDraft(key)` over localStorage with the `cc_draft:` prefix; `loadDraft` parses inside try/catch and removes the bad entry on failure, returning null
    - _Requirements: 7.6, 7.7_

  - [x]\* 3.2 Write property test for draft save/restore round-trip (Property 4)
    - **Property 4: Order_Form draft save/restore round-trip**
    - Generate arbitrary form objects (records of strings/numbers/arrays); assert `loadDraft` after `saveDraft` is deep-equal to the saved draft field-for-field
    - **Validates: Requirements 7.4, 10.7**

  - [x]\* 3.3 Write property test for corrupt-data tolerance (Property 5)
    - **Property 5: Draft store tolerates corrupt data**
    - Write arbitrary `fc.string()` directly under a draft key; assert `loadDraft` never throws, returns null on unparseable data, and removes the bad entry so a subsequent read does not load it
    - **Validates: Requirements 7.6, 7.7, 10.8**

  - [x] 3.4 Create `src/hooks/useDraftStore.js`
    - Debounced autosave (at most one save per `debounceMs = 1000`), restore-on-mount when a draft exists, report `restored` so the caller can show "Draft restored ✨", and expose `clearDraft()` for use on successful submit
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 10.7_

  - [ ]\* 3.5 Write unit tests for `useDraftStore`
    - Assert autosave is debounced to one/second, restore populates fields and reports `restored`, and `clearDraft` removes the draft
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ] 4. Build the image pipeline core and SafeImage (Media layer)
  - [x] 4.1 Create `src/utils/imagePipeline.js`
    - Implement pure `fitWithin(width, height, maxEdge)` (longest edge never exceeds `maxEdge`, aspect ratio preserved)
    - Implement `toWebP(file, { quality })`, `processUpload(file)` (validate → `fitWithin(., 2048)` → WebP, reject bad input), and `makeThumbnail(file, 480)`
    - _Requirements: 11.1, 11.5, 11.6_

  - [x]\* 4.2 Write property test for image fit (Property 10)
    - **Property 10: Image fit never exceeds the maximum edge**
    - Generate arbitrary positive width/height/maxEdge (including 480 and 2048); assert the longest output edge ≤ `maxEdge` and aspect ratio is preserved
    - **Validates: Requirements 11.2, 11.5**

  - [ ]\* 4.3 Write unit tests for `toWebP` and `processUpload`
    - Assert `toWebP` output type is `image/webp` and `processUpload` rejects unsupported/failed input storing nothing
    - _Requirements: 11.1, 11.6_

  - [x] 4.4 Create `src/components/SafeImage.jsx`
    - Lazy (defer until within 250px of viewport via `IntersectionObserver` + `loading="lazy"`), progressive (thumbnail placeholder → full), fallback to `/logo.png` on load error
    - _Requirements: 1.5, 11.2, 11.3, 11.4_

  - [ ]\* 4.5 Write unit tests for `SafeImage`
    - Assert it defers until near the viewport, swaps placeholder → full, and falls back to the placeholder on error
    - _Requirements: 1.5, 11.3, 11.4_

- [ ] 5. Build the analytics service core (Platform layer)
  - [x] 5.1 Create `src/services/analytics.js`
    - Define the frozen `EVENTS` allowlist and `PII_KEYS`; implement `sanitizePayload(payload)` (recursively drops PII keys), `track(eventName, payload)` (asserts the name is in `EVENTS`, sanitizes, logs), and `logError(message, extra)` (truncates message to 1000 chars, no PII)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

  - [x]\* 5.2 Write property test for PII-free payloads (Property 12)
    - **Property 12: Analytics payloads contain no customer PII**
    - Generate arbitrary payloads seeded with PII keys (name, phone, email, address/deliveryAddress, message/notes); assert the recorded payload contains none of them
    - **Validates: Requirements 14.2, 14.3, 14.8**

  - [x]\* 5.3 Write property test for error-message truncation (Property 13)
    - **Property 13: Error-event message is truncated and PII-free**
    - Generate arbitrary long strings; assert the recorded `message` field is ≤ 1000 chars and contains no PII keys
    - **Validates: Requirements 14.6**

  - [x]\* 5.4 Write property test for allowlisted event names (Property 14)
    - **Property 14: Analytics records only allowlisted, non-empty event names**
    - Generate arbitrary names in and out of the `EVENTS` set; assert recorded names are non-empty and members of `EVENTS`, and out-of-set names produce no recorded event
    - **Validates: Requirements 14.1, 14.7**

- [ ] 6. Build the design-system tokens (Platform layer)
  - [x] 6.1 Create `src/styles/tokens.js` and formalize `src/index.css` `:root` tokens
    - Define the named token set (color, motion 150–400ms, radius, space, font) with exact brand hexes rose `#B5606A`, gold `#D4A050`, cream `#FAF7F5`
    - Restore the Playfair Display heading token and Inter body token with serif/sans-serif fallbacks; import the font faces
    - _Requirements: 18.1, 18.2, 18.3, 18.6_

  - [x]\* 6.2 Write property test for animation-timing tokens (Property 15)
    - **Property 15: Design-system animation-timing tokens are within range**
    - Iterate the token set; assert every motion token parses to a single ms value in [150, 400] and every spacing/radius/color/shadow/typography token resolves to exactly one concrete value
    - **Validates: Requirements 18.1**

  - [ ]\* 6.3 Write unit tests for brand and typography tokens
    - Assert exact brand hex values and that heading/body fonts include their serif/sans-serif fallbacks
    - _Requirements: 18.2, 18.3, 18.6_

- [ ] 7. Build the sync engine queue and online status (Draft & Offline layer)
  - [x] 7.1 Create `src/services/syncEngine.js`
    - Implement `enqueueAction(action)` (FIFO, persisted to `cc_syncQueue:<uid>` so it survives reload), `flushQueue()` (apply FIFO within 10s of reconnect; on failure retain the action at the head for the next event), and `onSyncStatus(listener)`; keep the queue logic as a pure, testable reducer
    - _Requirements: 8.2, 8.4, 8.7, 8.8, 10.4_

  - [x]\* 7.2 Write property test for the action queue reducer (Property 6)
    - **Property 6: Action queue preserves submission order and retains failures**
    - Generate arbitrary action sequences with injected failure flags; assert FIFO application, that the final committed value equals the most recently submitted update, and that failed actions remain queued for retry
    - **Validates: Requirements 8.4, 8.7, 8.8, 10.4**

  - [x] 7.3 Create `src/hooks/useOnlineStatus.js`
    - Return a boolean derived from `navigator.onLine` plus `online`/`offline` events
    - _Requirements: 8.5, 8.6_

  - [x]\* 7.4 Write unit tests for `useOnlineStatus`
    - Assert it flips on dispatched `online`/`offline` events
    - _Requirements: 8.5, 8.6_

- [ ] 8. Harden the toast manager (State-View & Toast layer)
  - [x] 8.1 Update `showToast` in `src/components/iOS.jsx`
    - Set default visible duration to 4000ms; enforce max 3 simultaneous toasts stacked top-center in receive order with a FIFO overflow queue; keep enter/exit animations within 150–400ms; preserve the existing `showToast` signature and extract the cap/queue logic as a pure, testable reducer
    - _Requirements: 12.8, 13.1, 13.2, 13.6, 13.7_

  - [x]\* 8.2 Write property test for the toast manager (Property 11)
    - **Property 11: Toast system caps visible messages and preserves order**
    - Generate arbitrary sequences of `showToast` triggers; assert at most 3 visible, displayed in receive order, with overflow held FIFO and surfaced only as visible ones dismiss
    - **Validates: Requirements 13.6, 13.7**

  - [x]\* 8.3 Write unit tests for toast behavior
    - Assert 4s auto-dismiss, immediate dismiss control, top-center anchoring, and enter/exit animation within 150–400ms
    - _Requirements: 13.2, 13.3, 13.4, 13.5_

- [x] 9. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Build the State-View component family (State-View & Toast layer)
  - [x] 10.1 Create `src/components/StateView.jsx`
    - Implement `StateView` plus `LoadingView`, `ErrorView` (with retry), `EmptyView` (never blank), and `OfflineView`, building on the existing `EmptyState`/`Skeleton` primitives in `iOS.jsx`
    - Loading State_View appears within 300ms; success window 3–5s satisfied via the toast system
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 17.7, 17.8_

  - [ ]\* 10.2 Write unit tests for the State-View family
    - Assert empty/loading/error/offline/success render correctly, retry re-attempts the load, and 3 consecutive failures keep the retry action available
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [ ] 11. Build the inline expandable Order_Card (Modal & Inline-Interaction layer)
  - [x] 11.1 Create `src/components/orders/OrderCard.jsx`
    - Controlled `expanded`/`onToggleExpand` summary row that expands in place (no Modal_System), with an optimistic `onStatusChange` that persists and reverts + error-toasts on failure; export a pure expand-state reducer so the parent keeps at most one card open; wrap the component in `React.memo` with value-equal props
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 5.3_

  - [x]\* 11.2 Write property test for the expand reducer (Property 7)
    - **Property 7: At most one Order_Card is expanded**
    - Generate arbitrary sequences of `toggle(id)`; assert the expanded set never holds more than one card id
    - **Validates: Requirements 3.5, 3.6**

  - [ ]\* 11.3 Write unit tests for `OrderCard`
    - Assert tap expands in place without opening a modal, optimistic status applies ≤300ms, failure reverts and shows an error toast, and no `StatusUpdateModal` is rendered
    - _Requirements: 3.1, 3.3, 3.4, 3.7_

- [ ] 12. Enhance PremiumBottomSheet scroll restore (Modal & Inline-Interaction layer)
  - [x] 12.1 Update `src/components/PremiumBottomSheet.jsx`
    - Capture `window.scrollY` on open and restore it exactly on close; ensure the close transition unmounts the overlay within 400ms; keep the scroll capture/restore logic as a pure, testable function
    - _Requirements: 2.6, 2.7_

  - [x]\* 12.2 Write property test for scroll-offset restore (Property 8)
    - **Property 8: Modal scroll-offset restore round-trip**
    - Generate arbitrary integer scroll offsets; assert open-then-close restores the prior offset exactly
    - **Validates: Requirements 2.6**

  - [x]\* 12.3 Write unit tests for PremiumBottomSheet behavior
    - Assert body scroll lock on open, close via overlay/close-control/Escape, and overlay removal within 400ms
    - _Requirements: 2.1, 2.2, 2.5, 2.7_

- [ ] 13. Build VirtualList and motion hooks (Performance layer)
  - [x] 13.1 Create `src/components/VirtualList.jsx`
    - Windowed/incremental rendering for lists > 50 items, growing the rendered window via an `IntersectionObserver` sentinel and keeping the visible region free of blank gaps; keep the windowing logic as a pure, testable reducer
    - _Requirements: 5.1_

  - [x]\* 13.2 Write property test for list windowing (Property 9)
    - **Property 9: Incremental list window stays within bounds**
    - Generate arbitrary list length and reveal-event counts; assert the rendered count is never below the initial count nor above the total, and is non-decreasing as reveals occur
    - **Validates: Requirements 5.1**

  - [x] 13.3 Create `src/hooks/useReducedMotion.js`
    - Return true under `prefers-reduced-motion: reduce` (and battery-saver heuristics) so callers can disable non-essential motion while keeping controls usable
    - _Requirements: 5.4, 5.5, 17.11_

  - [x]\* 13.4 Write unit tests for VirtualList and useReducedMotion
    - Assert window growth on sentinel reveal and that reduced-motion is detected from `matchMedia`
    - _Requirements: 5.1, 17.11_

- [ ] 14. Build navigation & layout stability (Navigation & Layout layer)
  - [x] 14.1 Create `src/hooks/useKeyboardInsets.js`
    - Use `visualViewport` resize to detect the on-screen keyboard and report `{ keyboardOpen, viewportHeight }`, restoring within 300ms on dismiss
    - _Requirements: 4.3, 4.6, 17.2, 17.3, 17.4, 17.5_

  - [x] 14.2 Update bottom nav and FAB in `src/App.jsx` and `src/index.css`
    - Reserve `env(safe-area-inset-bottom)`, keep the nav anchored with `100dvh`-aware layout, add `--bottom-nav-clearance` page padding, position the FAB above the nav + safe area, hide the nav while the keyboard is open (via `useKeyboardInsets`), and ensure first-tap touch feedback within 100ms with no hover-emulation double tap
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 17.1, 17.9, 17.10_

  - [x]\* 14.3 Write unit tests for `useKeyboardInsets`
    - Assert the keyboard-open signal hides the nav and restores it on dismiss
    - _Requirements: 4.3, 4.6_

- [x] 15. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Wire the Error_Boundary to analytics (Error & Safety layer)
  - [x] 16.1 Update `src/components/AppErrorBoundary.jsx`
    - Add `resetKeys`/`retryKey` so retry re-mounts the failed subtree via a keyed fragment without a full reload, keep the fallback (Try again / Home / Refresh) visible if the child re-throws, and call `logError` from `componentDidCatch` with a truncated, PII-free message
    - _Requirements: 1.1, 1.2, 1.9, 14.6_

  - [x]\* 16.2 Write unit tests for the Error_Boundary
    - Assert a thrown child shows the fallback with retry/home, retry re-mounts the view, and a re-throw keeps the fallback and actions visible
    - _Requirements: 1.1, 1.2, 1.9_

- [ ] 17. Harden Firebase security (Platform layer)
  - [x] 17.1 Guard App Check in `src/services/firebase.js`
    - Initialize App Check only when `VITE_APP_CHECK_ENABLED === 'true'` and a site key is present, inside try/catch so a missing key or attestation init error logs a warning and login continues; keep web config sourced from env vars
    - _Requirements: 15.2, 15.3, 15.7, 15.8_

  - [ ]\* 17.2 Write unit tests for the guarded App Check init
    - Assert that a missing key or thrown init does not block the auth path
    - _Requirements: 15.7_

  - [x] 17.3 Add/verify Storage security rules
    - Require an authenticated Baker for storage bucket writes and reject unauthenticated/non-Baker writes with an auth-required error, leaving the bucket unchanged; allow authenticated image uploads
    - _Requirements: 15.9, 15.10_

  - [x]\* 17.4 Write Firestore rules isolation tests (Property 16)
    - **Property 16: Firestore rules enforce per-bakery isolation**
    - Add `@firebase/rules-unit-testing` as a dev dependency and an `emulators.firestore` block in `firebase.json`; run against the local Firebase emulator (`firebase emulators:exec`). Enumerate bakery-A-vs-bakery-B access (read/create/update/delete) across orders, customers, products, inventory, recipes, expenses, invoices, analytics; assert all denials, unauthenticated denial of private reads/writes, create-without-matching-uid denial, owner-uid-change denial, and unmatched-path denial; assert public read on business/products
    - Note: this task requires `@firebase/rules-unit-testing` + the running Firestore emulator
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 15.6**

- [ ] 18. Integrate inline Order_Cards into the Orders page (page integration)
  - [ ] 18.1 Update `src/pages/Orders.jsx` to use `OrderCard`
    - Add `expandedOrderId` state and pass `expanded`/`onToggleExpand` to each `OrderCard` (expanding one collapses others, ≤2px scroll movement); wire `onStatusChange` to the optimistic `updateOrderStatusInDB` flow; remove the `StatusUpdateModal` import and render site; route the legacy `CalendarView` `.modal-overlay` through `PremiumBottomSheet`
    - _Requirements: 2.8, 3.2, 3.5, 3.7, 19.2, 19.3_

  - [ ]\* 18.2 Write integration tests for the Orders inline flow
    - Assert expanding a card collapses the prior one, scroll position holds within 2px, status changes apply inline, and no `StatusUpdateModal` is mounted
    - _Requirements: 3.1, 3.2, 3.5, 3.7_

- [ ] 19. Wire draft persistence into the Order_Form (page integration)
  - [x] 19.1 Update `src/components/orders/OrderForm.jsx` with `useDraftStore`
    - Accept an optional `draftKey`, restore an existing draft on open and show "Draft restored ✨" via `showToast`, autosave changes (debounced), and clear the draft on successful submit; ensure the active route and draft restore after refresh/tab-switch/process death
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.5, 10.6, 13.10_

  - [ ]\* 19.2 Write integration tests for Order_Form draft restore/clear
    - Assert restore populates every field field-for-field, the restore toast fires, and submit clears the draft
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [ ] 20. Add the offline banner and sync wiring (page integration)
  - [x] 20.1 Create `src/components/OfflineBanner.jsx` and mount it in `MainLayout` (`src/App.jsx`)
    - Show the banner within 2s of going offline and hide within 2s of reconnect (driven by `useOnlineStatus`); fire an offline-mode toast via `showToast`; trigger `syncEngine.flushQueue()` on reconnect so offline-created orders persist and replay
    - _Requirements: 8.1, 8.5, 8.6, 13.11_

  - [ ]\* 20.2 Write integration tests for the offline banner and replay
    - Assert the banner appears/disappears on online/offline transitions and that an order created offline is queued and flushed FIFO on reconnect
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_

- [ ] 21. Integrate performance optimizations into pages (Performance layer)
  - [x] 21.1 Wrap route Suspense fallbacks and apply VirtualList to the Orders list
    - In `src/App.jsx`, wrap each lazy route's `Suspense` fallback in `LoadingView` with a 15s timeout that swaps to `ErrorView` (retry) while preserving navigation context; in `src/pages/Orders.jsx`, render the order list through `VirtualList` and confirm `OrderCard` memoization skips equal-input re-renders
    - _Requirements: 5.2, 5.3, 5.7_

  - [ ]\* 21.2 Write tests for lazy fallback timeout and memoization
    - Assert the lazy loading fallback resolves to an error State_View with retry after timeout and that equal props skip re-render
    - _Requirements: 5.2, 5.3, 5.7_

- [ ] 22. Consolidate WhatsApp callers onto the shared core (WhatsApp layer)
  - [x] 22.1 Re-point existing WhatsApp callers
    - Re-point `shareToWhatsApp` (`src/services/whatsapp.js`) and `sendWhatsAppMessage` (`src/utils/whatsapp.js`) to `buildWhatsAppLink`/`useWhatsAppShare`; route order-confirmed and WhatsApp-ready toasts through `showToast`; record the no-PII `order_create` and `whatsapp_send` analytics events
    - _Requirements: 6.1, 6.6, 12.7, 13.8, 13.9, 14.2, 14.3, 19.4_

  - [ ]\* 22.2 Write tests for WhatsApp caller consolidation
    - Assert both legacy callers produce identical links via the shared core and the confirm/ready toasts fire
    - _Requirements: 6.1, 13.8, 13.9_

- [ ] 23. Harden the production build pipeline (Platform layer)
  - [x] 23.1 Update `vite.config.js`
    - Configure esbuild to drop `console.log`/`console.debug`/`console.info` while retaining `console.error`/`console.warn`; confirm minification emits comment-free, whitespace-minimal output, source maps when enabled, and that the build halts on failure without emitting a partial `dist/`
    - _Requirements: 16.1, 16.2, 16.6, 16.7_

  - [x] 23.2 Audit and fix effect/subscription/timer cleanup across views
    - Ensure `useEffect` subscriptions, event listeners, and timers are released on unmount within 1s across the routed views
    - _Requirements: 16.3_

  - [ ]\* 23.3 Write unit tests for effect cleanup
    - Assert unmounting representative views releases their listeners, timers, and subscriptions
    - _Requirements: 16.3_

- [ ] 24. Clean up dead and duplicated code (Codebase Cleanup layer)
  - [ ] 24.1 Remove and migrate superseded modules
    - Migrate `BottomNavCustomiseSheet` (`src/App.jsx`) to `PremiumBottomSheet`; remove the legacy `BottomSheet` in `src/components/iOS.jsx` if unreferenced; delete the now-unused `StatusUpdateModal` file; collapse duplicate WhatsApp/image-compression code onto the new cores; remove dead Razorpay client artifacts; retain or replace any reference still used by a rendered view
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.7_

  - [ ]\* 24.2 Write a core-flow smoke integration test
    - Drive create → confirm → WhatsApp share and assert each step renders content or a State_View (never blank/frozen/unresolved), matching dev-build observable outcomes
    - _Requirements: 20.3, 20.5_

- [ ] 25. Final checkpoint
  - Run `npm run build` and `npx vitest --run`; ensure the production build completes with zero errors and 100 percent of the test suite passes. Ask the user if questions arise.
  - _Requirements: 19.5, 19.6, 20.4_

## Notes

- Tasks marked with `*` are optional (property tests, unit tests, integration tests) and can be skipped for a faster MVP; core implementation tasks are never optional.
- The Firestore rules isolation suite (task 17.4) needs `@firebase/rules-unit-testing` and the running Firebase Firestore emulator; all other property tests run in pure jsdom.
- Each task references specific requirement sub-clauses and, where relevant, the design Property number it implements, for traceability.
- The project is JavaScript/JSX (React + Vite); tests use vitest + fast-check (≥100 runs per property). Files use CRLF line endings and JSX uses real characters (rose, em-dash, ✨) rather than unicode escapes.
- Commands run on Windows/PowerShell — invoke them individually rather than chaining with `&&`.
- App Check stays guarded and must never block login; `PremiumBottomSheet` and `showToast` are reused rather than re-implemented.
- Manual/non-automated verification items from the design (real-device 60fps, Safari memory, TWA standalone display, bundle secret scans, HTTPS/domain config, heap profiling, plain-language copy review) are intentionally excluded as coding tasks.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "4.1", "5.1", "6.1", "7.1", "8.1"] },
    {
      "id": 1,
      "tasks": [
        "1.2",
        "1.3",
        "2.2",
        "2.3",
        "2.4",
        "3.2",
        "3.3",
        "3.4",
        "4.2",
        "4.3",
        "4.4",
        "5.2",
        "5.3",
        "5.4",
        "6.2",
        "6.3",
        "7.2",
        "7.3",
        "8.2",
        "8.3",
        "10.1",
        "11.1",
        "12.1",
        "13.1",
        "13.3",
        "14.1",
        "16.1",
        "17.1",
        "17.3"
      ]
    },
    {
      "id": 2,
      "tasks": [
        "1.4",
        "2.5",
        "3.5",
        "4.5",
        "7.4",
        "10.2",
        "11.2",
        "11.3",
        "12.2",
        "12.3",
        "13.2",
        "13.4",
        "14.3",
        "16.2",
        "17.2",
        "17.4",
        "14.2",
        "19.1",
        "22.1",
        "23.1"
      ]
    },
    { "id": 3, "tasks": ["18.1", "20.1", "19.2", "22.2"] },
    { "id": 4, "tasks": ["21.1", "18.2", "20.2"] },
    { "id": 5, "tasks": ["24.1", "21.2"] },
    { "id": 6, "tasks": ["23.2", "24.2"] },
    { "id": 7, "tasks": ["23.3"] }
  ]
}
```
