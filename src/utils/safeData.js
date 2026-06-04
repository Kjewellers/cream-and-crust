/**
 * safeData.js — null/garbage-safe accessors for Firestore data.
 *
 * Firestore documents can arrive missing fields, with wrong-typed values, or
 * fully null (failed reads, partial cache, legacy docs). These helpers never
 * throw on any input so the UI always has a well-formed value to render.
 *
 * Requirements: 1.3 (null/empty reads never blank-crash), 1.4 (invalid order
 * data renders with safe defaults).
 */

/**
 * Read a value at a dot-path from an object, returning `fallback` when the
 * path is missing or any intermediate value is null/undefined. Never throws.
 *
 * @param {*} obj - any value (object, null, primitive, array)
 * @param {string} path - dot-path, e.g. "customer.name"
 * @param {*} [fallback] - returned when the path cannot be resolved
 */
export function safeGet(obj, path, fallback = undefined) {
  if (obj == null || typeof path !== 'string' || path.length === 0) return fallback;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return fallback;
    current = current[part];
  }
  return current === undefined ? fallback : current;
}

/** Coerce any value to a finite number, or `fallback` when not possible. */
export function safeNumber(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Coerce any value to a trimmed non-empty string, or `fallback`. */
export function safeString(value, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return fallback;
}

/**
 * Coerce any value to an array. Arrays pass through; comma-separated strings
 * are split and trimmed; null/undefined/empty become []. Never throws.
 */
export function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  if (value == null) return [];
  return [value];
}

/** True when a Firestore read result represents "no data" to show. */
export function isEmptyResult(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
}

/**
 * Normalize a raw Firestore order document into a fully-formed object where
 * every field the Orders UI reads is defined with a valid-typed value.
 * Valid present fields pass through unchanged; missing/invalid fields fall
 * back to safe defaults. Never throws on any input (Req 1.4).
 *
 * @param {*} raw - any value (a Firestore order doc, null, or garbage)
 * @returns {object} render-safe order
 */
export function normalizeOrder(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};

  const total = safeNumber(o.total !== undefined ? o.total : o.totalAmount, 0);
  const advance = safeNumber(o.advance, 0);
  const customerName = safeString(
    o.customerName !== undefined ? o.customerName : safeGet(o, 'customer.name'),
    'Customer'
  );

  return {
    id: safeString(o.id),
    customerName,
    phone: safeString(o.phone !== undefined ? o.phone : safeGet(o, 'customer.phone')),
    product: safeString(o.product, 'Custom Order'),
    size: safeString(o.size !== undefined ? o.size : o.cakeWeight),
    category: safeString(o.category),
    status: safeString(o.status, 'inquiry').toLowerCase(),
    total,
    advance,
    balance: Math.max(0, total - advance),
    paymentMethod: safeString(o.paymentMethod),
    paymentStatus: safeString(o.paymentStatus),
    date: safeString(o.date !== undefined ? o.date : o.deliveryDate),
    time: safeString(o.time !== undefined ? o.time : o.deliveryTime),
    deliveryType: safeString(o.deliveryType, 'pickup'),
    deliveryAddress: safeString(o.deliveryAddress),
    notes: safeString(o.notes),
    items: safeArray(o.items),
    createdAt: safeString(o.createdAt),
  };
}
