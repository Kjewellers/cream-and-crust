import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShoppingBag, ShieldCheck, Zap } from 'lucide-react';
import { triggerHaptic } from '../iOS';

export default function LiveStatusIsland() {
  const [expanded, setExpanded] = useState(false);
  const [pulseMessage, setPulseMessage] = useState('🔥 4 Orders Today · 🤖 AI Active · 👑 Pro');

  const toggleExpand = () => {
    triggerHaptic('light');
    setExpanded((prev) => !prev);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      <motion.button
        type="button"
        layout
        onClick={toggleExpand}
        whileTap={{ scale: 0.95 }}
        style={{
          background: 'rgba(28, 20, 16, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: expanded ? 22 : 99,
          padding: expanded ? '14px 20px' : '6px 14px',
          color: '#FFF',
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: '90vw',
        }}
      >
        {/* Pulsing indicator circle */}
        <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#10B981', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', opacity: 0.75 }} />
          <span style={{ position: 'relative', display: 'block', width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
        </div>

        {!expanded ? (
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
            {pulseMessage}
          </span>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: '#F5D78E', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={14} color="#F5D78E" /> Live Bakery Activity
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
              • 4 confirmed orders in progress<br/>
              • Digital Storefront active & receiving visits<br/>
              • AI Assistant monitoring inventory levels
            </div>
          </motion.div>
        )}
      </motion.button>

      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
