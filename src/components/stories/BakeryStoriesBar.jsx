import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Globe,
  Package,
  X,
  ChevronRight,
  Share2,
  PhoneCall,
  Layers,
  Tag,
  MessageCircle,
} from 'lucide-react';
import { triggerHaptic, showToast } from '../iOS';
import { useNavigate } from 'react-router-dom';

const STORIES = [
  {
    id: 'tier-calculator',
    title: 'Tier Stack',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)',
    icon: Layers,
    badge: 'TOOL',
    unseen: true,
    slides: [
      {
        heading: '🎂 Multi-Tier Structural Calculator',
        subheading: 'Cake Engineering & Portions',
        content: 'Calculate exact portion counts, finished cake weights, base board dimensions, and internal dowel support for 2 to 5 tier celebration cakes.',
        cta: 'Launch Tier Calculator',
        action: 'cake-calculator',
      },
      {
        heading: '📐 Dessert vs Coffee Portions',
        subheading: 'Cutting & Portions Guide',
        content: 'Switch between generous 1" × 2" × 4" celebration dessert slices or 1" × 1" × 4" cocktail/finger portions with automatic dowel checklist.',
        cta: 'Open Tier Calculator',
        action: 'cake-calculator',
      },
    ],
  },
  {
    id: 'allergen-labels',
    title: 'FSSAI Labels',
    gradient: 'linear-gradient(135deg, #10B981 0%, #0D9488 100%)',
    icon: Tag,
    badge: 'FSSAI',
    unseen: true,
    slides: [
      {
        heading: '🏷️ FSSAI Food & Allergen Labels',
        subheading: 'Compliant Bakery Stickers',
        content: 'Auto-detect allergens live from ingredients, add manufacturing/expiry dates, FSSAI license number, and copy thermal ESC/POS or print stickers.',
        cta: 'Generate Food Label',
        action: 'allergen-label',
      },
      {
        heading: '🖨️ Thermal Roll Printer Ready',
        subheading: 'ESC/POS & 2" × 2" Stickers',
        content: 'One-click copy for Bluetooth thermal receipt & sticker printers, plus isolated browser printing for standard label sheets.',
        cta: 'Print Food Label',
        action: 'allergen-label',
      },
    ],
  },
  {
    id: 'instant-quote',
    title: 'Instant Quote',
    gradient: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
    icon: MessageCircle,
    badge: 'QUOTE',
    unseen: true,
    slides: [
      {
        heading: '💬 WhatsApp Instant Quote Builder',
        subheading: '30-Second Bespoke Cake Pricing',
        content: 'Generate itemized pricing proposals with finish, decor, add-ons, and 50% deposit breakdown. Share directly to WhatsApp with 1 tap.',
        cta: 'Create WhatsApp Quote',
        action: 'instant-quote',
      },
      {
        heading: '✨ Turn DMs into Confirmed Bookings',
        subheading: 'Professional Quotations',
        content: 'Includes your bakery branding, UPI ID, delivery schedule, and clear payment terms formatted beautifully with emojis.',
        cta: 'Build Instant Quote',
        action: 'instant-quote',
      },
    ],
  },
  {
    id: 'smart-analytics',
    title: 'Sales Insights',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    icon: Sparkles,
    badge: 'NEW',
    unseen: false,
    slides: [
      {
        heading: '📊 Sales & Margin Optimization',
        subheading: 'Recent order pattern highlights',
        content: 'Custom cake orders generate 65% of your profit! Promote 2-tier celebration cakes this weekend for higher margins.',
        cta: 'View Sales Analytics',
        link: '/analytics',
      },
      {
        heading: '💡 Recommended Pricing Adjustment',
        subheading: 'Based on ingredient cost trends',
        content: 'Review your recipe margins regularly. Track cost per portion to maintain healthy profit margins on high-volume bakes.',
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
    unseen: false,
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
        content: 'You have advanced recipe costing, automated WhatsApp receipts, exportable GST reports, and priority cloud sync.',
        cta: 'View Pro Benefits',
        link: '/subscribe',
      },
    ],
  },
];

