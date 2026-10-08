import { createContext, useContext } from 'react';

export const MotionContext = createContext(null);

export function useMotion() {
  const ctx = useContext(MotionContext);
  if (!ctx) {
    throw new Error('useMotion must be used within a MotionProvider');
  }
  return ctx;
}

export function useHaptics() {
  const { haptics } = useMotion();
  return haptics;
}

export function useSound() {
  const { sounds } = useMotion();
  return sounds;
}

export default MotionContext;
