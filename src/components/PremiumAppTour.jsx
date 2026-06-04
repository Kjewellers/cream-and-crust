import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  LayoutDashboard, ShoppingBag, Package, BarChart3,
  ChevronRight, Sparkles, CheckCircle2, Wand2, ShieldCheck, Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { triggerConfetti } from './DopamineKit';

const steps = [
  {
    id: 'welcome',
    emoji: '\u{1F9C1}',
    title: 'Welcome, Baker',
    description: "Your bakery just got a digital upgrade. Let us show you around \u2014 it only takes a minute.",
    icon: Sparkles,
    color: '#A14F61',
    gradient: 'linear-gradient(135deg, #A14F61 0%, #D4838E 100%)',
  },
  {
    id: 'dashboard',
    emoji: '\u{1F4CA}',
    title: 'Your Command Center',
    description: "See today\u2019s revenue, pending orders, low-stock alerts, and delivery schedule \u2014 all in one glance.",
    icon: LayoutDashboard,
    color: '#C8A46A',
    gradient: 'linear-gradient(135deg, #C8A46A 0%, #E2CC9A 100%)',
  },
  {
    id: 'orders',
    emoji: '\u{1F6D2}',
    title: 'Smart Order Flow',
    description: "From inquiry to delivery in one tap. Auto-generate invoices, share on WhatsApp, and book Rapido \u2014 all built in.",
    icon: ShoppingBag,
    color: '#A14F61',
    gradient: 'linear-gradient(135deg, #A14F61 0%, #D4838E 100%)',
  },
  {
    id: 'menu',
    emoji: '\u2728',
    title: 'Public Menu Builder',
    description: "Create a stunning 24/7 online menu. Pick a theme, add products, share the link \u2014 take orders while you sleep.",
    icon: Wand2,
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
  },
  {
    id: 'recipes',
    emoji: '\u{1F510}',
    title: 'Secret Recipe Vault',
    description: "Your formulas, protected. Store recipes with costing, batch scaling, and biometric lock for sensitive ones.",
    icon: ShieldCheck,
    color: '#2F7A5A',
    gradient: 'linear-gradient(135deg, #2F7A5A 0%, #4ADE80 100%)',
  },
  {
    id: 'inventory',
    emoji: '\u{1F4E6}',
    title: 'Inventory Mastery',
    description: "Never run out of flour again. Smart low-stock alerts, auto-deduction when orders are fulfilled, and cost tracking.",
    icon: Package,
    color: '#C8A46A',
    gradient: 'linear-gradient(135deg, #C8A46A 0%, #E2CC9A 100%)',
  },
  {
    id: 'customers',
    emoji: '\u{1F49B}',
    title: 'Customer Relationships',
    description: "Remember every customer\u2019s preferences, order history, and special dates. Build loyalty that lasts.",
    icon: Users,
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
  },
  {
    id: 'analytics',
    emoji: '\u{1F4C8}',
    title: 'Growth Analytics',
    description: "Turn data into profit. Visualize margins, best-sellers, and monthly trends with beautiful charts.",
    icon: BarChart3,
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
  },
  {
    id: 'ready',
    emoji: '\u{1F389}',
    title: "You're All Set!",
    description: "Your digital bakery is live. Join 100+ professional bakers growing with Cream & Crust.",
    icon: CheckCircle2,
    color: '#2F7A5A',
    gradient: 'linear-gradient(135deg, #2F7A5A 0%, #4ADE80 100%)',
  },
];

function PerspectiveCard({ children }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [6, -6]), { stiffness: 120, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-6, 6]), { stiffness: 120, damping: 30 });

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }
  function handleMouseLeave() { mouseX.set(0); mouseY.set(0); }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', width: '100%', maxWidth: 480 }}
    >
      {children}
    </motion.div>
  );
}

export default function PremiumAppTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const { finishTour } = useAuth();

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => { if (isLast) handleFinish(); else setCurrentStep(p => p + 1); };
  const handleBack = () => { if (currentStep > 0) setCurrentStep(p => p - 1); };

  const handleFinish = async () => {
    triggerConfetti(window.innerWidth / 2, window.innerHeight / 2);
    setIsExiting(true);
    setTimeout(() => { if (finishTour) finishTour(); if (onComplete) onComplete(); }, 800);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(250, 247, 245, 0.85)',
            backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
            padding: 20,
          }}
        >
          {/* Ambient blobs */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <motion.div
              animate={{ scale: [1, 1.3, 1], x: [0, 80, 0], y: [0, -40, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '-15%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: step.color + '18', filter: 'blur(100px)' }}
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], x: [0, -60, 0], y: [0, 60, 0] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', bottom: '-15%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: step.color + '12', filter: 'blur(100px)' }}
            />
          </div>

          <PerspectiveCard>
            <motion.div layout style={{
              background: '#FFFDFA', borderRadius: 36, overflow: 'hidden',
              boxShadow: '0 40px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
              position: 'relative',
            }}>
              {/* Top gradient band */}
              <div style={{ height: 6, background: step.gradient }} />

              {/* Emoji hero */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px 24px' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{
                      width: 100, height: 100, borderRadius: 28,
                      background: step.color + '12', border: '2px solid ' + step.color + '30',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 52, boxShadow: '0 16px 40px ' + step.color + '20',
                    }}
                  >
                    {step.emoji}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Content */}
              <div style={{ padding: '0 36px 40px', textAlign: 'center' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -24, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <h2 style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: '1.9rem', fontWeight: 700, color: '#2A1E1B',
                      letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 14,
                    }}>
                      {step.title}
                    </h2>
                    <p style={{
                      fontSize: '1rem', color: '#7F7069', lineHeight: 1.65,
                      fontWeight: 500, maxWidth: 360, margin: '0 auto',
                    }}>
                      {step.description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Progress dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 32, marginBottom: 28 }}>
                  {steps.map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ width: i === currentStep ? 28 : 8, background: i === currentStep ? step.color : '#E8DDD8' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      style={{ height: 8, borderRadius: 4 }}
                    />
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <button
                    onClick={currentStep > 0 ? handleBack : handleFinish}
                    style={{
                      height: 52, padding: '0 20px', borderRadius: 16,
                      background: 'transparent', border: '1.5px solid #E8DDD8',
                      color: '#7F7069', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                    }}
                  >
                    {currentStep > 0 ? 'Back' : 'Skip'}
                  </button>

                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleNext}
                    style={{
                      height: 56, padding: '0 28px', borderRadius: 18,
                      background: step.gradient, color: '#FFFFFF', border: 'none',
                      fontWeight: 800, fontSize: '1rem',
                      display: 'flex', alignItems: 'center', gap: 10,
                      cursor: 'pointer', boxShadow: '0 12px 32px ' + step.color + '35',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {isLast ? 'Start Baking \u{1F382}' : 'Continue'}
                    {!isLast && <ChevronRight size={20} />}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </PerspectiveCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
