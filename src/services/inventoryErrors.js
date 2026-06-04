/**
 * Typed error classes for inventory deduction.
 * Each carries enough context for the caller to display a useful toast
 * and persist a structured deductionError on the order document.
 */

export class MissingRecipeLinkError extends Error {
  constructor(orderId, productName) {
    super(`Order "${orderId}" has no recipeId — cannot deduct for product "${productName}".`);
    this.name = 'MissingRecipeLinkError';
    this.orderId = orderId;
    this.productName = productName;
    this.code = 'MISSING_RECIPE_LINK';
  }
}

export class MissingInventoryItemError extends Error {
  constructor(ingredientName) {
    super(`Inventory item not found for ingredient "${ingredientName}".`);
    this.name = 'MissingInventoryItemError';
    this.ingredientName = ingredientName;
    this.code = 'MISSING_INVENTORY_ITEM';
  }
}

export class InsufficientStockError extends Error {
  constructor(itemName, available, needed, unit) {
    super(`Insufficient stock for "${itemName}": need ${needed} ${unit}, have ${available} ${unit}.`);
    this.name = 'InsufficientStockError';
    this.itemName = itemName;
    this.available = available;
    this.needed = needed;
    this.unit = unit;
    this.code = 'INSUFFICIENT_STOCK';
  }
}

export class IncompatibleUnitError extends Error {
  constructor(ingredientUnit, inventoryUnit, ingredientName) {
    super(
      `Unit mismatch for "${ingredientName}": recipe uses "${ingredientUnit}" but inventory tracks "${inventoryUnit}".`
    );
    this.name = 'IncompatibleUnitError';
    this.ingredientUnit = ingredientUnit;
    this.inventoryUnit = inventoryUnit;
    this.ingredientName = ingredientName;
    this.code = 'INCOMPATIBLE_UNIT';
  }
}

// ─── Unit families ─────────────────────────────────────────────────────────
// Units within the same family can be converted to each other.
// Units in different families are incompatible.

export const UNIT_FAMILIES = {
  mass: ['kg', 'g', 'gm', 'gram', 'grams', 'kilogram', 'kilograms'],
  volume: ['l', 'litre', 'litres', 'liter', 'liters', 'ml', 'millilitre', 'milliliter'],
  count: ['pcs', 'pc', 'piece', 'pieces', 'box', 'boxes', 'packet', 'packets', 'unit', 'units'],
};

/**
 * Normalise a unit string to a canonical form.
 * Returns 'g' for all mass variants, 'ml' for all volume variants, 'pcs' for all count variants.
 * Returns the lowercased input if unrecognised (treated as-is).
 */
export function canonicalUnit(unit) {
  const u = (unit || '').toLowerCase().trim();
  if (UNIT_FAMILIES.mass.includes(u)) return u === 'kg' || u === 'kilogram' || u === 'kilograms' ? 'kg' : 'g';
  if (UNIT_FAMILIES.volume.includes(u)) return u === 'l' || u.startsWith('litr') || u.startsWith('liter') ? 'l' : 'ml';
  if (UNIT_FAMILIES.count.includes(u)) return 'pcs';
  return u;
}

/**
 * Convert a quantity from one unit to the canonical inventory unit.
 *
 * Examples:
 *   convertUnit(200, 'g', 'kg')  → 0.2   (recipe has 200g, inventory tracks kg)
 *   convertUnit(1,   'kg', 'g')  → 1000
 *   convertUnit(500, 'ml', 'l')  → 0.5
 *   convertUnit(2,   'pcs', 'pcs') → 2
 *
 * @param {number} qty       Quantity in the source unit
 * @param {string} fromUnit  Unit of the recipe ingredient
 * @param {string} toUnit    Unit of the inventory item
 * @returns {number}         Quantity in the inventory unit
 * @throws {IncompatibleUnitError} if units belong to different families
 */
export function convertUnit(qty, fromUnit, toUnit, ingredientName = '') {
  const from = canonicalUnit(fromUnit);
  const to   = canonicalUnit(toUnit);

  if (from === to) return qty;

  // Mass conversions
  if ((from === 'kg' || from === 'g') && (to === 'kg' || to === 'g')) {
    if (from === 'kg' && to === 'g')  return qty * 1000;
    if (from === 'g'  && to === 'kg') return qty / 1000;
  }

  // Volume conversions
  if ((from === 'l' || from === 'ml') && (to === 'l' || to === 'ml')) {
    if (from === 'l'  && to === 'ml') return qty * 1000;
    if (from === 'ml' && to === 'l')  return qty / 1000;
  }

  // Count — pcs to pcs is always identical
  if (from === 'pcs' && to === 'pcs') return qty;

  // Cross-family → incompatible
  throw new IncompatibleUnitError(fromUnit, toUnit, ingredientName);
}

/**
 * Parse the size string from an order into a numeric multiplier relative to 1 kg.
 * Handles strings like '500gm', '1kg', '1.5kg', '2kg', '2kg+', as well as bare numbers.
 *
 * @param {string} sizeStr
 * @returns {number}  Multiplier (1.0 = 1 kg baseline)
 */
export function parseSizeMultiplier(sizeStr) {
  const s = String(sizeStr || '1kg').toLowerCase().replace(/\s+/g, '');

  // Handle bare kg values like '1.5kg', '2kg', '2kg+'
  const kgMatch = s.match(/^(\d+(?:\.\d+)?)(?:kg\+?)?$/);
  if (kgMatch) return parseFloat(kgMatch[1]);

  // Handle gram values like '500gm', '500g', '500gram'
  const gMatch = s.match(/^(\d+(?:\.\d+)?)(?:gm?|gram)$/);
  if (gMatch) return parseFloat(gMatch[1]) / 1000;

  // Bare float (treat as kg)
  const numMatch = s.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) return parseFloat(numMatch[1]);

  return 1.0; // safe fallback
}
