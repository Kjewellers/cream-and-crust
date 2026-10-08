/**
 * ChatAnimations.js
 *
 * 60 FPS Framer Motion Animation Presets for ChatGPT-Grade AI Chat.
 */

export const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.18, ease: 'easeIn' } },
};

export const messageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 24, stiffness: 320 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export const drawerVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit: { y: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeInOut' } },
};

export const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
  },
};
