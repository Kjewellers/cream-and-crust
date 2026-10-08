/**
 * motionPresets.js — Cream & Crust Production Framer Motion Presets
 * 60 FPS Spring Physics Presets matching Apple iOS & Arc Browser.
 */

import { MotionTokens } from './motionTokens';

// Page Depth Transitions (Zero white flash, physical depth)
export const pageDepthVariants = {
  initial: { opacity: 0, scale: 0.96, y: 14 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: MotionTokens.springs.natural,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -10,
    transition: { duration: MotionTokens.durations.fast, ease: MotionTokens.easings.sharpExit },
  },
};

// Container Transform / Card Expansion
export const containerTransformVariants = {
  initial: { opacity: 0, scale: 0.92, borderRadius: 24 },
  animate: { opacity: 1, scale: 1, borderRadius: 16, transition: MotionTokens.springs.natural },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.18 } },
};

// List Stagger Parent & Item
export const listStaggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const listStaggerItem = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: MotionTokens.springs.natural },
  exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.15 } },
};

// Bottom Sheet Physics & Snapping
export const bottomSheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: MotionTokens.springs.sheetSnap,
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: MotionTokens.durations.fast, ease: MotionTokens.easings.sharpExit },
  },
};

// Micro-interaction button tap
export const buttonTapScale = {
  whileHover: { scale: 1.025, transition: { duration: 0.12 } },
  whileTap: { scale: 0.94, transition: { duration: 0.08 } },
};

// FAB Floating Button motion
export const fabVariants = {
  initial: { scale: 0, opacity: 0, rotate: -45 },
  animate: { scale: 1, opacity: 1, rotate: 0, transition: MotionTokens.springs.bounce },
  exit: { scale: 0, opacity: 0, rotate: 45, transition: { duration: 0.15 } },
};
