# Recipe Inventory Deduction Fix Bugfix Design

## Overview

When an order transitions to the `baking` status, `deductIngredientsForOrder` in `src/services/db.js` is supposed to debit the corresponding ingredients from the user's inventory. The current implementation is unreliable in six interlocking ways: it fuzzy-matches recipes by product-name substring, ignores recipe ingredient quantities (using hardcoded `0.2 / 200 / 1` values), re-deducts on every re-entry into `baking`, performs no unit conversion (g↔kg, ml↔L), writes each ingredient as a separate non-transactional `updateDoc`, and swallows all failures to `console.log`. There is also no inverse "restock" when an order is cancelled or its status leaves `baking`, and nothing is recorded on the order document about what (if anything) was deducted.

The fix replaces the entire deduction body with a recipe-driven, unit-aware, idempotent, transactional operation keyed off an explicit `recipeId` on the order, plus a symmetric `restockIngredientsForOrder` invoked when an order leaves `baking` (or is cancelled). All failure modes — missing recipe link, missing inventory item, insufficient stock, incompatible units — surface to the user via toast and are persisted to the order document as a `deductionSummary`. The order detail view renders that summary so the baker has explicit visibility into what changed.

The approach is deliberately surgical: only the deduction/restock path and the order-status caller change. Public function shapes for inventory (`{ item, stock, unit, minStock }`), recipes (`ingredients: [{ name, quantity, unit }]`), and the rest of the order-write API are preserved.

## Glossary

- **Bug_Condition (C)**: The condition under which the buggy deduction path is exercised — a transition into `baking` that triggers any of the six defects (fuzzy match, hardcoded quantity, re-entry, missing-data silence, missing unit conversion, non-atomic multi-ingredient writes), or a transition away from `baking` on an already-deducted order (where no restock occurs today).
- **Property (P)**: The desired post-fix behavior for buggy inputs — recipe selection by `recipeId`, recipe-driven and unit-converted quantities, idempotent `inventoryDeducted` guard, all-or-nothing transactional commit, user-visible toast on failure, persisted `deductionSummary`, and inverse restock on transitions away from `baking`.
- **Preservation**: Existing behavior that must be untouched — non-`baking` status updates, unrelated order-field writes via `updateOrderFieldsInDB`, the `{ item, stock, unit, minStock }` inventory shape, the `ingredients: [{ name, quantity, unit }]` recipe shape, and `uid`-scoped queries.
- **`deductIngredientsForOrder`**: The function in `src/services/db.js` that, when an order transitions to `baking`, currently fuzzy-matches a recipe and writes hardcoded deductions one ingredient at a time. This is the primary site of the fix.
- **`updateOrderStatusInDB`**: The function in `src/services/db.js` that calls `deductIngredientsForOrder` whenever `newStatus.toLowerCase() === "baking"`. The fix expands this caller to also invoke restock on transitions away from `baking`.
- **`recipeId`**: An explicit recipe identifier stored on the order document. Replaces fuzzy product-name substring matching as the recipe-selection mechanism.
- **`inventoryDeducted`**: A boolean flag on the order document used as the idempotency guard. `true` means deduction has already committed; `false` (or absent) means deduction has not run.
- **`deductionSummary`**: A per-order array of `{ ingredient, deductedQuantity, unit, inventoryItemId }` records (plus status/error metadata) persisted on the order document and rendered in the order detail view.
- **`orderMultiplier`**: The numeric scaling factor derived from the order size (e.g., `0.5` for a 500g cake, `2.0` for a 2kg cake). Already inferred today from `orderData.size`; the fix continues to derive it from the order but applies it to recipe-driven quantities, not hardcoded ones.
- **Unit conversion family**: A set of units that can be converted between each other. Supported families: mass (`g ↔ kg`), volume (`ml ↔ L`), count (`pcs`, `boxes`, `packets` — only identity, no cross-conversion).

## Bug Details

### Bug Condition

The bug manifests on two kinds of status transitions:

