import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  LayoutDashboard, ShoppingBag, Package, Receipt, BarChart3, 
  ChevronRight, ChevronLeft, X, Sparkles, CheckCircle2,
  Zap, Heart, Star, Coffee, Wand2, ShieldCheck,
  ArrowRight, MousePointer2, Smartphone, Monitor
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { triggerConfetti } from './DopamineKit';

const steps = [
  {
    id: 'welcome',
    title: "Welcome to Cream & Crust",
    description: "Your bakery's new high-performance engine. Let's take a quick tour of your workspace.",
    icon: Sparkles,
    color: "#6366F1",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=800",
    bgGradient: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
  },
  {
    id: 'dashboard',
    title: "Live Command Center",
    description: "Monitor your business pulse. Track daily revenue, delivery schedules, and critical alerts in real-time.",
    icon: LayoutDashboard,
    color: "#0EA5E9",
    image: "https://images.unsplash.com/photo-1551288049-bbdac8a28a80?auto=format&fit=crop&q=80&w=800",
    bgGradient: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)",
  },
  {
    id: 'orders',
    title: "Smart Order Flow",
    description: "Manage orders from inquiry to delivery. Automated WhatsApp sharing and Rapido booking built right in.",
    icon: ShoppingBag,
    color: "#F43F5E",
    image: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&q=80&w=800",
    bgGradient: "linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)",
  },
  {
    id: 'portfolio',
    title: "Portfolio Studio",
    description: "Create a stunning 24/7 digital storefront. Pick a theme, add products, and take orders while you sleep.",
    icon: Wand2,
    color: "#8B5CF6",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
    bgGradient: "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)",
  },
  {
    id: 'vault',
    title: "Secure Recipe Vault",
    description: "Your secret formulas, protected by biometric security. Access your recipes anywhere, safely.",
    icon: ShieldCheck,
    color: "#10B981",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800",
    bgGradient: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  },
  {
    id: 'inventory',
    title: "Inventory Mastery",
    description: "Never run out of flour again. Smart low-stock alerts and automatic ingredient cost tracking.",
    icon: Package,
    color: "#F59E0B",
    image: "https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?auto=format&fit=crop&q=80&w=800",
    bgGradient: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  },
  {
    id: 'analytics',
    title: "Growth Analytics",
    description: "Turn data into profit. Visualize margins and trends with beautiful, actionable charts.",
    icon: BarChart3,
    color: "#6366F1",
    image: "https://images.unsplash.com/photo-1551288049-bbdac8a28a80?auto=format&fit=crop&q=80&w=800",
    bgGradient: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
  },
  {
    id: 'ready',
    title: "You're All Set!",
    description: "Your digital bakery is now online. Join 100+ professional bakers scaling with Cream & Crust.",
    icon: CheckCircle2,
    color: "#10B981",
    image: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=800",
    bgGradient: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  }
];

const PerspectiveCard = ({ children, color }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [10, -10]), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-10, 10]), { stiffness: 100, damping: 30 });

  function handleMouseMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
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
        transformStyle: "preserve-3d",
      }}
      className="relative w-full max-w-xl"
    >
      {children}
    </motion.div>
  );
};

export default function PremiumAppTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const { finishTour } = useAuth();
  
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleFinish = async () => {
    triggerConfetti(window.innerWidth / 2, window.innerHeight / 2);
    setIsExiting(true);
    setTimeout(() => {
      if (finishTour) finishTour();
      if (onComplete) onComplete();
    }, 800);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(20px)',
            padding: 20
          }}
        >
          {/* Animated Background Shapes */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                x: [0, 100, 0]
              }}
              transition={{ duration: 20, repeat: Infinity }}
              style={{ position: 'absolute', top: '-10%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: `${step.color}15`, filter: 'blur(100px)' }} 
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, -90, 0],
                x: [0, -100, 0]
              }}
              transition={{ duration: 25, repeat: Infinity }}
              style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: `${step.color}10`, filter: 'blur(100px)' }} 
            />
          </div>

          <PerspectiveCard color={step.color}>
            <motion.div
              layoutId="tour-card"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 48,
                overflow: 'hidden',
                boxShadow: '0 50px 100px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                position: 'relative'
              }}
            >
              {/* Image Header */}
              <div style={{ height: 240, position: 'relative', overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={currentStep}
                    src={step.image} 
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.1, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </AnimatePresence>
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent, rgba(0,0,0,0.4))` }} />
                
                {/* Step Icon Overlay */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{ 
                    position: 'absolute', bottom: 24, left: 32, 
                    width: 64, height: 64, borderRadius: 20, 
                    background: 'white', color: step.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                  }}
                >
                  <step.icon size={32} />
                </motion.div>

                {/* Skip Button */}
                <button 
                  onClick={handleFinish}
                  style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(0,0,0,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, backdropFilter: 'blur(10px)', cursor: 'pointer' }}
                >
                  Skip Tour
                </button>
              </div>

              {/* Content Body */}
              <div style={{ padding: '40px 32px 32px' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 950, color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 16 }}>
                      {step.title}
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#64748B', lineHeight: 1.6, fontWeight: 500, marginBottom: 40 }}>
                      {step.description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Footer Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {steps.map((_, i) => (
                      <div 
                        key={i} 
                        style={{ 
                          width: i === currentStep ? 32 : 8, 
                          height: 8, 
                          borderRadius: 4, 
                          background: i === currentStep ? step.color : '#E2E8F0',
                          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }} 
                      />
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05, x: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNext}
                    style={{ 
                      height: 64, padding: '0 32px', borderRadius: 24, 
                      background: step.bgGradient, color: 'white', 
                      border: 'none', fontWeight: 800, fontSize: '1.1rem',
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer', boxShadow: `0 20px 40px ${step.color}30`
                    }}
                  >
                    {isLast ? 'Start Baking' : 'Continue'}
                    <ChevronRight size={22} />
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
