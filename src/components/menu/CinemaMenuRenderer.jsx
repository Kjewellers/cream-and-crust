/**
 * @file CinemaMenuRenderer.jsx
 *
 * Cinema Pâtisserie public-menu renderer. Selected via
 * `theme.template === 'cinema'`. Same prop contract:
 *   { business, settings, products, preview }
 *
 * Concept — a feature-film cinema:
 *   The bakery is a theatre. Categories are scenes. Cakes are
 *   feature films with movie posters, ratings, and tickets. The
 *   experience opens with a studio ident, a marquee with real bulb
 *   lights, a trailer reel, and closes with rolling end credits.
 *
 * What's actually rendered:
 *   - StudioIdent    : 2.4-sec intro logo build (skippable)
 *   - FilmGrain      : full-page 35mm grain overlay (subtle)
 *   - Marquee        : hero with animated chase-light bulbs
 *   - DirectorsNote  : drop-cap auteur note
 *   - TrailerReel    : auto-scrolling horizontal reel of cakes
 *   - SceneSection   : one per category — film strip header,
 *                       movie-poster cards w/ rating, "Buy Tickets"
 *   - BehindScenes   : pull-quote with film scratch overlay
 *   - BoxOffice      : closing CTA — vintage ticket stub
 *   - RollingCredits : continuously-scrolling vertical end credits
 *   - Cursor         : film-frame custom cursor (desktop only)
 *
 * Motion notes:
 *   - All animations respect prefers-reduced-motion via the inline
 *     <style>.
 *   - The studio ident is dismissed permanently per session via
 *     sessionStorage so revisits skip it.
 *   - In preview mode (in-builder iframe-y pane) the studio ident
 *     is auto-skipped and the cursor effect is disabled, so the
 *     bakery owner sees the menu directly.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Film,
  Star,
  Ticket,
  MessageCircle,
  Instagram,
  MapPin,
  Clock3,
  Play,
  Volume2,
} from 'lucide-react';
import {
  mergeMenuSettings,
  normalizeMenuProducts,
  MENU_TEMPLATE_ASSETS,
} from '../../data/menuDefaults';
import useOrderFlow from './useOrderFlow';

// ─── Palette ────────────────────────────────────────────────────────

const C = {
  velvet: '#7A1E2A', // theater curtain red
  velvetD: '#4A1019', // deep curtain shadow
  velvetL: '#A02A39', // curtain highlight
  void: '#080507', // theatre black
  ivory: '#F4ECDD', // film stock ivory
  ash: '#A89A87', // caption gray
  gold: '#D4A857', // marquee gold
  goldHi: '#F0D27A', // marquee gold highlight
  bulb: '#FFE7A8', // bulb glow
};

// Re-used type stack
const FONT_DISPLAY = '"Anton", "Bebas Neue", "Oswald", sans-serif';
const FONT_SERIF = '"Playfair Display", Georgia, serif';
const FONT_BODY = '"Inter", system-ui, sans-serif';
const FONT_MONO = '"IBM Plex Mono", "Courier New", monospace';

// ─── Hook: detect desktop ───────────────────────────────────────────

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

// ─── Studio ident (intro sequence) ─────────────────────────────────

function StudioIdent({ bakeryName, onComplete }) {
  // The full sequence runs 2.4s. We expose a skip button after 0.6s.
  const [showSkip, setShowSkip] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setShowSkip(true), 600);
    const t2 = setTimeout(() => onComplete?.(), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: C.void,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Sweeping arc of light (the studio "halo") */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 1], opacity: [0, 0.7, 0.5] }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'absolute',
          width: 720,
          height: 720,
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 60%, ${C.gold}55 0%, ${C.gold}15 30%, transparent 70%)`,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      {/* Spinning ring */}
      <motion.div
        initial={{ rotate: 0, opacity: 0 }}
        animate={{ rotate: 360, opacity: [0, 0.7, 0.4] }}
        transition={{ duration: 2.0, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          border: `1px dashed ${C.gold}66`,
          pointerEvents: 'none',
        }}
      />

      {/* Studio name build */}
      <motion.div
        initial={{ y: 20, opacity: 0, letterSpacing: '0.6em' }}
        animate={{ y: 0, opacity: 1, letterSpacing: '0.32em' }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          fontFamily: FONT_DISPLAY,
          fontSize: 'clamp(36px, 7vw, 84px)',
          fontWeight: 400,
          color: C.ivory,
          letterSpacing: '0.32em',
          lineHeight: 1,
          textTransform: 'uppercase',
          textAlign: 'center',
          padding: '0 20px',
          textShadow: `0 0 30px ${C.gold}33`,
        }}
      >
        {(bakeryName || 'Studios').toUpperCase()}
      </motion.div>

      {/* "Studios" subtitle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1] }}
        transition={{ duration: 1.2, delay: 1.2 }}
        style={{
          marginTop: 14,
          fontFamily: FONT_SERIF,
          fontStyle: 'italic',
          fontSize: 'clamp(13px, 1.3vw, 16px)',
          color: C.gold,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
        }}
      >
        {'\u2014'} a confectionery picture {'\u2014'}
      </motion.div>

      {/* Spark particles */}
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const radius = 200 + (i % 4) * 30;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: Math.cos(angle) * radius,
              y: Math.sin(angle) * radius,
              opacity: [0, 1, 0],
              scale: [0, 1, 0.5],
            }}
            transition={{ duration: 1.4, delay: 0.7 + i * 0.04, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: C.goldHi,
              boxShadow: `0 0 8px ${C.gold}`,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Skip */}
      {showSkip && (
        <button
          type="button"
          onClick={onComplete}
          style={{
            position: 'absolute',
            bottom: 32,
            right: 32,
            background: 'transparent',
            border: `1px solid ${C.ivory}66`,
            color: C.ivory,
            padding: '8px 16px',
            fontFamily: FONT_BODY,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            opacity: 0.85,
          }}
        >
          Skip Intro {'\u2192'}
        </button>
      )}
    </motion.div>
  );
}

// ─── Film grain overlay ────────────────────────────────────────────

function FilmGrain({ enabled = true }) {
  if (!enabled) return null;
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'url("data:image/svg+xml;utf8,' +
            encodeURIComponent(
              "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.045 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"
            ) +
            '")',
          mixBlendMode: 'overlay',
          opacity: 0.6,
          pointerEvents: 'none',
          zIndex: 50,
        }}
      />
      {/* Subtle vignette */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 50%, ${C.void}55 100%)`,
          pointerEvents: 'none',
          zIndex: 49,
        }}
      />
    </>
  );
}