1. **Transitions INTO `baking`** — the deduction path runs and is exercised by the buggy implementation: it fuzzy-matches by name, ignores recipe quantities, has no idempotency guard, has no unit conversion, swallows missing-data errors, and writes non-transactionally.
2. **Transitions AWAY FROM `baking`** on an order whose `inventoryDeducted` flag is already `true` — the current code does nothing, so previously deducted stock is permanently lost from inventory even though the order will not be baked.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type StatusTransition
         {
           order:            Order,                  // includes recipeId, inventoryDeducted, size, product
           recipes:           Array<Recipe>,          // user's recipes
           inventory:         Array<InventoryItem>,
           statusTransition:  { oldStatus, newStatus }
         }
  OUTPUT: boolean

  // Case A: transition INTO "baking" that hits any of the six defective paths
  intoBakingDefect :=
       statusTransition.newStatus = "baking"
   AND (
          hasRecipeWithExplicitQuantity(input.recipes, input.order)
       OR multipleRecipesNameOverlapProduct(input.recipes, input.order.product)
       OR alreadyDeductedOnce(input.order)             // inventoryDeducted already true
       OR missingRecipeOrInventoryMatch(input)
       OR recipeUnitDiffersFromInventoryUnit(input)
       OR recipeHasMultipleIngredients(input.recipes, input.order)
       )

  // Case B: transition AWAY FROM "baking" on a previously-deducted order (no restock today)
  awayFromBakingNoRestock :=
       statusTransition.oldStatus = "baking"
   AND statusTransition.newStatus <> "baking"
   AND input.order.inventoryDeducted = true

  RETURN intoBakingDefect OR awayFromBakingNoRestock
