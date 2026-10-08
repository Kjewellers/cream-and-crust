/**
 * useMotion.js — Custom React Hooks for Cream & Crust Motion Engine
 */
import { useState, useEffect, useCallback } from 'react';
import { MotionController } from './MotionController';
import { HapticEngine } from './HapticEngine';

/** Custom hook for motion configuration & ambient animation allowance */
export function useMotionConfig() {
  const [state, setState] = useState(() => MotionController.getState());

  useEffect(() => {
    return MotionController.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  return state;
}

/** Custom hook for triggering haptic feedback */
export function useHaptics() {
  const trigger = useCallback((type) => {
    HapticEngine.trigger(type);
  }, []);

  return { trigger };
}

/** Custom hook for predictive back swipe gestures */
export function usePredictiveBack(onBack) {
  const [dragX, setDragX] = useState(0);

  const handleDragEnd = useCallback(
    (_, info) => {
      if (info.offset.x > 120 || info.velocity.x > 600) {
        HapticEngine.trigger('selection');
        onBack?.();
      }
      setDragX(0);
    },
    [onBack]
  );

  return { dragX, handleDragEnd };
}
