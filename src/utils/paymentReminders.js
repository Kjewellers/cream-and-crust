/**
 * Helpers for the "Pending payment reminders" dashboard nudge.
 *
 * Surfaces orders that are still owed money AND are old enough to
 * comfortably nudge the customer. We deliberately exclude:
 *   - Inquiries / cancelled orders (no real obligation yet)
 *   - Orders without a phone number (we can't reach them via WhatsApp)
 *   - Orders younger than `minDaysOverdue` (default 5)
 *   - Orders already snoozed in this session (handled by caller)
 *
 * Dates: an order is "overdue" relative to the LATER of:
 *   - createdAt (so brand new orders aren't immediately flagged)
 *   - deliveryDate (if it's already passed; the customer has had the cake)
 *
 * The WhatsApp template is intentionally warm and short — bakers tend
 * to dread sending money reminders, so we make the copy feel friendly
 * and signed off with their bakery name.
 */

import { calculateOrderBalance, isOrderPendingPayment } from './finance.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MIN_DAYS_OVERDUE = 5;

function toMillis(value) {
  if (!value) return null;
  if (value && typeof value === 'object') {
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toMillis === 'function') {
      try {
        return value.toMillis();
      } catch {
        return null;
      }
    }
  }
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function customerName(order) {
  if (!order) return '';
  if (typeof order.customer === 'object' && order.customer)
    return order.customer.name || order.customerName || '';
  return order.customerName || (typeof order.customer === 'string' ? order.customer : '') || '';
}

function customerPhone(order) {
  if (!order) return '';
  if (typeof order.customer === 'object' && order.customer) return order.customer.phone || '';
  return order.phone || order.customerPhone || '';
}

/**
 * Pick the reference date used to calculate overdue-ness for a given
 * order. We use the LATER of createdAt and deliveryDate so the timer
 * starts from "the moment the customer received value".
 */
export function referenceDateMs(order) {
  const created = toMillis(order?.createdAt);
  const delivery = toMillis(order?.deliveryDate);
  const candidates = [created, delivery].filter((x) => typeof x === 'number' && !Number.isNaN(x));
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

/**
 * @param {Array<Object>} orders
 * @param {{ now?: number, minDaysOverdue?: number }} [opts]
 * @returns {Array<{order: Object, balance: number, daysOverdue: number, name: string, phone: string}>}
 *   Sorted: most overdue first, then largest balance.
 */
export function findOverduePending(orders, opts = {}) {
  if (!Array.isArray(orders)) return [];
  const now = opts.now ?? Date.now();
  const minDaysOverdue = opts.minDaysOverdue ?? DEFAULT_MIN_DAYS_OVERDUE;

  const result = [];
  for (const o of orders) {
    if (!o) continue;
    if (!isOrderPendingPayment(o)) continue;

    const status = String(o.status || '').toLowerCase();
    if (status === 'inquiry' || status === 'cancelled') continue;

    const phone = customerPhone(o);
    if (!phone) continue;

    const ref = referenceDateMs(o);
    if (ref == null) continue;

    const daysOverdue = Math.floor((now - ref) / DAY_MS);
    if (daysOverdue < minDaysOverdue) continue;

    const balance = calculateOrderBalance(o);
    if (!Number.isFinite(balance) || balance <= 0) continue;

    result.push({
      order: o,
      balance: Math.round(balance),
      daysOverdue,
      name: customerName(o) || 'there',
      phone,
    });
  }

  return result.sort((a, b) => {
    if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue;
    return b.balance - a.balance;
  });
}

/**
 * Build a friendly WhatsApp dunning template. Kept short, warm, and
 * signed by the bakery so it doesn't feel like a debt collector.
 *
 * @param {{name: string, balance: number, order: Object}} entry
 * @param {{bakeryName?: string, upiId?: string}} [biz]
 * @returns {string}
 */
export function buildReminderMessage(entry, biz = {}) {
  const safeName = (entry?.name && String(entry.name).trim()) || 'there';
  const balance = Math.max(0, Math.round(Number(entry?.balance) || 0));
  const item =
    entry?.order?.product ||
    entry?.order?.itemName ||
    entry?.order?.cakeName ||
    'your recent order';
  const bakery = biz?.bakeryName || biz?.name || 'Cream & Crust';

  const lines = [
    `Hi ${safeName} 👋`,
    '',
    `Hope you enjoyed ${item}! Just a gentle reminder that there's a balance of ₹${balance.toLocaleString()} pending on it.`,
  ];
  if (biz?.upiId) {
    lines.push('', `You can pay easily via UPI: ${biz.upiId}`);
  }
  lines.push('', `Thank you so much 🙏`, `— ${bakery}`);
  return lines.join('\n');
}

/**
 * Normalise a phone string into the international form WhatsApp's
 * wa.me deep link expects. Adds a default country code (91) for raw
 * 10-digit Indian numbers, leaves anything longer alone.
 */
export function waPhoneFromRaw(raw, defaultCountryCode = '91') {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  return digits;
}

/**
 * Build the wa.me deep link for a given entry + bakery.
 */
export function buildReminderUrl(entry, biz = {}) {
  const phone = waPhoneFromRaw(entry?.phone);
  if (!phone) return '';
  const text = encodeURIComponent(buildReminderMessage(entry, biz));
  return `https://wa.me/${phone}?text=${text}`;
}
