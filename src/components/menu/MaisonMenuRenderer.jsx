/**
 * @file MaisonMenuRenderer.jsx
 *
 * "Joie" — Bakerly-style joyful pâtisserie template.
 * Selected via `theme.template === 'maison'` (kept id for backwards
 * compatibility; visually a complete reset from the older Atelier
 * version into a Bakerly-inspired playful aesthetic).
 *
 * Aesthetic — inspired by bakerly.com:
 *   - sunny yellow + hot pink + sky blue + mint cream palette
 *   - oversized rounded sans-serif display + Italianno script accents
 *   - round product photos on flat-color circle backgrounds, gently
 *     rotated like stickers
 *   - sticker-style price tags + ingredient badges
 *   - decorative blobs, scribbles, squiggles & dots in the background
 *   - big bold pill-shaped CTAs in hot pink or sunny yellow
 *
 * Motion: gentle bounce-in reveals, a continuous marquee of joyful
 * one-liners along the top, sticker tags wiggle on hover, subtle
 * mouse-follow on the hero blob.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useInView,
} from 'framer-motion';
import {
  Instagram,
  MessageCircle,
  MapPin,
  Clock3,
  Sparkles,
  ChevronDown,
  Heart,
  Leaf,
  Award,
  Smile,
} from 'lucide-react';
import {
  mergeMenuSettings,
  normalizeMenuProducts,
  MENU_TEMPLATE_ASSETS,
} from '../../data/menuDefaults';
import useOrderFlow from './useOrderFlow';

// ─── Bakerly-inspired palette ───────────────────────────────────────

const C = {
  cream: '#FFFAEC', // page background
  butter: '#FFE373', // sunny yellow
  butterD: '#FFCB3F',
  pink: '#FF8FB8', // hot pink
  pinkD: '#E2588F',
  sky: '#9DC9EC', // sky blue
  skyD: '#5DA0D0',
  mint: '#B5E2C2', // mint cream
  mintD: '#7FCBA0',
  ink: '#2A1B14', // warm dark
  inkSoft: '#5C3F30',
  ash: '#9A7F6E',
};

// Cycle of accent colors used per product card / decorative shape
const ACCENT_CYCLE = [C.butter, C.pink, C.sky, C.mint];

const FONT_DISPLAY = '"Recoleta", "DM Serif Display", "Playfair Display", Georgia, serif';
const FONT_BODY = '"Plus Jakarta Sans", "Inter", system-ui, sans-serif';
const FONT_SCRIPT = '"Italianno", "Caveat", cursive';

// ─── Hooks ─────────────────────────────────────────────────────────

function useIsDesktop() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 720px)');
    const u = () => setV(mq.matches);
    u();
    mq.addEventListener?.('change', u);
    return () => mq.removeEventListener?.('change', u);
  }, []);
  return v;
}

function useReducedMotion() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const u = () => setV(mq.matches);
    u();
    mq.addEventListener?.('change', u);
    return () => mq.removeEventListener?.('change', u);
  }, []);
  return v;
}

// Deterministic pseudo-random angle / offset per product index, so each
// card "tilt" is stable across renders.
function tiltFor(idx) {
  const seed = ((idx + 1) * 9301 + 49297) % 233280;
  return (seed / 233280 - 0.5) * 6; // ±3°
}

// ─── Decorative scribbles & shapes (inline SVG, no asset deps) ─────

const Squiggle = ({ color = C.pink, width = 80, style }) => (
  <svg width={width} height="14" viewBox="0 0 80 14" fill="none" style={style} aria-hidden="true">
    <path
      d="M 2 7 Q 12 0 22 7 T 42 7 T 62 7 T 78 7"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const Dots = ({ color = C.sky, count = 5, style }) => (
  <div style={{ display: 'flex', gap: 6, ...style }} aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <span
        key={i}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
        }}
      />
    ))}
  </div>
);

const Star = ({ color = C.butter, size = 18, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} aria-hidden="true">
    <path d="M12 2 L14 9 L21 10 L16 15 L17 22 L12 18 L7 22 L8 15 L3 10 L10 9 Z" fill={color} />
  </svg>
);

const Blob = ({ color = C.butter, style, animate = true }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      animate={
        animate && !reduce
          ? {
              borderRadius: [
                '60% 40% 30% 70% / 60% 30% 70% 40%',
                '40% 60% 70% 30% / 30% 70% 30% 70%',
                '60% 40% 30% 70% / 60% 30% 70% 40%',
              ],
              scale: [1, 1.05, 1],
            }
          : {}
      }
      transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        background: color,
        position: 'absolute',
        ...style,
      }}
    />
  );
};

// ─── Marquee ribbon (joyful, runs along header) ────────────────────

function JoyfulMarquee({ items }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        padding: '12px 0',
        background: C.ink,
        color: C.cream,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 'clamp(20px, 4vw, 48px)',
          width: 'max-content',
          animation: 'cc-joie-marquee 40s linear infinite',
          fontFamily: FONT_BODY,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          alignItems: 'center',
        }}
      >
        {Array.from({ length: 2 }).map((_, copy) =>
          items.map((it, idx) => (
            <span
              key={`${copy}-${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 14,
                whiteSpace: 'nowrap',
              }}
            >
              <Star color={[C.butter, C.pink, C.sky, C.mint][idx % 4]} size={14} />
              {it}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────────

function JoyHeader({ data, onOrder, instagramHandle }) {
  return (
    <header
      style={{
        position: 'relative',
        zIndex: 5,
        padding: 'clamp(16px, 3vw, 28px) clamp(20px, 5vw, 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        background: 'transparent',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: FONT_DISPLAY,
          fontSize: 'clamp(22px, 3vw, 32px)',
          fontWeight: 700,
          color: C.ink,
          letterSpacing: '-0.01em',
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: C.pink,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          🥐
        </span>
        {data.bakeryName}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
      >
        {instagramHandle && (
          <button
            type="button"
            onClick={() =>
              window.open(
                `https://instagram.com/${instagramHandle}`,
                '_blank',
                'noopener,noreferrer'
              )
            }
            aria-label="Instagram"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: `2px solid ${C.ink}`,
              background: 'transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.ink,
            }}
          >
            <Instagram size={16} strokeWidth={2.4} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onOrder()}
          style={{
            background: C.pink,
            color: C.ink,
            border: `2px solid ${C.ink}`,
            padding: '11px 22px',
            fontFamily: FONT_BODY,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderRadius: 99,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: `4px 4px 0 ${C.ink}`,
          }}
        >
          Order Now
          <span style={{ fontSize: 14 }}>{'\u2192'}</span>
        </button>
      </motion.div>
    </header>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────

function JoyHero({ data, isDesktop, onOrder }) {
  const heroRef = useRef(null);
  const reduce = useReducedMotion();

  // Mouse-follow on the hero blob (desktop only)
  const blobX = useMotionValue(0);
  const blobY = useMotionValue(0);
  const sBlobX = useSpring(blobX, { stiffness: 60, damping: 16 });
  const sBlobY = useSpring(blobY, { stiffness: 60, damping: 16 });

  useEffect(() => {
    if (!isDesktop) return undefined;
    const onMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      blobX.set((e.clientX - cx) * 0.04);
      blobY.set((e.clientY - cy) * 0.04);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [isDesktop, blobX, blobY]);

  const heroImage = data.heroImage || MENU_TEMPLATE_ASSETS.luxuryHero;
  const tagline = (data.tagline || 'Baking happiness, by hand').replace(/\.+$/, '');

  return (
    <section
      ref={heroRef}
      style={{
        position: 'relative',
        padding: 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 56px) clamp(60px, 8vw, 120px)',
        overflow: 'hidden',
      }}
    >
      {/* Decorative blobs */}
      <motion.div
        style={{
          position: 'absolute',
          top: '8%',
          right: '-8%',
          width: 'clamp(280px, 36vw, 480px)',
          aspectRatio: '1',
          background: C.butter,
          opacity: 0.85,
          x: sBlobX,
          y: sBlobY,
          zIndex: 0,
        }}
        animate={
          reduce
            ? {}
            : {
                borderRadius: [
                  '60% 40% 30% 70% / 60% 30% 70% 40%',
                  '40% 60% 70% 30% / 30% 70% 30% 70%',
                  '60% 40% 30% 70% / 60% 30% 70% 40%',
                ],
              }
        }
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        animate={
          reduce
            ? {}
            : {
                borderRadius: [
                  '40% 60% 50% 50% / 50% 40% 60% 50%',
                  '60% 40% 30% 70% / 60% 30% 70% 40%',
                  '40% 60% 50% 50% / 50% 40% 60% 50%',
                ],
              }
        }
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: '4%',
          left: '-12%',
          width: 'clamp(240px, 30vw, 380px)',
          aspectRatio: '1',
          background: C.mint,
          opacity: 0.6,
          zIndex: 0,
        }}
      />

      {/* Floating decorative scribbles */}
      <Squiggle
        color={C.pink}
        width={70}
        style={{ position: 'absolute', top: '14%', left: '8%', zIndex: 1 }}
      />
      <Star
        color={C.pinkD}
        size={22}
        style={{ position: 'absolute', top: '60%', right: '6%', zIndex: 1 }}
      />
      <Dots color={C.skyD} style={{ position: 'absolute', top: '68%', left: '4%', zIndex: 1 }} />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'clamp(40px, 6vw, 80px)',
          alignItems: 'center',
        }}
        className="joie-hero-grid"
      >
        {/* Copy side */}
        <div style={{ position: 'relative' }}>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 99,
              background: C.ink,
              color: C.cream,
              fontFamily: FONT_BODY,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 22,
            }}
          >
            <Sparkles size={12} color={C.butter} /> Made with love & butter
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 'clamp(48px, 9vw, 120px)',
              fontWeight: 700,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              margin: 0,
              color: C.ink,
            }}
          >
            baking{' '}
            <span
              style={{
                fontFamily: FONT_SCRIPT,
                color: C.pink,
                fontWeight: 400,
                fontSize: '1.1em',
                fontStyle: 'normal',
                display: 'inline-block',
                transform: 'translateY(0.05em)',
              }}
            >
              happiness
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 'clamp(16px, 1.7vw, 19px)',
              color: C.inkSoft,
              margin: '20px 0 0',
              maxWidth: 500,
              lineHeight: 1.55,
            }}
          >
            {data.description ||
              'Real ingredients, no nonsense, and a whole lot of joie de vivre. Baked fresh in our atelier.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            style={{
              marginTop: 32,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <motion.button
              type="button"
              onClick={() => onOrder()}
              whileHover={{ y: -3 }}
              whileTap={{ y: 0 }}
              style={{
                background: C.pink,
                color: C.ink,
                border: `2.5px solid ${C.ink}`,
                padding: '17px 32px',
                fontFamily: FONT_BODY,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: `5px 5px 0 ${C.ink}`,
                transition: 'box-shadow 0.18s ease',
              }}
            >
              Shop the menu
              <span style={{ fontSize: 16 }}>{'\u2192'}</span>
            </motion.button>
            <a
              href="#story"
              style={{
                fontFamily: FONT_BODY,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: C.ink,
                textDecoration: 'underline',
                textDecorationThickness: 2,
                textUnderlineOffset: 6,
              }}
            >
              Our story
            </a>
          </motion.div>

          {/* Trust badges row */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.0 }}
            style={{
              marginTop: 36,
              display: 'flex',
              gap: 'clamp(16px, 3vw, 32px)',
              flexWrap: 'wrap',
            }}
          >
            {[
              { icon: Leaf, label: 'Real ingredients' },
              { icon: Heart, label: 'Made by hand' },
              { icon: Award, label: 'No preservatives' },
            ].map((b, i) => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: ACCENT_CYCLE[(i + 1) % ACCENT_CYCLE.length],
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: C.ink,
                  }}
                >
                  <b.icon size={15} strokeWidth={2.2} />
                </span>
                <span
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: C.ink,
                  }}
                >
                  {b.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Image / circle side */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1',
            maxWidth: 500,
            justifySelf: 'center',
          }}
        >
          {/* Background circle */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: C.butter,
              transform: 'rotate(-3deg)',
            }}
          />
          {/* Outer ring */}
          <div
            style={{
              position: 'absolute',
              inset: '-3%',
              borderRadius: '50%',
              border: `3px dashed ${C.ink}`,
              opacity: 0.18,
            }}
          />
          {/* Image */}
          <div
            style={{
              position: 'absolute',
              inset: '6%',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: `8px 12px 0 ${C.ink}`,
            }}
          >
            <img
              src={heroImage}
              alt={data.bakeryName}
              onError={(e) => {
                e.currentTarget.src = MENU_TEMPLATE_ASSETS.luxuryHero;
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'saturate(1.1) contrast(1.05)',
              }}
            />
          </div>

          {/* Floating sticker tag */}
          <motion.div
            animate={{ rotate: [-6, 6, -6] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: '-8%',
              right: '-8%',
              padding: '14px 18px',
              background: C.pink,
              color: C.ink,
              border: `2.5px solid ${C.ink}`,
              borderRadius: 99,
              fontFamily: FONT_BODY,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              boxShadow: `4px 4px 0 ${C.ink}`,
              transform: 'rotate(8deg)',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles
              size={14}
              style={{ marginRight: 4, verticalAlign: 'middle', color: C.butter }}
            />
            new this week
          </motion.div>

          {/* Floating italianno tag */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              bottom: '0%',
              left: '-10%',
              fontFamily: FONT_SCRIPT,
              fontSize: 'clamp(36px, 5vw, 56px)',
              color: C.ink,
              transform: 'rotate(-6deg)',
            }}
          >
            {tagline}
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        @media (min-width: 920px) {
          .joie-hero-grid {
            grid-template-columns: 1.05fr 0.95fr !important;
          }
        }
      `}</style>
    </section>
  );
}

// ─── Story ──────────────────────────────────────────────────────────

function StorySection({ data }) {
  return (
    <section
      id="story"
      style={{
        position: 'relative',
        padding: 'clamp(60px, 9vw, 120px) clamp(20px, 5vw, 56px)',
        background: C.cream,
        overflow: 'hidden',
      }}
    >
      <Star color={C.pink} size={26} style={{ position: 'absolute', top: '12%', right: '8%' }} />
      <Squiggle
        color={C.sky}
        width={90}
        style={{ position: 'absolute', bottom: '12%', left: '6%' }}
      />

      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'clamp(36px, 5vw, 72px)',
          alignItems: 'center',
        }}
        className="joie-story-grid"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.8 }}
        >
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: C.pink,
              marginBottom: 14,
            }}
          >
            The Atelier
          </div>
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 'clamp(36px, 5.5vw, 64px)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              margin: 0,
              color: C.ink,
            }}
          >
            Real ingredients,{' '}
            <span
              style={{
                fontFamily: FONT_SCRIPT,
                color: C.pink,
                fontWeight: 400,
                fontSize: '1.15em',
              }}
            >
              real
            </span>{' '}
            good.
          </h2>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 'clamp(15px, 1.6vw, 17px)',
              color: C.inkSoft,
              margin: '18px 0 0',
              lineHeight: 1.65,
              maxWidth: 460,
            }}
          >
            {data.tagline ? data.tagline + '. ' : ''}Every cake is made by hand at our atelier —
            slow proofs, real butter, nothing artificial. We bake what we&apos;d serve our family.
          </p>
          <ul
            style={{
              margin: '24px 0 0',
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontFamily: FONT_BODY,
              fontSize: 14,
              color: C.ink,
            }}
          >
            {[
              'No artificial preservatives',
              'Hand-piped, never machine-stamped',
              'Every order baked to order, never frozen',
            ].map((line, i) => (
              <li key={line} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: ACCENT_CYCLE[i % ACCENT_CYCLE.length],
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 12,
                    color: C.ink,
                    flexShrink: 0,
                  }}
                >
                  {'\u2713'}
                </span>
                {line}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Image collage */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.8 }}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1',
            maxWidth: 480,
            justifySelf: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: C.sky,
              borderRadius: 28,
              transform: 'rotate(-4deg)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '6%',
              borderRadius: 24,
              overflow: 'hidden',
              transform: 'rotate(2deg)',
              boxShadow: `8px 8px 0 ${C.ink}`,
              border: `3px solid ${C.ink}`,
            }}
          >
            <img
              src={data.heroImage || MENU_TEMPLATE_ASSETS.cheesecake}
              alt=""
              onError={(e) => {
                e.currentTarget.src = MENU_TEMPLATE_ASSETS.cheesecake;
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
          {/* Floating sticker badge */}
          <motion.div
            animate={{ rotate: [-8, 4, -8] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: '-6%',
              left: '-4%',
              padding: '12px 16px',
              background: C.butter,
              color: C.ink,
              border: `2.5px solid ${C.ink}`,
              borderRadius: 14,
              fontFamily: FONT_BODY,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              boxShadow: `4px 4px 0 ${C.ink}`,
              whiteSpace: 'nowrap',
            }}
          >
            Made today {'\u2728'}
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        @media (min-width: 800px) {
          .joie-story-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

// ─── Product circle card (round photo on coloured circle) ─────────

function ProductCircleCard({ product, idx, onOrder }) {
  const accent = ACCENT_CYCLE[idx % ACCENT_CYCLE.length];
  const tilt = tiltFor(idx);

  return (
    <motion.article
      initial={{ opacity: 0, y: 30, rotate: tilt - 4 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      viewport={{ once: true, margin: '-8%' }}
      transition={{ duration: 0.8, delay: (idx % 6) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, rotate: tilt * 0.4 }}
      onClick={() => onOrder(product)}
      style={{
        cursor: 'pointer',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1',
          maxWidth: 280,
          margin: '0 auto',
        }}
      >
        {/* Accent circle behind */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: accent,
          }}
        />
        {/* Product image */}
        <div
          style={{
            position: 'absolute',
            inset: '8%',
            borderRadius: '50%',
            overflow: 'hidden',
            border: `2.5px solid ${C.ink}`,
            boxShadow: `5px 5px 0 ${C.ink}`,
          }}
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = MENU_TEMPLATE_ASSETS.redVelvet;
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'saturate(1.05)',
            }}
          />
        </div>
        {/* Sticker price tag */}
        <motion.div
          whileHover={{ rotate: [tilt + 6, tilt - 6, tilt + 6] }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute',
            top: '-4%',
            right: '-4%',
            padding: '8px 14px',
            background: C.cream,
            color: C.ink,
            border: `2.5px solid ${C.ink}`,
            borderRadius: 99,
            fontFamily: FONT_DISPLAY,
            fontSize: 18,
            fontWeight: 700,
            boxShadow: `3px 3px 0 ${C.ink}`,
            transform: 'rotate(8deg)',
            whiteSpace: 'nowrap',
          }}
        >
          {'\u20B9'}
          {product.price}
        </motion.div>
        {/* Bestseller star */}
        {product.bestseller && (
          <div
            style={{
              position: 'absolute',
              bottom: '0%',
              left: '-6%',
              transform: 'rotate(-12deg)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 11px',
                background: C.ink,
                color: C.butter,
                borderRadius: 99,
                fontFamily: FONT_BODY,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                boxShadow: `2px 2px 0 ${C.butter}`,
              }}
            >
              <Star size={10} color={C.butter} /> Top pick
            </span>
          </div>
        )}
      </div>

      {/* Caption */}
      <div style={{ marginTop: 22, padding: '0 8px' }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: C.ash,
            marginBottom: 6,
          }}
        >
          {product.category}
        </div>
        <h3
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 'clamp(20px, 2.2vw, 26px)',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.015em',
            color: C.ink,
            margin: 0,
          }}
        >
          {product.name}
        </h3>
        {product.description && (
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: C.inkSoft,
              margin: '6px 0 0',
              lineHeight: 1.55,
            }}
          >
            {product.description}
          </p>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOrder(product);
          }}
          style={{
            marginTop: 14,
            padding: '9px 18px',
            background: C.cream,
            color: C.ink,
            border: `2px solid ${C.ink}`,
            borderRadius: 99,
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: `3px 3px 0 ${C.ink}`,
          }}
        >
          Add to order
          <span style={{ fontSize: 14 }}>{'\u2192'}</span>
        </button>
      </div>
    </motion.article>
  );
}

// ─── Menu grid ──────────────────────────────────────────────────────

function MenuGrid({ products, onOrder }) {
  if (!products.length) return null;
  return (
    <section
      id="menu"
      style={{
        position: 'relative',
        padding: 'clamp(60px, 9vw, 120px) clamp(20px, 5vw, 56px)',
        background: C.cream,
        overflow: 'hidden',
      }}
    >
      {/* Decorative shapes */}
      <Blob
        color={C.pink}
        animate={true}
        style={{ top: '8%', right: '-10%', width: 240, height: 240, opacity: 0.4 }}
      />
      <Blob
        color={C.sky}
        animate={true}
        style={{ bottom: '12%', left: '-8%', width: 200, height: 200, opacity: 0.4 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.7 }}
        style={{
          position: 'relative',
          textAlign: 'center',
          marginBottom: 'clamp(40px, 5vw, 60px)',
        }}
      >
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: C.pink,
            marginBottom: 12,
          }}
        >
          The Menu
        </div>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 'clamp(38px, 6vw, 72px)',
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: '-0.025em',
            margin: 0,
            color: C.ink,
          }}
        >
          shop the{' '}
          <span
            style={{ fontFamily: FONT_SCRIPT, color: C.pink, fontWeight: 400, fontSize: '1.15em' }}
          >
            sweetness
          </span>
        </h2>
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 16,
            color: C.inkSoft,
            margin: '14px auto 0',
            maxWidth: 480,
            lineHeight: 1.55,
          }}
        >
          Pick what makes you smile. Tap any cake to start your order.
        </p>
      </motion.div>

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 'clamp(30px, 4vw, 48px)',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        {products.map((product, idx) => (
          <ProductCircleCard key={product.id} product={product} idx={idx} onOrder={onOrder} />
        ))}
      </div>
    </section>
  );
}

// ─── Yellow CTA card ───────────────────────────────────────────────

function YellowCTACard({ data, onOrder }) {
  return (
    <section
      style={{
        padding: 'clamp(60px, 9vw, 120px) clamp(20px, 5vw, 56px)',
        background: C.cream,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -1 }}
        whileInView={{ opacity: 1, y: 0, rotate: -1.5 }}
        viewport={{ once: true, margin: '-15%' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          maxWidth: 1100,
          margin: '0 auto',
          padding: 'clamp(40px, 6vw, 70px) clamp(24px, 5vw, 56px)',
          background: C.butter,
          border: `3px solid ${C.ink}`,
          borderRadius: 32,
          boxShadow: `10px 10px 0 ${C.ink}`,
          overflow: 'hidden',
        }}
      >
        {/* Decorative corners */}
        <Star color={C.pink} size={28} style={{ position: 'absolute', top: 24, left: 24 }} />
        <Star color={C.sky} size={22} style={{ position: 'absolute', bottom: 24, right: 24 }} />
        <Squiggle color={C.pinkD} width={70} style={{ position: 'absolute', top: 30, right: 30 }} />

        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: C.ink,
              marginBottom: 14,
            }}
          >
            Reserve your cake
          </div>
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              margin: 0,
              color: C.ink,
            }}
          >
            ready to{' '}
            <span
              style={{
                fontFamily: FONT_SCRIPT,
                color: C.pinkD,
                fontWeight: 400,
                fontSize: '1.15em',
              }}
            >
              treat yourself
            </span>
            ?
          </h2>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 16,
              color: C.ink,
              margin: '14px auto 28px',
              maxWidth: 460,
              lineHeight: 1.55,
            }}
          >
            Send us a message on WhatsApp or order through our website. We bake to order, so reserve
            a day ahead for the best experience.
          </p>
          <motion.button
            type="button"
            onClick={() => onOrder()}
            whileHover={{ y: -3 }}
            whileTap={{ y: 0 }}
            style={{
              background: C.pink,
              color: C.ink,
              border: `2.5px solid ${C.ink}`,
              padding: '17px 36px',
              fontFamily: FONT_BODY,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              borderRadius: 99,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: `5px 5px 0 ${C.ink}`,
            }}
          >
            <MessageCircle size={16} /> Reserve a cake
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────

function JoyFooter({ data, instagramHandle, onOrder }) {
  return (
    <footer
      style={{
        position: 'relative',
        padding: 'clamp(50px, 7vw, 90px) clamp(20px, 5vw, 56px) 30px',
        background: C.ink,
        color: C.cream,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 36,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: FONT_DISPLAY,
              fontSize: 28,
              fontWeight: 700,
              color: C.cream,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: C.pink,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              🥐
            </span>
            {data.bakeryName}
          </div>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              color: C.cream,
              opacity: 0.7,
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 280,
            }}
          >
            {data.tagline || 'Baking happiness, by hand. Made fresh in our atelier.'}
          </p>
        </div>

        <div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: C.butter,
              marginBottom: 14,
            }}
          >
            Visit us
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.7, opacity: 0.85 }}>
            <p style={{ margin: 0, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Clock3 size={14} style={{ marginTop: 4, color: C.butter, flexShrink: 0 }} />
              <span>{data.timings}</span>
            </p>
            {(data.deliveryLocations || data.city) && (
              <p style={{ margin: '8px 0 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <MapPin size={14} style={{ marginTop: 4, color: C.butter, flexShrink: 0 }} />
                <span>{data.deliveryLocations || data.city}</span>
              </p>
            )}
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: C.butter,
              marginBottom: 14,
            }}
          >
            Get in touch
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => onOrder()}
              style={{
                background: C.pink,
                color: C.ink,
                border: `2.5px solid ${C.cream}`,
                padding: '12px 18px',
                fontFamily: FONT_BODY,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                alignSelf: 'flex-start',
                boxShadow: `4px 4px 0 ${C.cream}`,
              }}
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            {instagramHandle && (
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://instagram.com/${instagramHandle}`,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
                style={{
                  background: 'transparent',
                  color: C.cream,
                  border: `2.5px solid ${C.cream}`,
                  padding: '12px 18px',
                  fontFamily: FONT_BODY,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  borderRadius: 99,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  alignSelf: 'flex-start',
                }}
              >
                <Instagram size={14} /> @{instagramHandle}
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 50,
          paddingTop: 24,
          borderTop: `1px solid ${C.cream}22`,
          textAlign: 'center',
          fontFamily: FONT_BODY,
          fontSize: 12,
          color: C.cream,
          opacity: 0.5,
        }}
      >
        © {new Date().getFullYear()} {data.bakeryName}. Baked with love.
      </div>
    </footer>
  );
}

