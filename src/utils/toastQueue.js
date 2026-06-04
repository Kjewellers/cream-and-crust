/**
 * toastQueue.js — pure reducer for the Toast_System cap + FIFO overflow.
 *
 * At most MAX_VISIBLE toasts are shown at once; additional toasts wait in a
 * FIFO queue and are promoted as visible ones dismiss. Pure and testable.
 *
 * Requirements: 13.1 (top stack), 13.6 (max 3 visible, receive order),
 * 13.7 (FIFO overflow queue).
 */

export const MAX_VISIBLE = 3;

/** Empty toast state. */
export function initToastState() {
  return { visible: [], pending: [] };
}

/**
 * Apply one event and return the next state (pure; no I/O).
 *
 * Events:
 *  - { kind: 'add', toast }     -> show if under cap, else queue (FIFO)
 *  - { kind: 'remove', id }     -> drop from visible/pending; promote next
 *
 * @param {{visible: Array, pending: Array}} state
 * @param {object} event
 * @param {number} [maxVisible]
 */
export function reduceToasts(state, event, maxVisible = MAX_VISIBLE) {
  const s = state && Array.isArray(state.visible) ? state : initToastState();
  if (!event || typeof event !== 'object') return s;

  if (event.kind === 'add') {
    if (!event.toast) return s;
    if (s.visible.length < maxVisible) {
      return { visible: [...s.visible, event.toast], pending: s.pending };
    }
    return { visible: s.visible, pending: [...s.pending, event.toast] };
  }

  if (event.kind === 'remove') {
    const visible = s.visible.filter((t) => t.id !== event.id);
    let pending = s.pending.filter((t) => t.id !== event.id);
    // Promote the next queued toast into the freed visible slot (FIFO).
    if (visible.length < maxVisible && pending.length > 0) {
      const [next, ...rest] = pending;
      return { visible: [...visible, next], pending: rest };
    }
    return { visible, pending };
  }

  return s;
}
