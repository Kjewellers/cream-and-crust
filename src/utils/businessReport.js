/**
 * businessReport.js
 *
 * Pure helpers that compute a period-scoped business report (weekly or
 * monthly) from raw orders + expenses. No React, no side effects — easy
 * to unit-test. Used by the auto-popup report modal on the Dashboard.
 */

const toDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
};

const orderDate = (o) => toDate(o.deliveryDate) || toDate(o.date) || toDate(o.createdAt) || null;

const isCommitted = (o) => {
  const s = String(o?.status || '').toLowerCase();
  return s !== 'inquiry' && s !== 'cancelled';
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ── Period boundaries ───────────────────────────────────────────── */

/** Start of the ISO week (Monday 00:00) containing `ref`. */
export function startOfWeek(ref = new Date()) {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d;
}

/** ISO-ish week key like "2026-W23" — used to show the weekly report once per week. */
export function weekKey(ref = new Date()) {
  const d = startOfWeek(ref);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Month key like "2026-06". */
export function monthKey(ref = new Date()) {
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
}

export function startOfMonth(ref = new Date()) {
  return new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
}

/** Returns the [start, end) range for the PREVIOUS completed period. */
export function previousPeriodRange(type, ref = new Date()) {
  if (type === 'monthly') {
    const start = new Date(ref.getFullYear(), ref.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = startOfMonth(ref);
    return { start, end };
  }
  // weekly — previous Mon..Sun
  const thisWeekStart = startOfWeek(ref);
  const start = new Date(thisWeekStart);
  start.setDate(start.getDate() - 7);
  return { start, end: thisWeekStart };
}

/* ── The report ──────────────────────────────────────────────────── */

/**
 * Build a report object for the given range.
 * @param {Object} opts
 * @param {'weekly'|'monthly'} opts.type
 * @param {Array} opts.orders
 * @param {Array} opts.expenses
 * @param {Date} [opts.start]
 * @param {Date} [opts.end]
 */
export function buildReport({ type = 'weekly', orders = [], expenses = [], start, end } = {}) {
  const range = start && end ? { start, end } : previousPeriodRange(type, new Date());
  const { start: s, end: e } = range;

  const inRange = (d) => d && d >= s && d < e;

  const periodOrders = (orders || []).filter((o) => o && inRange(orderDate(o)));
  const committed = periodOrders.filter(isCommitted);

  const revenue = committed.reduce((sum, o) => sum + num(o.total ?? o.totalAmount), 0);
  let cashCollected = 0;
  let onlineCollected = 0;
  const collected = committed.reduce((sum, o) => {
    const amt = num(o.advance ?? o.amountPaid);
    if (String(o.paymentMethod || '').toLowerCase().includes('cash')) {
      cashCollected += amt;
    } else {
      onlineCollected += amt;
    }
    return sum + amt;
  }, 0);
  const pending = Math.max(0, revenue - collected);

  const periodExpenses = (expenses || []).filter(
    (x) => x && inRange(toDate(x.date) || toDate(x.createdAt))
  );
  const expenseTotal = periodExpenses.reduce((sum, x) => sum + num(x.amount), 0);

  const netProfit = revenue - expenseTotal;
  const margin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

  // Top product by revenue
  const productTotals = {};
  committed.forEach((o) => {
    const p = o.product || o.cakeFlavour || 'Custom order';
    productTotals[p] = (productTotals[p] || 0) + num(o.total ?? o.totalAmount);
  });
  const topProduct = Object.entries(productTotals).sort((a, b) => b[1] - a[1])[0] || null;

  // Busiest day (by order count)
  const dayCounts = {};
  committed.forEach((o) => {
    const d = orderDate(o);
    if (!d) return;
    const key = d.toLocaleDateString('en-IN', { weekday: 'long' });
    dayCounts[key] = (dayCounts[key] || 0) + 1;
  });
  const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0] || null;

  // New unique customers in period
  const customerSet = new Set();
  committed.forEach((o) => {
    const name =
      (typeof o.customer === 'object' ? o.customer?.name : o.customer) || o.customerName || o.phone;
    if (name) customerSet.add(String(name).toLowerCase().trim());
  });

  const cancelled = periodOrders.filter(
    (o) => String(o.status || '').toLowerCase() === 'cancelled'
  ).length;
  const avgOrderValue = committed.length ? Math.round(revenue / committed.length) : 0;

  const fmtRange = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const endDisplay = new Date(e);
  endDisplay.setDate(endDisplay.getDate() - 1);

  return {
    type,
    periodLabel:
      type === 'monthly'
        ? s.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        : `${fmtRange(s)} – ${fmtRange(endDisplay)}`,
    start: s,
    end: e,
    orderCount: committed.length,
    cancelled,
    revenue,
    collected,
    cashCollected,
    onlineCollected,
    pending,
    expenseTotal,
    netProfit,
    margin,
    avgOrderValue,
    topProduct, // [name, amount] | null
    busiestDay, // [day, count] | null
    newCustomers: customerSet.size,
    isEmpty: committed.length === 0 && expenseTotal === 0,
  };
}

/* ── A friendly one-line headline for the report ─────────────────── */
export function reportHeadline(report) {
  if (!report || report.isEmpty) {
    return report?.type === 'monthly'
      ? 'A quiet month — let\u2019s make the next one sweeter.'
      : 'A quiet week — fresh orders are on the way.';
  }
  if (report.netProfit > 0) {
    return report.type === 'monthly'
      ? 'A profitable month. Beautifully baked.'
      : 'A sweet week of steady profit.';
  }
  if (report.revenue > 0) {
    return 'Good sales — keep an eye on expenses to grow profit.';
  }
  return 'Orders are flowing — keep it up.';
}
