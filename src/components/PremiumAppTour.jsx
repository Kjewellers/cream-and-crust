import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  Wand2,
  ShieldCheck,
  Users,
  MoveHorizontal,
  ArrowRight,
  MessageCircle,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { triggerConfetti } from './DopamineKit';
import { triggerHaptic } from './iOS';

const steps = [
  {
    id: 'welcome',
    emoji: '🧁',
    title: 'Welcome, Baker',
    description: 'Your bakery just got a digital upgrade. Let us show you around — it only takes a minute.',
    icon: Sparkles,
    color: '#A14F61',
    gradient: 'linear-gradient(135deg, #A14F61 0%, #D4838E 100%)',
  },
  {
    id: 'dashboard',
    emoji: '📊',
    title: 'Your Command Center',
    description: "See today's revenue, pending orders, low-stock alerts, and delivery schedule — all in one glance.",
    icon: LayoutDashboard,
    color: '#C8A46A',
    gradient: 'linear-gradient(135deg, #C8A46A 0%, #E2CC9A 100%)',
  },
  {
    id: 'orders',
    emoji: '🛒',
    title: 'Smart Order Flow',
    description: 'From inquiry to delivery in one tap. Auto-generate invoices, share on WhatsApp, and book Rapido — all built in.',
    icon: ShoppingBag,
    color: '#A14F61',
    gradient: 'linear-gradient(135deg, #A14F61 0%, #D4838E 100%)',
    hasInteractiveDemo: true,
  },
  {
    id: 'menu',
    emoji: '✨',
    title: 'Public Menu Builder',
    description: 'Create a stunning 24/7 online menu. Pick a theme, add products, share the link — take orders while you sleep.',
    icon: Wand2,
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
  },
  {
    id: 'recipes',
    emoji: '🔐',
    title: 'Secret Recipe Vault',
    description: 'Your formulas, protected. Store recipes with costing, batch scaling, and biometric lock for sensitive ones.',
    icon: ShieldCheck,
    color: '#2F7A5A',
    gradient: 'linear-gradient(135deg, #2F7A5A 0%, #4ADE80 100%)',
  },
  {
    id: 'inventory',
    emoji: '📦',
    title: 'Inventory Mastery',
    description: 'Never run out of flour again. Smart low-stock alerts, auto-deduction when orders are fulfilled, and cost tracking.',
    icon: Package,
    color: '#C8A46A',
    gradient: 'linear-gradient(135deg, #C8A46A 0%, #E2CC9A 100%)',
  },
  {
    id: 'customers',
    emoji: '💛',
    title: 'Customer Relationships',
    description: "Remember every customer's preferences, order history, and special dates. Build loyalty that lasts.",
    icon: Users,
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
  },
  {
    id: 'analytics',
    emoji: '📈',
    title: 'Growth Analytics',
    description: 'Turn data into profit. Visualize margins, best-sellers, and monthly trends with beautiful charts.',
    icon: BarChart3,
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
  },
  {
    id: 'ready',
    emoji: '🎉',
    title: "You're All Set!",
    description: 'Your digital bakery is live. Join 100+ professional bakers growing with Cream & Crust.',
    icon: CheckCircle2,
    color: '#2F7A5A',
    gradient: 'linear-gradient(135deg, #2F7A5A 0%, #4ADE80 100%)',
  },
];

/**
 * Interactive Order Gesture Sandbox
 * Demonstrates the app's signature order swipe gestures right inside the tour!
 */
