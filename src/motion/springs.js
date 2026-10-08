/**
 * springs.js — Handcrafted Framer Motion spring physics presets.
 *
 * Provides physical weight, stiffness, damping, and mass values for
 * natural, non-rigid movement across components.
 */

export const SPRINGS = {
  // Ultra-gentle spring for subtle UI movement
  gentle: {
    type: 'spring',
    stiffness: 180,
    damping: 24,
    mass: 0.8,
  },

  // Responsive snappy spring for buttons & toggles
  snappy: {
    type: 'spring',
    stiffness: 380,
    damping: 28,
    mass: 0.6,
  },

  // Luxurious smooth spring for cards & modals
  luxury: {
    type: 'spring',
    stiffness: 260,
    damping: 26,
    mass: 0.9,
  },

  // Physics-driven spring for bottom sheets with rubber-band recovery
  sheet: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 1,
  },

  // Floating Action Button morph & bounce
  fabMorph: {
    type: 'spring',
    stiffness: 340,
    damping: 22,
    mass: 0.7,
  },

  // Physical card touch feedback
  cardTouch: {
    type: 'spring',
    stiffness: 420,
    damping: 32,
    mass: 0.5,
  },

  // Micro switch & checkbox spring
  toggle: {
    type: 'spring',
    stiffness: 500,
    damping: 30,
    mass: 0.4,
  },
};

export default SPRINGS;
