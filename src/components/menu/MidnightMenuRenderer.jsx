/**
 * @file MidnightMenuRenderer.jsx
 *
 * Midnight Velvet public-menu renderer. Selected via
 * `theme.template === 'midnight'`. Same prop contract as the default
 * `MenuRenderer`: `{ business, settings, products, preview }`.
 *
 * Aesthetic — deep maroon + gold leaf, candlelit luxury:
 *   - near-black plum background (#1A0A11) with velvet noise + radial
 *     candle glows that breathe
 *   - gold-leaf foil accents (#D4A857) used sparingly for rules and
 *     monogram seals
 *   - serif Cormorant Garamond display + Inter caps body
 *   - spotlight reveal: cards emerge from darkness via a soft circular
 *     mask, like stage lights catching a still life
 *   - gold-shimmer hover sweep on cards (CSS keyframe sweep)
 *   - slow camera pan on hero image (continuous translateX + scale)
 *   - flickering candle glow behind hero brand mark
 *   - low-key gold filigree borders
 *
 * No new dependencies. Fonts loaded inline.
 */

import React, { useMemo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Instagram, MessageCircle, MapPin, Clock3 } from 'lucide-react';
import { mergeMenuSettings, normalizeMenuProducts, MENU_TEMPLATE_ASSETS } from '../../data/menuDefaults';
import useOrderFlow from './useOrderFlow';

// ─── Palette ────────────────────────────────────────────────────────

const PALETTE = {
  void: '#0E0509',          // deepest plum, near black
  velvet: '#1A0A11',        // base background
  velvetMid: '#22101A',     // raised surface
  velvetHigh: '#2C1521',    // card surface
  gold: '#D4A857',          // gold leaf
  goldBright: '#E9C16A',    // gold highlight
  goldDeep: '#8E6C2C',      // gold shadow
  cream: '#F4E9D4',         // candlelight cream (text on dark)
  ash: '#9E8A7A',           // muted body text
  wineRed: '#7A2738',       // accent for badges
};

// ─── Gold filigree corner ornament (inline SVG) ───────────────────

