/**
 * PaymentToggle — refined, animated Paid / Pending switch.
 *
 * Fixes the "only turns on" bug by being a controlled component driven purely
 * by the `paid` prop (the parent owns the authoritative state). Adds a money
 * animation: coins fly UP into the pill when marked paid ("money coming in"),
 * and drift DOWN out of the pill when marked pending ("money going out").
 */
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COIN_COUNT = 5;

export default function PaymentToggle({ paid, amountLabel, onToggle }) {
  // Direction of the most recent change: 'in' (paid) or 'out' (pending).
  const [burst, setBurst] = useState(null); // { dir: 'in'|'out', key: number }
  const keyRef = useRef(0);

  const handleClick = (e) => {
    e.stopPropagation();
    const goingPaid = !paid;
    keyRef.current += 1;
    setBurst({ dir: goingPaid ? 'in' : 'out', key: keyRef.current });
    onToggle?.();
    // Clear the burst after the animation window so it can replay.
    setTimeout(() => setBurst(null), 850);
  };

  const green = '#16A34A';
  const red = '#EF4444';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={paid}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderRadius: 12,
        marginBottom: 14,
        border: paid ? '1px solid rgba(16,163,74,0.25)' : '1px solid rgba(239,68,68,0.2)',
        background: paid ? 'rgba(16,163,74,0.06)' : 'rgba(239,68,68,0.04)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* Flying coins layer */}
      <AnimatePresence>
        {burst && (
          <span
            key={burst.key}
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            {Array.from({ length: COIN_COUNT }).map((_, i) => {
              const spread = (i - (COIN_COUNT - 1) / 2) * 16;
              const goingIn = burst.dir === 'in';
              return (
                <motion.span
                  key={i}
                  initial={{
                    opacity: 0,
                    x: spread,
                    y: goingIn ? 26 : -6,
                    scale: 0.6,
                  }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    x: spread + (goingIn ? 0 : spread * 0.4),
                    y: goingIn ? -28 : 30,
                    scale: goingIn ? [0.6, 1.1, 1] : [1, 0.9, 0.5],
                  }}
                  transition={{ duration: 0.8, delay: i * 0.04, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    fontSize: 15,
                    fontWeight: 800,
                    color: goingIn ? green : red,
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                >
                  ₹
                </motion.span>
              );
            })}
          </span>
        )}
      </AnimatePresence>

      <span
        style={{
          fontSize: '0.78rem',
          fontWeight: 800,
          color: paid ? green : red,
          zIndex: 1,
        }}
      >
        {paid ? '✅ Payment Complete' : `💰 ${amountLabel} Pending`}
      </span>

      {/* Toggle switch */}
      <span
        style={{
          width: 46,
          height: 26,
          borderRadius: 99,
          background: paid ? green : 'rgba(74,59,50,0.18)',
          position: 'relative',
          transition: 'background 0.25s ease',
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        <motion.span
          layout
          animate={{ left: paid ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          style={{
            position: 'absolute',
            top: 2,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
          }}
        >
          {paid ? '💸' : ''}
        </motion.span>
      </span>
    </button>
  );
}