// ─── Main renderer ─────────────────────────────────────────────────

export default function MaisonMenuRenderer({ business, settings, products, preview = false }) {
  const data = mergeMenuSettings(business, settings);
  const productCards = normalizeMenuProducts(products);
  const allProducts = productCards.filter((p) => p.featured !== false);
  const isDesktop = useIsDesktop();
  const order = useOrderFlow({ business, data });
  const orderProduct = (product) => order.open(product || null);

  const instagramHandle = String(data.instagram || business?.instagram || '')
    .replace('@', '')
    .trim();

  return (
    <div
      style={{
        background: C.cream,
        color: C.ink,
        fontFamily: FONT_BODY,
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Italianno&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Caveat:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');
        @keyframes cc-joie-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-joie-anim] { animation: none !important; }
        }
      `}</style>

      <JoyfulMarquee
        items={[
          'Baked fresh today',
          'Made with real butter',
          'No artificial preservatives',
          'Hand-piped, every order',
          'Free local delivery on orders over ₹999',
          'New flavour: Pistachio Rose',
        ]}
      />

      <JoyHeader data={data} onOrder={orderProduct} instagramHandle={instagramHandle} />

      <JoyHero data={data} isDesktop={isDesktop} onOrder={orderProduct} />

      <StorySection data={data} />

      <MenuGrid products={allProducts} onOrder={orderProduct} />

      <YellowCTACard data={data} onOrder={orderProduct} />

      <JoyFooter data={data} instagramHandle={instagramHandle} onOrder={orderProduct} />

      {order.modals}
    </div>
  );
}
