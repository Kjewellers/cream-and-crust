/**
 * ModuleTour — premium per-module walkthrough.
 *
 * Shows a full-screen card (like the onboarding carousel) — no
 * transparent backdrop, no scrolling, no blur. Just a clean card
 * centered on screen with step content.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TOUR_STORAGE_PREFIX = 'cc_module_tour_seen_';

export function hasSeenModuleTour(moduleId, uid) {
  if (!uid || !moduleId) return true;
  return localStorage.getItem(`${TOUR_STORAGE_PREFIX}${moduleId}:${uid}`) === '1';
}

export function markModuleTourSeen(moduleId, uid) {
  if (!uid || !moduleId) return;
  localStorage.setItem(`${TOUR_STORAGE_PREFIX}${moduleId}:${uid}`, '1');
}

export function resetAllModuleTours(uid) {
  if (!uid) return;
  const keys = Object.keys(localStorage).filter(
    (k) => k.startsWith(TOUR_STORAGE_PREFIX) && k.endsWith(`:${uid}`)
  );
  keys.forEach((k) => localStorage.removeItem(k));
}

export default function ModuleTour({ moduleId, steps = [], onComplete }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (!uid || !moduleId || !steps.length) return;
    if (hasSeenModuleTour(moduleId, uid)) return;
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [uid, moduleId, steps.length]);

  const goNext = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      finish();
    } else {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, steps.length]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const finish = useCallback(() => {
    setVisible(false);
    markModuleTourSeen(moduleId, uid);
    if (onComplete) onComplete();
  }, [moduleId, uid, onComplete]);

  const skip = useCallback(() => {
    setVisible(false);
    markModuleTourSeen(moduleId, uid);
    if (onComplete) onComplete();
  }, [moduleId, uid, onComplete]);

  if (!visible || !steps.length) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'linear-gradient(160deg, #FFF9F5 0%, #FFF1F4 40%, #FAF6F0 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 20px',
            fontFamily: '"Inter", system-ui, sans-serif',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={skip}
            aria-label="Skip tour"
            style={{
              position: 'absolute',
              top: 'calc(16px + env(safe-area-inset-top, 0px))',
              right: 16,
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid rgba(181,96,106,0.12)',
              background: 'rgba(255,255,255,0.8)',
              color: '#8C7A6B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={15} strokeWidth={2.4} />
          </button>

          {/* Step counter top */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(22px + env(safe-area-inset-top, 0px))',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#B5606A',
            }}
          >
            {currentStep + 1} / {steps.length}
          </div>

          {/* Main content card */}
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                {/* Emoji hero */}
                {step.emoji && (
                  <motion.div
                    initial={{ scale: 0.5, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 26,
                      background: 'rgba(181, 96, 106, 0.08)',
                      border: '2px solid rgba(181, 96, 106, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 42,
                      marginBottom: 24,
                      boxShadow: '0 12px 32px rgba(181, 96, 106, 0.1)',
                    }}
                  >
                    {step.emoji}
                  </motion.div>
                )}

                {/* Title */}
                <h2
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontSize: 26,
                    fontWeight: 700,
                    margin: '0 0 10px',
                    color: '#2D1B14',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  {step.title}
                </h2>

                {/* Description */}
                <p
                  style={{
                    fontSize: 15,
                    color: '#8C7A6B',
                    lineHeight: 1.7,
                    margin: '0 0 0',
                    maxWidth: 320,
                  }}
                >
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom navigation */}
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
              left: 20,
              right: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: 380,
              margin: '0 auto',
            }}
          >
            {/* Back / Skip */}
            {isFirst ? (
              <button
                type="button"
                onClick={skip}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#B5A89E',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '10px 0',
                  fontFamily: 'inherit',
                }}
              >
                Skip
              </button>
            ) : (
              <button
                type="button"
                onClick={goBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 'none',
                  color: '#8C7A6B',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '10px 0',
                  fontFamily: 'inherit',
                }}
              >
                <ChevronLeft size={15} /> Back
              </button>
            )}

            {/* Dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === currentStep ? 20 : 7,
                    height: 7,
                    borderRadius: 4,
                    background:
                      i === currentStep
                        ? 'linear-gradient(90deg, #B5606A, #D4A050)'
                        : i < currentStep
                          ? 'rgba(181,96,106,0.5)'
                          : 'rgba(181,96,106,0.12)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Next / Done */}
            <button
              type="button"
              onClick={goNext}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '11px 20px',
                borderRadius: 13,
                border: 'none',
                background: isLast
                  ? 'linear-gradient(135deg, #10B981, #34D399)'
                  : 'linear-gradient(135deg, #B5606A, #D4A050)',
                color: '#fff',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: isLast
                  ? '0 6px 16px rgba(16,185,129,0.3)'
                  : '0 6px 16px rgba(181,96,106,0.25)',
                fontFamily: 'inherit',
              }}
            >
              {isLast ? (
                <>
                  <Sparkles size={13} /> Let's go!
                </>
              ) : (
                <>
                  Next <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
