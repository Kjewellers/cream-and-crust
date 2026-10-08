import React from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'linear-gradient(160deg, #FFF9F5 0%, #FFF1F4 40%, #FAF6F0 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '140%',
          height: '140%',
          top: '-20%',
          left: '-20%',
          background:
            'radial-gradient(circle at 25% 30%, rgba(181,96,106,0.12) 0%, transparent 50%), radial-gradient(circle at 75% 70%, rgba(212,160,80,0.10) 0%, transparent 45%)',
          pointerEvents: 'none',
        }}
      />

      {['🧁', '🎂', '🍰', '🥐', '✨', '🍪'].map((emoji, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 40 }}
          animate={{
            opacity: [0, 0.6, 0.4],
            y: [40, -20, -60],
            x: [0, (i % 2 === 0 ? 1 : -1) * 15, (i % 2 === 0 ? -1 : 1) * 8],
          }}
          transition={{
            duration: 4 + i * 0.5,
            delay: 0.3 + i * 0.15,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            fontSize: 20 + i * 3,
            top: `${15 + i * 12}%`,
            left: `${10 + i * 14}%`,
            pointerEvents: 'none',
            filter: 'blur(0.5px)',
          }}
        >
          {emoji}
        </motion.div>
      ))}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 2,
        }}
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.1 }}
          style={{ position: 'relative' }}
        >
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -18,
              borderRadius: 32,
              background: 'linear-gradient(135deg, rgba(181,96,106,0.35), rgba(212,160,80,0.25))',
              filter: 'blur(22px)',
              zIndex: -1,
            }}
          />
          <img
            src="/logo.png"
            alt="Cream & Crust"
            style={{
              width: 110,
              height: 110,
              objectFit: 'contain',
              borderRadius: 28,
              boxShadow: '0 16px 40px rgba(181,96,106,0.18), 0 4px 12px rgba(0,0,0,0.06)',
              background: '#fff',
              padding: 3,
              border: '2px solid rgba(181,96,106,0.12)',
            }}
          />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          style={{ marginTop: 28, textAlign: 'center' }}
        >
          <h1
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: '2.2rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: 0,
              color: '#2D1B14',
              lineHeight: 1.1,
            }}
          >
            Cream & Crust
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              marginTop: 8,
              fontSize: '0.78rem',
              color: '#8C7A6B',
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
            }}
          >
            Bakery Atelier
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          style={{
            marginTop: 40,
            width: 160,
            height: 3,
            background: 'rgba(181,96,106,0.10)',
            borderRadius: 10,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 1.4, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '50%',
              background:
                'linear-gradient(90deg, transparent, #B5606A, rgba(212,160,80,0.8), transparent)',
              borderRadius: 10,
            }}
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        style={{
          position: 'absolute',
          bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: '0.68rem',
            color: '#B5A89E',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          Made for premium bakers
        </div>
        <div
          style={{
            fontSize: '0.6rem',
            color: '#D4C4B8',
            fontWeight: 600,
            letterSpacing: '0.08em',
          }}
        >
          Crafted in India 🇮🇳
        </div>
      </motion.div>
    </motion.div>
  );
}
