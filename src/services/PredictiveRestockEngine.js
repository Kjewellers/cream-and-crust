/**
 * PredictiveRestockEngine.js
 *
 * Scans upcoming calendar orders against recipes and inventory.
 * Calculates required raw ingredients and identifies items running below minimum stock.
 */

export function calculatePredictiveRestock({ orders = [], inventory = [], recipes = [] }) {
  if (!Array.isArray(inventory) || inventory.length === 0) {
    return { shortages: [], totalRequired: {} };
  }

  // 1. Identify active upcoming orders (Confirmed, Baking, Ready)
  const activeOrders = orders.filter((o) => {
    const status = (o.status || '').toLowerCase();
    return status === 'confirmed' || status === 'baking' || status === 'ready';
  });

  const requiredMap = {};

  // 2. Aggregate raw ingredient requirements from recipes linked to active orders
  activeOrders.forEach((o) => {
    const recipe = recipes.find((r) => r.id === o.recipeId || r.name === o.product);
    if (recipe && Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach((ing) => {
        const name = (ing.item || ing.name || '').toLowerCase();
        const qty = Number(ing.qty || ing.quantity || 0);
        if (name && qty > 0) {
          requiredMap[name] = (requiredMap[name] || 0) + qty;
        }
      });
    }
  });

  // 3. Compare with current inventory stock and minimum thresholds
  const shortages = [];

  inventory.forEach((invItem) => {
    const itemNameLower = (invItem.item || invItem.name || '').toLowerCase();
    const currentStock = Number(invItem.stock || invItem.quantity || 0);
    const minThreshold = Number(invItem.minStock || invItem.minThreshold || 5);
    const upcomingDemand = requiredMap[itemNameLower] || 0;

    const netAvailable = currentStock - upcomingDemand;

    if (netAvailable < minThreshold || currentStock <= minThreshold) {
      const neededToReorder = Math.max(minThreshold * 2, upcomingDemand + minThreshold - currentStock);
      shortages.push({
        id: invItem.id,
        item: invItem.item || invItem.name,
        currentStock,
        unit: invItem.unit || 'kg',
        upcomingDemand,
        minThreshold,
        reorderQty: Math.ceil(neededToReorder),
        severity: currentStock === 0 ? 'CRITICAL' : netAvailable < 0 ? 'HIGH' : 'MEDIUM',
      });
    }
  });

  return {
    shortages: shortages.sort((a, b) => (a.severity === 'CRITICAL' ? -1 : 1)),
    activeOrdersCount: activeOrders.length,
  };
}