function OrderSwipePracticeWidget() {
  const [swipeStatus, setSwipeStatus] = useState(null); // 'whatsapp' | 'paid' | null
  const demoDragX = useMotionValue(0);
  const demoRotate = useTransform(demoDragX, [-100, 100], [-6, 6]);

  const handleDemoDragEnd = (_, info) => {
    if (info.offset.x > 40) {
      setSwipeStatus('whatsapp');
      triggerHaptic('success');
      setTimeout(() => setSwipeStatus(null), 2400);
    } else if (info.offset.x < -40) {
      setSwipeStatus('paid');
      triggerHaptic('success');
      setTimeout(() => setSwipeStatus(null), 2400);
    }
  };

  return (
    <div style={{ marginTop: 16, marginBottom: 8, width: '100%' }}>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#8A7B75',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <MoveHorizontal size={14} /> Practice Gesture: Try swiping below
      </div>

      <div
        style={{
          position: 'relative',
          borderRadius: 20,
          overflow: 'hidden',
          background: '#F5ECE6',
          padding: 3,
        }}
      >
        {/* Underneath Action Backgrounds */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            fontSize: '0.8rem',
            fontWeight: 800,
          }}
        >
          <span style={{ color: '#2F7A5A', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageCircle size={15} /> WhatsApp
          </span>
          <span style={{ color: '#C8A46A', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CreditCard size={15} /> Mark Paid
          </span>
        </div>

        {/* Draggable Order Card Preview */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onDragEnd={handleDemoDragEnd}
          style={{
            x: demoDragX,
            rotate: demoRotate,
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '12px 14px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
            cursor: 'grab',
            position: 'relative',
            zIndex: 1,
            userSelect: 'none',
            touchAction: 'pan-y',
          }}
          whileDrag={{ scale: 0.98, cursor: 'grabbing' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2A1E1B' }}>
                🎂 Belgian Chocolate Cake
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8A7B75', marginTop: 2 }}>
                Priya S. · 1kg · ₹1,200
              </div>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 999,
                background: swipeStatus === 'whatsapp' ? '#E6F4EA' : swipeStatus === 'paid' ? '#FEF3C7' : '#FFF0E6',
                color: swipeStatus === 'whatsapp' ? '#137333' : swipeStatus === 'paid' ? '#B45309' : '#C2410C',
                transition: 'all 0.2s ease',
              }}
            >
              {swipeStatus === 'whatsapp' ? '💬 WhatsApp Ready' : swipeStatus === 'paid' ? '✓ Marked Paid' : 'Pending'}
            </span>
          </div>
        </motion.div>
      </div>

      <div
        style={{
          fontSize: '0.72rem',
          color: '#A1948E',
          marginTop: 6,
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <span>👉 Swipe right for WhatsApp</span>
        <span>·</span>
        <span>👈 Swipe left to mark paid</span>
      </div>
    </div>
  );
}

/**
 * 3D Parallax Tilt Card Container
 */
function PerspectiveCard({ children, onCardSwipe, isDragging }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [5, -5]), { stiffness: 140, damping: 28 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-5, 5]), { stiffness: 140, damping: 28 });

  function handleMouseMove(e) {
    if (isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        width: '100%',
        maxWidth: 480,
      }}
    >
      {children}
    </motion.div>
  );
}

export default function PremiumAppTour({ onComplete }) {
  const [[currentStep, direction], setPage] = useState([0, 0]);
  const [isExiting, setIsExiting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const { finishTour } = useAuth();

  const dragX = useMotionValue(0);
  const dragRotate = useTransform(dragX, [-220, 220], [-8, 8]);
  const dragScale = useTransform(dragX, [-220, 0, 220], [0.97, 1, 0.97]);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  // Navigate with direction tracking for fluid spring slide
  const paginate = (newDirection) => {
    setHasInteracted(true);
    const nextIndex = currentStep + newDirection;
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    setPage([nextIndex, newDirection]);
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      triggerHaptic('light');
      paginate(1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      triggerHaptic('light');
      paginate(-1);
    }
  };

  const handleFinish = async () => {
    triggerHaptic('success');
    triggerConfetti(window.innerWidth / 2, window.innerHeight / 2);
    setIsExiting(true);
    setTimeout(() => {
      if (finishTour) finishTour();
      if (onComplete) onComplete();
    }, 800);
  };

  // Keyboard navigation gestures (ArrowRight, ArrowLeft, Enter, Space, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (isLast) handleFinish();
        else {
          triggerHaptic('light');
          paginate(1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentStep > 0) {
          triggerHaptic('light');
          paginate(-1);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleFinish();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isLast]);

  // Handle horizontal swipe drag release with momentum and elasticity
  const handleDragEnd = (_, info) => {
    setIsDragging(false);
    const { offset, velocity } = info;
    const swipeThreshold = 45;
    const velocityThreshold = 320;

    if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
      // Swiped Left -> Advance to next
      if (!isLast) {
        triggerHaptic('medium');
        paginate(1);
      } else {
        triggerHaptic('light');
      }
    } else if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
      // Swiped Right -> Go to previous
      if (!isFirst) {
        triggerHaptic('medium');
        paginate(-1);
      } else {
        triggerHaptic('light');
      }
    }
  };

  // Slide transition variants
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 360, damping: 30 },
        opacity: { duration: 0.22 },
        scale: { duration: 0.22 },
      },
    },
    exit: (dir) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
      scale: 0.96,
      transition: {
        x: { type: 'spring', stiffness: 360, damping: 30 },
        opacity: { duration: 0.18 },
        scale: { duration: 0.18 },
      },
    }),
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(250, 247, 245, 0.88)',
            backdropFilter: 'blur(36px)',
            WebkitBackdropFilter: 'blur(36px)',
            padding: 16,
            userSelect: 'none',
          }}
        >
          {/* Ambient Colorful Blobs */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <motion.div
              animate={{ scale: [1, 1.3, 1], x: [0, 80, 0], y: [0, -40, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: '-15%',
                right: '-10%',
                width: 500,
                height: 500,
                borderRadius: '50%',
                background: step.color + '18',
                filter: 'blur(100px)',
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], x: [0, -60, 0], y: [0, 60, 0] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                bottom: '-15%',
                left: '-10%',
                width: 500,
                height: 500,
                borderRadius: '50%',
                background: step.color + '12',
                filter: 'blur(100px)',
              }}
            />
          </div>

          <PerspectiveCard isDragging={isDragging}>
            {/* Draggable Tour Card with Physical Inertia and Rubber-Band Spring */}
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.28}
              onDragStart={() => {
                setIsDragging(true);
                setHasInteracted(true);
                triggerHaptic('light');
              }}
              onDragEnd={handleDragEnd}
              whileDrag={{ scale: 0.985 }}
              style={{
                x: dragX,
                rotate: dragRotate,
                scale: dragScale,
                background: '#FFFDFA',
                borderRadius: 36,
                overflow: 'hidden',
                boxShadow: isDragging
                  ? '0 50px 100px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.2)'
                  : '0 40px 80px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.12)',
                position: 'relative',
                touchAction: 'pan-y',
                cursor: isDragging ? 'grabbing' : 'grab',
                transition: 'box-shadow 0.2s ease',
              }}
            >
              {/* Top Accent Gradient Bar */}
              <div style={{ height: 6, background: step.gradient }} />

              {/* Physical Sheet Grab Handle Pill & Step Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 24px 0',
                }}
              >
                {/* Pull Handle Pill */}
                <div
                  style={{
                    width: 38,
                    height: 4,
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.12)',
                    margin: '0 auto',
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: 14,
                  }}
                />

                {/* Step Counter Badge */}
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: '#8A7B75',
                    background: 'rgba(0,0,0,0.04)',
                    padding: '4px 10px',
                    borderRadius: 999,
                  }}
                >
                  {currentStep + 1} of {steps.length}
                </span>

                {/* Quick Skip Button */}
                <button
                  type="button"
                  onClick={handleFinish}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#8A7B75',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 8,
                  }}
                >
                  Skip
                </button>
              </div>

              {/* Hero Emoji with Spring Bounce */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 32px 14px',
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ scale: 0.5, opacity: 0, rotate: direction > 0 ? 15 : -15 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: direction > 0 ? -15 : 15 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 26,
                      background: step.color + '12',
                      border: '2px solid ' + step.color + '30',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 48,
                      boxShadow: '0 16px 36px ' + step.color + '25',
                    }}
                  >
                    {step.emoji}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Step Content */}
              <div style={{ padding: '0 32px 34px', textAlign: 'center' }}>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <h2
                      style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontSize: '1.85rem',
                        fontWeight: 700,
                        color: '#2A1E1B',
                        letterSpacing: '-0.03em',
                        lineHeight: 1.15,
                        marginBottom: 10,
                      }}
                    >
                      {step.title}
                    </h2>
                    <p
                      style={{
                        fontSize: '0.96rem',
                        color: '#7F7069',
                        lineHeight: 1.6,
                        fontWeight: 500,
                        maxWidth: 350,
                        margin: '0 auto',
                      }}
                    >
                      {step.description}
                    </p>

                    {/* Interactive Order Gesture Sandbox on Orders slide */}
                    {step.hasInteractiveDemo && <OrderSwipePracticeWidget />}
                  </motion.div>
                </AnimatePresence>

                {/* Interactive Spring Dots Stepper */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: step.hasInteractiveDemo ? 18 : 28,
                    marginBottom: 24,
                  }}
                >
                  {steps.map((_, i) => (
                    <motion.button
                      key={i}
                      type="button"
                      aria-label={`Go to step ${i + 1}`}
                      onClick={() => {
                        triggerHaptic('light');
                        setHasInteracted(true);
                        setPage([i, i > currentStep ? 1 : -1]);
                      }}
                      animate={{
                        width: i === currentStep ? 30 : 8,
                        backgroundColor: i === currentStep ? step.color : '#E8DDD8',
                        boxShadow: i === currentStep ? `0px 2px 8px ${step.color}60` : '0px 0px 0px rgba(0,0,0,0)',
                      }}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      style={{
                        height: 8,
                        borderRadius: 4,
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>

                {/* Bottom Actions Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={currentStep > 0 ? handleBack : handleFinish}
                    style={{
                      height: 52,
                      padding: '0 20px',
                      borderRadius: 16,
                      background: 'transparent',
                      border: '1.5px solid #E8DDD8',
                      color: '#7F7069',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {currentStep > 0 && <ChevronLeft size={16} />}
                    {currentStep > 0 ? 'Back' : 'Skip Tour'}
                  </button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleNext}
                    style={{
                      height: 54,
                      padding: '0 28px',
                      borderRadius: 18,
                      background: step.gradient,
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      boxShadow: '0 12px 30px ' + step.color + '40',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {isLast ? 'Start Baking 🎂' : 'Continue'}
                    {!isLast && <ChevronRight size={18} />}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </PerspectiveCard>

          {/* Floating Gesture Affordance Pill (Guides user to swipe) */}
          <AnimatePresence>
            {!hasInteracted && currentStep === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 18,
                  padding: '9px 18px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.88)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  color: '#6A5A54',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                <motion.span
                  animate={{ x: [-3, 3, -3] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'inline-block' }}
                >
                  👈
                </motion.span>
                <span>Swipe card or use arrow keys</span>
                <motion.span
                  animate={{ x: [3, -3, 3] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'inline-block' }}
                >
                  👉
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
