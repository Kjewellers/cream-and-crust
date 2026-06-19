# Implementation Plan

## Overview

This plan fixes the recipe inventory deduction defects in `src/services/db.js` using the bug condition methodology: (1) write a property-based exploration test that surfaces all eight defects on the unfixed code, (2) write property-based preservation tests that pin down behavior on `¬C(X)` (non-buggy inputs), (3) implement the fix in nine focused sub-tasks (helpers + recipe lookup + recipe-driven deductions + transactional commit + toast + restock + caller wiring + UI + order-creation), then (4) re-run both property tests to confirm the bug is gone and no regressions exist.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2"],
      "rationale": "Exploration and preservation property tests are independent of each other and must run on UNFIXED code before any implementation begins. Task 1 must FAIL (confirms the bug); task 2 must PASS (pins down the baseline)."
    },
    {
      "wave": 2,
      "tasks": ["3.1"],
      "rationale": "convertUnit helper and typed error classes are the foundation for recipe-driven deduction (3.3), failure surfacing (3.5), and restock (3.6)."
    },
    {
      "wave": 3,
      "tasks": ["3.2", "3.3"],
      "rationale": "Recipe lookup by recipeId (3.2) and recipe-driven, unit-converted deductions (3.3) can proceed in parallel once 3.1 is in place; both feed the transactional commit in 3.4."
    },
    {
      "wave": 4,
      "tasks": ["3.4"],
      "rationale": "Transactional commit + idempotency guard wraps the work from 3.2 and 3.3."
    },
    {
      "wave": 5,
      "tasks": ["3.5"],
      "rationale": "Toast and deductionError persistence assume the transaction layer (3.4) exists so they can correctly distinguish 'committed' from 'aborted'."
    },
    {
      "wave": 6,
      "tasks": ["3.6"],
      "rationale": "restockIngredientsForOrder mirrors 3.4 and reuses the error classes from 3.1, so it follows the deduction implementation."
    },
    {
      "wave": 7,
      "tasks": ["3.7"],
      "rationale": "Wiring updateOrderStatusInDB depends on both deductIngredientsForOrder (3.4) and restockIngredientsForOrder (3.6)."
    },
    {
      "wave": 8,
      "tasks": ["3.8", "3.9"],
      "rationale": "UI rendering (3.8) needs deductionError from 3.5 and deductionSummary from 3.4; the order-creation form change (3.9) is independent but is required for Property 1 to pass end-to-end."
    },
    {
      "wave": 9,
      "tasks": ["3.10", "3.11"],
      "rationale": "Re-run the SAME tests from tasks 1 and 2 (no new tests). Both should now pass: 3.10 confirms the bug is fixed, 3.11 confirms no regressions."
    },
    {
      "wave": 10,
      "tasks": ["4"],
      "rationale": "Checkpoint runs the full test suite to confirm both property tests and any pre-existing tests pass together."
    }
  ]
}
```

- Tasks 1 and 2 are independent and must precede every 3.x sub-task.
- 3.1 has no dependencies inside Phase 3 and is the foundation for 3.3, 3.5, 3.6.
- 3.2 and 3.3 can be done together but both feed 3.4.
- 3.4 must complete before 3.5 (failure surfacing assumes the transaction layer exists).
- 3.6 depends on 3.1 (error classes) and 3.4 (transactional pattern).
- 3.7 depends on 3.4 and 3.6 (it calls both).
- 3.8 and 3.9 are UI / form changes; 3.8 depends on 3.5 (so `deductionError` exists), 3.9 has no internal dependency but Property 1 cannot pass end-to-end without it.
- 3.10 and 3.11 must be the last tasks before the checkpoint.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Recipe-Driven, Unit-Aware, Idempotent, Atomic Deduction (and Inverse Restock)
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate `deductIngredientsForOrder` mishandles the eight defective paths called out in the design (hardcoded quantity, fuzzy match, double-deduction, silent failure, unit mismatch, partial commit, no restock, no audit trail).
  - **Scoped PBT Approach**: For deterministic defects, scope each property to concrete failing cases for reproducibility, then layer `fast-check` arbitraries over the scoped inputs.
  - Create `src/services/__tests__/deductIngredientsForOrder.bug.test.js` (Vitest + `fast-check`) that mocks the Firestore primitives (`getDoc`, `getDocs`, `updateDoc`, `runTransaction`) and drives `deductIngredientsForOrder` / `updateOrderStatusInDB` with crafted `(order, recipes, inventory, statusTransition)` fixtures from the design's "Bug Condition" pseudocode.
  - Implement the following property-backed cases corresponding to `isBugCondition(input) = true`:
    - **Case A1 — Hardcoded quantity (1.1 vs 2.1)**: For all `recipeQty ∈ [1, 1000]` and `unit ∈ {g, kg}`, recipe `{ name: "flour", quantity: recipeQty, unit }`, inventory `{ item: "flour", stock: 5, unit: "kg" }`, order `size: "1kg"`. Assert deducted amount equals `convertUnit(recipeQty, unit, "kg") × orderMultiplier(order)`.
    - **Case A2 — Fuzzy match (1.2 vs 2.2)**: Order `{ product: "Birthday Cake" }` with no `recipeId`, recipes `["Chocolate Cake", "Vanilla Cake"]`. Assert a `missing-recipe-link` error is surfaced and inventory is unchanged.
    - **Case A3 — Double deduction (1.3 vs 2.3)**: Run deduction twice on the same order; after first run `inventoryDeducted = true`. Assert second run is a no-op (inventory unchanged on the second call).
    - **Case A4 — Silent missing inventory (1.4 vs 2.4)**: Recipe references `"Almond Flour"`, inventory has no matching item. Assert a `missing-inventory-item` toast/error is surfaced and no partial writes occur.
    - **Case A5 — Unit mismatch (1.5 vs 2.5)**: Recipe `200 g`, inventory `kg`. Assert deduction of `0.2 × orderMultiplier kg`.
    - **Case A6 — Partial commit (1.6 vs 2.6)**: Multi-ingredient recipe; inject a transactional failure on the third write. Assert all three inventory items are unchanged and `inventoryDeducted` is still `false`.
    - **Case A7 — Insufficient stock (2.4)**: Recipe needs `1 kg flour`, inventory has `0.3 kg`. Assert `insufficient-stock` toast and no inventory write.
    - **Case A8 — Incompatible unit (2.5)**: Recipe says `200 g`, inventory unit is `pcs`. Assert `incompatible-unit` toast and no inventory write.
    - **Case A9 — No restock on cancel (1.7 vs 2.7)**: Order in `baking` with `inventoryDeducted = true` and a `deductionSummary` transitions to `cancelled`. Assert inventory is restored to pre-deduction values and `inventoryDeducted` becomes `false`.
    - **Case A10 — No audit trail (1.8 vs 2.8)**: After a successful deduction, assert `order.deductionSummary` is a non-empty array of `{ ingredient, deductedQuantity, unit, inventoryItemId }` and `order.deductionError` is `null`.
  - The assertions should match the Property 1 pseudocode in the design (recipe selection by id, unit-converted quantities, idempotency, atomic commit, surfaced failures, inverse restock, persisted summary).
  - Run test on UNFIXED code: `npx vitest run src/services/__tests__/deductIngredientsForOrder.bug.test.js`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "for recipe `{ quantity: 500, unit: g }` and inventory `kg`, F deducts `200` instead of `0.5`", "F selects recipe by name substring when `recipeId` is absent and deducts silently", "second `baking` transition deducts again instead of no-op", "transactional failure on 3rd write leaves first 2 ingredients debited") to confirm the root cause analysis in design.md.
  - Mark task complete when test is written, run, and the failure list is captured in the test file's leading comment block.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Paths Are Byte-for-Byte Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for inputs where `isBugCondition(input) = false`:
    - Observe: `updateOrderStatusInDB(orderId, "Confirmed", ...)` does not call `deductIngredientsForOrder` and writes only the status fields.
    - Observe: `updateOrderStatusInDB(orderId, "Delivered", ...)` from `Pending` does not touch inventory.
    - Observe: `updateOrderFieldsInDB(orderId, { customerName, deliveryDate })` writes only those fields and does not touch inventory or `inventoryDeducted` / `deductionSummary`.
    - Observe: Inventory documents read via existing queries continue to use the `{ item, stock, unit, minStock }` shape with `uid` scoping.
    - Observe: Recipe documents continue to use `ingredients: [{ name, quantity, unit }]` with `uid` scoping.
    - Observe: Orders with no `recipeId` undergoing non-`baking` operations (view, edit customer, change delivery date) do not raise deduction-related errors.
  - Create `src/services/__tests__/deductIngredientsForOrder.preservation.test.js` (Vitest + `fast-check`) with property-based tests capturing the observed behavior patterns from the Preservation Requirements:
    - **P2.1 — Non-baking status preservation (3.1)**: For all `(oldStatus, newStatus)` where `newStatus ≠ "baking"` and `oldStatus ≠ "baking"`, assert inventory is untouched and order status fields are written identically under F (current code).
    - **P2.2 — Happy-path deduction occurrence (3.2)**: For orders with explicit `recipeId`, single matching ingredient, units already matching the inventory unit, sufficient stock, and first transition into `baking`, assert that _deduction occurred and the order was marked_ under F (the _quantities_ are not asserted here — that's covered by Property 1).
    - **P2.3 — Field-update preservation (3.3)**: For arbitrary field payloads passed to `updateOrderFieldsInDB`, assert inventory is untouched and `inventoryDeducted` / `deductionSummary` are not written under F.
    - **P2.4 — Inventory shape preservation (3.4)**: For every inventory document written under F, assert keys are exactly `{ item, stock, unit, minStock }` (plus the document's `uid`) — no new fields introduced by F.
    - **P2.5 — Recipe shape preservation (3.5)**: F never writes to recipe documents; reads use `ingredients: [{ name, quantity, unit }]`. Property-test that no recipe-doc writes occur during deduction.
    - **P2.6 — Missing-recipeId non-baking operations (3.6)**: For orders with no `recipeId` exercising non-`baking` operations, assert no errors are raised and no inventory writes occur under F.
  - Property-based testing is recommended for stronger preservation guarantees: `fast-check` generates many `(order, recipes, inventory, statusTransition)` tuples across `¬C(X)` and catches edge cases (empty recipes, unusual unit strings, zero-quantity ingredients, missing optional fields).
  - Run tests on UNFIXED code: `npx vitest run src/services/__tests__/deductIngredientsForOrder.preservation.test.js`
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code; record the observed baseline outputs as inline comments next to each property so the post-fix run can be compared.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix recipe inventory deduction (recipe-driven, unit-aware, idempotent, transactional, with inverse restock)
  - [x] 3.1 Add `convertUnit` helper and typed error classes
    - Add `convertUnit(quantity, fromUnit, toUnit)` in `src/services/db.js` (or a co-located `src/services/units.js` re-exported from `db.js`) supporting:
      - Mass family: `g ↔ kg` (`1 kg = 1000 g`), identity within unit.
      - Volume family: `ml ↔ L` (`1 L = 1000 ml`), identity within unit.
      - Count family: `pcs`, `boxes`, `packets` — identity only; cross-conversion within the family is unsupported.
      - Cross-family conversion (e.g., `g → ml`, `pcs → kg`) throws `IncompatibleUnitError`.
      - Unit comparison is case-insensitive.
    - Define typed error classes `MissingRecipeLinkError`, `MissingInventoryItemError`, `InsufficientStockError`, `IncompatibleUnitError` with codes `"missing-recipe-link"`, `"missing-inventory-item"`, `"insufficient-stock"`, `"incompatible-unit"` respectively.
    - _Bug_Condition: isBugCondition(input) — defects 1.1, 1.5 (hardcoded quantity, missing unit conversion)_
    - _Expected_Behavior: 2.1 (recipe-driven quantity), 2.5 (unit conversion within supported families, incompatible-unit error otherwise)_
    - _Preservation: 3.4, 3.5 (inventory and recipe shapes unchanged)_
    - _Requirements: 2.1, 2.5_

  - [x] 3.2 Replace recipe selection with explicit `recipeId` lookup
    - In `deductIngredientsForOrder`, read `order.recipeId`. If falsy, throw `MissingRecipeLinkError("Order has no recipeId")`.
    - Fetch the single recipe document by id via `getDoc(doc(db, "recipes", order.recipeId))`, still scoped to `uid`. If the recipe document does not exist or has no `ingredients`, throw `MissingRecipeLinkError("Recipe not found")`.
    - Remove the existing fuzzy `recipes.find(r => productName.includes(rName) || rName.includes(productName))` heuristic entirely.
    - _Bug_Condition: isBugCondition(input) — defect 1.2 (multipleRecipesNameOverlapProduct)_
    - _Expected_Behavior: 2.2 (recipe by explicit `recipeId`, no fuzzy fallback; surface "missing-recipe-link" toast and don't deduct)_
    - _Preservation: 3.5, 3.6 (recipe shape unchanged; orders without `recipeId` continue to work for non-`baking` operations)_
    - _Requirements: 2.2_

  - [x] 3.3 Compute recipe-driven, unit-converted deductions per ingredient
    - For each `ing` in `recipe.ingredients`:
      - Find the matching inventory item by id (preferred) or by exact case-insensitive `item` name. If none, throw `MissingInventoryItemError(ing.name)`.
      - Compute `converted = convertUnit(ing.quantity, ing.unit, inventoryItem.unit)`.
      - Compute `deduction = converted * orderMultiplier(order)` (continue deriving `orderMultiplier` from `order.size` as today).
      - If `inventoryItem.stock - deduction < 0`, throw `InsufficientStockError(ing.name, deduction, inventoryItem.stock)`.
    - _Bug_Condition: isBugCondition(input) — defects 1.1, 1.4, 1.5_
    - _Expected_Behavior: 2.1 (recipe-driven quantity × orderMultiplier in inventory unit), 2.4 (surface `missing-inventory-item` and `insufficient-stock` failures), 2.5 (unit conversion)_
    - _Preservation: 3.4, 3.5_
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 3.4 Wrap deduction in a Firestore transaction with idempotency guard
    - Use `runTransaction(db, async (tx) => { … })` to perform the entire deduction atomically.
    - Inside the transaction:
      - `tx.get(orderRef)`. If `order.inventoryDeducted === true`, return early (no-op).
      - `tx.get(...)` each inventory document referenced by the recipe.
      - Compute all new stocks (errors raised in 3.3 abort the transaction).
      - `tx.update(...)` each inventory document with its new stock.
      - `tx.update(orderRef, { inventoryDeducted: true, deductionSummary: [...], deductionError: null })`.
    - Replace the existing per-ingredient sequential `updateInventoryStockInDB` / `updateDoc` calls.
    - _Bug_Condition: isBugCondition(input) — defects 1.3 (alreadyDeductedOnce), 1.6 (recipeHasMultipleIngredients atomicity risk)_
    - _Expected_Behavior: 2.3 (idempotent no-op when `inventoryDeducted = true`), 2.6 (single transaction; all-or-nothing)_
    - _Preservation: 3.2, 3.4 (deduction still happens on the happy path; inventory shape unchanged)_
    - _Requirements: 2.3, 2.6_

  - [x] 3.5 Surface failures via toast and persist on the order
    - In the caller `updateOrderStatusInDB`, catch `MissingRecipeLinkError`, `MissingInventoryItemError`, `InsufficientStockError`, `IncompatibleUnitError` and dispatch a toast (using the existing toast service used elsewhere in the app) with a specific human-readable message per error class.
    - On failure, persist via a non-transactional follow-up `updateDoc(orderRef, { deductionSummary: [], deductionError: { code, message } })` so the order detail view can render the failure state. `inventoryDeducted` remains `false`.
    - Remove the existing `try/catch + console.error` swallowing.
    - _Bug_Condition: isBugCondition(input) — defects 1.4 (missingRecipeOrInventoryMatch), 1.8 (no audit trail)_
    - _Expected_Behavior: 2.4 (surface user-visible toast for every failure mode), 2.8 (persist `deductionSummary` / `deductionError` on the order)_
    - _Preservation: 3.3 (unrelated order writes still don't trigger deduction)_
    - _Requirements: 2.4, 2.8_

  - [x] 3.6 Add `restockIngredientsForOrder(orderId, orderData)`
    - New exported function in `src/services/db.js`, mirroring 3.4.
    - Gated on `order.inventoryDeducted === true` AND a non-empty `order.deductionSummary`. If neither holds, no-op silently (e.g., legacy orders deducted before this fix).
    - Inside a single `runTransaction`:
      - For each entry in `deductionSummary`, `tx.update(inventoryItemRef, { stock: prevStock + entry.deductedQuantity })`.
      - `tx.update(orderRef, { inventoryDeducted: false, deductionSummary: [], deductionError: null })`.
    - Surface failures via toast with the same error-class mapping as 3.5.
    - _Bug_Condition: isBugCondition(input) — defect 1.7 (oldStatus = baking, newStatus ≠ baking, inventoryDeducted = true)_
    - _Expected_Behavior: 2.7 (inverse restock; clear `inventoryDeducted` so a later legitimate transition back to baking can deduct again)_
    - _Preservation: 3.4 (inventory shape unchanged)_
    - _Requirements: 2.7_

  - [x] 3.7 Wire restock into `updateOrderStatusInDB`
    - Read the prior order snapshot via `getDoc(orderRef)` _before_ `updateDoc` so the old status and `inventoryDeducted` flag are available.
    - After `updateDoc(orderRef, { status: newStatus, ...extraFields })`:
      - If `newStatus.toLowerCase() === "baking"`: call `deductIngredientsForOrder(orderId, { ...orderSnap })` (existing behavior, now using the rewritten function).
      - Else if the _previous_ status (from `orderSnap`) was `"baking"` and `orderSnap.inventoryDeducted === true`: call `restockIngredientsForOrder(orderId, { ...orderSnap })`.
    - Ensure non-`baking` status updates that aren't transitioning away from a previously-deducted `baking` state continue to write only status fields (no inventory touch).
    - _Bug_Condition: isBugCondition(input) — Case B (away-from-baking on previously-deducted order)_
    - _Expected_Behavior: 2.7 (restock invocation on transition away from baking)_
    - _Preservation: 3.1 (non-baking status updates still don't touch inventory), 3.3 (`updateOrderFieldsInDB` and other order writes still don't trigger deduction)_
    - _Requirements: 2.7, 3.1, 3.3_

  - [x] 3.8 Render `deductionSummary` in the order detail view
    - In the existing order detail component (locate during execution; likely `src/components/OrderDetail.jsx` or equivalent), render `order.deductionSummary` as a small table of `{ ingredient, deductedQuantity, unit }` rows when present.
    - Render a one-line error banner when `order.deductionError` is set (showing `code` + `message`).
    - When neither is present, render nothing (preserve existing layout).
    - _Bug_Condition: isBugCondition(input) — defect 1.8 (no audit trail visible to baker)_
    - _Expected_Behavior: 2.8 (order detail view renders deduction summary)_
    - _Preservation: existing order detail view layout otherwise unchanged_
    - _Requirements: 2.8_

  - [x] 3.9 Populate `recipeId` in the order-creation flow
    - Locate the order form / order-add path (during execution) and ensure the new order document is written with `recipeId` set to the selected recipe's id.
    - This is a precondition for Property 1; without it, every `baking` transition would surface `missing-recipe-link`.
    - Do not change any other field in the order document.
    - _Bug_Condition: prerequisite for 1.2 (no fuzzy match) — orders must carry `recipeId`_
    - _Expected_Behavior: 2.2 (recipe is identifiable by `recipeId`)_
    - _Preservation: 3.6 (orders without `recipeId` still work for non-`baking` operations); existing form fields and validation otherwise unchanged_
    - _Requirements: 2.2_

  - [x] 3.10 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Recipe-Driven, Unit-Aware, Idempotent, Atomic Deduction (and Inverse Restock)
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1: `npx vitest run src/services/__tests__/deductIngredientsForOrder.bug.test.js`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed for all 10 cases A1–A10)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 3.11 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Paths Are Byte-for-Byte Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2: `npx vitest run src/services/__tests__/deductIngredientsForOrder.preservation.test.js`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions across `¬C(X)`)
    - Confirm all tests still pass after fix (no regressions in non-`baking` transitions, unrelated field updates, inventory/recipe shapes, or no-`recipeId` non-`baking` operations).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run the full test suite: `npx vitest run`
  - Confirm both `deductIngredientsForOrder.bug.test.js` and `deductIngredientsForOrder.preservation.test.js` pass.
  - Confirm any pre-existing tests still pass (no regressions).
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- **Test framework**: The project uses Vitest + `fast-check`. Run individual files with `npx vitest run <path>`; never use watch mode in automation.
- **Mocking strategy**: Tests mock the Firestore primitives (`getDoc`, `getDocs`, `updateDoc`, `runTransaction`) rather than spinning up the emulator, so they remain fast and deterministic.
- **Property 1 vs Property 2 split**: Property 1 (Bug Condition / Expected Behavior) covers `isBugCondition(input) = true` — the recipe-driven, unit-aware, idempotent, atomic, restock-on-cancel, audit-trail behavior. Property 2 (Preservation) covers `isBugCondition(input) = false` — non-`baking` transitions, unrelated field updates, inventory/recipe shapes, and no-`recipeId` non-`baking` operations.
- **Quantity equivalence on the happy path**: As the design notes, F (hardcoded `0.2 / 200 / 1`) and F' (recipe-driven) legitimately differ in the _numeric_ deduction even on the happy path. Property 2 therefore checks the _fact_ of deduction (deduction occurred and order was marked) rather than quantity equality. Quantity correctness is owned by Property 1.
- **Order-creation `recipeId` (task 3.9)**: This is a precondition for Property 1 to pass end-to-end. Without it, every `baking` transition surfaces `missing-recipe-link` regardless of the deduction code being correct.
- **Legacy orders**: `restockIngredientsForOrder` no-ops silently when `deductionSummary` is empty so orders deducted before this fix shipped (which have no summary) are not double-handled on a later cancellation.
- **Toast service**: Use the existing toast service already used elsewhere in the app rather than introducing a new one. Locate during execution.