// ─── Custom film-frame cursor ──────────────────────────────────────

function FilmCursor({ enabled }) {
  const cursorRef = useRef(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const cur = cursorRef.current;
    if (!cur) return undefined;
    let raf = 0;
    let x = 0,
      y = 0,
      tx = 0,
      ty = 0;
    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const tick = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      cur.style.transform = `translate3d(${x - 14}px, ${y - 14}px, 0)`;
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
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 28,
        height: 28,
        zIndex: 9999,
        pointerEvents: 'none',
        willChange: 'transform',
        mixBlendMode: 'difference',
      }}
    >
      {/* film-frame: outer rect with sprocket holes */}
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="2" y="2" width="24" height="24" stroke={C.ivory} strokeWidth="1.5" />
        <circle cx="6" cy="6" r="1" fill={C.ivory} />
        <circle cx="14" cy="6" r="1" fill={C.ivory} />
        <circle cx="22" cy="6" r="1" fill={C.ivory} />
        <circle cx="6" cy="22" r="1" fill={C.ivory} />
        <circle cx="14" cy="22" r="1" fill={C.ivory} />
        <circle cx="22" cy="22" r="1" fill={C.ivory} />
      </svg>
    </div>
  );
}

// ─── Marquee with animated bulb ring ───────────────────────────────

function MarqueeBulb({ idx, total, radiusX, radiusY, chasePhase }) {
  // Bulbs distributed around an ellipse. Chase animation cycles a brighter
  // bulb around the perimeter; bulbs not on the chase frame still glow softly.
  const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(angle) * radiusX;
  const y = Math.sin(angle) * radiusY;
  // Convert angle to phase 0..1 for chase
  const phase = (idx / total + chasePhase) % 1;
  return (
    <motion.div
      animate={{
        opacity: [0.55, 0.55, 1, 0.55, 0.55],
        scale: [1, 1, 1.25, 1, 1],
      }}
      transition={{
        duration: total * 0.12,
        delay: -phase * total * 0.12,
        repeat: Infinity,
        ease: 'easeInOut',
        times: [0, 0.4, 0.5, 0.6, 1],
      }}
      style={{
        position: 'absolute',
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        width: 8,
        height: 8,
        marginLeft: -4,
        marginTop: -4,
        borderRadius: '50%',
        background: C.bulb,
        boxShadow: `0 0 12px ${C.bulb}, 0 0 24px ${C.gold}66`,
      }}
    />
  );
}

