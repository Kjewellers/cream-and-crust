/**
 * paymentStatus.js — single source of truth for "is this order paid?".
 *
 * The explicit `isPaid` flag is AUTHORITATIVE. Only when it is undefined do we
 * fall back to the advance-vs-total heuristic. This is what lets the payment
 * toggle switch back to Pending and have it stick (the old code re-derived
 * "paid" from advance >= total and the toggle appeared stuck on).
 *
 * @param {{ isPaid?: boolean, total?: number|string, totalAmount?: number|string, advance?: number|string }} order
 * @returns {boolean}
 */
export function isOrderPaid(order) {
  if (!order || typeof order !== 'object') return false;
  if (order.isPaid === true) return true;
  if (order.isPaid === false) return false;
  const total = Number(order.total || order.totalAmount || 0);
  const advance = Number(order.advance || 0);
  return total > 0 && advance >= total;
}

/** Compute the next persisted fields when toggling payment. */
export function nextPaymentState(order) {
  const total = Number(order?.total || order?.totalAmount || 0);
  const nextPaid = !isOrderPaid(order);
  return {
    isPaid: nextPaid,
    paymentStatus: nextPaid ? 'paid' : 'pending',
    balanceDue: nextPaid ? 0 : Math.max(0, total - Number(order?.advance || 0)),
  };
}
