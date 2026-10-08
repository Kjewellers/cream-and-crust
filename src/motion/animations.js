/**
 * animations.js — Pre-packaged Framer Motion variants for UI elements.
 *
 * Consolidates card entrances, button press physics, modal overlays,
 * list staggers, and drawer glides into reusable objects.
 */

import { SPRINGS } from './springs.js';

export const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: SPRINGS.luxury,
  },
  hover: {
    scale: 1.015,
    transition: SPRINGS.cardTouch,
  },
  tap: {
    scale: 0.98,
    transition: SPRINGS.cardTouch,
  },
};

export const listContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const listItemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: SPRINGS.gentle,
  },
  exit: {
    opacity: 0,
    x: -24,
    height: 0,
    transition: { duration: 0.2 },
  },
};

export const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const sheetVariants = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: SPRINGS.sheet,
  },
  exit: {
    y: '100%',
    transition: { duration: 0.25, ease: [0.32, 0, 0.67, 0] },
  },
};

export const drawerVariants = {
  closed: { x: '-100%' },
  open: {
    x: 0,
    transition: SPRINGS.luxury,
  },
};

export const checkmarkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
      opacity: { duration: 0.1 },
    },
  },
};

export const shakeVariants = {
  shake: {
    x: [0, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.4 },
  },
};
