import { playSound } from '../../utils/audioManager';

/**
 * HapticManager.js
 * Enhanced haptic engine for precise error/success feedback patterns.
 * Ensures haptics are never harsh or long, aligning with premium UI guidelines.
 */

export const HapticManager = {
  trigger(type = 'light') {
    playSound(type);
    
    // Only proceed if vibration is supported (e.g., Android devices).
    // iOS Safari does not support navigator.vibrate, but native iOS
    // wrappers (like Capacitor) might bridge this or we rely on playSound.
    if (typeof window === 'undefined' || !window.navigator?.vibrate) {
      return;
    }

    // Handcrafted, soft haptic patterns (in milliseconds)
    const patterns = {
      // Micro interactions
      light: [10],           // Soft tick (e.g., card appears)
      selection: [15],       // Button hover/focus
      medium: [20],          // Retry action
      
      // Semantic patterns
      success: [10, 40, 15], // Recovered / Checkmark draws itself
      error: [30, 40, 30],   // Failure (Soft, not harsh)
      warning: [25, 30, 25], // Warning
      
      // Unique error states
      offline: [15, 80, 15], // Signal drop feel
      payment: [20, 60, 25], // Coin flip feel
    };

    const pattern = patterns[type] || patterns.light;
    window.navigator.vibrate(pattern);
  }
};
