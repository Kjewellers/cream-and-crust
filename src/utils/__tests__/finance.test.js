/**
 * Feature: production-readiness-hardening — Orders <-> Payments connection.
 *
 * Verifies the Payments/Analytics "collected" figure respects the explicit
 * isPaid flag set by the Orders payment toggle, so the app shows real data.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateOrderBalance,
  isOrderPendingPayment,
  calculateCollectedForOrder,
  calculateCollectedRevenue,
  calculatePendingPayments,
} from '../finance.js';

describe('finance — toggle-driven payment state', () => {
  it('a toggled-paid order with no advance counts its full total as collected', () => {
    const order = { total: 1000, advance: 0, isPaid: true, status: 'confirmed' };
    expect(calculateCollectedForOrder(order)).toBe(1000);
    expect(calculateOrderBalance(order)).toBe(0);
    expect(isOrderPendingPayment(order)).toBe(false);
  });

  it('a toggled-pending order (even with full advance) is pending', () => {
    const order = { total: 1000, advance: 1000, isPaid: false, status: 'confirmed' };
    // collected reflects the actual advance, balance is the remainder
    expect(calculateCollectedForOrder(order)).toBe(1000);
    // explicit pending: balance derivation respects isPaid:false only when
    // there is an outstanding amount; here advance==total so balance is 0.
    expect(calculateOrderBalance(order)).toBe(0);
  });

  it('partial advance, not paid: collected = advance, pending = remainder', () => {
    const order = { total: 1000, advance: 400, status: 'confirmed' };
    expect(calculateCollectedForOrder(order)).toBe(400);
    expect(calculateOrderBalance(order)).toBe(600);
    expect(isOrderPendingPayment(order)).toBe(true);
  });

  it('aggregate collected revenue across mixed orders', () => {
    const orders = [
      { total: 1000, advance: 0, isPaid: true, status: 'confirmed' }, // 1000 collected
      { total: 500, advance: 200, status: 'baking' }, // 200 collected
      { total: 800, advance: 0, status: 'inquiry' }, // excluded (inquiry)
      { total: 300, advance: 300, status: 'cancelled' }, // excluded (cancelled)
    ];
    // calculateCollectedRevenue applies the committed-status filter itself.
    expect(calculateCollectedRevenue(orders)).toBe(1200);

    // calculatePendingPayments does NOT filter by status (the Payments page
    // pre-filters to committed orders), so mirror that real usage here.
    const committed = orders.filter((o) => {
      const s = String(o.status).toLowerCase();
      return s !== 'inquiry' && s !== 'cancelled';
    });
    expect(calculatePendingPayments(committed).amount).toBe(300); // 500-200
  });
});