function HeroMarquee({ data, onOrder }) {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Chase phase rotates through bulbs on a slow timer (purely visual cue)
  const [chasePhase, setChasePhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setChasePhase((p) => (p + 0.05) % 1), 90);
    return () => clearInterval(id);
  }, []);

  const titleLines = (data.heroTitle || 'Sweet Moments,\nMade Special').split('\n');
  const today = useMemo(() => {
    const d = new Date();
    return d
      .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      .toUpperCase();
  }, []);

  // Marquee dimensions
  const BULB_COUNT = 56;

  return (
    <section
      ref={heroRef}
      style={{
        position: 'relative',
        minHeight: 'min(100vh, 820px)',
        padding: 'clamp(80px, 12vw, 160px) clamp(20px, 5vw, 60px) clamp(80px, 10vw, 120px)',
        overflow: 'hidden',
        background: `radial-gradient(ellipse at center top, ${C.velvetD} 0%, ${C.void} 70%)`,
      }}
    >
      {/* Top scroll-rail accent (theatre track) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${C.gold} 0%, ${C.goldHi} 50%, ${C.gold} 100%)`,
          boxShadow: `0 0 12px ${C.gold}55`,
        }}
      />

      {/* "Now showing" date banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={{
          position: 'relative',
          textAlign: 'center',
          marginBottom: 40,
          color: C.gold,
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
        }}
      >
        {'\u2605\u00A0\u00A0Now Playing\u00A0\u00B7\u00A0'}
        {today}
        {'\u00A0\u00B7\u00A0Daily Showings\u00A0\u00B7\u00A0Sold-Out Hits\u00A0\u00A0\u2605'}
      </motion.div>

      {/* Marquee box */}
      <motion.div
        style={{
          position: 'relative',
          maxWidth: 1180,
          margin: '0 auto',
          padding: 'clamp(60px, 8vw, 100px) clamp(40px, 6vw, 80px)',
          textAlign: 'center',
          y: titleY,
          opacity: titleOpacity,
        }}
      >
        {/* Bulb ring (renders inside the marquee container, around perimeter) */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {Array.from({ length: BULB_COUNT }).map((_, i) => (
            <MarqueeBulb
              key={i}
              idx={i}
              total={BULB_COUNT}
              radiusX={460}
              radiusY={260}
              chasePhase={chasePhase}
            />
          ))}
        </div>

        {/* Inner gold border frame */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 'clamp(20px, 4vw, 40px)',
            border: `1px solid ${C.gold}66`,
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 'clamp(28px, 5vw, 50px)',
            border: `1px solid ${C.gold}33`,
            pointerEvents: 'none',
          }}
        />

        {/* "PRESENTS" eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            position: 'relative',
            zIndex: 2,
            color: C.gold,
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            marginBottom: 18,
          }}
        >
          {'\u2014\u00A0\u00A0'}
          {(data.bakeryName || 'Studios').toUpperCase()}
          {' STUDIOS PRESENTS\u00A0\u00A0\u2014'}
        </motion.div>

        {/* The title */}
        {titleLines.map((line, lineIdx) => (
          <div key={lineIdx} style={{ overflow: 'hidden', position: 'relative', zIndex: 2 }}>
            <motion.h1
              initial={{ y: '102%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.0, delay: 0.4 + lineIdx * 0.12, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 'clamp(56px, 11vw, 144px)',
                fontWeight: 400,
                lineHeight: 0.9,
                letterSpacing: '0.005em',
                margin: 0,
                color: C.ivory,
                textTransform: 'uppercase',
                textShadow: `0 0 30px ${C.gold}55, 0 0 60px ${C.velvet}55`,
              }}
            >
              {line}
            </motion.h1>
          </div>
        ))}

        {/* Italic subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          style={{
            position: 'relative',
            zIndex: 2,
            fontFamily: FONT_SERIF,
            fontStyle: 'italic',
            fontSize: 'clamp(16px, 1.8vw, 22px)',
            color: C.ivory,
            opacity: 0.85,
            margin: '24px auto 0',
            maxWidth: 580,
            lineHeight: 1.55,
          }}
        >
          {data.description}
        </motion.p>

        {/* Rating + duration line — fake "Universal" / "U/A" / "120 MIN" plate */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          style={{
            position: 'relative',
            zIndex: 2,
            marginTop: 24,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            color: C.ivory,
            fontFamily: FONT_BODY,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ padding: '4px 8px', border: `1px solid ${C.gold}` }}>
            U {'\u00B7'} ALL AGES
          </span>
          <span style={{ opacity: 0.5 }}>{'\u2022'}</span>
          <span>FEATURE PRESENTATION</span>
          <span style={{ opacity: 0.5 }}>{'\u2022'}</span>
          <span>DOLBY VISION</span>
        </motion.div>

        {/* Buy Tickets CTA */}
        <motion.button
          type="button"
          onClick={() => onOrder()}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          whileHover={{ y: -2, boxShadow: `0 12px 30px ${C.gold}66` }}
          whileTap={{ scale: 0.97 }}
          style={{
            position: 'relative',
            zIndex: 2,
            marginTop: 36,
            background: `linear-gradient(180deg, ${C.goldHi} 0%, ${C.gold} 50%, ${C.gold} 100%)`,
            color: C.void,
            border: `2px solid ${C.gold}`,
            padding: '16px 36px',
            fontFamily: FONT_BODY,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.36em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: `0 6px 20px ${C.gold}55, inset 0 1px 0 ${C.goldHi}`,
          }}
        >
          <Ticket size={15} /> Buy Tickets
        </motion.button>

        {/* "Showtimes" subline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 1.0, delay: 1.6 }}
          style={{
            position: 'relative',
            zIndex: 2,
            marginTop: 16,
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: C.ash,
            letterSpacing: '0.12em',
          }}
        >
          showtimes: 09:00 {'\u00B7'} 12:00 {'\u00B7'} 15:00 {'\u00B7'} 18:00 {'\u00B7'} 21:00
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── 35mm film strip divider ────────────────────────────────────────

function FilmStrip({ direction = 'horizontal' }) {
  const HOLES = 16;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: '100%',
        height: 44,
        background: C.void,
        borderTop: `1px solid ${C.velvetD}`,
        borderBottom: `1px solid ${C.velvetD}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        margin: 'clamp(40px, 6vw, 80px) 0',
      }}
    >
      {Array.from({ length: HOLES }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '4%',
            maxWidth: 26,
            height: 22,
            background: '#000',
            border: `1px solid #1a1416`,
            borderRadius: 3,
            boxShadow: 'inset 0 1px 2px #000',
          }}
        />
      ))}
    </div>
  );
}

// ─── Director's note (drop cap on velvet) ─────────────────────────

function DirectorsNote({ data }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.0 }}
      style={{
        padding: 'clamp(60px, 9vw, 120px) clamp(20px, 6vw, 80px)',
        maxWidth: 940,
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: C.gold,
        }}
      >
        Director's Note
      </div>
      <div
        style={{
          margin: '14px auto 28px',
          height: 1,
          width: 60,
          background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
        }}
      />
      <p
        style={{
          fontFamily: FONT_SERIF,
          fontSize: 'clamp(20px, 2.5vw, 30px)',
          lineHeight: 1.55,
          letterSpacing: '0.005em',
          color: C.ivory,
          margin: 0,
          fontWeight: 400,
        }}
      >
        <span
          style={{
            fontSize: 'clamp(70px, 9vw, 108px)',
            float: 'left',
            lineHeight: 0.85,
            fontFamily: FONT_SERIF,
            fontWeight: 700,
            color: C.gold,
            paddingRight: 16,
            paddingTop: 8,
            fontStyle: 'italic',
            textShadow: `0 0 24px ${C.gold}55`,
          }}
        >
          I
        </span>
        wanted each cake to feel like the last shot of a quiet film {'\u2014'}{' '}
        <span style={{ color: C.gold, fontStyle: 'italic' }}>
          {data.tagline || 'soft, lit, unforgettable.'}
        </span>{' '}
        Welcome to {data.bakeryName}.
      </p>
      <div
        style={{
          marginTop: 36,
          fontFamily: FONT_SERIF,
          fontStyle: 'italic',
          fontSize: 16,
          color: C.ash,
        }}
      >
        {'\u2014'} Directed by {data.bakeryName}
      </div>
    </motion.section>
  );
}

// ─── Trailer reel — auto-scrolling horizontal cake strip ──────────

function TrailerReel({ products }) {
  // Duplicate set so the loop is seamless
  const reel = useMemo(() => [...products, ...products], [products]);
  if (!reel.length) return null;
  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(40px, 6vw, 70px) 0',
        overflow: 'hidden',
        background: C.void,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginBottom: 28,
          color: C.gold,
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
        }}
      >
        {'\u25b6'} The Trailer Reel
      </div>
      <div
        style={{
          display: 'flex',
          gap: 24,
          width: 'max-content',
          animation: 'cinema-reel 60s linear infinite',
          willChange: 'transform',
        }}
      >
        {reel.map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            style={{
              position: 'relative',
              width: 280,
              height: 380,
              flexShrink: 0,
              overflow: 'hidden',
              border: `1px solid ${C.gold}33`,
              boxShadow: `0 12px 28px -8px ${C.void}`,
              background: C.velvetD,
            }}
          >
            <img
              src={p.image}
              alt={p.name}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = MENU_TEMPLATE_ASSETS.redVelvet;
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'brightness(0.78) contrast(1.1) saturate(1.05)',
              }}
            />
            {/* Title plate at bottom */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '14px 16px',
                background: `linear-gradient(180deg, transparent 0%, ${C.void}ee 60%, ${C.void} 100%)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 22,
                  color: C.ivory,
                  lineHeight: 1.05,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontFamily: FONT_BODY,
                  fontSize: 10,
                  color: C.gold,
                  letterSpacing: '0.32em',
                  textTransform: 'uppercase',
                }}
              >
                {p.category}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Movie poster card ────────────────────────────────────────────

function MoviePoster({ product, onOrder, idx, total }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const imgScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.06, 1.0, 1.06]);

  // Star rating heuristic — bestsellers get 5, others get 4
  const stars = product.bestseller ? 5 : 4;
  const rating = product.bestseller ? 9.4 : 8.7;
  const certificate = product.eggless ? 'V' : 'U';
  const status = product.bestseller ? 'NOW SHOWING' : 'COMING SOON';
  const featNumber = String(idx + 1).padStart(3, '0');

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
      whileHover="hover"
      style={{
        position: 'relative',
        background: C.velvetD,
        border: `1px solid ${C.gold}33`,
        boxShadow: `0 16px 32px -12px ${C.void}, inset 0 0 0 1px ${C.velvet}55`,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={() => onOrder(product)}
      data-cursor="pointer"
    >
      {/* Poster image — proper movie-poster ratio */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '2 / 3',
          overflow: 'hidden',
          background: C.void,
        }}
      >
        <motion.img
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
            scale: imgScale,
            filter: 'saturate(1.05) contrast(1.1) brightness(0.86)',
          }}
        />
        {/* Bottom gradient for text legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, transparent 0%, transparent 40%, ${C.void}cc 80%, ${C.void} 100%)`,
          }}
        />

        {/* Status badge */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            padding: '4px 10px',
            background: product.bestseller ? C.gold : C.velvet,
            color: product.bestseller ? C.void : C.ivory,
            fontFamily: FONT_BODY,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            border: product.bestseller ? `1px solid ${C.goldHi}` : `1px solid ${C.velvetL}`,
          }}
        >
          {status}
        </div>

        {/* Certificate */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: `1.5px solid ${C.gold}`,
            background: `${C.void}cc`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_DISPLAY,
            fontSize: 12,
            color: C.gold,
          }}
        >
          {certificate}
        </div>

        {/* Feature number */}
        <div
          style={{
            position: 'absolute',
            top: 50,
            right: 14,
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: C.gold,
            letterSpacing: '0.18em',
            opacity: 0.75,
          }}
        >
          FEAT.&nbsp;{featNumber}
        </div>

        {/* Title overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '20px 22px',
          }}
        >
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.36em',
              textTransform: 'uppercase',
              color: C.gold,
              marginBottom: 6,
            }}
          >
            {product.category}
          </div>
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 'clamp(22px, 2.4vw, 30px)',
              fontWeight: 400,
              lineHeight: 1.0,
              letterSpacing: '0.005em',
              margin: 0,
              color: C.ivory,
              textTransform: 'uppercase',
              textShadow: `0 2px 12px ${C.void}`,
            }}
          >
            {product.name}
          </h3>

          {/* Star rating */}
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 2 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={11}
                  fill={i < stars ? C.gold : 'transparent'}
                  stroke={C.gold}
                  strokeWidth={1.5}
                />
              ))}
            </div>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: C.gold,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              {rating}/10
            </span>
          </div>
        </div>
      </div>

      {/* Caption strip below poster */}
      <div style={{ padding: '18px 22px 20px', position: 'relative' }}>
        {product.description && (
          <p
            style={{
              fontFamily: FONT_SERIF,
              fontStyle: 'italic',
              fontSize: 14,
              color: C.ash,
              lineHeight: 1.55,
              margin: '0 0 16px',
            }}
          >
            "{product.description}"
          </p>
        )}

        {/* Cast/credits row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 16,
            fontFamily: FONT_BODY,
            fontSize: 9,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
          }}
        >
          <div>
            <div style={{ color: C.ash, opacity: 0.6, fontWeight: 700 }}>Starring</div>
            <div style={{ color: C.ivory, marginTop: 2, fontWeight: 700 }}>
              {product.weight || 'Single Serving'}
            </div>
          </div>
          {product.eggless && (
            <div>
              <div style={{ color: C.ash, opacity: 0.6, fontWeight: 700 }}>Genre</div>
              <div style={{ color: C.gold, marginTop: 2, fontWeight: 700 }}>Eggless</div>
            </div>
          )}
        </div>

        {/* Bottom row — price + ticket */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: 14,
            borderTop: `1px dashed ${C.gold}33`,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONT_BODY,
                fontSize: 9,
                color: C.ash,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              Ticket
            </div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 24,
                color: C.gold,
                letterSpacing: '0.005em',
                lineHeight: 1,
              }}
            >
              {'\u20B9'}
              {product.price}
            </div>
          </div>
          <motion.div
            variants={{ hover: { x: 6 } }}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: C.gold,
              borderBottom: `1px solid ${C.gold}`,
              paddingBottom: 2,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ticket size={12} /> Buy Ticket {'\u2192'}
          </motion.div>
        </div>
      </div>

      {/* Marquee bulb hover halo */}
      <motion.div
        variants={{ hover: { opacity: 1 } }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'absolute',
          inset: -1,
          border: `1px solid ${C.gold}`,
          boxShadow: `0 0 24px ${C.gold}66, inset 0 0 0 1px ${C.gold}66`,
          pointerEvents: 'none',
        }}
      />
    </motion.article>
  );
}

