/**
 * @file EditorialMenuRenderer.jsx
 *
 * Editorial Magazine public-menu renderer. Selected via
 * `theme.template === 'editorial'`. Same prop contract as the default
 * `MenuRenderer`: `{ business, settings, products, preview }`.
 *
 * Aesthetic — Vogue / Kinfolk inspired:
 *   - oversized Playfair Display serif headlines + italic subheads
 *   - cream paper background with very subtle grain
 *   - photo-led layouts: full-bleed hero, editorial spreads, asymmetric
 *     two-column layouts with images bleeding into margins
 *   - thin gold rules + small caps issue / volume numbering
 *   - drop caps on the editor's note
 *   - magazine-style numbered index of contents
 *
 * Motion:
 *   - slow parallax on hero image (scroll-driven scale + translateY)
 *   - image zoom-in on scroll into view (1.06 -> 1.0)
 *   - smooth section dissolves (opacity + slight rise)
 *   - hero title letter-stagger reveal
 *
 * No new dependencies. Fonts loaded inline via <style>.
 */

import React, { useMemo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Instagram, MessageCircle, MapPin, Clock3 } from 'lucide-react';
import { mergeMenuSettings, normalizeMenuProducts, MENU_TEMPLATE_ASSETS } from '../../data/menuDefaults';
import useOrderFlow from './useOrderFlow';

// ─── Visual primitives ────────────────────────────────────────────

/**
 * Fine gold rule used as section divider. Width animates in on enter.
 */
