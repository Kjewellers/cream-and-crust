/**
 * MotionProvider.jsx
 * React Provider component wrapping motion controller state for children components.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { MotionController } from './MotionController';

const MotionContext = createContext(MotionController.getState());

export function MotionProvider({ children }) {
  const [state, setState] = useState(() => MotionController.getState());

  useEffect(() => {
    return MotionController.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  return (
    <MotionContext.Provider value={state}>
      {children}
    </MotionContext.Provider>
  );
}

export function useMotionState() {
  return useContext(MotionContext);
}