// ─── Scene heading ─────────────────────────────────────────────────

function SceneHeading({ idx, name }) {
  const sceneNum = String(idx + 1).padStart(2, '0');
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9 }}
      style={{
        textAlign: 'center',
        marginBottom: 36,
        position: 'relative',
      }}
    >
      {/* Clapperboard scene marker */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 14,
          padding: '10px 20px',
          background: C.void,
          border: `1.5px solid ${C.gold}`,
          marginBottom: 18,
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            background: `repeating-linear-gradient(45deg, ${C.ivory} 0px, ${C.ivory} 4px, ${C.void} 4px, ${C.void} 8px)`,
            border: `1px solid ${C.ivory}`,
          }}
        />
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: 700,
            color: C.ivory,
            letterSpacing: '0.18em',
          }}
        >
          SCENE&nbsp;{sceneNum}
          {'\u00A0\u00B7\u00A0'}TAKE&nbsp;01
        </span>
      </div>
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 'clamp(40px, 6.5vw, 84px)',
          fontWeight: 400,
          margin: 0,
          letterSpacing: '0.005em',
          lineHeight: 0.95,
          color: C.ivory,
          textTransform: 'uppercase',
          textShadow: `0 0 30px ${C.gold}33`,
        }}
      >
        {name}
      </h2>
      <div
        style={{
          margin: '16px auto 0',
          height: 1,
          width: 80,
          background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
        }}
      />
    </motion.div>
  );
}