function GoldRule({ width = 80, gold = '#B89968' }) {
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      whileInView={{ width, opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
      style={{
        height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${gold} 30%, ${gold} 70%, transparent 100%)`,
        margin: '0 auto',
      }}
    />
  );
}

/**
 * Small-caps eyebrow text, the editorial "category label" style.
 */
function Eyebrow({ children, color = '#1A1410' }) {
  return (
    <div
      style={{
        fontFamily: '"Inter", system-ui, sans-serif',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.32em',
        textTransform: 'uppercase',
        color,
        opacity: 0.78,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Section heading — large serif w/ optional italic flourish line.
 */
function SectionHeading({ eyebrow, title, italic, gold }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
      style={{ textAlign: 'center', marginBottom: 36 }}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 500,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          margin: '10px 0 8px',
          color: '#1A1410',
        }}
      >
        {title}
      </h2>
      {italic && (
        <p
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            color: '#5C4A40',
            margin: '0 0 18px',
            maxWidth: 540,
            marginInline: 'auto',
            lineHeight: 1.55,
          }}
        >
          {italic}
        </p>
      )}
      <GoldRule gold={gold} />
    </motion.div>
  );
}

// ─── Editorial product card — image-first, serif copy ─────────────

function EditorialCard({ product, onOrder, gold, ink, idx }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  // Slow image parallax inside card
  const imageY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1.0, 1.08]);

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
      style={{
        background: 'transparent',
        position: 'relative',
        breakInside: 'avoid',
        marginBottom: 'clamp(40px, 6vw, 72px)',
      }}
    >
      {/* Image block — overflow hidden frame for parallax */}
      <div
        style={{
          width: '100%',
          aspectRatio: idx % 3 === 0 ? '4 / 5' : '1 / 1',
          overflow: 'hidden',
          position: 'relative',
          background: '#EFE7DD',
        }}
      >
        <motion.img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = MENU_TEMPLATE_ASSETS.redVelvet; }}
          style={{
            width: '100%',
            height: '110%',
            objectFit: 'cover',
            y: imageY,
            scale: imageScale,
            filter: 'saturate(0.92) contrast(1.02)',
          }}
        />
        {product.bestseller && (
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              background: 'rgba(250, 246, 240, 0.92)',
              color: ink,
              padding: '4px 10px',
              fontFamily: '"Inter", sans-serif',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              border: `1px solid ${gold}`,
            }}
          >
            Editor's Pick
          </div>
        )}
      </div>

      {/* Caption block */}
      <div style={{ padding: '18px 4px 0', textAlign: 'left' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14,
              color: gold,
              fontWeight: 500,
              minWidth: 32,
            }}
          >
            №&nbsp;{String(idx + 1).padStart(2, '0')}
          </span>
          <Eyebrow color={ink}>{product.category}</Eyebrow>
        </div>

        <h3
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 'clamp(22px, 2.4vw, 30px)',
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: '-0.015em',
            color: ink,
            margin: '4px 0 8px',
          }}
        >
          {product.name}
        </h3>

        {product.description && (
          <p
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 15,
              color: '#5C4A40',
              lineHeight: 1.6,
              margin: '0 0 14px',
              maxWidth: 480,
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
            paddingTop: 12,
            borderTop: `1px solid ${gold}55`,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 22,
                fontWeight: 500,
                color: ink,
                letterSpacing: '-0.01em',
              }}
            >
              ₹{product.price}
            </span>
            {product.weight && (
              <span
                style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 11,
                  color: '#7F6962',
                  marginLeft: 10,
                  letterSpacing: '0.08em',
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
              color: ink,
              fontFamily: '"Inter", sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: `1px solid ${ink}`,
              paddingBottom: 2,
            }}
          >
            Enquire <span style={{ fontSize: 14 }}>→</span>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Hero with parallax and letter-stagger ─────────────────────────

function MagazineHero({ data, onOrder, gold, ink, accent }) {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.02, 1.18]);
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const titleY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const today = useMemo(() => {
    const d = new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  // Letter-stagger animation for the headline
  const titleLines = (data.heroTitle || 'Sweet Moments,\nMade Special').split('\n');

  return (
    <section
      ref={heroRef}
      style={{
        position: 'relative',
        minHeight: 'min(100vh, 720px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Full-bleed image with slow parallax */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          scale: imgScale,
          y: imgY,
        }}
      >
        <img
          src={data.heroImage || MENU_TEMPLATE_ASSETS.luxuryHero}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'saturate(0.85) contrast(1.05) brightness(0.92)',
          }}
          onError={(e) => { e.currentTarget.src = MENU_TEMPLATE_ASSETS.luxuryHero; }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(20,16,12,0.18) 0%, rgba(20,16,12,0.05) 35%, rgba(20,16,12,0.55) 100%)',
          }}
        />
      </motion.div>

      {/* Masthead bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '20px clamp(20px, 4vw, 48px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          color: '#FAF6F0',
          fontFamily: '"Inter", sans-serif',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
        }}
      >
        <span>Vol. 01 · {today}</span>
        <span style={{ opacity: 0.7 }}>The Pâtissier Edition</span>
        <span>№ 001</span>
      </motion.div>

      {/* Title stack — bottom-left */}
      <motion.div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 'auto',
          padding: 'clamp(40px, 8vw, 96px) clamp(20px, 5vw, 64px)',
          color: '#FAF6F0',
          y: titleY,
          opacity: titleOpacity,
          maxWidth: 980,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{ marginBottom: 16 }}
        >
          <Eyebrow color="#FAF6F0">{data.bakeryName}</Eyebrow>
        </motion.div>

        {titleLines.map((line, lineIdx) => (
          <div key={lineIdx} style={{ overflow: 'hidden', lineHeight: 0.95 }}>
            <motion.h1
              initial={{ y: '102%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.0, delay: 0.2 + lineIdx * 0.12, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 'clamp(48px, 10vw, 128px)',
                fontWeight: 500,
                fontStyle: lineIdx % 2 === 1 ? 'italic' : 'normal',
                letterSpacing: '-0.03em',
                lineHeight: 0.95,
                margin: 0,
                color: '#FAF6F0',
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
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(16px, 1.8vw, 20px)',
            color: 'rgba(250, 246, 240, 0.9)',
            margin: '24px 0 0',
            maxWidth: 540,
            lineHeight: 1.55,
          }}
        >
          {data.description}
        </motion.p>

        <motion.button
          type="button"
          onClick={() => onOrder()}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          style={{
            marginTop: 32,
            background: 'transparent',
            border: '1px solid #FAF6F0',
            color: '#FAF6F0',
            padding: '14px 28px',
            fontFamily: '"Inter", sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          Place an Order <span style={{ fontSize: 16 }}>→</span>
        </motion.button>
      </motion.div>

      {/* Bottom-right page corner mark */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={{ duration: 1.4, delay: 1 }}
        style={{
          position: 'absolute',
          right: 'clamp(20px, 4vw, 48px)',
          bottom: 'clamp(20px, 4vw, 48px)',
          color: '#FAF6F0',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 'clamp(13px, 1.4vw, 16px)',
          textAlign: 'right',
          zIndex: 2,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', fontStyle: 'normal', fontFamily: 'Inter', marginBottom: 4, opacity: 0.7 }}>
          Cover Story
        </div>
        A house of <br />
        <span style={{ fontSize: 'clamp(20px, 2vw, 24px)' }}>cakes &amp; quiet luxury.</span>
      </motion.div>
    </section>
  );
}

// ─── Editor's note (drop cap spread) ─────────────────────────────

function EditorsNote({ data, gold, ink }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9 }}
      style={{
        padding: 'clamp(60px, 10vw, 120px) clamp(20px, 6vw, 80px)',
        maxWidth: 880,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <Eyebrow color={ink}>From the Kitchen</Eyebrow>
      <div style={{ marginTop: 14, marginBottom: 24 }}>
        <GoldRule gold={gold} width={56} />
      </div>
      <p
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(20px, 2.4vw, 28px)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
          color: ink,
          margin: 0,
          fontWeight: 500,
        }}
      >
        <span
          style={{
            fontSize: 'clamp(60px, 8vw, 96px)',
            float: 'left',
            lineHeight: 0.85,
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 600,
            color: gold,
            paddingRight: 14,
            paddingTop: 6,
            fontStyle: 'italic',
          }}
        >
          A
        </span>
        t {data.bakeryName}, every cake is a small story — folded in butter,
        whispered in vanilla, tied with a thread of intention. {data.tagline ? `${data.tagline}.` : 'Made with love.'}{' '}
        <em>This menu is our season&apos;s diary.</em>
      </p>
    </motion.section>
  );
}

// ─── Numbered table of contents (index page) ─────────────────────

function TableOfContents({ categories, gold, ink, onJump }) {
  if (!categories.length) return null;
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9 }}
      style={{
        padding: '20px clamp(20px, 6vw, 80px) 60px',
        maxWidth: 1080,
        margin: '0 auto',
      }}
    >
      <SectionHeading
        eyebrow="Table of Contents"
        title="The Index"
        italic="An ordered tour through this season's offerings."
        gold={gold}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '4px 36px',
          marginTop: 24,
        }}
      >
        {categories.map((cat, idx) => (
          <motion.button
            key={cat.id || cat.name}
            type="button"
            onClick={() => onJump(cat.name)}
            whileHover={{ x: 6 }}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.06, duration: 0.6 }}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 14,
              padding: '14px 4px',
              borderBottom: `1px solid ${gold}40`,
              background: 'transparent',
              border: 'none',
              borderBottomStyle: 'solid',
              borderBottomWidth: 1,
              borderBottomColor: `${gold}40`,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 14,
                color: gold,
                minWidth: 36,
              }}
            >
              №&nbsp;{String(idx + 1).padStart(2, '0')}
            </span>
            <span
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 'clamp(20px, 2.2vw, 26px)',
                color: ink,
                flex: 1,
                fontWeight: 500,
              }}
            >
              {cat.name}
            </span>
            <span
              style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: 11,
                color: '#9C8A80',
                letterSpacing: '0.18em',
              }}
            >
              p. {String((idx + 1) * 7).padStart(2, '0')}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}

// ─── Pull-quote spread ─────────────────────────────────────────────

function PullQuote({ quote, attribution, gold, ink }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 1.0 }}
      style={{
        padding: 'clamp(80px, 12vw, 140px) clamp(20px, 6vw, 80px)',
        textAlign: 'center',
        maxWidth: 980,
        margin: '0 auto',
        position: 'relative',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(96px, 14vw, 180px)',
          color: gold,
          opacity: 0.35,
          lineHeight: 0.7,
          display: 'block',
          marginBottom: -20,
        }}
      >
        “
      </span>
      <p
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 'clamp(24px, 3.6vw, 44px)',
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
          color: ink,
          margin: '0 auto',
          fontWeight: 500,
        }}
      >
        {quote}
      </p>
      <div style={{ marginTop: 28 }}>
        <GoldRule gold={gold} width={40} />
      </div>
      <div style={{ marginTop: 14 }}>
        <Eyebrow color={ink}>{attribution}</Eyebrow>
      </div>
    </motion.section>
  );
}

// ─── Main renderer ───────────────────────────────────────────────

export default function EditorialMenuRenderer({ business, settings, products, preview = false }) {
  const data = mergeMenuSettings(business, settings);
  const productCards = normalizeMenuProducts(products);
  const visibleCategories = data.categories.filter((c) => c.visible !== false);
  const allProducts = productCards.filter((p) => p.featured !== false);

  const accent = data.theme?.primaryColor || '#8C4A52';
  const ink = '#1A1410';
  const cream = '#FAF6F0';
  const gold = '#B89968';

  const whatsappNumber = String(data.whatsapp || '').replace(/[^\d]/g, '');
  const instagram = String(data.instagram || '').replace('@', '');

  const order = useOrderFlow({ business, data });
  const orderProduct = (product) => order.open(product || null);

  // Group products by category for the magazine spread
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

  const jumpToCategory = (name) => {
    const el = document.getElementById(`editorial-cat-${name.replace(/\s+/g, '-').toLowerCase()}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      style={{
        background:
          'url("data:image/svg+xml;utf8,' +
          encodeURIComponent(
            '<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'140\' height=\'140\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.95\' numOctaves=\'2\' stitchTiles=\'stitch\'/><feColorMatrix values=\'0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.10  0 0 0 0.025 0\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\'/></svg>'
          ) +
          '") repeat, ' +
          cream,
        color: ink,
        fontFamily: '"Inter", system-ui, sans-serif',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap');
        .editorial-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px;
        }
        @media (min-width: 720px) {
          .editorial-grid { grid-template-columns: 1fr 1fr; gap: 56px 48px; }
        }
        @media (min-width: 1180px) {
          .editorial-grid { grid-template-columns: 1fr 1fr 1fr; gap: 64px 56px; }
        }
        .editorial-grid > *:nth-child(6n+1) { transform: translateY(0); }
        @media (min-width: 720px) {
          .editorial-grid > *:nth-child(2n) { transform: translateY(48px); }
        }
      `}</style>

      <MagazineHero data={data} onOrder={orderProduct} gold={gold} ink={ink} accent={accent} />

      <EditorsNote data={data} gold={gold} ink={ink} />

      <TableOfContents
        categories={visibleCategories}
        gold={gold}
        ink={ink}
        onJump={jumpToCategory}
      />

      <PullQuote
        quote={`Cake is the story of a Sunday \u2014 quiet, generous, lasting longer than the room remembers.`}
        attribution={`A note from ${data.bakeryName}`}
        gold={gold}
        ink={ink}
      />

      {/* ── Product spreads, grouped by category ───────────── */}
      {Array.from(productsByCategory.entries()).map(([catName, list], catIdx) => {
        if (!list.length) return null;
        return (
          <section
            key={catName}
            id={`editorial-cat-${catName.replace(/\s+/g, '-').toLowerCase()}`}
            style={{
              padding: 'clamp(40px, 6vw, 80px) clamp(20px, 6vw, 80px)',
              maxWidth: 1320,
              margin: '0 auto',
            }}
          >
            <SectionHeading
              eyebrow={`Chapter ${String(catIdx + 1).padStart(2, '0')}`}
              title={catName}
              italic={`A curated selection from our ${catName.toLowerCase()} archive.`}
              gold={gold}
            />
            <div className="editorial-grid">
              {list.map((product, idx) => (
                <EditorialCard
                  key={product.id}
                  product={product}
                  onOrder={orderProduct}
                  gold={gold}
                  ink={ink}
                  idx={idx}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* ── Closing spread ──────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(80px, 12vw, 140px) clamp(20px, 6vw, 80px)',
          textAlign: 'center',
          background: '#F2EAE0',
          borderTop: `1px solid ${gold}40`,
          borderBottom: `1px solid ${gold}40`,
          marginTop: 60,
        }}
      >
        <Eyebrow color={ink}>Closing Pages</Eyebrow>
        <h2
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 500,
            margin: '14px 0 12px',
            letterSpacing: '-0.02em',
            color: ink,
          }}
        >
          Until next season.
        </h2>
        <div style={{ marginBottom: 24 }}>
          <GoldRule gold={gold} width={60} />
        </div>
        <motion.button
          type="button"
          onClick={() => orderProduct()}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: ink,
            color: cream,
            border: 'none',
            padding: '16px 32px',
            fontFamily: '"Inter", sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <MessageCircle size={14} /> Begin Your Order
        </motion.button>
      </section>

      {/* ── Colophon footer ────────────────────────────── */}
      <footer
        style={{
          padding: 'clamp(60px, 8vw, 100px) clamp(20px, 6vw, 80px) 60px',
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 40,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Eyebrow color={ink}>Colophon</Eyebrow>
          <h3
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 28,
              fontWeight: 500,
              margin: '12px 0 8px',
              letterSpacing: '-0.015em',
              color: ink,
            }}
          >
            {data.bakeryName}
          </h3>
          <p
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14,
              color: '#5C4A40',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {data.tagline || 'A house of cakes and quiet luxury.'}
          </p>
        </div>

        <div>
          <Eyebrow color={ink}>Visit & Hours</Eyebrow>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 15,
              color: ink,
              marginTop: 12,
              lineHeight: 1.7,
            }}
          >
            <p style={{ margin: 0, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Clock3 size={14} style={{ marginTop: 4, color: gold, flexShrink: 0 }} />
              <span>{data.timings}</span>
            </p>
            {(data.deliveryLocations || data.city) && (
              <p style={{ margin: '8px 0 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <MapPin size={14} style={{ marginTop: 4, color: gold, flexShrink: 0 }} />
                <span>{data.deliveryLocations || data.city}</span>
              </p>
            )}
          </div>
        </div>

        <div>
          <Eyebrow color={ink}>Correspondence</Eyebrow>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {whatsappNumber && (
              <button
                type="button"
                onClick={() => orderProduct()}
                style={{
                  background: 'transparent',
                  border: `1px solid ${ink}`,
                  color: ink,
                  padding: '10px 14px',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  alignSelf: 'flex-start',
                }}
              >
                <MessageCircle size={14} /> WhatsApp
              </button>
            )}
            {instagram && (
              <button
                type="button"
                onClick={() => window.open(`https://instagram.com/${instagram}`, '_blank')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${ink}`,
                  color: ink,
                  padding: '10px 14px',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  alignSelf: 'flex-start',
                }}
              >
                <Instagram size={14} /> @{instagram}
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Issue mark */}
      <div
        style={{
          textAlign: 'center',
          padding: '20px 0 60px',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 12,
          color: '#9C8A80',
        }}
      >
        — End of Issue №&nbsp;001 · {new Date().getFullYear()} —
      </div>
      {order.modals}
    </div>
  );
}