const FilamentCorner = ({ size = 32, color = PALETTE.gold, style = {}, flip = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    style={{ transform: flip ? 'scaleX(-1)' : undefined, opacity: 0.85, ...style }}
    aria-hidden="true"
  >
    <path
      d="M2 2 L14 2 M2 2 L2 14 M2 2 Q10 6 14 14 Q6 10 2 2 Z"
      stroke={color}
      strokeWidth="0.8"
      strokeLinecap="round"
      fill={color}
      fillOpacity="0.15"
    />
    <circle cx="2" cy="2" r="1.2" fill={color} />
  </svg>
);

// ─── Gold rule with embedded diamond ──────────────────────────────

const GoldRule = ({ width = 80, color = PALETTE.gold }) => (
  <motion.div
    initial={{ width: 0, opacity: 0 }}
    whileInView={{ width, opacity: 1 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 1.0, ease: [0.25, 1, 0.5, 1] }}
    style={{
      height: 24,
      margin: '0 auto',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        flex: 1,
        height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
      }}
    />
    <div
      style={{
        width: 8,
        height: 8,
        margin: '0 6px',
        background: color,
        transform: 'rotate(45deg)',
        boxShadow: `0 0 8px ${color}`,
      }}
    />
    <div
      style={{
        flex: 1,
        height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
      }}
    />
  </motion.div>
);

// ─── Eyebrow caps ─────────────────────────────────────────────────

const Eyebrow = ({ children, color = PALETTE.gold }) => (
  <div
    style={{
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.36em',
      textTransform: 'uppercase',
      color,
      opacity: 0.9,
    }}
  >
    {children}
  </div>
);

// ─── Card — spotlight reveal + gold shimmer on hover ─────────────

function VelvetCard({ product, onOrder, idx }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  // Slow vertical drift on the image for that lit-still-life feel
  const imageY = useTransform(scrollYProgress, [0, 1], ['-4%', '4%']);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1.0, 1.05]);

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
      whileHover="hover"
      className="midnight-card"
      style={{
        position: 'relative',
        background: `linear-gradient(165deg, ${PALETTE.velvetHigh} 0%, ${PALETTE.velvetMid} 100%)`,
        border: `1px solid ${PALETTE.gold}33`,
        overflow: 'hidden',
        breakInside: 'avoid',
        marginBottom: 28,
        cursor: 'default',
      }}
    >
      {/* Spotlight halo behind card on hover */}
      <motion.div
        variants={{
          hover: { opacity: 1 },
        }}
        initial={{ opacity: 0 }}
        style={{
          position: 'absolute',
          inset: -40,
          background: `radial-gradient(circle at 50% 0%, ${PALETTE.gold}22 0%, transparent 60%)`,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'opacity 0.5s ease',
        }}
      />

      {/* Gold corner filigrees */}
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 3 }}>
        <FilamentCorner size={20} />
      </div>
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 3 }}>
        <FilamentCorner size={20} flip />
      </div>

      {/* Image */}
      <div
        style={{
          width: '100%',
          aspectRatio: idx % 3 === 0 ? '4 / 5' : '1 / 1',
          overflow: 'hidden',
          position: 'relative',
          background: PALETTE.void,
        }}
      >
        <motion.img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = MENU_TEMPLATE_ASSETS.redVelvet; }}
          style={{
            width: '100%',
            height: '108%',
            objectFit: 'cover',
            y: imageY,
            scale: imageScale,
            filter: 'brightness(0.85) saturate(1.1) contrast(1.05)',
          }}
        />
        {/* Vignette overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at center, transparent 50%, ${PALETTE.void}cc 100%)`,
            pointerEvents: 'none',
          }}
        />
        {/* Gold shimmer sweep on hover */}
        <motion.div
          variants={{
            hover: { x: '120%' },
          }}
          initial={{ x: '-30%' }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40%',
            height: '100%',
            background: `linear-gradient(110deg, transparent 0%, ${PALETTE.gold}22 45%, ${PALETTE.goldBright}55 50%, ${PALETTE.gold}22 55%, transparent 100%)`,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        />

        {product.bestseller && (
          <div
            style={{
              position: 'absolute',
              bottom: 14,
              left: 14,
              background: PALETTE.void,
              color: PALETTE.gold,
              padding: '5px 12px',
              fontFamily: '"Inter", sans-serif',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              border: `1px solid ${PALETTE.gold}`,
              boxShadow: `0 4px 12px ${PALETTE.gold}44`,
            }}
          >
            ✦ Signature
          </div>
        )}
      </div>

      {/* Caption */}
      <div style={{ padding: '20px 22px 22px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
          <span
            style={{
              fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14,
              color: PALETTE.gold,
              fontWeight: 500,
              minWidth: 30,
            }}
          >
            №&nbsp;{String(idx + 1).padStart(2, '0')}
          </span>
          <Eyebrow color={PALETTE.ash}>{product.category}</Eyebrow>
        </div>

        <h3
          style={{
            fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
            fontSize: 'clamp(22px, 2.4vw, 28px)',
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: '0.005em',
            color: PALETTE.cream,
            margin: '4px 0 8px',
          }}
        >
          {product.name}
        </h3>

        {product.description && (
          <p
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14.5,
              color: PALETTE.ash,
              lineHeight: 1.6,
              margin: '0 0 16px',
            }}
          >
            {product.description}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: 14,
            borderTop: `1px solid ${PALETTE.gold}33`,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 22,
                fontWeight: 500,
                color: PALETTE.gold,
                letterSpacing: '0.02em',
              }}
            >
              ₹{product.price}
            </span>
            {product.weight && (
              <span
                style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 10.5,
                  color: PALETTE.ash,
                  marginLeft: 10,
                  letterSpacing: '0.12em',
                  opacity: 0.8,
                }}
              >
                · {product.weight}
              </span>
            )}
          </div>
          <motion.button
            type="button"
            onClick={() => onOrder(product)}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'transparent',
              border: 'none',
              color: PALETTE.gold,
              fontFamily: '"Inter", sans-serif',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: `1px solid ${PALETTE.gold}`,
              paddingBottom: 2,
            }}
          >
            Reserve <span style={{ fontSize: 13 }}>→</span>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Hero with slow camera pan + flickering candle ────────────────