END FUNCTION
```

### Examples

- **Hardcoded quantity (defect 1.1)**: Order `{ product: "Chocolate Cake", size: "1kg" }` against recipe `{ name: "Chocolate Cake", ingredients: [{ name: "flour", quantity: 500, unit: "g" }] }`. *Expected:* deduct `500 g` (or `0.5 kg` if inventory is in kg). *Actual:* deducts `200 g` (the hardcoded value), regardless of what the recipe says.
- **Fuzzy match (defect 1.2)**: Order `{ product: "Birthday Cake" }`, recipes `["Chocolate Cake", "Vanilla Cake"]`. *Expected:* fail with `"missing-recipe-link"` because the order has no `recipeId`. *Actual:* matches whichever recipe name is a substring of `"birthday cake"` (or vice versa) and deducts silently.
- **Double deduction (defect 1.3)**: Order cycled `Pending → Baking → Confirmed → Baking`. *Expected:* second `Baking` is a no-op because `inventoryDeducted = true`. *Actual:* deducts again, draining inventory by 2× per cycle.
- **Silent failure (defect 1.4)**: Recipe references `"Almond Flour"` but inventory only has `"Wheat Flour"`. *Expected:* toast `"No inventory item for ingredient 'Almond Flour'"` and abort. *Actual:* `console.log` and continue, leaving the recipe partially deducted.
- **Unit mismatch (defect 1.5)**: Recipe says `200 g sugar`, inventory item is `{ stock: 5, unit: "kg" }`. *Expected:* convert to `0.2 kg` and deduct → new stock `4.8 kg`. *Actual:* subtracts `200` from `5` → new stock `0` (clamped from `-195`).
- **Partial commit (defect 1.6)**: Recipe has 5 ingredients, the 3rd `updateInventoryStockInDB` throws. *Expected:* nothing committed; order's `inventoryDeducted` stays `false`. *Actual:* ingredients 1 and 2 are already debited; inventory drift, no rollback.
- **No restock (defect 1.7)**: Order in `Baking` (with `inventoryDeducted: true`) is cancelled by the user. *Expected:* the previously deducted quantities are added back and `inventoryDeducted` is cleared to `false`. *Actual:* no inventory write at all; stock is permanently lost.
- **No audit trail (defect 1.8)**: After a successful deduction, the order document has no record of what was debited. *Expected:* `deductionSummary` array stored on the order and rendered in the order detail view. *Actual:* nothing on the order; only ephemeral `console.log` output.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Status updates that are not `baking` and are not transitioning *away* from a previously-deducted `baking` state must continue to update only the order's status fields without touching inventory (preserves clause 3.1).
- Successful deductions on the happy path — first transition into `baking`, valid `recipeId`, all ingredients found, units compatible, sufficient stock — must continue to debit inventory and persist updated stock values (preserves clause 3.2; the *quantities* change to recipe-driven values, but the fact that deduction happens and that inventory is written does not).
- `updateOrderFieldsInDB` and other unrelated order writes must continue to write fields without triggering deduction or restock (preserves clause 3.3).
- Inventory items continue to use the `{ item, stock, unit, minStock }` shape with `uid`-scoped queries (preserves clause 3.4).
- Recipes continue to use the `ingredients: [{ name, quantity, unit }]` shape with `uid`-scoped queries (preserves clause 3.5).
- Orders without a `recipeId` continue to be viewable, editable (customer details, delivery date), etc. — only the `baking` transition for such orders surfaces a `"missing-recipe-link"` error (preserves clause 3.6).

**Scope:**

All inputs that do NOT match `isBugCondition` should be completely unaffected by this fix. This explicitly includes:
- Status transitions between non-`baking` statuses (e.g., `Pending → Confirmed`, `Confirmed → Delivered`).
- Transitions into `baking` on an order with `inventoryDeducted = true` already (idempotent no-op; no inventory write).
- Field-only updates via `updateOrderFieldsInDB`.
- Reads of inventory and recipes from elsewhere in the application.

## Hypothesized Root Cause

Based on the bug description and reading of `src/services/db.js`, the defects share a common root: the current `deductIngredientsForOrder` was written as a "best-effort guess" rather than as a contract over the `(order, recipe, inventory)` tuple. Each individual defect has its own proximate cause:

1. **Recipe selection by name substring (root of defects 1.2, 1.4)**: `recipes.find(r => productName.includes(rName) || rName.includes(productName))` is a heuristic that has no notion of intent. The fix requires an explicit `recipeId` on the order; the order-creation flow must populate it (out of scope for the deduction function itself but in scope for this spec).

2. **Hardcoded deduction values (root of defect 1.1)**: The branches `0.2 * multiplier`, `200 * multiplier`, `Math.ceil(1 * multiplier)` ignore `ing.quantity`. The fix reads `ing.quantity` directly and routes it through unit conversion.

3. **Missing idempotency guard (root of defect 1.3)**: The caller in `updateOrderStatusInDB` invokes deduction every time `newStatus === "baking"`, without checking whether deduction has already happened. The fix introduces a Firestore transaction that reads `order.inventoryDeducted` and aborts (no-ops) when it is already `true`.

4. **Missing unit conversion (root of defect 1.5)**: There is no conversion table at all today. The fix introduces a small `convertUnit(quantity, fromUnit, toUnit)` helper covering `g ↔ kg`, `ml ↔ L`, and identity for `pcs / boxes / packets`. Cross-family conversions return an `incompatible-unit` error.

5. **Non-transactional writes (root of defect 1.6)**: Each ingredient is a separate `updateInventoryStockInDB` call. The fix moves the entire deduction (read all inventory items + write all updated stocks + flip `inventoryDeducted` + write `deductionSummary`) into a single Firestore `runTransaction` so the commit is atomic.

6. **Silent failures (root of defects 1.4, 1.8)**: The function uses `try/catch + console.error`. The fix throws a typed error (or returns a discriminated result) that the caller surfaces to the UI via the existing toast system, and the order document records the failed `deductionSummary` with status/error metadata.

7. **No inverse operation (root of defect 1.7)**: There is no restock function today, and `updateOrderStatusInDB` doesn't watch transitions away from `baking`. The fix introduces `restockIngredientsForOrder` (the algebraic inverse, gated on `inventoryDeducted = true`) and wires it into `updateOrderStatusInDB` for the `oldStatus = baking, newStatus ≠ baking` case.

## Correctness Properties

Property 1: Bug Condition - Recipe-driven, unit-aware, idempotent, atomic deduction (and inverse restock)

_For any_ status transition where the bug condition holds (`isBugCondition` returns `true`), the fixed `deductIngredientsForOrder` / `restockIngredientsForOrder` SHALL:
- Select the recipe by `order.recipeId` (never by name substring); if `recipeId` is missing or the recipe does not exist, surface a `"missing-recipe-link"` toast and not write to inventory.
- Compute each deduction as `convertUnit(ing.quantity, ing.unit, inventoryItem.unit) × orderMultiplier(order)` and subtract that converted amount from the inventory item's stock.
- Skip deduction (no-op, no inventory write) when `order.inventoryDeducted = true` on entry into `baking`.
- Commit all ingredient stock updates plus the `inventoryDeducted = true` flag plus the `deductionSummary` field atomically in a single Firestore transaction; on any failure, no partial writes remain.
- Surface every failure mode (`missing-recipe-link`, `missing-inventory-item`, `insufficient-stock`, `incompatible-unit`) as a user-visible toast.
- On a transition away from `baking` for an order with `inventoryDeducted = true`, restock the previously deducted quantities back to the corresponding inventory items (atomically), and clear `inventoryDeducted` to `false`.
- Persist a `deductionSummary` array on the order document of the form `[{ ingredient, deductedQuantity, unit, inventoryItemId }]` (plus status/error metadata) that the order detail view renders.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

Property 2: Preservation - Non-buggy paths are byte-for-byte unchanged

_For any_ input where the bug condition does NOT hold (`isBugCondition` returns `false`), the fixed code SHALL produce the same observable result as the original code, preserving inventory state, order document state, and the absence of inventory writes for non-`baking` transitions and unrelated order-field updates. Specifically:
- Inventory after the operation under F equals inventory after the same operation under F'.
- Order document fields written by F equal those written by F' (modulo the new `inventoryDeducted` and `deductionSummary` fields, which are only touched on `baking` transitions).
- `updateOrderFieldsInDB` and other non-status writes do not trigger deduction or restock under either F or F'.
- The shapes of inventory items (`{ item, stock, unit, minStock }`) and recipes (`ingredients: [{ name, quantity, unit }]`), and `uid`-scoped queries, are unchanged.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/services/db.js`

