/**
 * PaywallStatePreserver.js
 *
 * Captures and restores UI context before/after the paywall opens.
 * Ensures users never lose their place or work due to a subscription flow.
 *
 * Storage strategy:
 *   - Route + scroll → sessionStorage (auto-clears on tab close, no stale data)
 *   - Pending action → localStorage via PendingActionManager (survives app kill)
 *
 * Usage:
 *   // Before opening paywall:
 *   PaywallStatePreserver.capture();
 *
 *   // After paywall closes (success OR cancel):
 *   PaywallStatePreserver.restore();
 */

import { log } from '../utils/logger';

const SESSION_KEY = 'cc:paywall_state';

/**
 * Capture the current UI context into sessionStorage.
 * Called just before the paywall modal opens.
 */
export function capturePaywallState() {
  try {
    const state = {
      route: typeof window !== 'undefined' ? window.location.hash || window.location.pathname : '',
      scrollY: typeof window !== 'undefined' ? Math.round(window.scrollY) : 0,
      capturedAt: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    log.purchase('state:captured', { route: state.route, scrollY: state.scrollY });
  } catch {
    // sessionStorage unavailable — no-op, never throw
  }
}

/**
 * Restore scroll position after paywall closes.
 * Route restoration is handled by SubscriptionContext (paywall is a portal,
 * never navigates away, so route is already correct).
 */
export function restorePaywallState() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;

    const state = JSON.parse(raw);

    // Only restore if captured within this session (< 30 min ago)
    const age = Date.now() - (state.capturedAt || 0);
    if (age > 30 * 60 * 1000) {
      clearPaywallState();
      return;
    }

    // Restore scroll position after a paint so the sheet has closed
    if (typeof window !== 'undefined' && typeof state.scrollY === 'number') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: state.scrollY, behavior: 'instant' });
          log.purchase('state:restored', { scrollY: state.scrollY });
        });
      });
    }

    clearPaywallState();
  } catch {
    // Never throw
  }
}

/**
 * Clear the saved state (call after restore or on sign-out).
 */
export function clearPaywallState() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // no-op
  }
}

/**
 * Read the saved state without clearing it (for diagnostics).
 * @returns {{ route: string, scrollY: number, capturedAt: number } | null}
 */
export function getPaywallState() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
