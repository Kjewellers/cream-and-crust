/**
 * iOS-level shared animation variants and helpers
 */

// Page entry animation – subtle spring lift
export const pageVariants = {
  hidden:  { opacity: 0, y: 16, scale: 0.98, filter: "blur(6px)" },
  show:    { opacity: 1, y: 0,  scale: 1, filter: "blur(0px)",
    transition: { type: 'spring', stiffness: 380, damping: 28, mass: 0.9 } },
  exit:    { opacity: 0, y: -12, scale: 0.98, filter: "blur(4px)",
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

// Stagger container for list items
export const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.06 } },
};

// Individual list item
export const listItem = {
  hidden: { opacity: 0, y: 20, scale: 0.96, filter: "blur(8px)" },
  show:   { opacity: 1, y: 0,  scale: 1, filter: "blur(0px)",
    transition: { type: 'spring', stiffness: 400, damping: 28 } },
  exit:   { opacity: 0, scale: 0.96, filter: "blur(4px)",
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

// Card hover/tap
export const cardTap = {
  whileHover: { y: -3, boxShadow: '0 12px 40px rgba(28,16,8,0.1)' },
  whileTap:   { scale: 0.975, y: 0 },
  transition: { type: 'spring', stiffness: 400, damping: 22 },
};

// Button press
export const buttonPress = {
  whileTap: { scale: 0.94 },
  transition: { type: 'spring', stiffness: 500, damping: 24 },
};

// Modal spring entry
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 40, filter: "blur(8px)" },
  show:   { opacity: 1, scale: 1,    y: 0, filter: "blur(0px)",
    transition: { type: 'spring', stiffness: 380, damping: 30 } },
  exit:   { opacity: 0, scale: 0.96, y: 20, filter: "blur(6px)",
    transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } },
};

// Bottom sheet slide-up (mobile modals)
export const sheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  show:   { y: 0, opacity: 1,
    transition: { type: 'spring', stiffness: 320, damping: 30 } },
  exit:   { y: '100%', opacity: 0,
    transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } },
};

// Stat card counter spring
export const statCard = {
  hidden: { opacity: 0, scale: 0.9, y: 16 },
  show:   { opacity: 1, scale: 1,   y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 22 } },
};

// FAB entrance
export const fabVariants = {
  hidden: { scale: 0, opacity: 0, rotate: -45 },
  show:   { scale: 1, opacity: 1, rotate: 0,
    transition: { type: 'spring', stiffness: 400, damping: 18, delay: 0.3 } },
};

// Badge pulse (for notifications)
export const badgePulse = {
  animate: {
    scale: [1, 1.15, 1],
    transition: { repeat: Infinity, repeatDelay: 3, duration: 0.4 }
  }
};

// Shimmer keyframe helper
export const shimmerTransition = {
  duration: 1.4,
  repeat: Infinity,
  ease: 'linear',
};
