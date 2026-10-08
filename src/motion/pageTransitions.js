/**
 * pageTransitions.js — Seamless route transition variants for Cream & Crust.
 *
 * Implements depth scaling + fade transitions with fallbacks for
 * reduced motion. Zero layout jumps, zero white flashes.
 */

import { EASINGS } from './easing.js';

export const pageTransitions = {
  initial: {
    opacity: 0,
    scale: 0.98,
    y: 8,
  },
  in: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: EASINGS.editorial,
    },
  },
  out: {
    opacity: 0,
    scale: 0.98,
    y: -8,
    transition: {
      duration: 0.2,
      ease: EASINGS.accelerate,
    },
  },
};

export const reducedPageTransitions = {
  initial: { opacity: 0 },
  in: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
  out: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

export default pageTransitions;
