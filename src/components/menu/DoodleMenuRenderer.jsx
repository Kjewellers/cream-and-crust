/**
 * @file DoodleMenuRenderer.jsx
 *
 * Pinterest-doodle aesthetic public-menu renderer for the bakery
 * Menu Builder. Selected from the theme customizer via
 * `theme.template === 'doodle'`. Same prop contract as the default
 * `MenuRenderer`: `{ business, settings, products, preview }`.
 *
 * Aesthetic ingredients:
 *   - cream paper background with subtle grain
 *   - hand-drawn SVG doodles (whisk, croissant, cake-slice, hearts,
 *     sparkles) scattered as decorative elements with parallax drift
 *   - polaroid-style product cards with masking-tape corners and
 *     slight rotation
 *   - mixed typography: handwritten display (Caveat, Patrick Hand) +
 *     Playfair body
 *   - sticker-style price tags + sticker-style order CTA
 *   - masonry-ish responsive grid with variable card heights
 *
 * Motion:
 *   - hero doodles "draw in" via SVG `pathLength`
 *   - cards stagger fade + rotate-up on viewport enter
 *   - sticker labels wiggle subtly on hover
 *   - smooth scroll between sections
 *   - cursor follower on desktop (small ink dot)
 *
 * No new dependencies — framer-motion is already in the project.
 * Google Fonts are loaded inline via <style> so the build stays light.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Instagram, MapPin, Clock3, Sparkles, Star } from 'lucide-react';
import { mergeMenuSettings, normalizeMenuProducts, MENU_TEMPLATE_ASSETS } from '../../data/menuDefaults';
import useOrderFlow from './useOrderFlow';

// ─── Hand-drawn doodle SVGs (inline, no asset deps) ──────────────────

/**
 * Each doodle is a stroked SVG path optimized for `pathLength`
 * animation. A consistent stroke color is supplied via prop so the
 * theme can re-tint the entire doodle pack.
 */
const Doodle = ({ d, viewBox = '0 0 64 64', stroke = '#A14F61', size = 48, delay = 0, scribble = false, ...rest }) => (
  <motion.svg
    viewBox={viewBox}
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay, duration: 0.5 }}
    {...rest}
  >
    <motion.path
      d={d}
      stroke={stroke}
      strokeWidth={scribble ? 1.4 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ delay, duration: 1.2, ease: 'easeOut' }}
    />
  </motion.svg>
);

const DOODLE_PATHS = {
  whisk: 'M32 6 L32 32 M22 36 Q32 50 42 36 Q44 30 38 28 Q32 27 26 30 Q20 32 22 36 Z',
  croissant: 'M10 38 Q14 22 32 18 Q50 22 54 38 Q44 36 32 38 Q20 40 10 38 Z M18 36 L24 30 M28 36 L34 30 M38 36 L44 30',
  cakeSlice: 'M14 50 L32 14 L50 50 Z M14 50 L50 50 M20 38 L44 38 M32 14 Q32 22 32 28',
  heart: 'M32 50 C12 38 12 22 22 18 Q32 16 32 26 Q32 16 42 18 C52 22 52 38 32 50 Z',
  sparkle: 'M32 8 L32 24 M32 40 L32 56 M8 32 L24 32 M40 32 L56 32 M16 16 L24 24 M40 40 L48 48 M48 16 L40 24 M24 40 L16 48',
  star: 'M32 8 L37 24 L54 24 L40 34 L46 50 L32 40 L18 50 L24 34 L10 24 L27 24 Z',
  coffee: 'M14 22 L14 46 Q14 54 22 54 L42 54 Q50 54 50 46 L50 22 Z M50 28 Q58 28 58 36 Q58 44 50 44 M22 22 L22 14 M30 22 L30 14 M38 22 L38 14',
  donut: 'M32 12 C44 12 52 20 52 32 C52 44 44 52 32 52 C20 52 12 44 12 32 C12 20 20 12 32 12 Z M32 22 C26 22 22 26 22 32 C22 38 26 42 32 42 C38 42 42 38 42 32 C42 26 38 22 32 22 Z M16 24 L18 22 M44 22 L46 24 M48 36 L50 38 M14 38 L16 40',
  cupcake: 'M16 32 Q16 22 32 22 Q48 22 48 32 L46 50 L18 50 Z M16 32 L48 32 M22 22 Q22 14 32 14 Q42 14 42 22',
  squiggle: 'M8 32 Q14 22 20 32 T32 32 T44 32 T56 32',
  flourish: 'M8 32 Q20 14 32 32 T56 32 M14 26 Q14 22 18 22 M50 38 Q50 42 46 42',
};

