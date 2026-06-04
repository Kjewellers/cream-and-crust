/**
 * @file GalleryMenuRenderer.jsx
 *
 * Pastel Gallery public-menu renderer. Selected via
 * `theme.template === 'gallery'`. Same prop contract as the default
 * MenuRenderer: { business, settings, products, preview }.
 *
 * Concept — museum exhibition:
 *   The bakery's menu is presented as a curated art exhibition.
 *   Cakes are "acquisitions". Categories are "wings". Categories carry
 *   numerals. Each piece has a museum plaque. Visitors are invited to
 *   leave a note. The footer is signed by the curator.
 *
 * Aesthetic — soft pastel, gallery white:
 *   - warm gallery-white background (#FAF8F4) with very subtle grain
 *   - pastel section washes (blush, butter, sage, mist) used sparingly
 *   - Fraunces variable serif for display, Inter for caps & body
 *   - tonal blocks behind hero piece (like pinned to wall)
 *   - thin pastel rules between sections
 *
 * Motion — deliberate, slow, cinematic:
 *   - Custom cursor (desktop only) — morphs into a circular "VIEW"
 *     label when hovering acquisitions
 *   - Mouse-tracked pastel spotlight glow that paints the wall
 *   - Scroll progress rail at the very top
 *   - Hero piece — 3D mouse-tilt with damped spring + floor reflection
 *   - Cards enter with a "falling leaf" cascade: drift down + rotate
 *     + de-blur, staggered
 *   - Once settled, cards continuously bob in place at slightly
 *     different phases (asynchronous breathing across the wall)
 *   - Plaque under each piece tilts and reveals "Acquire" CTA on hover
 *   - Magnetic CTAs — buttons soft-track the cursor when nearby
 *
 * No new dependencies. Fonts loaded inline.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { Instagram, MessageCircle, MapPin, Clock3 } from 'lucide-react';
import { mergeMenuSettings, normalizeMenuProducts, MENU_TEMPLATE_ASSETS } from '../../data/menuDefaults';
import useOrderFlow from './useOrderFlow';

// ─── Palette ────────────────────────────────────────────────────────

const PALETTE = {
  wall: '#FAF8F4',          // gallery wall (warm white)
  wallSoft: '#F2EEE8',      // tonal block behind hero
  ink: '#1F1B16',           // warm dark for text
  mute: '#8A847C',          // muted body
  hairline: '#E5E0D8',      // borders
  blush: '#F4DDD6',         // pastel pink wing
  butter: '#F4E9D2',        // pastel yellow wing
  sage: '#D9DFCE',          // pastel green wing
  mist: '#DDE0E5',          // pastel blue wing
  lilac: '#E2DAE8',         // pastel purple wing
  accent: '#B5606A',        // brand accent (used very sparingly)
  gold: '#B89968',          // accent gold for plaque numerals
};

// Pastel washes cycled per category wing.
const WING_WASHES = [PALETTE.blush, PALETTE.butter, PALETTE.sage, PALETTE.mist, PALETTE.lilac];

// ─── Hooks ──────────────────────────────────────────────────────────

/** Detect whether this browser supports a fine pointer (desktop). */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return isDesktop;
}

// ─── Custom cursor — gallery viewing experience ────────────────────

function GalleryCursor({ enabled }) {
  const cursorRef = useRef(null);
  const [mode, setMode] = useState('default'); // default | view | acquire

  useEffect(() => {
    if (!enabled) return undefined;
    const cur = cursorRef.current;
    if (!cur) return undefined;
    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;

    const onMove = (e) => { tx = e.clientX; ty = e.clientY; };
    const onOver = (e) => {
      const target = e.target?.closest?.('[data-cursor]');
      const next = target?.getAttribute('data-cursor') || 'default';
      setMode(next);
    };

    const tick = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      cur.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  const isLabelMode = mode === 'view' || mode === 'acquire';

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      {/* Inner dot */}
      <motion.div
        animate={{
          width: isLabelMode ? 80 : 8,
          height: isLabelMode ? 80 : 8,
          marginLeft: isLabelMode ? -40 : -4,
          marginTop: isLabelMode ? -40 : -4,
          backgroundColor: isLabelMode ? PALETTE.ink : PALETTE.ink,
          color: PALETTE.wall,
          opacity: isLabelMode ? 1 : 0.85,
          mixBlendMode: isLabelMode ? 'normal' : 'difference',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Inter", sans-serif',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          boxShadow: isLabelMode ? `0 12px 28px ${PALETTE.ink}33` : 'none',
        }}
      >
        {mode === 'view' && 'View'}
        {mode === 'acquire' && 'Acquire'}
      </motion.div>
    </div>
  );
}

// ─── Mouse-tracked pastel spotlight on the wall ───────────────────

function WallSpotlight({ enabled }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    let x = 0, y = 0, tx = 0, ty = 0;
    const onMove = (e) => { tx = e.clientX; ty = e.clientY; };
    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.transform = `translate3d(${x - 280}px, ${y - 280}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 560,
        height: 560,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${PALETTE.blush}55 0%, ${PALETTE.butter}30 30%, transparent 70%)`,
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(20px)',
        willChange: 'transform',
        mixBlendMode: 'multiply',
      }}
    />
  );
}

