import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from '../iOS';
import { pageVariants } from '../../animations';

export function DelayedFallback({ fullScreen }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(timer);
  }, []);
  if (!show) return <div style={{ minHeight: fullScreen ? '100vh' : '60vh' }} />;
  return (
    <div style={{ minHeight: fullScreen ? '100vh' : '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="animate-spin" color="var(--accent, #B5606A)" size={28} />
    </div>
  );
}

export const PageWrapper = ({ children, className = '' }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    className={`page-wrapper ${className}`}
    style={{ minHeight: '100%', width: '100%', originY: 0 }}
  >
    {children}
  </motion.div>
);
