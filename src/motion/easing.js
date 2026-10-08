/**
 * easing.js — Curated cubic bezier easing curves for Cream & Crust.
 *
 * Designed for a soft, editorial, handcrafted feel.
 * Never hardcode bezier curves in components.
 */

export const EASINGS = {
  // Editorial soft curve for standard UI elements (Airbnb / Apple style)
  editorial: [0.25, 1, 0.5, 1],

  // Decelerate curve for entering elements
  decelerate: [0.0, 0.0, 0.2, 1],

  // Accelerate curve for exiting elements
  accelerate: [0.4, 0.0, 1, 1],

  // Standard material curve
  standard: [0.4, 0.0, 0.2, 1],

  // Entrance with subtle natural overshoot
  entrance: [0.175, 0.885, 0.32, 1.275],

  // Soft spring-like bounce curve for micro feedback
  subtleBounce: [0.34, 1.56, 0.64, 1],

  // Smooth linear easing for continuous ambient motion
  ambientLinear: [0.42, 0, 0.58, 1],
};

export const EASING_CSS = {
  editorial: 'cubic-bezier(0.25, 1, 0.5, 1)',
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  entrance: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  subtleBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export default EASINGS;
