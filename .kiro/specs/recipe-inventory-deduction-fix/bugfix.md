# Bugfix Requirements Document

## Introduction

When an order moves to the "baking" status, `deductIngredientsForOrder` in `src/services/db.js` is intended to debit the corresponding ingredient quantities from the user's inventory. The current implementation is unreliable: it ignores the recipe's actual ingredient quantities (using hardcoded amounts), matches recipes by fuzzy name substring, can deduct the same order multiple times, fails silently on missing data, performs no unit conversion between recipe and inventory units, and writes each ingredient in a separate non-transactional update. The combined effect is inventory drift (stock numbers that no longer reflect reality), with bakers unaware that deduction misbehaved.

This bugfix replaces the hardcoded deduction with a recipe-driven, unit-aware, transactional, idempotent deduction (and a matching restock for cancellations and status reversals), and surfaces failures to the user.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an order moves to "baking" and the matched recipe specifies a quantity (e.g., `500g flour`) THEN the system ignores the recipe quantity and deducts a hardcoded amount (`0.2` for kg/L, `200` for g/ml, `1` for pcs/boxes/packets) scaled only by a coarse size multiplier.

1.2 WHEN an order's product name partially overlaps with multiple recipe names (e.g., order "Birthday Cake" against recipes "Chocolate Cake" and "Vanilla Cake") THEN the system matches the first recipe whose name is a substring of the product name (or vice versa) and deducts from it silently, even if it is not the intended recipe.

1.3 WHEN an order is cycled through statuses such that "baking" is entered more than once (e.g., Pending → Baking → Confirmed → Baking) THEN the system re-runs deduction and debits the inventory multiple times for the same order.

1.4 WHEN no recipe matches the product, the recipe has no ingredients, or no inventory item matches an ingredient by substring THEN the system logs to the console and returns without notifying the baker in the UI.

1.5 WHEN a recipe ingredient is specified in one unit (e.g., `200g sugar`) and the inventory item is stocked in a different but compatible unit (e.g., `kg`) THEN the system subtracts the recipe's numeric quantity directly from the inventory stock without converting units, producing a wildly incorrect deduction.

1.6 WHEN a recipe has multiple ingredients and an error or concurrent write occurs partway through deduction THEN the system has already committed some `updateDoc` calls and the inventory is left in a partially deducted state, with no rollback.

1.7 WHEN an order that has already had ingredients deducted is cancelled, or its status is reverted away from "baking" THEN the system does not return the previously deducted quantities to inventory.

1.8 WHEN deduction succeeds (fully or partially) THEN the system records nothing on the order document, so the order detail view cannot show what was deducted or whether deduction ran at all.

### Expected Behavior (Correct)

2.1 WHEN an order moves to "baking" and the matched recipe specifies a quantity and unit per ingredient THEN the system SHALL compute each deduction as `recipe.ingredient.quantity × orderMultiplier`, converted into the inventory item's unit, and subtract that converted amount from inventory stock.

2.2 WHEN an order moves to "baking" THEN the system SHALL identify the recipe via an explicit `recipeId` (or equivalent product/recipe ID) stored on the order document, and SHALL NOT fall back to fuzzy name matching; if no `recipeId` is set or the referenced recipe does not exist, the system SHALL surface a toast error ("Missing recipe link") and SHALL NOT deduct.

2.3 WHEN an order whose document already has `inventoryDeducted: true` re-enters "baking" THEN the system SHALL skip deduction (treat it as a no-op) and SHALL NOT debit inventory a second time.

2.4 WHEN deduction cannot proceed because a recipe is missing, an inventory item for an ingredient cannot be found, stock would go negative (insufficient stock), or units are incompatible THEN the system SHALL surface a user-visible toast describing the specific failure and SHALL NOT silently swallow the error.

2.5 WHEN a recipe ingredient unit and the inventory item unit are both members of a supported conversion family (g ↔ kg, ml ↔ L) THEN the system SHALL convert the recipe quantity into the inventory unit before subtracting; WHEN both units are countable (pcs, boxes, packets) and identical THEN the system SHALL subtract the quantity as-is; WHEN the units are not in the same family THEN the system SHALL treat it as an incompatible-unit failure per 2.4.

2.6 WHEN an order's deduction touches multiple ingredients THEN the system SHALL perform all reads and writes in a single Firestore transaction (or equivalent read-modify-write batch with a guard) so that either all ingredients are deducted and the order is marked `inventoryDeducted: true`, or none are.

2.7 WHEN an order with `inventoryDeducted: true` is cancelled, or its status transitions away from "baking" to a non-baking status THEN the system SHALL execute an inverse "restock" operation that adds the previously deducted quantities back to the corresponding inventory items (transactionally) and SHALL clear `inventoryDeducted` (e.g., set to `false`) so a later legitimate transition back to "baking" can deduct again.