// ─── Cursor follower — desktop only ──────────────────────────────────

function CursorFollower({ accent }) {
  const dotRef = useRef(null);
  useEffect(() => {
    const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isDesktop) return undefined;
    const dot = dotRef.current;
    if (!dot) return undefined;
    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    const onMove = (e) => { tx = e.clientX; ty = e.clientY; };
    const tick = () => {
      x += (tx - x) * 0.15;
      y += (ty - y) * 0.15;
      dot.style.transform = `translate3d(${x - 6}px, ${y - 6}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: accent,
        opacity: 0.5,
        pointerEvents: 'none',
        zIndex: 9999,
        mixBlendMode: 'multiply',
        boxShadow: `0 0 24px ${accent}55`,
      }}
    />
  );
}

// ─── Polaroid product card with motion ──────────────────────────────

function PolaroidCard({ product, onOrder, accent, idx }) {
  // Fixed pseudo-random rotation per card so server vs client render is
  // deterministic. Using idx as the seed keeps cards stable across re-renders.
  const tilt = useMemo(() => {
    const seed = ((idx + 1) * 9301 + 49297) % 233280;
    return ((seed / 233280) - 0.5) * 4; // ±2 degrees
  }, [idx]);

  // Tape color cycles for variety.
  const tapeColors = ['#FFE7A8', '#F8C2C8', '#C7E4D5', '#E2D7F2'];
  const tape = tapeColors[idx % tapeColors.length];

  return (
    <motion.article
      initial={{ opacity: 0, y: 32, rotate: tilt - 4 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      whileHover={{
        y: -6,
        rotate: tilt * 0.5,
        transition: { duration: 0.25 },
      }}
      style={{
        background: '#FFFFFF',
        padding: 12,
        paddingBottom: 18,
        borderRadius: 4,
        boxShadow: '0 8px 24px -8px rgba(60, 30, 30, 0.18), 0 2px 6px -2px rgba(60, 30, 30, 0.10)',
        position: 'relative',
        cursor: 'default',
        breakInside: 'avoid',
      }}
    >
      {/* Masking tape */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: `translateX(-50%) rotate(${tilt * 1.5}deg)`,
          width: 60,
          height: 18,
          background: tape,
          opacity: 0.85,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      />

      {/* Image */}
      <div
        style={{
          width: '100%',
          aspectRatio: '4 / 3',
          background: '#F4ECE3',
          overflow: 'hidden',
          borderRadius: 2,
          position: 'relative',
        }}
      >
        <img
          src={product.image}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.96)' }}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = MENU_TEMPLATE_ASSETS.redVelvet; }}
        />

        {/* Sticker price tag — sits on the image corner */}
        <motion.div
          whileHover={{ rotate: [-3, 3, -3, 0], transition: { duration: 0.5 } }}
          style={{
            position: 'absolute',
            top: 10,
            right: -8,
            background: accent,
            color: '#FFF',
            padding: '6px 14px',
            fontFamily: '"Caveat", "Patrick Hand", cursive',
            fontSize: 22,
            fontWeight: 700,
            transform: 'rotate(8deg)',
            boxShadow: '0 4px 10px -2px rgba(0,0,0,0.18)',
            letterSpacing: 0.5,
            lineHeight: 1,
          }}
        >
          ₹{product.price}
        </motion.div>

        {product.bestseller && (
          <span
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: '#FFFDE0',
              color: '#8C5A00',
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 800,
              fontFamily: '"Patrick Hand", cursive',
              letterSpacing: 0.5,
              transform: 'rotate(-3deg)',
              border: '1.5px dashed #8C5A00',
            }}
          >
            ★ bestseller
          </span>
        )}
      </div>

      {/* Caption */}
      <div style={{ paddingTop: 12, textAlign: 'center' }}>
        <h3
          style={{
            fontFamily: '"Caveat", "Patrick Hand", cursive',
            fontSize: 24,
            fontWeight: 700,
            margin: 0,
            color: '#3A2A25',
            lineHeight: 1.1,
            letterSpacing: 0.2,
          }}
        >
          {product.name}
        </h3>
        {product.description && (
          <p
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 12.5,
              fontStyle: 'italic',
              color: '#7F6962',
              margin: '4px 0 0',
              lineHeight: 1.5,
              maxWidth: 240,
              marginInline: 'auto',
            }}
          >
            {product.description}
          </p>
        )}
        {product.weight && (
          <small
            style={{
              fontFamily: '"Caveat", cursive',
              fontSize: 14,
              color: accent,
              display: 'block',
              marginTop: 4,
            }}
          >
            ✿ {product.weight}
          </small>
        )}

        {/* Order sticker button */}
        <motion.button
          type="button"
          onClick={() => onOrder(product)}
          whileHover={{ scale: 1.05, rotate: -2 }}
          whileTap={{ scale: 0.95 }}
          style={{
            marginTop: 12,
            background: '#3A2A25',
            color: '#FFFDE0',
            border: 'none',
            padding: '8px 18px',
            fontFamily: '"Caveat", "Patrick Hand", cursive',
            fontSize: 18,
            fontWeight: 700,
            borderRadius: 99,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 10px -2px rgba(0,0,0,0.20)',
            letterSpacing: 0.5,
          }}
        >
          <MessageCircle size={14} strokeWidth={2.4} />
          order me!
        </motion.button>
      </div>
    </motion.article>
  );
}

// ─── Section heading w/ doodle flourish ─────────────────────────────

function DoodleHeading({ children, accent, doodle = 'flourish' }) {
  return (
    <div style={{ textAlign: 'center', margin: '36px 0 24px', position: 'relative' }}>
      <Doodle d={DOODLE_PATHS[doodle]} stroke={accent} size={64} style={{ display: 'inline-block', opacity: 0.85 }} />
      <h2
        style={{
          fontFamily: '"Caveat", "Patrick Hand", cursive',
          fontSize: 'clamp(36px, 6vw, 56px)',
          fontWeight: 700,
          margin: '4px 0 0',
          color: '#3A2A25',
          letterSpacing: 0.5,
          lineHeight: 1.1,
        }}
      >
        {children}
      </h2>
      <div
        aria-hidden="true"
        style={{
          width: 80,
          height: 3,
          background: accent,
          borderRadius: 99,
          margin: '6px auto 0',
          opacity: 0.7,
        }}
      />
    </div>
  );
}

// ─── Main renderer ───────────────────────────────────────────────────

export default function DoodleMenuRenderer({ business, settings, products, preview = false }) {
  const data = mergeMenuSettings(business, settings);
  const productCards = normalizeMenuProducts(products);
  const visibleCategories = data.categories.filter((c) => c.visible !== false);
  const bestsellers = productCards.filter((p) => p.bestseller).slice(0, 6);
  const allProducts = productCards.filter((p) => p.featured !== false);

  const accent = data.theme?.primaryColor || '#A14F61';
  const heroRef = useRef(null);

  // Scroll-driven parallax for hero doodles
  const { scrollY } = useScroll();
  const yDoodle1 = useTransform(scrollY, [0, 600], [0, -80]);
  const yDoodle2 = useTransform(scrollY, [0, 600], [0, 60]);
  const yDoodle3 = useTransform(scrollY, [0, 600], [0, -40]);

  const [activeCategory, setActiveCategory] = useState('All');
  const filteredProducts = activeCategory === 'All'
    ? allProducts
    : allProducts.filter((p) => p.category === activeCategory);

  const whatsappNumber = String(data.whatsapp || '').replace(/[^\d]/g, '');
  const instagram = String(data.instagram || '').replace('@', '');

  const order = useOrderFlow({ business, data });
  const orderProduct = (product) => order.open(product || null);

  return (
    <div
      ref={heroRef}
      style={{
        // Cream paper with subtle SVG grain
        background:
          'url("data:image/svg+xml;utf8,' +
          encodeURIComponent(
            '<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\' stitchTiles=\'stitch\'/><feColorMatrix values=\'0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0.06 0\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\'/></svg>',
          ) +
          '") repeat, ' +
          'linear-gradient(180deg, #FBF4E9 0%, #FAEFE2 100%)',
        color: '#3A2A25',
        fontFamily: '"Playfair Display", Georgia, serif',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        scrollBehavior: 'smooth',
      }}
    >
      {/* Inline font + scroll-snap styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;700&family=Patrick+Hand&family=Playfair+Display:ital,wght@0,500;0,700;1,500&display=swap');
        .doodle-masonry {
          column-count: 1;
          column-gap: 22px;
        }
        @media (min-width: 600px) {
          .doodle-masonry { column-count: 2; }
        }
        @media (min-width: 980px) {
          .doodle-masonry { column-count: 3; }
        }
        @media (min-width: 1300px) {
          .doodle-masonry { column-count: 4; }
        }
        .doodle-masonry > * { margin-bottom: 22px; }
      `}</style>

      {!preview && <CursorFollower accent={accent} />}

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          padding: 'clamp(40px, 8vw, 90px) 24px clamp(60px, 10vw, 120px)',
          textAlign: 'center',
        }}
      >
        {/* Parallax doodles */}
        <motion.div style={{ position: 'absolute', top: 30, left: '6%', y: yDoodle1, opacity: 0.7 }}>
          <Doodle d={DOODLE_PATHS.whisk} stroke={accent} size={72} delay={0.1} />
        </motion.div>
        <motion.div style={{ position: 'absolute', top: 80, right: '8%', y: yDoodle2, opacity: 0.7 }}>
          <Doodle d={DOODLE_PATHS.croissant} stroke={accent} size={84} delay={0.25} />
        </motion.div>
        <motion.div style={{ position: 'absolute', bottom: 40, left: '14%', y: yDoodle3, opacity: 0.7 }}>
          <Doodle d={DOODLE_PATHS.heart} stroke={accent} size={56} delay={0.5} />
        </motion.div>
        <motion.div style={{ position: 'absolute', top: 200, left: '50%', x: '-50%', opacity: 0.5 }}>
          <Doodle d={DOODLE_PATHS.sparkle} stroke={accent} size={42} delay={0.8} />
        </motion.div>

        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            border: `1.5px dashed ${accent}`,
            borderRadius: 99,
            color: accent,
            fontFamily: '"Patrick Hand", cursive',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 18,
          }}
        >
          <Sparkles size={14} /> {data.bakeryName}
        </motion.div>

        {/* Big handwritten title */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          style={{
            fontFamily: '"Caveat", "Patrick Hand", cursive',
            fontSize: 'clamp(54px, 10vw, 110px)',
            fontWeight: 700,
            lineHeight: 0.95,
            margin: 0,
            color: '#3A2A25',
            letterSpacing: -1,
            whiteSpace: 'pre-line',
          }}
        >
          {data.heroTitle}
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: '#7F6962',
            margin: '20px auto 0',
            maxWidth: 540,
            lineHeight: 1.55,
          }}
        >
          {data.description}
        </motion.p>

        {/* Sticker CTA */}
        <motion.button
          type="button"
          onClick={() => orderProduct()}
          initial={{ opacity: 0, scale: 0.8, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: -2 }}
          transition={{ duration: 0.6, delay: 0.45, type: 'spring' }}
          whileHover={{ scale: 1.06, rotate: 2 }}
          whileTap={{ scale: 0.96 }}
          style={{
            marginTop: 32,
            background: accent,
            color: '#FFFDE0',
            border: `2px solid #3A2A25`,
            padding: '14px 32px',
            fontFamily: '"Caveat", "Patrick Hand", cursive',
            fontSize: 26,
            fontWeight: 700,
            borderRadius: 99,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            letterSpacing: 0.5,
            boxShadow: '4px 6px 0 0 #3A2A25',
            transform: 'rotate(-2deg)',
          }}
        >
          <MessageCircle size={20} strokeWidth={2.4} />
          order on whatsapp ✨
        </motion.button>
      </section>

      {/* ── CATEGORY PILLS ──────────────────────────────────────── */}
      {visibleCategories.length > 0 && (
        <section style={{ padding: '0 24px', marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 10,
              maxWidth: 900,
              margin: '0 auto',
            }}
          >
            {['All', ...visibleCategories.map((c) => c.name)].map((name) => {
              const active = activeCategory === name;
              return (
                <motion.button
                  key={name}
                  type="button"
                  onClick={() => setActiveCategory(name)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    background: active ? '#3A2A25' : '#FFFDE0',
                    color: active ? '#FFFDE0' : '#3A2A25',
                    border: `1.5px solid #3A2A25`,
                    padding: '6px 16px',
                    fontFamily: '"Caveat", "Patrick Hand", cursive',
                    fontSize: 18,
                    fontWeight: 600,
                    borderRadius: 99,
                    cursor: 'pointer',
                    boxShadow: active ? '2px 3px 0 0 #3A2A25' : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {name}
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── BESTSELLERS ─────────────────────────────────────────── */}
      {bestsellers.length > 0 && (
        <section style={{ padding: '20px 24px 40px', position: 'relative', maxWidth: 1400, margin: '0 auto' }}>
          <DoodleHeading accent={accent} doodle="star">our favourites</DoodleHeading>
          <div className="doodle-masonry">
            {bestsellers.map((product, idx) => (
              <PolaroidCard
                key={product.id}
                product={product}
                onOrder={orderProduct}
                accent={accent}
                idx={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── ALL PRODUCTS ────────────────────────────────────────── */}
      {filteredProducts.length > 0 && (
        <section style={{ padding: '20px 24px 60px', position: 'relative', maxWidth: 1400, margin: '0 auto' }}>
          <DoodleHeading accent={accent} doodle="cupcake">
            {activeCategory === 'All' ? 'sweet things' : activeCategory.toLowerCase()}
          </DoodleHeading>

          {/* Decorative side doodles */}
          <Doodle
            d={DOODLE_PATHS.donut}
            stroke={accent}
            size={56}
            style={{ position: 'absolute', top: 80, left: 12, opacity: 0.5 }}
          />
          <Doodle
            d={DOODLE_PATHS.coffee}
            stroke={accent}
            size={56}
            style={{ position: 'absolute', top: 200, right: 12, opacity: 0.5 }}
          />

          <div className="doodle-masonry">
            {filteredProducts.map((product, idx) => (
              <PolaroidCard
                key={product.id}
                product={product}
                onOrder={orderProduct}
                accent={accent}
                idx={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer
        style={{
          padding: '40px 24px 60px',
          textAlign: 'center',
          borderTop: `2px dashed ${accent}55`,
          marginTop: 40,
          position: 'relative',
        }}
      >
        <Doodle
          d={DOODLE_PATHS.flourish}
          stroke={accent}
          size={80}
          style={{ display: 'inline-block', marginBottom: 8, opacity: 0.7 }}
        />
        <h3
          style={{
            fontFamily: '"Caveat", "Patrick Hand", cursive',
            fontSize: 36,
            fontWeight: 700,
            margin: '0 0 8px',
            color: '#3A2A25',
          }}
        >
          let's bake something sweet ✿
        </h3>
        <p
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 14,
            color: '#7F6962',
            margin: '0 0 24px',
          }}
        >
          {data.timings} · {data.deliveryLocations || data.city || 'local delivery'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          {whatsappNumber && (
            <motion.button
              type="button"
              onClick={() => orderProduct()}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              style={{
                background: '#FFFDE0',
                color: '#3A2A25',
                border: '1.5px solid #3A2A25',
                padding: '8px 16px',
                borderRadius: 99,
                fontFamily: '"Caveat", cursive',
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MessageCircle size={16} /> +{whatsappNumber}
            </motion.button>
          )}
          {instagram && (
            <motion.button
              type="button"
              onClick={() => window.open(`https://instagram.com/${instagram}`, '_blank')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              style={{
                background: '#FFFDE0',
                color: '#3A2A25',
                border: '1.5px solid #3A2A25',
                padding: '8px 16px',
                borderRadius: 99,
                fontFamily: '"Caveat", cursive',
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Instagram size={16} /> @{instagram}
            </motion.button>
          )}
        </div>

        <p
          style={{
            fontFamily: '"Caveat", cursive',
            fontSize: 14,
            color: '#A09287',
            margin: 0,
          }}
        >
          made with <Heart size={12} fill={accent} stroke={accent} style={{ verticalAlign: 'middle' }} /> at {data.bakeryName}
        </p>
      </footer>
      {order.modals}
    </div>
  );
}