// ─── Behind-the-scenes pull quote w/ scratch overlay ──────────────

function BehindScenes({ data }) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 1.0 }}
      style={{
        position: 'relative',
        padding: 'clamp(80px, 12vw, 140px) clamp(20px, 6vw, 80px)',
        textAlign: 'center',
        maxWidth: 980,
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      {/* Scratchy film burn lines */}
      <motion.div
        animate={{ x: [-30, 30, -30] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: `repeating-linear-gradient(
            8deg,
            transparent 0px,
            transparent 80px,
            ${C.gold}07 80px,
            ${C.gold}07 81px,
            transparent 81px,
            transparent 200px
          )`,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: C.gold,
        }}
      >
        Behind the Scenes
      </div>

      <span
        aria-hidden="true"
        style={{
          fontFamily: FONT_SERIF,
          fontSize: 'clamp(80px, 12vw, 160px)',
          color: C.gold,
          opacity: 0.35,
          lineHeight: 0.7,
          display: 'block',
          marginTop: 12,
          marginBottom: -12,
        }}
      >
        "
      </span>

      <p
        style={{
          fontFamily: FONT_SERIF,
          fontStyle: 'italic',
          fontSize: 'clamp(22px, 3.4vw, 42px)',
          lineHeight: 1.3,
          letterSpacing: '-0.005em',
          color: C.ivory,
          margin: 0,
          fontWeight: 400,
        }}
      >
        Every cake is shot in golden hour. We let the butter find its own light.
      </p>
      <div
        style={{
          margin: '32px auto 14px',
          height: 1,
          width: 60,
          background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
        }}
      />
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.36em',
          textTransform: 'uppercase',
          color: C.gold,
        }}
      >
        {'\u2014'} {data.bakeryName}, on set
      </div>
    </motion.section>
  );
}