export default function BakeryStoriesBar({ onOpenToolModal }) {
  const navigate = useNavigate();
  const [activeStory, setActiveStory] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [seenStories, setSeenStories] = useState(() => {
    try {
      const raw = localStorage.getItem('cc_seen_stories');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Complete background scroll locking (Instagram / Airbnb standard)
  useEffect(() => {
    if (!activeStory || typeof window === 'undefined') return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const origOverflow = document.body.style.overflow;
    const origDocOverflow = document.documentElement.style.overflow;
    const origPosition = document.body.style.position;
    const origTop = document.body.style.top;
    const origWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveStory(null);
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.documentElement.style.overflow = origDocOverflow;
      document.body.style.overflow = origOverflow;
      document.body.style.position = origPosition;
      document.body.style.top = origTop;
      document.body.style.width = origWidth;
      try {
        window.scrollTo(0, scrollY);
      } catch (_) {}
    };
  }, [activeStory, slideIndex]);

  const openStory = (story) => {
    triggerHaptic('light');
    setActiveStory(story);
    setSlideIndex(0);
    setSeenStories((prev) => {
      const next = new Set(prev);
      next.add(story.id);
      try {
        localStorage.setItem('cc_seen_stories', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const closeStory = () => {
    setActiveStory(null);
  };

  const nextSlide = () => {
    if (!activeStory) return;
    triggerHaptic('light');
    if (slideIndex < activeStory.slides.length - 1) {
      setSlideIndex((prev) => prev + 1);
    } else {
      closeStory();
    }
  };

  const prevSlide = () => {
    if (!activeStory) return;
    triggerHaptic('light');
    if (slideIndex > 0) {
      setSlideIndex((prev) => prev - 1);
    } else {
      closeStory();
    }
  };

  const handleCtaClick = () => {
    if (!activeStory) return;
    const slide = activeStory.slides[slideIndex];
    closeStory();

    if (slide.action) {
      triggerHaptic('success');
      if (typeof onOpenToolModal === 'function') {
        onOpenToolModal(slide.action);
      }
      window.dispatchEvent(
        new CustomEvent('open-tool-modal', { detail: { tool: slide.action } })
      );
    } else if (slide.link) {
      navigate(slide.link);
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
          const isSeen = seenStories.has(story.id);
          return (
            <motion.button
              key={story.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openStory(story)}
              aria-label={`Open story: ${story.title}`}
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
                touchAction: 'manipulation',
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
                  background: isSeen ? 'rgba(74, 59, 50, 0.16)' : story.gradient,
                  boxShadow: isSeen ? 'none' : '0 4px 14px rgba(0,0,0,0.12)',
                  transition: 'all 0.25s ease',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'var(--card, #ffffff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text, #1C1917)',
                  }}
                >
                  <Icon
                    size={24}
                    style={{
                      color: isSeen ? 'var(--text3, #8C7A6B)' : 'var(--accent, #B5606A)',
                      transition: 'color 0.2s ease',
                    }}
                  />
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
                      color: isSeen ? '#4B5563' : '#fff',
                      background: isSeen ? '#E5E7EB' : story.gradient,
                      padding: '1px 6px',
                      borderRadius: 99,
                      letterSpacing: '0.04em',
                      boxShadow: isSeen ? 'none' : '0 2px 6px rgba(0,0,0,0.2)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {story.badge}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: isSeen ? 600 : 800,
                  color: isSeen ? 'var(--text3, #6B7280)' : 'var(--text, #2D1B14)',
                  letterSpacing: '-0.01em',
                  transition: 'all 0.2s ease',
                }}
              >
                {story.title}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Full Screen Story Viewer Modal (Instagram / YouTube Stories style) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeStory && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={closeStory}
                role="dialog"
                aria-modal="true"
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 100000,
                  background: 'rgba(15, 12, 10, 0.94)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                  touchAction: 'none',
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <motion.div
                  initial={{ scale: 0.94, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.94, y: 15 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    maxWidth: 420,
                    height: '82vh',
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
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      padding: '16px 18px 8px',
                      zIndex: 10,
                    }}
                  >
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
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 18px 12px',
                      zIndex: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <activeStory.icon size={16} color="#000" />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>{activeStory.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeStory();
                      }}
                      aria-label="Close story"
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 34,
                        height: 34,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                      }}
                    >
                      <X size={18} strokeWidth={2.4} />
                    </button>
                  </div>

                  {/* Tap Left / Right Overlay for Story Navigation */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 5 }}>
                    <div
                      onClick={prevSlide}
                      style={{ flex: 1, height: '100%', cursor: 'pointer' }}
                      aria-label="Previous slide"
                    />
                    <div
                      onClick={nextSlide}
                      style={{ flex: 2, height: '100%', cursor: 'pointer' }}
                      aria-label="Next slide"
                    />
                  </div>

                  {/* Slide Content */}
                  <div
                    style={{
                      flex: 1,
                      padding: '24px 28px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      zIndex: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontWeight: 800,
                        opacity: 0.88,
                        marginBottom: 8,
                      }}
                    >
                      {activeStory.slides[slideIndex].subheading}
                    </div>
                    <h2
                      style={{
                        fontSize: 26,
                        fontWeight: 900,
                        lineHeight: 1.2,
                        margin: '0 0 16px',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {activeStory.slides[slideIndex].heading}
                    </h2>
                    <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.95, margin: 0 }}>
                      {activeStory.slides[slideIndex].content}
                    </p>
                  </div>

                  {/* Slide CTA Button */}
                  <div style={{ padding: '0 24px 28px', zIndex: 10 }}>
                    <button
                      type="button"
                      onClick={handleCtaClick}
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
                        touchAction: 'manipulation',
                      }}
                    >
                      <span>{activeStory.slides[slideIndex].cta}</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
