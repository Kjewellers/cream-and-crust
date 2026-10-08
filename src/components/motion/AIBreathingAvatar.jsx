import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Moon, WifiOff, Loader2, Heart } from 'lucide-react';

/**
 * AIBreathingAvatar — Handcrafted interactive AI avatar.
 * Modes: 'idle' | 'thinking' | 'typing' | 'listening' | 'sleeping' | 'celebration' | 'offline'
 */
export default function AIBreathingAvatar({ mode = 'idle', size = 48, onClick }) {
  // Mode configuration
  const isSleeping = mode === 'sleeping';
  const isOffline = mode === 'offline';
  const isThinking = mode === 'thinking';
  const isListening = mode === 'listening';
  const isCelebration = mode === 'celebration';

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size,
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Outer Breathing Pulsing Glow Ring */}
      <motion.div
        animate={{
          scale: isListening ? [1, 1.25, 1] : [1, 1.1, 1],
          opacity: isSleeping ? 0.2 : isOffline ? 0.1 : [0.3, 0.65, 0.3],
        }}
        transition={{
          duration: isListening ? 1.4 : 3.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          background: isOffline
            ? 'rgba(156, 163, 175, 0.4)'
            : 'radial-gradient(circle, rgba(212, 160, 80, 0.45) 0%, rgba(181, 96, 106, 0.2) 70%)',
          filter: 'blur(4px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Avatar Container */}
      <motion.div
        animate={{
          y: isSleeping ? [0, 2, 0] : [0, -3, 0],
          scale: isCelebration ? [1, 1.15, 1] : 1,
        }}
        transition={{
          duration: isSleeping ? 4 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: isOffline
            ? 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)'
            : 'linear-gradient(135deg, var(--accent, #B5606A) 0%, var(--gold, #D4A050) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          boxShadow: '0 8px 20px rgba(181, 96, 106, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isOffline ? (
          <WifiOff size={size * 0.45} />
        ) : isSleeping ? (
          <Moon size={size * 0.45} />
        ) : isThinking ? (
          <Loader2 size={size * 0.45} className="animate-spin" />
        ) : isCelebration ? (
          <Heart size={size * 0.45} color="#FFF" />
        ) : (
          <Sparkles size={size * 0.45} />
        )}
      </motion.div>

      {/* Active State Badge Indicator */}
      {isListening && (
        <span
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#10B981',
            border: '2px solid #FFF',
          }}
        />
      )}
    </div>
  );
}
