import { motion } from 'framer-motion';

// Premium Apple-tier Spring Physics
export const springTransition = { 
  type: "spring", 
  stiffness: 350, 
  damping: 28, 
  mass: 0.8 
};

// Gentle, ultra-smooth ease for fades
export const easeTransition = {
  duration: 0.4,
  ease: [0.16, 1, 0.3, 1] // Apple-like custom bezier
};

// Orchestrated staggering for lists
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06, // Fast, crisp stagger
      delayChildren: 0.05
    }
  }
};

// Individual items in a staggered list
export const staggerItem = {
  hidden: { opacity: 0, y: 30, scale: 0.95, filter: "blur(8px)" },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    filter: "blur(0px)", 
    transition: springTransition 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    filter: "blur(4px)", 
    transition: { duration: 0.2 } 
  }
};

// Full page sweep/fade transition
export const pageVariants = {
  initial: { 
    opacity: 0, 
    y: 15,
    scale: 0.98,
    filter: "blur(4px)"
  },
  in: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  out: { 
    opacity: 0, 
    scale: 0.98,
    filter: "blur(2px)",
    transition: { duration: 0.2 }
  }
};

// Background scale-down effect (for when modals open)
export const backgroundScaleVariant = {
  normal: { 
    scale: 1, 
    filter: "blur(0px)", 
    borderRadius: "0px",
    transition: springTransition 
  },
  pushed: { 
    scale: 0.94, 
    filter: "blur(6px)", 
    borderRadius: "24px",
    transition: springTransition 
  }
};

// Premium Modal Entrance
export const modalVariants = {
  hidden: { y: "100%", opacity: 0 },
  show: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 32, 
      mass: 0.8 
    } 
  },
  exit: { 
    y: "100%", 
    opacity: 0, 
    transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } 
  }
};

// Removed PageWrapper (moved to App.jsx to fix Vite compilation error)