**Function**: `deductIngredientsForOrder` (rewritten), `updateOrderStatusInDB` (extended), plus a new sibling `restockIngredientsForOrder` and a small private `convertUnit` helper.

**Specific Changes**:

1. **Add `convertUnit(quantity, fromUnit, toUnit)` helper**
   - Mass family: `g ↔ kg` (`1 kg = 1000 g`), identity within unit.
   - Volume family: `ml ↔ L` (`1 L = 1000 ml`), identity within unit.
   - Count family: `pcs`, `boxes`, `packets` — identity only; cross-conversion within the family is unsupported.
   - Cross-family (e.g., `g → ml`, `pcs → kg`) throws a typed `IncompatibleUnitError`.
   - Unit comparison is case-insensitive.

2. **Replace recipe selection with explicit `recipeId` lookup**
   - Read `order.recipeId`. If falsy, throw `MissingRecipeLinkError("Order has no recipeId")`.
   - Fetch the single recipe document by id (still scoped to `uid` via the recipe's stored `uid` field). If the recipe document does not exist or has no `ingredients`, throw `MissingRecipeLinkError("Recipe not found")`.

3. **Replace hardcoded quantities with recipe-driven, unit-converted deduction**
   - For each `ing` in `recipe.ingredients`:
     - Find the matching inventory item by id (preferred) or by exact case-insensitive name. If none, throw `MissingInventoryItemError(ing.name)`.
     - Compute `converted = convertUnit(ing.quantity, ing.unit, inventoryItem.unit)`.
     - Compute `deduction = converted * orderMultiplier(order)`.
     - If `inventoryItem.stock - deduction < 0`, throw `InsufficientStockError(ing.name, deduction, inventoryItem.stock)`.

4. **Wrap deduction in a Firestore transaction with idempotency guard**
   - Use `runTransaction(db, async (tx) => { … })`.
   - Inside the transaction:
     - `tx.get(orderRef)`. If `order.inventoryDeducted === true`, return early (no-op).
     - `tx.get(...)` each inventory document referenced by the recipe.
     - Compute all new stocks (raises errors above on failure; abort transaction).
     - `tx.update(...)` each inventory document with its new stock.
     - `tx.update(orderRef, { inventoryDeducted: true, deductionSummary: [...], deductionError: null })`.

5. **Surface failures via toast and persist on the order**
   - Caller in `updateOrderStatusInDB` catches `MissingRecipeLinkError`, `MissingInventoryItemError`, `InsufficientStockError`, `IncompatibleUnitError` and dispatches a toast (using the existing toast service used elsewhere in the app) with a specific human-readable message per error class.
   - Persist the failure on the order via a non-transactional follow-up `updateDoc(orderRef, { deductionSummary: [], deductionError: { code, message } })` so the order detail view can render the failure state. (`inventoryDeducted` remains `false`.)

6. **Add `restockIngredientsForOrder(orderId, orderData)`**
   - Mirror of step 4, gated on `order.inventoryDeducted === true` AND a non-empty `order.deductionSummary`.
   - Inside a single transaction, for each summary entry, `tx.update(inventoryItemRef, { stock: prevStock + entry.deductedQuantity })`, then `tx.update(orderRef, { inventoryDeducted: false, deductionSummary: [], deductionError: null })`.
   - If there is no `deductionSummary` (e.g., an old order that was deducted before this fix shipped), no-op silently — there is nothing to restock and no user expectation of restock for that order.

7. **Wire restock into `updateOrderStatusInDB`**
   - After `updateDoc(orderRef, { status: newStatus, ...extraFields })`:
     - If `newStatus.toLowerCase() === "baking"`: call `deductIngredientsForOrder` (existing behavior).
     - Else if the *previous* status was `"baking"` (read from `orderSnap` before the update) and `orderSnap.inventoryDeducted === true`: call `restockIngredientsForOrder`.
   - Note: read the prior order snapshot *before* `updateDoc` so the old status is available.

8. **Update the order detail view**
   - In the existing order detail component (likely `src/components/OrderDetail.jsx` or equivalent — to be located during task execution), render `deductionSummary` as a small table of `{ ingredient, deductedQuantity, unit }` rows when present, plus a one-line error banner when `deductionError` is set.

9. **Update the order-creation flow to populate `recipeId`**
   - Ensure the order form / order-add path sets `recipeId` on the new order document. This is a precondition for property 1; without it, every `baking` transition would surface `missing-recipe-link`. The exact form change is identified during task execution.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior. The project already uses Vitest and `fast-check`, so property-based tests are the natural fit for the preservation property and for fuzzing the unit-conversion + recipe-multiplier arithmetic.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write Vitest tests that mock the Firestore `getDocs`, `getDoc`, `updateDoc`, and `runTransaction` primitives, drive `deductIngredientsForOrder` / `updateOrderStatusInDB` with crafted `(order, recipes, inventory)` fixtures, and assert what *should* happen. Run these tests on the UNFIXED code to observe the predicted failures and confirm the root cause.

**Test Cases**:
1. **Hardcoded-Quantity Test** (clause 1.1 vs 2.1): Recipe says `{ name: "flour", quantity: 500, unit: "g" }`, inventory item is `{ item: "flour", stock: 5, unit: "kg" }`, order `size: "1kg"`. Assert new stock = `4.5 kg`. (Will fail on unfixed code: deducts `200` instead of `0.5`, yielding `0` clamped from `-195`.)
2. **Fuzzy-Match Test** (clause 1.2 vs 2.2): Order `{ product: "Birthday Cake" }` with no `recipeId`, recipes `["Chocolate Cake", "Vanilla Cake"]`. Assert a `missing-recipe-link` error is surfaced and inventory is unchanged. (Will fail on unfixed code: silently deducts from one of the matching recipes.)
3. **Double-Deduction Test** (clause 1.3 vs 2.3): Run deduction twice on the same order with `inventoryDeducted = true` after the first run. Assert the second run is a no-op. (Will fail on unfixed code: deducts twice.)
4. **Silent-Failure Test** (clause 1.4 vs 2.4): Recipe references `"Almond Flour"`, inventory has no matching item. Assert a `missing-inventory-item` toast/error is surfaced. (Will fail on unfixed code: console-logs and returns.)
5. **Unit-Mismatch Test** (clause 1.5 vs 2.5): Recipe `200 g`, inventory `kg`. Assert deduction of `0.2 kg`. (Will fail on unfixed code: deducts `200` from a kg-denominated stock.)
6. **Partial-Commit Test** (clause 1.6 vs 2.6): Multi-ingredient recipe; inject a transactional failure on the third write. Assert all three inventory items are unchanged and `inventoryDeducted` is still `false`. (Will fail on unfixed code: first two writes have already committed.)
7. **No-Restock-On-Cancel Test** (clause 1.7 vs 2.7): Order is in `baking` with `inventoryDeducted = true` and a `deductionSummary`; transition to `cancelled`. Assert inventory is restored to its pre-deduction values and `inventoryDeducted` is `false`. (Will fail on unfixed code: nothing happens.)
8. **No-Audit-Trail Test** (clause 1.8 vs 2.8): After a successful deduction, assert `order.deductionSummary` is a non-empty array of `{ ingredient, deductedQuantity, unit, inventoryItemId }` and `order.deductionError` is `null`. (Will fail on unfixed code: neither field is written.)
9. **Edge-Case — Insufficient-Stock Test** (clause 2.4): Recipe needs `1 kg flour`, inventory has `0.3 kg`. Assert an `insufficient-stock` toast and that no inventory write occurs. (May fail on unfixed code: clamps to `0` and writes silently.)
10. **Edge-Case — Incompatible-Unit Test** (clause 2.5): Recipe says `200 g`, inventory item unit is `pcs`. Assert an `incompatible-unit` toast and no inventory write. (Will fail on unfixed code: deducts `200` from a `pcs`-denominated count.)

**Expected Counterexamples**:
- Hardcoded `200` / `0.2` / `1` deductions appear regardless of the recipe's `ingredient.quantity`.
- Recipe is selected by `productName.includes(rName) || rName.includes(productName)` rather than by id, so any product name overlap leads to silent deduction from the wrong recipe.
- Re-entering `baking` re-runs deduction without any guard, draining inventory by `n×` over `n` cycles.
- Failures (no recipe, no inventory item, transactional error) reach `console.error` only, never the user.
- Possible causes: heuristic name matching, hardcoded values in place of `ing.quantity`, missing `inventoryDeducted` guard, missing `convertUnit`, sequential `updateDoc` calls instead of `runTransaction`, missing inverse-restock branch in `updateOrderStatusInDB`.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := deductIngredientsForOrder_fixed(input)         // OR restockIngredientsForOrder_fixed for case B

  // Recipe selection is by id, never fuzzy
  ASSERT result.recipeUsed = lookupById(input.recipes, input.order.recipeId)
      OR result.error IN {"missing-recipe-link", "missing-inventory-item",
                          "insufficient-stock", "incompatible-unit"}

  // Quantities are recipe-driven and unit-converted
  FOR EACH ing IN result.deductedIngredients DO
    ASSERT ing.deductedQuantity =
           convertUnit(ing.recipeQuantity, ing.recipeUnit, ing.inventoryUnit)
           * orderMultiplier(input.order)
  END FOR

  // Idempotency
  ASSERT NOT (input.order.inventoryDeducted = true AND result.deducted = true)

  // Atomicity
  ASSERT result.committed = "all" OR result.committed = "none"

  // Failures are surfaced
  ASSERT result.error = NULL OR result.toastShown = true

  // Restock on transitions away from baking
  IF input.statusTransition.oldStatus = "baking"
     AND input.statusTransition.newStatus <> "baking"
     AND input.order.inventoryDeducted = true
  THEN
    ASSERT inventoryAfter(input) = inventoryBefore(input) + previouslyDeducted(input.order)
    ASSERT input.order.inventoryDeducted_after = false
  END IF

  // Audit trail
  ASSERT result.deductionSummary IS PERSISTED ON input.order
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT deductIngredientsForOrder_original(input)
       = deductIngredientsForOrder_fixed(input)
  ASSERT inventoryAfter_F(input)  = inventoryAfter_F'(input)
  ASSERT orderAfter_F(input)      = orderAfter_F'(input)
END FOR
```

**Testing Approach**: Property-based testing via `fast-check` is recommended for preservation because:
- It generates many `(order, recipes, inventory, statusTransition)` tuples automatically across the input domain.
- It catches edge cases — empty recipes, unusual unit strings, zero-quantity ingredients, missing optional fields — that hand-rolled unit tests miss.
- It provides strong guarantees that behavior is unchanged across the entire `¬C(X)` region (non-`baking` transitions, idempotent re-entries, unrelated field updates).

**Test Plan**: Observe behavior on UNFIXED code first for non-`baking` status transitions, idempotent re-entries (orders already with `inventoryDeducted = true`), and unrelated field updates. Capture that observed behavior in property-based tests that run against both F and F' and assert byte-for-byte equality of inventory and order documents.

**Test Cases**:
1. **Non-Baking Status Preservation** (clause 3.1): Generate random `(oldStatus, newStatus)` pairs where `newStatus ≠ "baking"` and `oldStatus ≠ "baking"`. Assert inventory is untouched under both F and F', and order status fields are written identically.
2. **Happy-Path Deduction Equivalence** (clause 3.2): Construct orders where the bug condition does NOT hold — explicit `recipeId`, single ingredient, units already match the inventory item's unit, sufficient stock, first transition into `baking`. The *fact* of deduction must be the same under F and F' (both deduct exactly once); the *quantities* legitimately differ (F uses hardcoded, F' uses recipe-driven), so this property is checked at the "deduction occurred and order was marked" level rather than at quantity equality. Quantity correctness for these cases is covered by Property 1.
3. **Field-Update Preservation** (clause 3.3): Generate random `updateOrderFieldsInDB` calls with arbitrary field payloads. Assert inventory is untouched and `inventoryDeducted` / `deductionSummary` are not written, under both F and F'.
4. **Inventory Shape Preservation** (clause 3.4): Property-test that every inventory document written by F' has the same keys (`item`, `stock`, `unit`, `minStock`) and `uid` scoping as those written by F.
5. **Recipe Shape Preservation** (clause 3.5): Property-test that the fix never writes to recipe documents, only reads them — and reads use the same `ingredients: [{ name, quantity, unit }]` shape.
6. **Missing-RecipeId Non-Baking Operations** (clause 3.6): Generate orders without `recipeId` and exercise non-`baking` operations (view, edit customer, change delivery date). Assert no errors are raised and no inventory writes occur, under both F and F'.

### Unit Tests

- `convertUnit` table-driven tests across all supported pairs (`g↔kg`, `ml↔L`, identity for `pcs / boxes / packets`) plus rejection of cross-family conversions.
- `orderMultiplier` derivation from `order.size` strings (`"500g"`, `"1kg"`, `"1.5kg"`, `"2kg"`, etc.).
- Each error class (`MissingRecipeLinkError`, `MissingInventoryItemError`, `InsufficientStockError`, `IncompatibleUnitError`) — verify it's thrown under the right condition and surfaces the right toast message.
- `restockIngredientsForOrder` no-op when `inventoryDeducted = false` or `deductionSummary` is empty.

### Property-Based Tests

- **Property 1 (Bug Condition)**: Generate random `(order, recipes, inventory)` tuples that satisfy `isBugCondition`. Assert the fixed function obeys the property assertions in the Fix Checking pseudocode.
- **Property 2 (Preservation)**: Generate random `(order, recipes, inventory, statusTransition)` tuples that do *not* satisfy `isBugCondition`. Assert F and F' produce identical inventory and order document state.
- **Round-Trip Property (Deduct then Restock)**: For any valid happy-path deduction followed by a restock, assert inventory returns to its pre-deduction values and `inventoryDeducted` is `false`. This is a strong correctness guarantee for the inverse operation.
- **Idempotency Property**: Calling `deductIngredientsForOrder` `n` times on the same order produces the same final inventory state as calling it once.

### Integration Tests

- Full flow: create order with `recipeId` → transition `Pending → Baking` → assert inventory debited and `deductionSummary` rendered in order detail.
- Full flow: above, then transition `Baking → Cancelled` → assert inventory restored and `inventoryDeducted` cleared.
- Full flow: transition `Pending → Baking → Confirmed → Baking` → assert inventory debited only once.
- Failure flow: order with no `recipeId` → transition to `Baking` → assert toast is shown, inventory untouched, `deductionError` persisted on the order.
- Failure flow: recipe references missing inventory item → transition to `Baking` → assert toast, no partial writes.
