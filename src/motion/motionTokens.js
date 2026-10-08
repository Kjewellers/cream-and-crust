/**
 * MotionTokens.js — Cream & Crust God Tier Motion Design Tokens v2.0
 * Centralized motion tokens defining Cream & Crust's unique handcrafted identity.
 */

export const MotionTokens = {
  // Spring Presets (RK4 Parameters)
  springs: {
    snappy: { type: 'spring', stiffness: 440, damping: 28, mass: 0.65 },
    natural: { type: 'spring', stiffness: 350, damping: 28, mass: 0.8 },
    gentle: { type: 'spring', stiffness: 250, damping: 30, mass: 1.0 },
    bounce: { type: 'spring', stiffness: 480, damping: 18, mass: 0.6 },
    sheetSnap: { type: 'spring', stiffness: 320, damping: 32, mass: 1.1 },
    celebration: { type: 'spring', stiffness: 500, damping: 15, mass: 0.5 },
    appleSpring: { type: 'spring', stiffness: 500, damping: 35, mass: 1 },
  },

  // Duration Scale (seconds)
  durations: {
    instant: 0.08,
    fast: 0.16,
    base: 0.24,
    moderate: 0.36,
    slow: 0.50,
    deliberate: 0.72,
  },

  // Easing Curves
  easings: {
    creamSignature: [0.16, 1, 0.3, 1],       // Smooth deceleration
    expressive: [0.34, 1.56, 0.64, 1],     // Subtle overshoot
    appleEase: [0.25, 0.1, 0.25, 1],        // iOS fluid standard
    sharpExit: [0.4, 0, 1, 1],             // Quick dismissal
    linear: [0, 0, 1, 1],
  },

  // Scale Tokens
  scale: {
    tapCompression: 0.94,
    cardHover: 1.025,
    activeFocus: 1.05,
    badgePop: 1.15,
  },

  // Depth & Elevation
  depth: {
    flat: 0,
    raised: '0 4px 12px rgba(74, 59, 50, 0.06)',
    floating: '0 12px 36px rgba(74, 59, 50, 0.14)',
    overlay: '0 24px 64px rgba(0, 0, 0, 0.35)',
  },

  // Levels Hierarchy
  levels: {
    LEVEL_0_LAYOUT: 0,
    LEVEL_1_MICRO: 1,
    LEVEL_2_NAVIGATION: 2,
    LEVEL_3_CELEBRATION: 3,
    LEVEL_4_AMBIENT: 4,
  },

  // Stagger Reveal Presets
  staggerReveal: {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.035,
          delayChildren: 0.02,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 12 },
      show: { 
        opacity: 1, 
        y: 0,
        transition: { type: 'spring', stiffness: 400, damping: 30 }
      },
    },
  },

  // Button Press Variants
  buttonPress: {
    idle: { scale: 1 },
    tap: { 
      scale: 0.97, 
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      transition: { type: 'spring', stiffness: 600, damping: 25 }
    },
  }
};