function MidnightHero({ data, onOrder }) {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.18]);
  const titleY = useTransform(scrollYProgress, [0, 1], ['0%', '-25%']);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const titleLines = (data.heroTitle || 'Sweet Moments,\nMade Special').split('\n');
  const monogram = (data.bakeryName || 'C').trim().charAt(0).toUpperCase();

  return (
    <section
      ref={heroRef}
      style={{
        position: 'relative',
        minHeight: 'min(100vh, 760px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: PALETTE.void,
      }}
    >
      {/* Hero image with continuous slow pan + scale (motion-website feel) */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          scale: imgScale,
        }}
      >
        <motion.div
          animate={{
            x: ['-3%', '3%', '-3%'],
            scale: [1.0, 1.04, 1.0],
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <img
            src={data.heroImage || MENU_TEMPLATE_ASSETS.darkHero}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.55) saturate(1.05) contrast(1.1) hue-rotate(-5deg)',
            }}
            onError={(e) => { e.currentTarget.src = MENU_TEMPLATE_ASSETS.darkHero; }}
          />
        </motion.div>
        {/* Heavy vignette + maroon wash */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse at 50% 60%, transparent 0%, ${PALETTE.void}80 70%, ${PALETTE.void} 100%),
              linear-gradient(180deg, ${PALETTE.void}cc 0%, ${PALETTE.velvet}88 40%, ${PALETTE.void}ee 100%)
            `,
          }}
        />
      </motion.div>

      {/* Flickering candle glows — two warm bloom halos */}
      <motion.div
        animate={{ opacity: [0.55, 0.75, 0.55, 0.7, 0.55] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '20%',
          left: '15%',
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${PALETTE.gold}33 0%, transparent 70%)`,
          pointerEvents: 'none',
          filter: 'blur(20px)',
        }}
      />
      <motion.div
        animate={{ opacity: [0.65, 0.5, 0.7, 0.55, 0.65] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '12%',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${PALETTE.goldBright}28 0%, transparent 70%)`,
          pointerEvents: 'none',
          filter: 'blur(18px)',
        }}
      />

      {/* Top masthead */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2 }}
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '24px clamp(20px, 5vw, 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          color: PALETTE.gold,
          fontFamily: '"Inter", sans-serif',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
        }}
      >
        <span>By Candlelight</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: 0.85 }}>
          <span style={{ width: 4, height: 4, background: PALETTE.gold, transform: 'rotate(45deg)' }} />
          {data.bakeryName}
          <span style={{ width: 4, height: 4, background: PALETTE.gold, transform: 'rotate(45deg)' }} />
        </span>
        <span style={{ opacity: 0.7 }}>Est. {new Date().getFullYear()}</span>
      </motion.div>

      {/* Centered monogram + title stack */}
      <motion.div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 'auto',
          marginBottom: 'auto',
          padding: 'clamp(40px, 8vw, 80px) clamp(20px, 5vw, 64px)',
          textAlign: 'center',
          y: titleY,
          opacity: titleOpacity,
          maxWidth: 1100,
          marginInline: 'auto',
          width: '100%',
        }}
      >
        {/* Monogram seal w/ flickering glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.0, delay: 0.3 }}
          style={{ position: 'relative', display: 'inline-block', marginBottom: 28 }}
        >
          <motion.div
            animate={{ opacity: [0.5, 0.9, 0.6, 0.85, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -30,
              background: `radial-gradient(circle, ${PALETTE.gold}55 0%, transparent 70%)`,
              filter: 'blur(12px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: `1.5px solid ${PALETTE.gold}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 36,
              fontWeight: 500,
              color: PALETTE.gold,
              background: `radial-gradient(circle, ${PALETTE.velvet} 0%, ${PALETTE.void} 100%)`,
              boxShadow: `inset 0 0 12px ${PALETTE.gold}33, 0 0 24px ${PALETTE.gold}33`,
            }}
          >
            {monogram}
          </div>
        </motion.div>

        {/* Title — letter stagger reveal */}
        {titleLines.map((line, lineIdx) => (
          <div key={lineIdx} style={{ overflow: 'hidden', lineHeight: 0.95 }}>
            <motion.h1
              initial={{ y: '102%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.1, delay: 0.5 + lineIdx * 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                fontSize: 'clamp(48px, 9vw, 116px)',
                fontWeight: 400,
                fontStyle: lineIdx % 2 === 1 ? 'italic' : 'normal',
                letterSpacing: '0.005em',
                lineHeight: 0.98,
                margin: 0,
                color: PALETTE.cream,
                textShadow: `0 2px 30px ${PALETTE.void}cc, 0 0 50px ${PALETTE.gold}11`,
              }}
            >
              {line}
            </motion.h1>
          </div>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          style={{ marginTop: 28 }}
        >
          <GoldRule width={120} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.0 }}
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(17px, 1.9vw, 22px)',
            color: PALETTE.cream,
            opacity: 0.85,
            margin: '20px auto 0',
            maxWidth: 580,
            lineHeight: 1.55,
          }}
        >
          {data.description}
        </motion.p>

        {/* Reserve CTA */}
        <motion.button
          type="button"
          onClick={() => onOrder()}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.3 }}
          whileHover={{ y: -2, boxShadow: `0 8px 30px ${PALETTE.gold}66` }}
          whileTap={{ scale: 0.97 }}
          style={{
            marginTop: 36,
            background: `linear-gradient(135deg, ${PALETTE.gold} 0%, ${PALETTE.goldBright} 50%, ${PALETTE.gold} 100%)`,
            backgroundSize: '200% 100%',
            color: PALETTE.void,
            border: 'none',
            padding: '15px 36px',
            fontFamily: '"Inter", sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.36em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: `0 4px 20px ${PALETTE.gold}55`,
          }}
        >
          Reserve a Conversation
        </motion.button>
      </motion.div>

      {/* Bottom scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 1.5, delay: 1.6 }}
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          padding: '0 0 24px',
          color: PALETTE.gold,
          fontFamily: '"Inter", sans-serif',
          fontSize: 10,
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
        }}
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          ⌄ Descend
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Section heading ────────────────────────────────────────────────

function SectionHeading({ eyebrow, title, italic }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.0 }}
      style={{ textAlign: 'center', marginBottom: 40 }}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        style={{
          fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
          fontSize: 'clamp(38px, 6vw, 72px)',
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: '0.005em',
          margin: '14px 0 8px',
          color: PALETTE.cream,
          textShadow: `0 0 30px ${PALETTE.gold}22`,
        }}
      >
        {title}
      </h2>
      {italic && (
        <p
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            color: PALETTE.ash,
            margin: '0 0 22px',
            maxWidth: 580,
            marginInline: 'auto',
            lineHeight: 1.55,
          }}
        >
          {italic}
        </p>
      )}
      <GoldRule width={80} />
    </motion.div>
  );
}

// ─── Atelier note (drop cap on dark) ───────────────────────────────

function AtelierNote({ data }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.0 }}
      style={{
        padding: 'clamp(70px, 11vw, 130px) clamp(20px, 6vw, 80px)',
        maxWidth: 920,
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <Eyebrow>From the Atelier</Eyebrow>
      <div style={{ marginTop: 16, marginBottom: 28 }}>
        <GoldRule width={56} />
      </div>
      <p
        style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 'clamp(20px, 2.4vw, 30px)',
          lineHeight: 1.55,
          letterSpacing: '0.005em',
          color: PALETTE.cream,
          margin: 0,
          fontWeight: 400,
        }}
      >
        <span
          style={{
            fontSize: 'clamp(64px, 9vw, 108px)',
            float: 'left',
            lineHeight: 0.85,
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontWeight: 500,
            color: PALETTE.gold,
            paddingRight: 16,
            paddingTop: 8,
            fontStyle: 'italic',
            textShadow: `0 0 20px ${PALETTE.gold}66`,
          }}
        >
          B
        </span>
        y candlelight, our cakes are slower things.{' '}
        <span style={{ color: PALETTE.gold, fontStyle: 'italic' }}>{data.tagline || 'Made with quiet intention.'}</span>{' '}
        Each is folded by hand, marked by gold leaf and a long memory of butter,
        until the room itself begins to glow. <em>Welcome to {data.bakeryName}.</em>
      </p>
    </motion.section>
  );
}

// ─── Main renderer ───────────────────────────────────────────────

export default function MidnightMenuRenderer({ business, settings, products, preview = false }) {
  const data = mergeMenuSettings(business, settings);
  const productCards = normalizeMenuProducts(products);
  const visibleCategories = data.categories.filter((c) => c.visible !== false);
  const allProducts = productCards.filter((p) => p.featured !== false);

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

  return (
    <div
      style={{
        background:
          // Layer 1: subtle velvet noise
          'url("data:image/svg+xml;utf8,' +
          encodeURIComponent(
            '<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/><feColorMatrix values=\'0 0 0 0 0.85  0 0 0 0 0.66  0 0 0 0 0.34  0 0 0 0.04 0\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\'/></svg>'
          ) +
          '") repeat, ' +
          // Layer 2: deep velvet gradient
          `radial-gradient(ellipse at top, ${PALETTE.velvet} 0%, ${PALETTE.void} 70%)`,
        color: PALETTE.cream,
        fontFamily: '"Inter", system-ui, sans-serif',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap');
        .midnight-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 28px;
        }
        @media (min-width: 720px) {
          .midnight-grid { grid-template-columns: 1fr 1fr; gap: 36px 28px; }
        }
        @media (min-width: 1180px) {
          .midnight-grid { grid-template-columns: 1fr 1fr 1fr; gap: 40px 32px; }
        }
        @media (min-width: 720px) {
          .midnight-grid > *:nth-child(2n) { transform: translateY(36px); }
        }
        .midnight-card { transition: transform 0.6s ease, border-color 0.4s ease; }
        .midnight-card:hover { border-color: ${PALETTE.gold}88; transform: translateY(-4px); }
      `}</style>

      <MidnightHero data={data} onOrder={orderProduct} />

      <AtelierNote data={data} />

      {/* ── Product spreads, grouped by category ───────────── */}
      {Array.from(productsByCategory.entries()).map(([catName, list], catIdx) => {
        if (!list.length) return null;
        return (
          <section
            key={catName}
            id={`midnight-cat-${catName.replace(/\s+/g, '-').toLowerCase()}`}
            style={{
              padding: 'clamp(40px, 6vw, 80px) clamp(20px, 6vw, 80px)',
              maxWidth: 1320,
              margin: '0 auto',
            }}
          >
            <SectionHeading
              eyebrow={`Course ${String(catIdx + 1).padStart(2, '0')}`}
              title={catName}
              italic={`A small reserve from our ${catName.toLowerCase()} table.`}
            />
            <div className="midnight-grid">
              {list.map((product, idx) => (
                <VelvetCard
                  key={product.id}
                  product={product}
                  onOrder={orderProduct}
                  idx={idx}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* ── Closing — invitation ────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(80px, 12vw, 140px) clamp(20px, 6vw, 80px)',
          textAlign: 'center',
          background: `
            radial-gradient(ellipse at center, ${PALETTE.velvetMid} 0%, ${PALETTE.void} 80%)
          `,
          borderTop: `1px solid ${PALETTE.gold}33`,
          borderBottom: `1px solid ${PALETTE.gold}33`,
          marginTop: 60,
          position: 'relative',
        }}
      >
        {/* Two flickering candles */}
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.45, 0.65, 0.4] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '20%',
            left: '20%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${PALETTE.gold}33 0%, transparent 70%)`,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />
        <motion.div
          animate={{ opacity: [0.5, 0.35, 0.6, 0.4, 0.5] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '30%',
            right: '20%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${PALETTE.goldBright}28 0%, transparent 70%)`,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <Eyebrow>An Invitation</Eyebrow>
          <h2
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 'clamp(38px, 6.5vw, 72px)',
              fontWeight: 400,
              margin: '14px 0 14px',
              letterSpacing: '0.005em',
              color: PALETTE.cream,
              textShadow: `0 0 40px ${PALETTE.gold}33`,
            }}
          >
            Light a candle. Save us a table.
          </h2>
          <div style={{ marginBottom: 32 }}>
            <GoldRule width={70} />
          </div>
          <motion.button
            type="button"
            onClick={() => orderProduct()}
            whileHover={{ y: -2, boxShadow: `0 8px 30px ${PALETTE.gold}66` }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: `linear-gradient(135deg, ${PALETTE.gold} 0%, ${PALETTE.goldBright} 50%, ${PALETTE.gold} 100%)`,
              color: PALETTE.void,
              border: 'none',
              padding: '16px 38px',
              fontFamily: '"Inter", sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.36em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: `0 4px 20px ${PALETTE.gold}55`,
            }}
          >
            <MessageCircle size={14} /> Reserve Now
          </motion.button>
        </div>
      </section>

      {/* ── Colophon footer ────────────────────────────── */}
      <footer
        style={{
          padding: 'clamp(60px, 8vw, 100px) clamp(20px, 6vw, 80px) 50px',
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 40,
          alignItems: 'flex-start',
          position: 'relative',
        }}
      >
        <div>
          <Eyebrow>The House</Eyebrow>
          <h3
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 28,
              fontWeight: 500,
              margin: '12px 0 8px',
              letterSpacing: '0.005em',
              color: PALETTE.cream,
            }}
          >
            {data.bakeryName}
          </h3>
          <p
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14.5,
              color: PALETTE.ash,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {data.tagline || 'Cakes by candlelight, since always.'}
          </p>
        </div>

        <div>
          <Eyebrow>Hours of Service</Eyebrow>
          <div
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 15,
              color: PALETTE.cream,
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
                style={{
                  background: 'transparent',
                  border: `1px solid ${PALETTE.gold}`,
                  color: PALETTE.gold,
                  padding: '10px 16px',
                  fontFamily: '"Inter", sans-serif',
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
                <MessageCircle size={13} /> WhatsApp
              </button>
            )}
            {instagram && (
              <button
                type="button"
                onClick={() => window.open(`https://instagram.com/${instagram}`, '_blank')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${PALETTE.gold}`,
                  color: PALETTE.gold,
                  padding: '10px 16px',
                  fontFamily: '"Inter", sans-serif',
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
                <Instagram size={13} /> @{instagram}
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Bottom mark */}
      <div
        style={{
          textAlign: 'center',
          padding: '24px 0 60px',
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 12,
          color: PALETTE.ash,
          opacity: 0.7,
        }}
      >
        {'\u2014'} By candlelight at {data.bakeryName} {'\u00B7'} {new Date().getFullYear()} {'\u2014'}
      </div>
      {order.modals}
    </div>
  );
}
