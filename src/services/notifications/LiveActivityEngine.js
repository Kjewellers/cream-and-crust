/**
 * LiveActivityEngine.js
 *
 * Enterprise Live Order Activity Engine for Cream & Crust.
 * Tracks live active orders, calculates real-time progress percentages,
 * and powers the in-app floating Live Activity Banner and ongoing notification updates.
 */

export const ORDER_STAGES = {
  pending: { label: 'Order Received', percentage: 15, emoji: '📋', icon: 'Receipt' },
  preparing: { label: 'Prepping Ingredients', percentage: 40, emoji: '🥣', icon: 'Utensils' },
  baking: { label: 'Baking in Oven', percentage: 70, emoji: '🧁', icon: 'Flame' },
  out_for_delivery: { label: 'Out for Delivery', percentage: 90, emoji: '🛵', icon: 'Truck' },
  ready: { label: 'Ready for Pickup', percentage: 95, emoji: '🛍️', icon: 'ShoppingBag' },
  completed: { label: 'Delivered / Completed', percentage: 100, emoji: '✨', icon: 'CheckCircle' },
  cancelled: { label: 'Order Cancelled', percentage: 0, emoji: '❌', icon: 'XCircle' },
};

let activeOrderListeners = new Set();
let currentActiveOrder = null;

export function getStageDetails(status) {
  return ORDER_STAGES[status] || ORDER_STAGES.pending;
}

export function setActiveOrderProgress(order) {
  if (!order) {
    currentActiveOrder = null;
  } else {
    const stageInfo = getStageDetails(order.status);
    currentActiveOrder = {
      ...order,
      stageLabel: stageInfo.label,
      percentage: stageInfo.percentage,
      emoji: stageInfo.emoji,
    };
  }

  // Notify active listeners
  activeOrderListeners.forEach((listener) => {
    try {
      listener(currentActiveOrder);
    } catch (e) {
      console.error('[LiveActivityEngine] Listener error:', e);
    }
  });
}

export function subscribeToLiveActivity(listener) {
  activeOrderListeners.add(listener);
  listener(currentActiveOrder);

  return () => {
    activeOrderListeners.delete(listener);
  };
}

export function getCurrentActiveOrder() {
  return currentActiveOrder;
}