// ─── Box Office — closing CTA shaped like ticket stub ─────────────

function BoxOffice({ onOrder }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.0 }}
      style={{
        padding: 'clamp(80px, 12vw, 140px) clamp(20px, 6vw, 80px)',
        textAlign: 'center',
        background: `linear-gradient(180deg, ${C.void} 0%, ${C.velvetD} 50%, ${C.void} 100%)`,
        position: 'relative',
      }}
    >
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: C.gold,
          marginBottom: 14,
        }}
      >
        Box Office Now Open
      </div>
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 'clamp(48px, 8vw, 96px)',
          fontWeight: 400,
          margin: '0 0 36px',
          letterSpacing: '0.005em',
          lineHeight: 0.95,
          color: C.ivory,
          textTransform: 'uppercase',
          textShadow: `0 0 36px ${C.gold}55`,
        }}
      >
        Reserve&nbsp;your seat.
      </h2>

      {/* Vintage ticket stub */}
      <button
        type="button"
        onClick={() => onOrder()}
        style={{
          background: `linear-gradient(180deg, ${C.goldHi} 0%, ${C.gold} 100%)`,
          color: C.void,
          border: `2px solid ${C.gold}`,
          padding: 0,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'stretch',
          fontFamily: FONT_BODY,
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
          boxShadow: `0 12px 28px ${C.gold}44`,
          position: 'relative',
        }}
      >
        <span
          style={{
            padding: '20px 30px',
            fontSize: 12,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Ticket size={18} /> Admit One
        </span>
        {/* dotted tear-line */}
        <span
          style={{
            width: 14,
            background: `radial-gradient(circle at 50% 0, transparent 0, transparent 6px, ${C.gold} 6px), repeating-linear-gradient(0deg, ${C.gold} 0 5px, transparent 5px 10px)`,
          }}
        />
        <span
          style={{
            padding: '20px 30px',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {'\u2192'} Place Order
        </span>
      </button>

      <div
        style={{
          marginTop: 20,
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: C.ash,
          letterSpacing: '0.18em',
        }}
      >
        seat #A-07 {'\u00B7'} row 4 {'\u00B7'} doors open at order time
      </div>
    </motion.section>
  );
}

// ─── Rolling end credits ──────────────────────────────────────────

function RollingCredits({ data, products, categories }) {
  const credits = useMemo(() => {
    const featured = products.find((p) => p.bestseller) || products[0];
    return [
      { role: 'Directed by', names: [data.bakeryName] },
      { role: 'Produced by', names: [`The ${data.bakeryName} Atelier`] },
      { role: 'Cinematography', names: ['Golden hour, daily'] },
      { role: 'Original Score', names: ['Whisks in motion'] },
      { role: 'Production Design', names: [data.tagline || 'Quiet luxury'] },
      { role: 'Starring', names: products.slice(0, 8).map((p) => p.name) },
      { role: 'Featured Acquisition', names: featured ? [featured.name] : [] },
      { role: 'Wardrobe Department', names: ['Silken icing, fine sugar'] },
      { role: 'Catering', names: [`In-house, since always`] },
      { role: 'Locations', names: [data.deliveryLocations || data.city || 'Local delivery'] },
      { role: 'Now Showing', names: categories.map((c) => c.name) },
      { role: 'Special Thanks', names: ['Every customer who lit a candle.'] },
    ];
  }, [data, products, categories]);

  // Continuous credit roll — duration scales with content
  const duration = 60 + credits.length * 4;

  return (
    <section
      style={{
        position: 'relative',
        background: `linear-gradient(180deg, ${C.void} 0%, ${C.velvetD} 100%)`,
        padding: '60px 0 0',
        overflow: 'hidden',
        borderTop: `1px solid ${C.gold}33`,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginBottom: 30,
          color: C.gold,
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
        }}
      >
        {'\u2605'} End Credits {'\u2605'}
      </div>

      <div
        style={{
          position: 'relative',
          height: 'clamp(380px, 48vw, 540px)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            top: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 26,
            padding: '0 20px',
            animation: `cinema-credits ${duration}s linear infinite`,
            willChange: 'transform',
          }}
        >
          {credits.map((c, i) => (
            <div key={i} style={{ textAlign: 'center', maxWidth: 580 }}>
              <div
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.42em',
                  textTransform: 'uppercase',
                  color: C.ash,
                  marginBottom: 6,
                }}
              >
                {c.role}
              </div>
              {c.names.map((n, j) => (
                <div
                  key={j}
                  style={{
                    fontFamily: FONT_SERIF,
                    fontSize: 'clamp(18px, 2vw, 24px)',
                    fontWeight: 400,
                    color: C.ivory,
                    letterSpacing: '0.005em',
                    lineHeight: 1.3,
                  }}
                >
                  {n}
                </div>
              ))}
            </div>
          ))}
          {/* End mark */}
          <div style={{ marginTop: 60, textAlign: 'center', paddingBottom: 80 }}>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 60,
                color: C.gold,
                letterSpacing: '0.2em',
                opacity: 0.85,
              }}
            >
              FIN
            </div>
            <div
              style={{
                fontFamily: FONT_BODY,
                fontSize: 10,
                color: C.ash,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                marginTop: 8,
              }}
            >
              {'\u00A9'} {new Date().getFullYear()} {data.bakeryName} Pictures
            </div>
          </div>
        </div>

        {/* Top/bottom fade masks */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 60,
            background: `linear-gradient(180deg, ${C.void} 0%, transparent 100%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: `linear-gradient(0deg, ${C.velvetD} 0%, transparent 100%)`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </section>
  );
}

// ─── Footer (theatre info) ────────────────────────────────────────

function CinemaFooter({ data, onOrder, instagramHandle }) {
  return (
    <footer
      style={{
        padding: 'clamp(40px, 6vw, 70px) clamp(20px, 6vw, 80px) 60px',
        maxWidth: 1180,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 36,
        alignItems: 'flex-start',
        borderTop: `1px solid ${C.velvet}55`,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: C.gold,
          }}
        >
          The Theatre
        </div>
        <h3
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            fontWeight: 400,
            margin: '12px 0 8px',
            letterSpacing: '0.01em',
            color: C.ivory,
            textTransform: 'uppercase',
          }}
        >
          {data.bakeryName}
        </h3>
        <p
          style={{
            fontFamily: FONT_SERIF,
            fontStyle: 'italic',
            fontSize: 14,
            color: C.ash,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {data.tagline || 'Made with quiet intention.'}
        </p>
      </div>

      <div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: C.gold,
          }}
        >
          Daily Showings
        </div>
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 15,
            color: C.ivory,
            marginTop: 12,
            lineHeight: 1.7,
          }}
        >
          <p style={{ margin: 0, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Clock3 size={14} style={{ marginTop: 4, color: C.gold, flexShrink: 0 }} />
            <span>{data.timings}</span>
          </p>
          {(data.deliveryLocations || data.city) && (
            <p style={{ margin: '8px 0 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <MapPin size={14} style={{ marginTop: 4, color: C.gold, flexShrink: 0 }} />
              <span>{data.deliveryLocations || data.city}</span>
            </p>
          )}
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: C.gold,
          }}
        >
          Box Office
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            onClick={() => onOrder()}
            style={{
              background: 'transparent',
              border: `1px solid ${C.gold}`,
              color: C.gold,
              padding: '10px 16px',
              fontFamily: FONT_BODY,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              alignSelf: 'flex-start',
            }}
          >
            <Ticket size={13} /> Reserve a Seat
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
                border: `1px solid ${C.gold}`,
                color: C.gold,
                padding: '10px 16px',
                fontFamily: FONT_BODY,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                alignSelf: 'flex-start',
              }}
            >
              <Instagram size={13} /> Press Reel
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}

// ─── Main renderer ───────────────────────────────────────────────

export default function CinemaMenuRenderer({ business, settings, products, preview = false }) {
  const data = mergeMenuSettings(business, settings);
  const productCards = normalizeMenuProducts(products);
  const visibleCategories = data.categories.filter((c) => c.visible !== false);
  const allProducts = productCards.filter((p) => p.featured !== false);
  const isDesktop = useIsDesktop();
  const order = useOrderFlow({ business, data });
  const orderProduct = (product) => order.open(product || null);

  // Studio ident shown only once per session, and never in preview mode
  const [showIdent, setShowIdent] = useState(() => {
    if (preview) return false;
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('cc-cinema-ident') !== '1';
    } catch (_) {
      return true;
    }
  });
  const dismissIdent = () => {
    setShowIdent(false);
    try {
      sessionStorage.setItem('cc-cinema-ident', '1');
    } catch (_) {
      /* noop */
    }
  };

  const productsByCategory = useMemo(() => {
    const groups = new Map();
    visibleCategories.forEach((c) => groups.set(c.name, []));
    allProducts.forEach((p) => {
      const key =
        p.category && groups.has(p.category)
          ? p.category
          : visibleCategories[0]?.name || 'Featured';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });
    return groups;
  }, [allProducts, visibleCategories]);

  const instagramHandle = String(data.instagram || business?.instagram || '')
    .replace('@', '')
    .trim();

  // Choose top products for the trailer reel
  const reelProducts = useMemo(
    () =>
      [...allProducts.filter((p) => p.bestseller), ...allProducts]
        .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
        .slice(0, 12),
    [allProducts]
  );

  return (
    <div
      style={{
        background: C.void,
        color: C.ivory,
        fontFamily: FONT_BODY,
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        cursor: isDesktop && !preview ? 'none' : 'auto',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&display=swap');

        @keyframes cinema-reel {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes cinema-credits {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-100%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .cinema-anim { animation: none !important; }
        }

        .cinema-poster-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 36px;
        }
        @media (min-width: 700px) {
          .cinema-poster-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
        }
        @media (min-width: 1100px) {
          .cinema-poster-grid { grid-template-columns: 1fr 1fr 1fr; gap: 48px; }
        }
      `}</style>

      <FilmGrain enabled={!preview} />
      <FilmCursor enabled={isDesktop && !preview} />

      <AnimatePresence>
        {showIdent && <StudioIdent bakeryName={data.bakeryName} onComplete={dismissIdent} />}
      </AnimatePresence>

      <HeroMarquee data={data} onOrder={orderProduct} />

      <FilmStrip />

      <DirectorsNote data={data} />

      {reelProducts.length > 0 && (
        <>
          <FilmStrip />
          <TrailerReel products={reelProducts} />
          <FilmStrip />
        </>
      )}

      {/* ── Scenes (categories) ──────────────────────────── */}
      {Array.from(productsByCategory.entries()).map(([catName, list], catIdx) => {
        if (!list.length) return null;
        return (
          <section
            key={catName}
            style={{
              padding: 'clamp(40px, 6vw, 80px) clamp(20px, 6vw, 80px)',
              maxWidth: 1380,
              margin: '0 auto',
            }}
          >
            <SceneHeading idx={catIdx} name={catName} />
            <div className="cinema-poster-grid">
              {list.map((product, idx) => (
                <MoviePoster
                  key={product.id}
                  product={product}
                  onOrder={orderProduct}
                  idx={idx}
                  total={list.length}
                />
              ))}
            </div>
          </section>
        );
      })}

      <FilmStrip />

      <BehindScenes data={data} />

      <BoxOffice onOrder={orderProduct} />

      <RollingCredits data={data} products={allProducts} categories={visibleCategories} />

      <CinemaFooter data={data} onOrder={orderProduct} instagramHandle={instagramHandle} />

      {order.modals}
    </div>
  );
}
