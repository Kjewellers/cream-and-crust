/**
 * listWindow.js — pure reducer for incremental ("windowed") list rendering.
 *
 * The rendered count starts at `initialCount` and grows by `step` each time a
 * reveal event fires, never below the initial count nor above the total list
 * length, and is non-decreasing.
 *
 * Requirements: 5.1 (render large lists incrementally, no blank gaps).
 */

/**
 * @param {number} current - currently rendered count
 * @param {{ total: number, step?: number }} opts
 * @returns {number} next rendered count, clamped to [current, total]
 */
export function growWindow(current, { total, step = 20 } = {}) {
  const t = Math.max(0, Number(total) || 0);
  const c = Math.max(0, Number(current) || 0);
  const next = c + (Number(step) || 0);
  // Non-decreasing, never above total.
  return Math.min(Math.max(c, next), t);
}

/**
 * Clamp an initial count into [0, total].
 */
export function initWindow(total, initialCount = 20) {
  const t = Math.max(0, Number(total) || 0);
  return Math.min(Math.max(0, Number(initialCount) || 0), t);
}
