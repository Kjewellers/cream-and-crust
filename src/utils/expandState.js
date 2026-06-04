/**
 * expandState.js — pure reducer for "at most one expanded card".
 *
 * Toggling a card expands it and collapses any other; toggling the already-
 * expanded card collapses it. The resulting state holds at most one id.
 *
 * Requirements: 3.5 (at most one Order_Card expanded), 3.6 (collapse others).
 */

/**
 * @param {string|null} current - currently expanded id (or null)
 * @param {string} id - the card being toggled
 * @returns {string|null} next expanded id
 */
export function toggleExpand(current, id) {
  if (id == null) return current;
  return current === id ? null : id;
}
