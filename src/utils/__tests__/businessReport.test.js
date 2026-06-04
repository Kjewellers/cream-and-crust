import { describe, it, expect } from 'vitest';
import {
  buildReport,
  weekKey,
  monthKey,
  previousPeriodRange,
  reportHeadline,
} from '../businessReport.js';

// Helpers to build dated fixtures inside an explicit range
const mkOrder = (dateStr, total, status = 'delivered', extra = {}) => ({
  date: dateStr,
  total,
  status,
  ...extra,
});

describe('businessReport — period keys', () => {
  it('weekKey is stable within a week and changes across weeks', () => {
    const a = weekKey(new Date('2026-06-01')); // Monday
    const b = weekKey(new Date('2026-06-03')); // same week
    const c = weekKey(new Date('2026-06-10')); // next week
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('monthKey formats YYYY-MM', () => {
    expect(monthKey(new Date('2026-06-15'))).toBe('2026-06');
    expect(monthKey(new Date('2026-12-01'))).toBe('2026-12');
  });

  it('previousPeriodRange(monthly) returns the prior calendar month', () => {
    const { start, end } = previousPeriodRange('monthly', new Date('2026-06-02'));
    expect(start.getMonth()).toBe(4); // May (0-indexed)
    expect(end.getMonth()).toBe(5); // June 1
    expect(end.getDate()).toBe(1);
  });
});

describe('buildReport — computation', () => {
  const start = new Date('2026-05-01T00:00:00');
  const end = new Date('2026-06-01T00:00:00');

  it('sums committed revenue and excludes cancelled/inquiry', () => {
    const orders = [
      mkOrder('2026-05-05', 1000, 'delivered'),
      mkOrder('2026-05-10', 500, 'baking'),
      mkOrder('2026-05-12', 999, 'cancelled'),
      mkOrder('2026-05-15', 800, 'inquiry'),
      mkOrder('2026-04-30', 700, 'delivered'), // out of range
    ];
    const r = buildReport({ type: 'monthly', orders, expenses: [], start, end });
    expect(r.revenue).toBe(1500); // 1000 + 500
    expect(r.orderCount).toBe(2);
    expect(r.cancelled).toBe(1);
  });

  it('computes net profit and margin', () => {
    const orders = [mkOrder('2026-05-05', 2000, 'delivered')];
    const expenses = [{ date: '2026-05-06', amount: 500 }];
    const r = buildReport({ type: 'monthly', orders, expenses, start, end });
    expect(r.expenseTotal).toBe(500);
    expect(r.netProfit).toBe(1500);
    expect(r.margin).toBe(75);
  });

  it('identifies top product and busiest day', () => {
    const orders = [
      mkOrder('2026-05-04', 1000, 'delivered', { product: 'Chocolate Cake' }), // Monday
      mkOrder('2026-05-04', 200, 'delivered', { product: 'Cupcakes' }), // Monday
      mkOrder('2026-05-11', 1500, 'delivered', { product: 'Chocolate Cake' }), // Monday
    ];
    const r = buildReport({ type: 'monthly', orders, expenses: [], start, end });
    expect(r.topProduct[0]).toBe('Chocolate Cake');
    expect(r.topProduct[1]).toBe(2500);
    expect(r.busiestDay[0]).toBe('Monday');
    expect(r.busiestDay[1]).toBe(3); // all three orders fall on a Monday
  });

  it('counts unique customers', () => {
    const orders = [
      mkOrder('2026-05-04', 100, 'delivered', { customerName: 'Anita' }),
      mkOrder('2026-05-05', 100, 'delivered', { customerName: 'anita' }), // same (case-insensitive)
      mkOrder('2026-05-06', 100, 'delivered', { customerName: 'Bob' }),
    ];
    const r = buildReport({ type: 'monthly', orders, expenses: [], start, end });
    expect(r.newCustomers).toBe(2);
  });

  it('flags an empty period', () => {
    const r = buildReport({ type: 'weekly', orders: [], expenses: [], start, end });
    expect(r.isEmpty).toBe(true);
    expect(r.revenue).toBe(0);
  });

  it('avg order value', () => {
    const orders = [
      mkOrder('2026-05-04', 1000, 'delivered'),
      mkOrder('2026-05-05', 2000, 'delivered'),
    ];
    const r = buildReport({ type: 'monthly', orders, expenses: [], start, end });
    expect(r.avgOrderValue).toBe(1500);
  });

  it('does not crash on null entries / missing fields', () => {
    const orders = [null, {}, mkOrder('2026-05-04', 500, 'delivered')];
    const expenses = [null, { amount: 100, date: '2026-05-04' }];
    expect(() => buildReport({ type: 'monthly', orders, expenses, start, end })).not.toThrow();
  });
});

describe('reportHeadline', () => {
  it('returns a profit headline when profitable', () => {
    const h = reportHeadline({ type: 'monthly', isEmpty: false, netProfit: 500, revenue: 1000 });
    expect(typeof h).toBe('string');
    expect(h.length).toBeGreaterThan(0);
  });
  it('returns a quiet headline when empty', () => {
    const h = reportHeadline({ type: 'weekly', isEmpty: true });
    expect(h.toLowerCase()).toContain('quiet');
  });
});
