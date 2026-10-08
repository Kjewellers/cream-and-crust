import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShoppingBag, ShieldCheck, Globe, Package, X, ChevronRight, Share2, PhoneCall } from 'lucide-react';
import { triggerHaptic, showToast } from '../iOS';
import { useNavigate } from 'react-router-dom';

const STORIES = [
  {
    id: 'ai-insights',
    title: 'AI Co-Pilot',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    icon: Sparkles,
    badge: 'NEW',
    unseen: true,
    slides: [
      {
        heading: '🤖 Smart Sales Optimization',
        subheading: 'AI analyzed your recent order patterns',
        content: 'Custom cake orders generate 65% of your profit! Promote 2-tier celebration cakes this weekend for a 24% revenue surge.',
        cta: 'Open AI Assistant',
        link: '/ai-assistant',
      },
      {
        heading: '💡 Recommended Pricing Adjustment',
        subheading: 'Based on butter & flour price trends',
        content: 'Your Chocolate Truffle Cake margin has improved by 8%. Consider offering a 10% combo discount on 1kg orders to boost volume.',
        cta: 'View Recipe Costs',
        link: '/recipes',
      },
    ],
  },
  {
    id: 'live-menu',
    title: 'Digital Store',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    icon: Globe,
    badge: 'LIVE',
    unseen: true,
    slides: [
      {
        heading: '📱 Your Storefront is Live',
        subheading: 'Instant ordering link for WhatsApp & Instagram',
        content: 'Customers can view your full catalog, choose pickup/delivery dates, and pay via UPI directly from their phone.',
        cta: 'Manage Digital Menu',
        link: '/menu-builder',
      },
    ],
  },
  {
    id: 'bakes-today',
    title: 'Fresh Bakes',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    icon: ShoppingBag,
    badge: 'TODAY',
    unseen: false,
    slides: [
      {
        heading: '👨‍🍳 Today\'s Baking Schedule',
        subheading: 'Keep track of order deadlines',
        content: 'Track confirmed orders, kitchen prep lists, and delivery slots in real time to ensure zero missed orders.',
        cta: 'View Orders List',
        link: '/orders',
      },
    ],
  },
  {
    id: 'pro-status',
    title: 'Pro Atelier',
    gradient: 'linear-gradient(135deg, #D4A050 0%, #B8860B 100%)',
    icon: ShieldCheck,
    badge: 'PRO',
    unseen: false,
    slides: [
      {
        heading: '👑 Cream & Crust Pro Active',
        subheading: 'Unlocked full suite of bakery tools',
        content: 'You have unlimited AI recipe generation, automated WhatsApp receipts, exportable GST reports, and priority cloud sync.',
        cta: 'View Pro Benefits',
        link: '/subscribe',
      },
    ],
  },
];

export default function BakeryStoriesBar() {
  const navigate = useNavigate();
  const [activeStory, setActiveStory] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const openStory = (story) => {
    triggerHaptic('light');
    setActiveStory(story);
    setSlideIndex(0);
  };

  const closeStory = () => {
    setActiveStory(null);
  };

  const nextSlide = () => {
    if (!activeStory) return;
    if (slideIndex < activeStory.slides.length - 1) {
      setSlideIndex((prev) => prev + 1);
    } else {
      closeStory();
    }
  };

  const prevSlide = () => {
    if (!activeStory) return;
    if (slideIndex > 0) {
      setSlideIndex((prev) => prev - 1);
    } else {
      closeStory();
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* ── Story Bubbles Horizontal Carousel (Instagram / X style) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          overflowX: 'auto',
          padding: '4px 2px 8px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {STORIES.map((story) => {
          const Icon = story.icon;
          return (
            <motion.button
              key={story.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openStory(story)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              {/* Ring Container */}
              <div
                style={{
                  position: 'relative',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  padding: 3,
                  background: story.gradient,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'var(--card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text)',
                  }}
                >
                  <Icon size={24} style={{ color: 'var(--accent)' }} />
                </div>
                {story.badge && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 8.5,
                      fontWeight: 900,
                      color: '#fff',
                      background: story.gradient,
                      padding: '1px 6px',
                      borderRadius: 99,
                      letterSpacing: '0.04em',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}
                  >
                    {story.badge}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: 'var(--text)',
                  letterSpacing: '-0.01em',
                }}
              >
                {story.title}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Full Screen Story Viewer Modal (Instagram / YouTube Stories style) ── */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            onClick={closeStory}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 12, 10, 0.92)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 420,
                height: '80vh',
                maxHeight: 680,
                borderRadius: 28,
                background: activeStory.gradient,
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                color: '#fff',
              }}
            >
              {/* Progress Bar Segment Indicator */}
              <div style={{ display: 'flex', gap: 6, padding: '16px 18px 8px', zIndex: 10 }}>
                {activeStory.slides.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 99,
                      background: 'rgba(255,255,255,0.3)',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: idx < slideIndex ? '100%' : '0%' }}
                      animate={{ width: idx <= slideIndex ? '100%' : '0%' }}
                      transition={{ duration: 0.3 }}
                      style={{ height: '100%', background: '#fff' }}
                    />
                  </div>
                ))}
              </div>

              {/* Story Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px 12px', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <activeStory.icon size={16} color="#000" />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{activeStory.title}</span>
                </div>
                <button
                  onClick={closeStory}
                  style={{ background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tap Left / Right Overlay for Story Navigation */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 5 }}>
                <div onClick={prevSlide} style={{ flex: 1, height: '100%', cursor: 'pointer' }} />
                <div onClick={nextSlide} style={{ flex: 2, height: '100%', cursor: 'pointer' }} />
              </div>

              {/* Slide Content */}
              <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 8 }}>
                <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, opacity: 0.85, marginBottom: 8 }}>
                  {activeStory.slides[slideIndex].subheading}
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.2, margin: '0 0 16px' }}>
                  {activeStory.slides[slideIndex].heading}
                </h2>
                <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.95, margin: 0 }}>
                  {activeStory.slides[slideIndex].content}
                </p>
              </div>

              {/* Slide CTA Button */}
              <div style={{ padding: '0 24px 28px', zIndex: 10 }}>
                <button
                  onClick={() => {
                    const link = activeStory.slides[slideIndex].link;
                    closeStory();
                    if (link) navigate(link);
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: 16,
                    background: '#fff',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: 15,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  }}
                >
                  <span>{activeStory.slides[slideIndex].cta}</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
