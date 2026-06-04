/**
 * scrollLock.js — pure helpers for capturing and restoring the background
 * scroll offset around a modal/bottom-sheet open/close.
 *
 * Keeping the math pure makes the "restore to exactly the prior offset"
 * behavior testable without a DOM.
 *
 * Requirements: 2.6 (restore background scroll offset on close).
 */

/**
 * Capture the current vertical scroll offset.
 * @param {{ scrollY?: number }} [win]
 * @returns {number}
 */
export function captureScroll(win = typeof window !== 'undefined' ? window : { scrollY: 0 }) {
  const y = win?.scrollY;
  return Number.isFinite(y) ? y : 0;
}

/**
 * Compute the offset to restore to. Identity by design — open-then-close must
 * land on exactly the captured value (Req 2.6).
 * @param {number} captured
 * @returns {number}
 */
export function restoreScroll(captured) {
  return Number.isFinite(captured) ? captured : 0;
}
