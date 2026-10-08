/**
 * haptics.js — Premium Centralized Haptic Manager for Cream & Crust.
 *
 * Safe implementation that uses Capacitor Haptics if available on native,
 * and falls back seamlessly to the Web Vibration API.
 *
 * Patterns:
 *  - softTick()          : 10ms micro pulse (button press, toggle, tab, nav)
 *  - mediumTick()        : 22ms firm pulse (save, add product, create invoice)
 *  - successPattern()    : Double pulse (payment complete, sync complete)
 *  - warningPattern()    : Double pulse (delete prompt, low inventory)
 *  - errorPattern()      : Triple pulse (validation error, network failure)
 *  - selectionFeedback() : 6ms ultra-light pulse (date/time picker, slider tick)
 */

export class HapticManager {
  constructor() {
    this.enabled = true;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  _getCapacitorHaptics() {
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins) {
      return window.Capacitor.Plugins.Haptics || null;
    }
    return null;
  }

  // Private helper to trigger vibration safely
  _trigger(pattern) {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      const nativeHaptics = this._getCapacitorHaptics();

      // 1. Native Capacitor Haptics if available
      if (nativeHaptics) {
        if (pattern === 'soft' || pattern === 'selection') {
          nativeHaptics.selectionStart?.();
        } else if (pattern === 'medium') {
          nativeHaptics.impact?.({ style: 'MEDIUM' });
        } else if (pattern === 'success') {
          nativeHaptics.notification?.({ type: 'SUCCESS' });
        } else if (pattern === 'warning') {
          nativeHaptics.notification?.({ type: 'WARNING' });
        } else if (pattern === 'error') {
          nativeHaptics.notification?.({ type: 'ERROR' });
        }
        return;
      }

      // 2. Web Vibration API fallback
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        if (pattern === 'soft') navigator.vibrate(10);
        else if (pattern === 'selection') navigator.vibrate(6);
        else if (pattern === 'medium') navigator.vibrate(22);
        else if (pattern === 'success') navigator.vibrate([15, 50, 25]);
        else if (pattern === 'warning') navigator.vibrate([30, 40, 30]);
        else if (pattern === 'error') navigator.vibrate([40, 30, 40, 30, 40]);
      }
    } catch {
      // Haptics must never crash caller
    }
  }

  softTick() {
    this._trigger('soft');
  }

  mediumTick() {
    this._trigger('medium');
  }

  successPattern() {
    this._trigger('success');
  }

  warningPattern() {
    this._trigger('warning');
  }

  errorPattern() {
    this._trigger('error');
  }

  selectionFeedback() {
    this._trigger('selection');
  }
}

export const haptics = new HapticManager();
export default haptics;
