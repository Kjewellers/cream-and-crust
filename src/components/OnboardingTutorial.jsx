import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, ShoppingBag, Package, Receipt, BarChart3, 
  ChevronRight, ChevronLeft, X, Sparkles, CheckCircle2,
  Zap, Heart, Star, Coffee
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const steps = [
  {
    title: "Welcome to Cream & Crust",
    description: "Experience the future of bakery management. Let's take a 60-second tour of your high-performance workspace.",
    icon: Sparkles,
    color: "#FF6B6B",
    bgGradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)",
    accent: "rgba(255, 107, 107, 0.2)"
  },
  {
    title: "Live Dashboard",
    description: "Monitor your business pulse in real-time. Track daily revenue, critical alerts, and delivery schedules from one command center.",
    icon: LayoutDashboard,
    color: "#4ECDC4",
    bgGradient: "linear-gradient(135deg, #4ECDC4 0%, #6EE7E7 100%)",
    accent: "rgba(78, 205, 196, 0.2)"
  },
  {
    title: "Smart Order Flow",
    description: "From inquiry to delivery, manage orders with ease. Automated WhatsApp sharing and Rapido booking built right in.",
    icon: ShoppingBag,
    color: "#45B7D1",
    bgGradient: "linear-gradient(135deg, #45B7D1 0%, #68D8F2 100%)",
    accent: "rgba(69, 183, 209, 0.2)"
  },
  {
    title: "Inventory Intelligence",
    description: "Master your stocks and recipes. Never run out of ingredients again with smart low-stock alerts and cost tracking.",
    icon: Package,
    color: "#A8E6CF",
    bgGradient: "linear-gradient(135deg, #A8E6CF 0%, #C8F2E2 100%)",
    accent: "rgba(168, 230, 207, 0.2)"
  },
  {
    title: "Precision Analytics",
    description: "Turn data into growth. Visualize your profit margins, popular products, and customer trends with beautiful charts.",
    icon: BarChart3,
    color: "#FF8B94",
    bgGradient: "linear-gradient(135deg, #FF8B94 0%, #FFA8AF 100%)",
    accent: "rgba(255, 139, 148, 0.2)"
  },
  {
    title: "Dopamine Rewards",
    description: "Management shouldn't be boring. Enjoy satisfying animations and streaks as you crush your daily bakery goals.",
    icon: Zap,
    color: "#FFD93D",
    bgGradient: "linear-gradient(135deg, #FFD93D 0%, #FFE66D 100%)",
    accent: "rgba(255, 217, 61, 0.2)"
  },
  {
    title: "You're All Set!",
    description: "Your digital bakery is now online. Join 100+ professional bakers scaling their business with Cream & Crust.",
    icon: CheckCircle2,
    color: "#6BCB77",
    bgGradient: "linear-gradient(135deg, #6BCB77 0%, #8FE396 100%)",
    accent: "rgba(107, 203, 119, 0.2)"
  }
];

const FloatingParticle = ({ color, delay }) => (
  <motion.div
    animate={{
      y: [0, -100, 0],
      x: [0, Math.random() * 50 - 25, 0],
      opacity: [0, 1, 0],
      scale: [0, 1.2, 0],
    }}
    transition={{
      duration: 3 + Math.random() * 2,
      repeat: Infinity,
      delay: delay,
      ease: "easeInOut"
    }}
    style={{
      position: 'absolute',
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: color,
      pointerEvents: 'none',
      zIndex: 0
    }}
  />
);

export default function OnboardingTutorial({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const { finishOnboarding, finishTour } = useAuth();
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate static particles positions
    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      delay: i * 0.4,
      left: `${Math.random() * 100}%`,
      bottom: `${Math.random() * 20}%`
    }));
    setParticles(newParticles);
  }, []);

  const handleFinish = async () => {
    console.log("Onboarding finishing...");
    setIsVisible(false);
    if (onComplete) {
      console.log("Calling onComplete prop");
      onComplete();
    }
    
    try {
      // Fire and forget the DB update if possible, or at least don't block the UI
      if (finishTour) {
        finishTour();
      } else if (finishOnboarding) {
        finishOnboarding();
      }
    } catch (e) {
      console.error("Onboarding background update error:", e);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = steps[currentStep];

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 3000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'rgba(20, 15, 12, 0.8)',
      backdropFilter: 'blur(12px)',
      pointerEvents: 'auto'
    }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 40 }}
        className="tutorial-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg)',
          borderRadius: '40px',
          padding: '40px',
          boxShadow: '0 30px 100px rgba(0,0,0,0.3)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'auto'
        }}
      >
        {/* Background Particles */}
        {particles.map(p => (
          <div key={p.id} style={{ position: 'absolute', left: p.left, bottom: p.bottom, zIndex: 0, pointerEvents: 'none' }}>
            <FloatingParticle color={step.color} delay={p.delay} />
          </div>
        ))}

        <button 
          onClick={() => {
            console.log("X button clicked");
            handleFinish();
          }}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'rgba(0,0,0,0.05)',
            border: 'none',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            pointerEvents: 'auto',
            color: 'var(--text2)',
            zIndex: 10,
            transition: 'all 0.2s'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Step Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '20px', 
                background: step.bgGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: `0 10px 20px ${step.color}30`
              }}>
                <step.icon size={30} />
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 style={{ 
                    fontSize: '2.2rem', 
                    fontWeight: 800, 
                    margin: 0, 
                    color: 'var(--text)',
                    letterSpacing: '-0.04em',
                    lineHeight: 1.1
                  }}>
                    {step.title}
                  </h2>
                  <p style={{ 
                    fontSize: '1.15rem', 
                    color: 'var(--text2)', 
                    marginTop: '12px',
                    lineHeight: 1.5,
                    fontWeight: 500
                  }}>
                    {step.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginTop: '10px',
            }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {steps.map((_, i) => (
                  <div 
                    key={i}
                    style={{
                      width: i === currentStep ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      background: i === currentStep ? step.color : 'rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Onboarding action button clicked, step:", currentStep);
                  if (currentStep === steps.length - 1) {
                    handleFinish();
                  } else {
                    handleNext();
                  }
                }}
                style={{ 
                  height: '56px',
                  padding: '0 32px', 
                  borderRadius: '18px',
                  background: step.bgGradient,
                  border: 'none',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: `0 10px 25px ${step.color}50`,
                  zIndex: 10
                }}
              >
                {currentStep === steps.length - 1 ? 'Start Now' : 'Next'}
                {currentStep < steps.length - 1 && <ChevronRight size={22} style={{ pointerEvents: 'none' }} />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Dynamic Background Accents */}
        <motion.div 
          animate={{ 
            scale: [1, 1.4, 1],
            rotate: [0, 180, 360],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '300px',
            height: '300px',
            borderRadius: '100px',
            background: step.color,
            filter: 'blur(80px)',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-150px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: step.color,
            filter: 'blur(100px)',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      </motion.div>
    </div>
  );
}
