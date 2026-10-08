/**
 * useErrorAnimations.js
 * Framer Motion variants and orchestration logic for the 4-level error system.
 * Designed for 60FPS using GPU-accelerated properties (transform, opacity, filter).
 */

import { useReducedMotion } from 'framer-motion';

// Premium spring physics for UI elements
export const ErrorSprings = {
  // Level 1: Tiny Errors (Quick, snappy, but soft)
  toast: { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 },
  
  // Level 2: Recoverable (Slightly more buoyant)
  bubble: { type: 'spring', stiffness: 350, damping: 28, mass: 1 },
  
  // Level 3: Action Required (Heavier, premium rubber spring)
  card: { type: 'spring', stiffness: 300, damping: 26, mass: 1.2 },
  
  // Staggered children (icons, text, buttons)
  stagger: { delayChildren: 0.1, staggerChildren: 0.08 }
};

export function useErrorAnimations() {
  const prefersReducedMotion = useReducedMotion();

  // Root scale effect for Level 3 modals
  const rootScaleVariants = {
    idle: { 
      scale: 1, 
      filter: 'blur(0px) brightness(1)', 
      borderRadius: 0,
      transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } 
    },
    dimmed: { 
      scale: prefersReducedMotion ? 1 : 0.985, 
      filter: prefersReducedMotion ? 'blur(0px) brightness(0.9)' : 'blur(4px) brightness(0.85)',
      borderRadius: prefersReducedMotion ? 0 : 20,
      transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] }
    }
  };

  // Level 1: GlassToast
  const toastVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : -8, scale: 0.98 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.22, ease: 'easeOut' }
    },
    exit: { 
      opacity: 0, 
      y: prefersReducedMotion ? 0 : -8,
      scale: 0.98,
      transition: { duration: 0.18, ease: 'easeIn' }
    }
  };

  // Level 2: FloatingStatusBubble
  const bubbleVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: ErrorSprings.bubble
    },
    exit: { 
      opacity: 0, 
      y: prefersReducedMotion ? 0 : -10,
      scale: 0.95,
      transition: { duration: 0.2, ease: 'easeIn' }
    }
  };

  // Level 3: AnimatedErrorCard
  const cardVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 40, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: ErrorSprings.card
    },
    exit: { 
      opacity: 0, 
      y: prefersReducedMotion ? 0 : 20,
      scale: 0.95,
      transition: { duration: 0.25, ease: 'easeIn' }
    }
  };

  // Typography staggered animations
  const textItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return {
    rootScaleVariants,
    toastVariants,
    bubbleVariants,
    cardVariants,
    textItemVariants,
    prefersReducedMotion
  };
}