// ─── Scroll progress rail at top of page ──────────────────────────

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 28 });
  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 100,
        background: `linear-gradient(90deg, ${PALETTE.blush} 0%, ${PALETTE.butter} 35%, ${PALETTE.sage} 70%, ${PALETTE.mist} 100%)`,
        scaleX,
        transformOrigin: 'left',
        opacity: 0.85,
      }}
    />
  );
}

// ─── Tiny visual primitives ───────────────────────────────────────

const Eyebrow = ({ children, color = PALETTE.ink, opacity = 0.65 }) => (
  <div
    style={{
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.36em',
      textTransform: 'uppercase',
      color,
      opacity,
    }}
  >
    {children}
  </div>
);

function PastelRule({ width = 80, color = PALETTE.hairline }) {
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      whileInView={{ width, opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 1.0, ease: [0.25, 1, 0.5, 1] }}
      style={{
        height: 1,
        background: color,
        margin: '0 auto',
      }}
    />
  );
}

// ─── Magnetic CTA — desktop hover lifts button toward cursor ──────

function MagneticButton({ children, enabled, ...props }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 200, damping: 18, mass: 0.4 });

  useEffect(() => {
    if (!enabled) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      // strength scales with proximity, capped
      const max = 14;
      x.set(Math.max(-max, Math.min(max, dx * 0.25)));
      y.set(Math.max(-max, Math.min(max, dy * 0.25)));
    };
    const onLeave = () => {
      x.set(0);
      y.set(0);
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [enabled, x, y]);

  return (
    <motion.button
      ref={ref}
      type="button"
      style={{ x: sx, y: sy }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ─── Hero piece — 3D mouse tilt + floor reflection ────────────────

function GalleryHero({ data, onOrder, isDesktop }) {
  const heroRef = useRef(null);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const sX = useSpring(tiltX, { stiffness: 80, damping: 20 });
  const sY = useSpring(tiltY, { stiffness: 80, damping: 20 });

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroLift = useTransform(scrollYProgress, [0, 1], ['0%', '-8%']);

  useEffect(() => {
    if (!isDesktop) return undefined;
    const el = heroRef.current;
    if (!el) return undefined;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const px = (e.clientX - cx) / rect.width;
      const py = (e.clientY - cy) / rect.height;
      tiltX.set(py * -8); // rotateX
      tiltY.set(px * 8);  // rotateY
    };
    const onLeave = () => {
      tiltX.set(0);
      tiltY.set(0);
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [isDesktop, tiltX, tiltY]);

  const today = useMemo(() => {
    const d = new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]} \u2014 ${d.getFullYear()}`;
  }, []);

  const titleLines = (data.heroTitle || 'Sweet Moments,\nMade Special').split('\n');

  return (
    <section
      ref={heroRef}
      style={{
        position: 'relative',
        minHeight: 'min(100vh, 800px)',
        padding: 'clamp(24px, 4vw, 48px) clamp(20px, 6vw, 80px) 0',
        overflow: 'hidden',
      }}
    >
      {/* Top exhibition banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 'clamp(40px, 8vw, 96px)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: PALETTE.accent,
              boxShadow: `0 0 0 6px ${PALETTE.accent}22`,
            }}
          />
          <Eyebrow>Now Showing</Eyebrow>
        </div>
        <Eyebrow>Volume 04 {'\u00B7'} The Pastel Edition</Eyebrow>
        <Eyebrow>{today}</Eyebrow>
      </motion.div>

      {/* Asymmetric grid — title block / hero piece */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 'clamp(20px, 4vw, 48px)',
          alignItems: 'flex-end',
        }}
      >
        {/* Title block */}
        <motion.div
          style={{
            gridColumn: 'span 12',
            y: titleY,
            opacity: titleOpacity,
          }}
          className="hero-title-block"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{ marginBottom: 18 }}
          >
            <Eyebrow color={PALETTE.accent} opacity={0.85}>
              {data.bakeryName} {'\u00B7'} An Exhibition
            </Eyebrow>
          </motion.div>

          {titleLines.map((line, lineIdx) => (
            <div key={lineIdx} style={{ overflow: 'hidden', lineHeight: 0.94 }}>
              <motion.h1
                initial={{ y: '102%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1.0, delay: 0.2 + lineIdx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: '"Fraunces", "Cormorant Garamond", Georgia, serif',
                  fontSize: 'clamp(48px, 9vw, 132px)',
                  fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 1',
                  fontWeight: lineIdx % 2 === 1 ? 300 : 400,
                  fontStyle: lineIdx % 2 === 1 ? 'italic' : 'normal',
                  letterSpacing: '-0.025em',
                  lineHeight: 0.95,
                  margin: 0,
                  color: PALETTE.ink,
                }}
              >
                {line}
              </motion.h1>
            </div>
          ))}

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 'clamp(16px, 1.8vw, 21px)',
              color: PALETTE.mute,
              margin: '28px 0 0',
              maxWidth: 580,
              lineHeight: 1.55,
              fontVariationSettings: '"opsz" 14',
            }}
          >
            {data.description}
          </motion.p>
        </motion.div>
      </div>

      {/* Hero piece — pinned to wall, with 3D tilt + floor reflection */}
      <motion.div
        style={{
          position: 'relative',
          marginTop: 'clamp(48px, 8vw, 80px)',
          marginBottom: 60,
          display: 'flex',
          justifyContent: 'center',
          y: heroLift,
        }}
      >
        {/* Tonal block "hung on wall" */}
        <div
          style={{
            position: 'absolute',
            top: 'clamp(20px, 3vw, 32px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(74%, 760px)',
            height: 'clamp(280px, 38vw, 420px)',
            background: PALETTE.blush,
            opacity: 0.55,
            borderRadius: 4,
          }}
        />

        {/* The hero artwork itself */}
        <motion.div
          style={{
            position: 'relative',
            width: 'min(64%, 640px)',
            aspectRatio: '4 / 5',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 30px 60px -20px rgba(31,27,22,0.18), 0 8px 20px -8px rgba(31,27,22,0.10)',
            transformStyle: 'preserve-3d',
            transformPerspective: 1200,
            rotateX: sX,
            rotateY: sY,
          }}
        >
          <img
            src={data.heroImage || MENU_TEMPLATE_ASSETS.luxuryHero}
            alt=""
            onError={(e) => { e.currentTarget.src = MENU_TEMPLATE_ASSETS.luxuryHero; }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'saturate(0.92) contrast(1.03)',
            }}
          />

          {/* Plaque pinned to bottom-left of artwork */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.0 }}
            style={{
              position: 'absolute',
              bottom: 18,
              left: 18,
              right: 18,
              padding: '14px 18px',
              background: 'rgba(250, 248, 244, 0.92)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${PALETTE.hairline}`,
              borderRadius: 2,
            }}
          >
            <Eyebrow color={PALETTE.gold} opacity={1}>Featured Acquisition</Eyebrow>
            <div
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontSize: 'clamp(18px, 1.8vw, 22px)',
                fontWeight: 400,
                fontStyle: 'italic',
                color: PALETTE.ink,
                margin: '4px 0 0',
                letterSpacing: '-0.005em',
                fontVariationSettings: '"opsz" 18',
              }}
            >
              {data.tagline || 'House of cakes & quiet luxury'}
            </div>
          </motion.div>
        </motion.div>

        {/* Floor reflection */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%) scaleY(-1)',
            width: 'min(64%, 640px)',
            height: 'clamp(80px, 12vw, 120px)',
            backgroundImage: `url(${data.heroImage || MENU_TEMPLATE_ASSETS.luxuryHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            opacity: 0.18,
            filter: 'blur(2px)',
            maskImage: 'linear-gradient(to top, transparent 0%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 100%)',
            pointerEvents: 'none',
          }}
        />
      </motion.div>

      {/* CTA */}
      <div style={{ textAlign: 'center', marginTop: 'clamp(40px, 6vw, 80px)', marginBottom: 60 }}>
        <MagneticButton
          enabled={isDesktop}
          onClick={() => onOrder()}
          data-cursor="acquire"
          whileTap={{ scale: 0.97 }}
          style={{
            background: PALETTE.ink,
            color: PALETTE.wall,
            border: 'none',
            padding: '18px 42px',
            fontFamily: '"Inter", sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.36em',
            textTransform: 'uppercase',
            cursor: isDesktop ? 'none' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            borderRadius: 0,
          }}
        >
          Begin Your Tour <span style={{ fontSize: 14 }}>{'\u2192'}</span>
        </MagneticButton>
      </div>
    </section>
  );
}

// ─── Curator's note ───────────────────────────────────────────────

function CuratorsNote({ data }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.0 }}
      style={{
        padding: 'clamp(80px, 12vw, 140px) clamp(20px, 6vw, 80px)',
        maxWidth: 920,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <Eyebrow>From the Curator</Eyebrow>
      <div style={{ marginTop: 18, marginBottom: 28 }}>
        <PastelRule width={48} />
      </div>
      <p
        style={{
          fontFamily: '"Fraunces", Georgia, serif',
          fontSize: 'clamp(22px, 2.6vw, 32px)',
          lineHeight: 1.5,
          letterSpacing: '-0.01em',
          color: PALETTE.ink,
          margin: 0,
          fontVariationSettings: '"opsz" 24, "SOFT" 50',
          fontWeight: 400,
        }}
      >
        This season we held space for the small things {'\u2014'}{' '}
        <span style={{ fontStyle: 'italic', color: PALETTE.accent }}>
          a pinch of saffron, a softer crumb, a colour you noticed on a Tuesday morning.
        </span>{' '}
        Each piece on these walls began that way at {data.bakeryName}.
      </p>
      <div
        style={{
          marginTop: 40,
          fontFamily: '"Fraunces", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 16,
          color: PALETTE.mute,
        }}
      >
        {'\u2014'} The Atelier
      </div>
    </motion.section>
  );
}

// ─── Floor plan / table of contents ──────────────────────────────

function FloorPlan({ categories, onJump }) {
  if (!categories.length) return null;
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return (
    <section
      style={{
        padding: 'clamp(40px, 6vw, 80px) clamp(20px, 6vw, 80px) 80px',
        maxWidth: 1080,
        margin: '0 auto',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.8 }}
        style={{ textAlign: 'center', marginBottom: 36 }}
      >
        <Eyebrow>Floor Plan</Eyebrow>
        <h2
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontSize: 'clamp(34px, 5vw, 56px)',
            fontWeight: 400,
            margin: '14px 0 8px',
            letterSpacing: '-0.025em',
            color: PALETTE.ink,
            fontVariationSettings: '"opsz" 96',
          }}
        >
          The Wings
        </h2>
        <p
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 16,
            color: PALETTE.mute,
            margin: '0 auto',
            maxWidth: 480,
          }}
        >
          A guided walk through this season's collection.
        </p>
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '0 32px',
        }}
      >
        {categories.map((cat, idx) => {
          const wash = WING_WASHES[idx % WING_WASHES.length];
          return (
            <motion.button
              key={cat.id || cat.name}
              type="button"
              onClick={() => onJump(cat.name)}
              data-cursor="view"
              whileHover="hover"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.07, duration: 0.6 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '20px 4px',
                borderBottom: `1px solid ${PALETTE.hairline}`,
                background: 'transparent',
                border: 'none',
                borderBottomStyle: 'solid',
                borderBottomWidth: 1,
                borderBottomColor: PALETTE.hairline,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                position: 'relative',
              }}
            >
              {/* Wash chip */}
              <motion.span
                variants={{ hover: { scale: 1.15, rotate: 12 } }}
                transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                style={{
                  width: 28,
                  height: 28,
                  background: wash,
                  borderRadius: 4,
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 12,
                  color: PALETTE.ink,
                  fontWeight: 500,
                }}
              >
                {numerals[idx] || idx + 1}
              </motion.span>
              <span
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontSize: 'clamp(20px, 2.2vw, 26px)',
                  color: PALETTE.ink,
                  flex: 1,
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                  fontVariationSettings: '"opsz" 24',
                }}
              >
                {cat.name}
              </span>
              <motion.span
                variants={{ hover: { x: 4 } }}
                style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 11,
                  color: PALETTE.mute,
                  letterSpacing: '0.18em',
                }}
              >
                {'\u2192'}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Gallery card — falling leaf entrance, idle bob, plaque flip ─

function GalleryCard({ product, onOrder, idx, wash }) {
  const ref = useRef(null);
  // Deterministic small rotation per card for "hung slightly off true" feel
  const tilt = useMemo(() => {
    const seed = ((idx + 1) * 9301 + 49297) % 233280;
    return ((seed / 233280) - 0.5) * 2.4;
  }, [idx]);
  // Phase offset for asynchronous bobbing across the wall
  const bobDelay = (idx * 0.6) % 5;

  const variableSize = idx % 7 === 0 ? '4 / 5' : idx % 5 === 0 ? '5 / 6' : '1 / 1';

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: -36, rotate: tilt - 6, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: (idx % 6) * 0.08 }}
      whileHover="hover"
      data-cursor="view"
      style={{
        position: 'relative',
        breakInside: 'avoid',
        marginBottom: 'clamp(40px, 6vw, 64px)',
        cursor: 'pointer',
      }}
      onClick={() => onOrder(product)}
    >
      {/* Continuous gentle bob — wraps the whole piece */}
      <motion.div
        animate={{ y: [0, -6, 0, 4, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: bobDelay }}
        style={{ display: 'block' }}
      >
        {/* Hanging line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -22,
            left: '50%',
            width: 1,
            height: 22,
            background: PALETTE.hairline,
            transform: 'translateX(-50%)',
            zIndex: 0,
          }}
        />
        {/* Wall pin */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -26,
            left: '50%',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: PALETTE.ink,
            transform: 'translateX(-50%)',
            zIndex: 1,
          }}
        />

        {/* Wash chip behind image (subtle pinned-paper effect) */}
        <motion.div
          variants={{ hover: { rotate: tilt * 1.5, scale: 1.02 } }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            inset: -10,
            background: wash,
            opacity: 0.45,
            borderRadius: 2,
            zIndex: 0,
          }}
        />

        {/* Image frame */}
        <motion.div
          variants={{
            hover: {
              y: -6,
              boxShadow: '0 32px 56px -20px rgba(31,27,22,0.22), 0 12px 28px -10px rgba(31,27,22,0.16)',
            },
          }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            aspectRatio: variableSize,
            overflow: 'hidden',
            background: PALETTE.wallSoft,
            borderRadius: 2,
            boxShadow: '0 20px 38px -18px rgba(31,27,22,0.16), 0 4px 12px -4px rgba(31,27,22,0.06)',
          }}
        >
          <motion.img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={(e) => { e.currentTarget.src = MENU_TEMPLATE_ASSETS.redVelvet; }}
            variants={{ hover: { scale: 1.06 } }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'saturate(0.94) contrast(1.02)',
            }}
          />

          {product.bestseller && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: 'rgba(250,248,244,0.92)',
                color: PALETTE.ink,
                padding: '4px 10px',
                fontFamily: '"Inter", sans-serif',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                border: `1px solid ${PALETTE.gold}`,
              }}
            >
              {'\u2726'} Curator's Pick
            </div>
          )}
        </motion.div>

        {/* Plaque — museum caption */}
        <motion.div
          variants={{
            hover: {
              y: -2,
              borderColor: PALETTE.ink,
            },
          }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'relative',
            zIndex: 2,
            marginTop: 16,
            padding: '14px 16px',
            background: PALETTE.wall,
            border: `1px solid ${PALETTE.hairline}`,
            borderRadius: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 12,
                color: PALETTE.gold,
                fontVariationSettings: '"opsz" 14',
                fontWeight: 500,
              }}
            >
              No.&nbsp;{String(idx + 1).padStart(3, '0')}
            </span>
            <Eyebrow color={PALETTE.mute} opacity={1}>{product.category}</Eyebrow>
          </div>
          <h3
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: 'clamp(18px, 1.8vw, 22px)',
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
              color: PALETTE.ink,
              margin: '2px 0 6px',
              fontVariationSettings: '"opsz" 24',
            }}
          >
            {product.name}
          </h3>
          {product.description && (
            <p
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 13.5,
                color: PALETTE.mute,
                lineHeight: 1.55,
                margin: '0 0 10px',
                fontVariationSettings: '"opsz" 14',
              }}
            >
              {product.description}{product.weight ? ` \u00B7 ${product.weight}` : ''}
            </p>
          )}

          {/* Bottom row — price & acquire */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              paddingTop: 10,
              borderTop: `1px solid ${PALETTE.hairline}`,
              position: 'relative',
              overflow: 'hidden',
              minHeight: 22,
            }}
          >
            {/* Price — slides up off-screen on hover */}
            <motion.span
              variants={{ hover: { y: -28, opacity: 0 } }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontSize: 18,
                fontWeight: 400,
                color: PALETTE.ink,
                letterSpacing: '-0.01em',
                fontVariationSettings: '"opsz" 18',
              }}
            >
              {'\u20B9'}{product.price}
            </motion.span>
            {/* Acquire label — slides up into view on hover */}
            <motion.span
              initial={{ y: 28, opacity: 0 }}
              variants={{ hover: { y: -22, opacity: 1 } }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'absolute',
                left: 0,
                bottom: 10,
                fontFamily: '"Inter", sans-serif',
                fontSize: 10.5,
                fontWeight: 700,
                color: PALETTE.accent,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
              }}
            >
              {'\u2192'} Acquire This Piece
            </motion.span>
            <motion.span
              variants={{ hover: { x: 4 } }}
              style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: 11,
                color: PALETTE.mute,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              View
            </motion.span>
          </div>
        </motion.div>
      </motion.div>
    </motion.article>
  );
}

// ─── Featured wall — one large editorial card ─────────────────────

function FeaturedWall({ product, onOrder, isDesktop }) {
  if (!product) return null;
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 1.0 }}
      style={{
        padding: 'clamp(60px, 10vw, 120px) clamp(20px, 6vw, 80px)',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 'clamp(20px, 4vw, 56px)',
          alignItems: 'center',
        }}
        className="featured-grid"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          style={{
            gridColumn: 'span 12',
            order: 1,
          }}
          className="featured-image"
        >
          <div
            style={{
              position: 'relative',
              aspectRatio: '4 / 5',
              overflow: 'hidden',
              borderRadius: 2,
              boxShadow: '0 30px 60px -22px rgba(31,27,22,0.20)',
            }}
            data-cursor="view"
          >
            <img
              src={product.image}
              alt={product.name}
              onError={(e) => { e.currentTarget.src = MENU_TEMPLATE_ASSETS.redVelvet; }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'saturate(0.95)',
              }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.1 }}
          style={{ gridColumn: 'span 12', order: 2 }}
          className="featured-copy"
        >
          <Eyebrow color={PALETTE.gold} opacity={1}>Featured Piece</Eyebrow>
          <h3
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: 'clamp(34px, 5vw, 60px)',
              fontWeight: 400,
              margin: '14px 0 14px',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              color: PALETTE.ink,
              fontVariationSettings: '"opsz" 96',
            }}
          >
            {product.name}
          </h3>
          {product.description && (
            <p
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 'clamp(16px, 1.6vw, 19px)',
                color: PALETTE.mute,
                lineHeight: 1.65,
                margin: '0 0 24px',
                maxWidth: 520,
              }}
            >
              {product.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontSize: 26,
                fontWeight: 400,
                color: PALETTE.ink,
                letterSpacing: '-0.015em',
              }}
            >
              {'\u20B9'}{product.price}
            </span>
            <MagneticButton
              enabled={isDesktop}
              onClick={() => onOrder(product)}
              data-cursor="acquire"
              whileTap={{ scale: 0.97 }}
              style={{
                background: PALETTE.ink,
                color: PALETTE.wall,
                border: 'none',
                padding: '14px 28px',
                fontFamily: '"Inter", sans-serif',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                cursor: isDesktop ? 'none' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                borderRadius: 0,
              }}
            >
              Acquire {'\u2192'}
            </MagneticButton>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

// ─── Visitors' book — closing CTA ─────────────────────────────────

function VisitorsBook({ data, onOrder, isDesktop }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.0 }}
      style={{
        padding: 'clamp(80px, 12vw, 160px) clamp(20px, 6vw, 80px)',
        textAlign: 'center',
        background: `linear-gradient(180deg, ${PALETTE.wall} 0%, ${PALETTE.wallSoft} 100%)`,
        marginTop: 60,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative pastel circles */}
      <motion.div
        animate={{ y: [0, 10, 0], rotate: [0, 4, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '15%',
          left: '12%',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: PALETTE.blush,
          opacity: 0.5,
        }}
      />
      <motion.div
        animate={{ y: [0, -14, 0], rotate: [0, -3, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '14%',
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: PALETTE.sage,
          opacity: 0.55,
        }}
      />
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
        style={{
          position: 'absolute',
          top: '60%',
          left: '20%',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: PALETTE.butter,
          opacity: 0.6,
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <Eyebrow>Visitors' Book</Eyebrow>
        <h2
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(40px, 6.5vw, 76px)',
            fontWeight: 400,
            margin: '18px 0 14px',
            letterSpacing: '-0.02em',
            color: PALETTE.ink,
            fontVariationSettings: '"opsz" 144, "SOFT" 100',
          }}
        >
          Leave us a note.
        </h2>
        <p
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontSize: 'clamp(15px, 1.5vw, 18px)',
            color: PALETTE.mute,
            margin: '0 auto 36px',
            maxWidth: 540,
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}
        >
          Tell us which piece caught your eye. We'll meet you there.
        </p>
        <MagneticButton
          enabled={isDesktop}
          onClick={() => onOrder()}
          data-cursor="acquire"
          whileTap={{ scale: 0.97 }}
          style={{
            background: PALETTE.ink,
            color: PALETTE.wall,
            border: 'none',
            padding: '18px 42px',
            fontFamily: '"Inter", sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.36em',
            textTransform: 'uppercase',
            cursor: isDesktop ? 'none' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            borderRadius: 0,
          }}
        >
          <MessageCircle size={14} /> Sign the Book
        </MagneticButton>
      </div>
    </motion.section>
  );
}

// ─── Main renderer ───────────────────────────────────────────────

export default function GalleryMenuRenderer({ business, settings, products, preview = false }) {
  const data = mergeMenuSettings(business, settings);
  const productCards = normalizeMenuProducts(products);
  const visibleCategories = data.categories.filter((c) => c.visible !== false);
  const allProducts = productCards.filter((p) => p.featured !== false);

  const isDesktop = useIsDesktop();
  // Disable cursor + spotlight + magnetic in preview mode (would escape the iframe-y preview pane)
  const enableCursorEffects = isDesktop && !preview;

  const whatsappNumber = String(data.whatsapp || '').replace(/[^\d]/g, '');
  const instagram = String(data.instagram || '').replace('@', '');

  const order = useOrderFlow({ business, data });
  const orderProduct = (product) => order.open(product || null);

  const productsByCategory = useMemo(() => {
    const groups = new Map();
    visibleCategories.forEach((c) => groups.set(c.name, []));
    allProducts.forEach((p) => {
      const key = p.category && groups.has(p.category) ? p.category : (visibleCategories[0]?.name || 'Featured');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });
    return groups;
  }, [allProducts, visibleCategories]);

  const featured = useMemo(() => {
    const best = allProducts.find((p) => p.bestseller);
    return best || allProducts[0] || null;
  }, [allProducts]);

  const jumpToCategory = (name) => {
    const el = document.getElementById(`gallery-cat-${name.replace(/\s+/g, '-').toLowerCase()}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  return (
    <div
      style={{
        background:
          'url("data:image/svg+xml;utf8,' +
          encodeURIComponent(
            '<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'140\' height=\'140\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.95\' numOctaves=\'2\' stitchTiles=\'stitch\'/><feColorMatrix values=\'0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.10  0 0 0 0.018 0\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\'/></svg>'
          ) +
          '") repeat, ' +
          PALETTE.wall,
        color: PALETTE.ink,
        fontFamily: '"Inter", system-ui, sans-serif',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        cursor: enableCursorEffects ? 'none' : 'auto',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..700,30..100,0..1;1,9..144,300..700,30..100,0..1&family=Inter:wght@400;500;600;700&display=swap');

        .gallery-wall {
          column-count: 1;
          column-gap: 32px;
        }
        @media (min-width: 720px) {
          .gallery-wall { column-count: 2; column-gap: 36px; }
        }
        @media (min-width: 1100px) {
          .gallery-wall { column-count: 3; column-gap: 44px; }
        }
        @media (min-width: 1500px) {
          .gallery-wall { column-count: 4; column-gap: 48px; }
        }

        @media (min-width: 760px) {
          .featured-grid .featured-image { grid-column: span 6 !important; }
          .featured-grid .featured-copy { grid-column: span 6 !important; }
        }

        .gallery-wall a, .gallery-wall button { cursor: ${enableCursorEffects ? 'none' : 'pointer'}; }
      `}</style>

      <ScrollProgress />
      <WallSpotlight enabled={enableCursorEffects} />
      <GalleryCursor enabled={enableCursorEffects} />

      <GalleryHero data={data} onOrder={orderProduct} isDesktop={isDesktop} />

      <CuratorsNote data={data} />

      <FloorPlan categories={visibleCategories} onJump={jumpToCategory} />

      {/* ── Wings (categories) ─────────────────────────────── */}
      {Array.from(productsByCategory.entries()).map(([catName, list], catIdx) => {
        if (!list.length) return null;
        const wash = WING_WASHES[catIdx % WING_WASHES.length];
        return (
          <section
            key={catName}
            id={`gallery-cat-${catName.replace(/\s+/g, '-').toLowerCase()}`}
            style={{
              padding: 'clamp(40px, 6vw, 90px) clamp(20px, 6vw, 80px)',
              maxWidth: 1480,
              margin: '0 auto',
              position: 'relative',
            }}
          >
            {/* Wing eyebrow with wash chip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.9 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 36,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  background: wash,
                  borderRadius: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 14,
                  fontWeight: 500,
                  color: PALETTE.ink,
                }}
              >
                {numerals[catIdx] || catIdx + 1}
              </span>
              <Eyebrow>Wing {numerals[catIdx] || catIdx + 1}</Eyebrow>
              <div style={{ flex: 1, height: 1, background: PALETTE.hairline, minWidth: 24 }} />
              <h2
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontSize: 'clamp(28px, 4.5vw, 52px)',
                  fontWeight: 400,
                  margin: 0,
                  letterSpacing: '-0.025em',
                  color: PALETTE.ink,
                  lineHeight: 1.05,
                  fontVariationSettings: '"opsz" 96',
                }}
              >
                {catName}
              </h2>
            </motion.div>

            {/* Asymmetric wall layout via CSS columns */}
            <div className="gallery-wall">
              {list.map((product, idx) => (
                <GalleryCard
                  key={product.id}
                  product={product}
                  onOrder={orderProduct}
                  idx={idx}
                  wash={wash}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* ── Featured wall (single editorial piece) ──────────── */}
      {featured && (
        <FeaturedWall product={featured} onOrder={orderProduct} isDesktop={isDesktop} />
      )}

      {/* ── Visitors' book CTA ────────────────────────────── */}
      <VisitorsBook data={data} onOrder={orderProduct} isDesktop={isDesktop} />

      {/* ── Footer ───────────────────────────────────────── */}
      <footer
        style={{
          padding: 'clamp(60px, 8vw, 100px) clamp(20px, 6vw, 80px) 50px',
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 40,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Eyebrow>The Gallery</Eyebrow>
          <h3
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: 28,
              fontWeight: 400,
              margin: '12px 0 8px',
              letterSpacing: '-0.015em',
              color: PALETTE.ink,
              fontVariationSettings: '"opsz" 96',
            }}
          >
            {data.bakeryName}
          </h3>
          <p
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14.5,
              color: PALETTE.mute,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {data.tagline || 'A small gallery of cakes.'}
          </p>
        </div>

        <div>
          <Eyebrow>Open Hours</Eyebrow>
          <div
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: 15,
              color: PALETTE.ink,
              marginTop: 12,
              lineHeight: 1.7,
            }}
          >
            <p style={{ margin: 0, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Clock3 size={14} style={{ marginTop: 4, color: PALETTE.gold, flexShrink: 0 }} />
              <span>{data.timings}</span>
            </p>
            {(data.deliveryLocations || data.city) && (
              <p style={{ margin: '8px 0 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <MapPin size={14} style={{ marginTop: 4, color: PALETTE.gold, flexShrink: 0 }} />
                <span>{data.deliveryLocations || data.city}</span>
              </p>
            )}
          </div>
        </div>

        <div>
          <Eyebrow>Correspondence</Eyebrow>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {whatsappNumber && (
              <button
                type="button"
                onClick={() => orderProduct()}
                data-cursor="acquire"
                style={{
                  background: 'transparent',
                  border: `1px solid ${PALETTE.ink}`,
                  color: PALETTE.ink,
                  padding: '10px 16px',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  cursor: enableCursorEffects ? 'none' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  alignSelf: 'flex-start',
                  borderRadius: 0,
                }}
              >
                <MessageCircle size={13} /> WhatsApp
              </button>
            )}
            {instagram && (
              <button
                type="button"
                onClick={() => window.open(`https://instagram.com/${instagram}`, '_blank')}
                data-cursor="view"
                style={{
                  background: 'transparent',
                  border: `1px solid ${PALETTE.ink}`,
                  color: PALETTE.ink,
                  padding: '10px 16px',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  cursor: enableCursorEffects ? 'none' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  alignSelf: 'flex-start',
                  borderRadius: 0,
                }}
              >
                <Instagram size={13} /> @{instagram}
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Curator's signature */}
      <div
        style={{
          textAlign: 'center',
          padding: '20px 0 60px',
          fontFamily: '"Fraunces", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 13,
          color: PALETTE.mute,
          letterSpacing: '0.005em',
        }}
      >
        Curated with care at {data.bakeryName} {'\u00B7'} {new Date().getFullYear()}
      </div>
      {order.modals}
    </div>
  );
}
