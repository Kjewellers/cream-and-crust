/**
 * durations.js — Centralized animation duration constants for Cream & Crust.
 *
 * All values are in milliseconds and match mobile native 60fps frame budgets.
 * Never hardcode duration numbers in components.
 */

export const DURATIONS = {
  instant: 0,
  micro: 120,      // Quick state changes (checkbox, radio, switch)
  fast: 180,       // Button compress, hover, subtle micro-interactions
  base: 250,       // Standard UI transitions (modals, dropdowns, card lift)
  slow: 350,       // Page transitions, bottom sheet slides, drawer glide
  luxurious: 450,  // Hero elements, splash reveals, celebration sequences
  ambient: 3600,   // AI avatar breathing, floating elements
};

export default DURATIONS;