2.8 WHEN deduction or restock completes (fully or with a handled failure) THEN the system SHALL persist a per-order deduction summary on the order document (e.g., `deductionSummary: [{ ingredient, deductedQuantity, unit, inventoryItemId }]` plus status/error metadata) AND the order detail view SHALL render that summary so the baker can see exactly what changed.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an order's status is updated to anything other than "baking" (and not transitioning away from a previously-deducted "baking" state) THEN the system SHALL CONTINUE TO update only the order's status fields without touching inventory.

3.2 WHEN an order moves to "baking" for the first time, has a valid `recipeId`, all ingredients map to existing inventory items, units are compatible, and stock is sufficient THEN the system SHALL CONTINUE TO debit inventory for that order (now using recipe-driven, unit-converted quantities) and persist the updated stock values.

3.3 WHEN unrelated order fields are updated via `updateOrderFieldsInDB` or other order writes THEN the system SHALL CONTINUE TO write those fields without triggering deduction or restock.

3.4 WHEN inventory stock for an item is read or displayed elsewhere in the application THEN the system SHALL CONTINUE TO use the existing `{ item, stock, unit, minStock }` shape and `uid`-scoped queries.

3.5 WHEN recipes are read or displayed elsewhere in the application THEN the system SHALL CONTINUE TO use the existing `ingredients: [{ name, quantity, unit }]` shape and `uid`-scoped queries.

3.6 WHEN an order has no `recipeId` and the user is performing an operation other than the "baking" transition (e.g., viewing, editing customer details, changing delivery date) THEN the system SHALL CONTINUE TO allow that operation without raising deduction-related errors.

## Deriving the Bug Condition

**Bug Condition Function** — identifies inputs that trigger the buggy deduction path:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X = (order, recipes, inventory, statusTransition)
  OUTPUT: boolean

  // The buggy path is exercised whenever the "baking" deduction runs
  // under any of the conditions the current implementation mishandles.
  RETURN statusTransition.newStatus = "baking" AND (
       hasRecipeWithExplicitQuantity(X.recipes, X.order)
    OR multipleRecipesNameOverlapProduct(X.recipes, X.order.product)
    OR alreadyDeductedOnce(X.order)              // re-entry into baking
    OR missingRecipeOrInventoryMatch(X)
    OR recipeUnitDiffersFromInventoryUnit(X)
    OR recipeHasMultipleIngredients(X.recipes, X.order)   // atomicity risk
  )
  OR (
       statusTransition.oldStatus = "baking"
   AND statusTransition.newStatus <> "baking"
   AND X.order.inventoryDeducted = true            // restock case
  )
END FUNCTION
```

**Property Specification — Fix Checking:**

```pascal
// Property: Fix Checking - Recipe-driven, unit-aware, idempotent, atomic deduction
FOR ALL X WHERE isBugCondition(X) DO
  result ← deductIngredientsForOrder'(X)   // F'

  // Recipe selection is by explicit ID, never fuzzy
  ASSERT result.recipeUsed = lookupById(X.recipes, X.order.recipeId)
      OR result.error IN { "missing-recipe-link", "missing-inventory-item",
                           "insufficient-stock", "incompatible-unit" }

  // Quantities come from the recipe and are unit-converted
  FOR EACH ing IN result.deductedIngredients DO
    ASSERT ing.deductedQuantity =
           convertUnit(ing.recipeQuantity, ing.recipeUnit, ing.inventoryUnit)
           * orderMultiplier(X.order)
  END FOR

  // Idempotency: never deduct twice for the same order
  ASSERT NOT (X.order.inventoryDeducted = true AND result.deducted = true)

  // Atomicity: all-or-nothing across ingredients + order flag
  ASSERT result.committed = "all" OR result.committed = "none"

  // Failures are surfaced, not silent
  ASSERT result.error = NULL OR result.toastShown = true

  // Restock inverse on transition away from baking
  IF statusTransition.oldStatus = "baking"
     AND statusTransition.newStatus <> "baking"
     AND X.order.inventoryDeducted = true
  THEN
    ASSERT inventoryAfter(X) = inventoryBefore(X) + previouslyDeducted(X.order)
    ASSERT X.order.inventoryDeducted_after = false
  END IF

  // Per-order summary is persisted and visible
  ASSERT result.deductionSummary IS PERSISTED ON X.order
END FOR
```

**Property Specification — Preservation Checking:**

```pascal
// Property: Preservation Checking - non-buggy paths are unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT deductIngredientsForOrder(X) = deductIngredientsForOrder'(X)
  ASSERT inventoryAfter_F(X) = inventoryAfter_F'(X)
  ASSERT orderAfter_F(X)     = orderAfter_F'(X)
END FOR
```

**Key Definitions:**
- **F**: the original `deductIngredientsForOrder` (and its caller `updateOrderStatusInDB`) as currently implemented in `src/services/db.js`.
- **F'**: the fixed implementation that uses `recipeId`, recipe-driven quantities, unit conversion (g↔kg, ml↔L, pcs/boxes/packets identity), an `inventoryDeducted` guard, an inverse restock, transactional writes, toast-surfaced failures, and a persisted per-order deduction summary.
