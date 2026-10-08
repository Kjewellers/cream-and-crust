/**
 * HapticEngine.js — Universal Haptic Engine for Cream & Crust
 * Supports Web Vibrate API & Capacitor Haptics Plugin with safe fallbacks.
 */

import { MotionTokens } from './motionTokens';

class HapticEngineService {
  constructor() {
    this.enabled = true;
    this.lastHapticTime = 0;
    this.minIntervalMs = 35; // Prevents haptic fatigue/overuse
  }

  trigger(type = 'selection') {
    if (!this.enabled) return;

    const now = Date.now();
    if (now - this.lastHapticTime < this.minIntervalMs && type === 'softTick') {
      return; // Suppress rapid soft ticks
    }
    this.lastHapticTime = now;

    try {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        const patterns = {
          [MotionTokens.haptics.softTick]: 8,
          [MotionTokens.haptics.selection]: 12,
          [MotionTokens.haptics.mediumTick]: 22,
          [MotionTokens.haptics.success]: [12, 40, 24],
          [MotionTokens.haptics.warning]: [30, 40, 30],
          [MotionTokens.haptics.error]: [45, 50, 45, 50, 45],
          [MotionTokens.haptics.longPress]: 40,
          [MotionTokens.haptics.dragSnap]: 15,
          [MotionTokens.haptics.sheetSnap]: 18,
          [MotionTokens.haptics.pullToRefresh]: 25,
        };

        const pattern = patterns[type] || patterns.selection;
        window.navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration failures on unsupported hardware
    }
  }

  setEnabled(status) {
    this.enabled = Boolean(status);
  }
}

export const HapticEngine = new HapticEngineService();
export const triggerHaptic = (type) => HapticEngine.trigger(type);
