import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronLeft, Palette, Type, Layout, Sparkles, 
  Eye, Save, ArrowLeft, Check, Plus, Image as ImageIcon,
  Instagram, MessageCircle, Phone, MapPin, Clock, Star,
  Smartphone, Monitor, Zap, Globe, Menu, Settings, List,
  Heart, ShoppingBag, Info, Share2, Copy, Send, X, Camera,
  Play, Users, Award, PlayCircle, MoreHorizontal, User,
  Calendar, ShoppingCart, ArrowDown, ExternalLink, Loader2,
  CheckCircle2, Trash2, LayoutGrid, Layers, MousePointer2,
  Clock3, ThumbsUp, ShieldCheck, PieChart, Wand2, ArrowRight,
  Star as StarIcon
} from 'lucide-react';

// --- PREVIEW HELPERS ---
const StarRating = ({ rating = 5, color = '#FFB400' }) => (
  <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
    {[...Array(5)].map((_, i) => (
      <StarIcon key={i} size={10} fill={i < rating ? color : 'transparent'} color={i < rating ? color : '#CBD5E1'} />
    ))}
  </div>
);

const HandDrawnDoodle = ({ type, color, style }) => {
  if (type === 'circle') return (
    <svg viewBox="0 0 100 100" style={{ ...style, pointerEvents: 'none' }}>
      <path d="M50,10 C25,10 10,25 10,50 C10,75 25,90 50,90 C75,90 90,75 90,50 C90,25 75,10 52,10.5" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
  if (type === 'heart') return (
    <svg viewBox="0 0 100 100" style={{ ...style, pointerEvents: 'none' }}>
      <path d="M50,30 C35,10 10,20 10,45 C10,70 50,90 50,90 C50,90 90,70 90,45 C90,20 65,10 50,30" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
  return null;
};
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeToBusiness, 
  updateBusinessInDB, 
  subscribeToProducts,
  subscribeToStories,
  addStoryToDB,
  deleteStoryFromDB,
  subscribeToPortfolioSettings,
  updatePortfolioSettings
} from '../services/db';
import { uploadToCloudinary } from '../services/cloudinary';
import { TEMPLATES } from '../data/templates';
import { showToast, triggerHaptic } from '../components/iOS';
import { formatCurrency } from '../utils/date';

// New Components
import PortfolioAnalytics from '../components/portfolio/PortfolioAnalytics';
import ShareModal from '../components/portfolio/ShareModal';
import PremiumOnboarding from '../components/portfolio/PremiumOnboarding';

// --- MOBILE PREVIEW ---
const MobilePreview = ({ baker, products, selectedTemplate, settings }) => {
  const theme = {
    ...selectedTemplate,
    accent: settings.primaryColor || selectedTemplate.styles.accent,
    bg: selectedTemplate.styles.bg || '#FFFBFA',
    text: selectedTemplate.styles.text || '#0F172A',
    fontPrimary: settings.font || selectedTemplate.styles.font,
    fontSecondary: selectedTemplate.styles.bodyFont || "'Inter', sans-serif"
  };

  const isBakerly = selectedTemplate.id === 'bakerly-artisan';

  const displayProducts = settings.selectedProductIds?.length > 0 
    ? products.filter(p => settings.selectedProductIds.includes(p.id))
    : (products.length > 0 ? products : selectedTemplate.mockProducts);

  return (
    <div style={{ 
      width: 320, height: 640, background: '#000', borderRadius: 54, 
      padding: 12, position: 'relative', 
      boxShadow: '0 0 0 2px #444, 0 0 0 6px #222, 0 50px 100px -20px rgba(0,0,0,0.5)',
      border: '1px solid #555'
    }}>
      {/* iPhone Dynamic Island Mock */}
      <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', width: 120, height: 35, background: '#000', borderRadius: 24, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
         <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#111', border: '1px solid rgba(255,255,255,0.1)' }} />
         <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
      </div>
      <div style={{ width: '100%', height: '100%', background: theme.bg, borderRadius: 42, overflow: 'hidden', overflowY: 'auto' }} className="hide-scrollbar">
        {/* Landing Page Content */}
        <div style={{ background: theme.bg, color: theme.text, minHeight: '100%', fontFamily: theme.fontSecondary }}>
          {/* HERO */}
          <section style={{ 
            padding: '60px 20px 40px', 
            textAlign: 'center', 
            background: settings.coverUrl ? `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3)), url(${settings.coverUrl})` : `${theme.accent}10`, 
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative', 
            overflow: 'hidden',
            color: settings.coverUrl ? 'white' : theme.text
          }}>
            {selectedTemplate.styles.hasDoodles && !settings.coverUrl && (
              <>
                <HandDrawnDoodle type="circle" color={selectedTemplate.styles.secondary} style={{ position: 'absolute', top: '10%', left: '5%', width: 50, height: 50, rotate: '-15deg', opacity: 0.2 }} />
                <HandDrawnDoodle type="heart" color={selectedTemplate.styles.tertiary} style={{ position: 'absolute', bottom: '15%', right: '5%', width: 40, height: 40, rotate: '12deg', opacity: 0.2 }} />
              </>
            )}

            {settings.logoUrl ? (
              <img src={settings.logoUrl} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `4px solid white`, boxShadow: '0 10px 20px rgba(0,0,0,0.1)', marginBottom: 20 }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: theme.accent, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 20px', border: '4px solid white', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                {settings.bakeryName?.[0] || 'C'}
              </div>
            )}
            <h1 style={{ 
              fontSize: '1.6rem', 
              fontWeight: 900, 
              margin: 0, 
              fontFamily: theme.fontPrimary,
              textTransform: selectedTemplate.styles.isLowercase ? 'lowercase' : 'none'
            }}>
              {settings.bakeryName || baker?.name || 'My Bakery'}
            </h1>
            <p style={{ 
              color: '#64748B', 
              fontSize: '0.85rem', 
              marginTop: 8,
              textTransform: selectedTemplate.styles.isLowercase ? 'lowercase' : 'none'
            }}>
              {settings.tagline || 'Homemade with love'}
            </p>
            
            <button style={{ background: isBakerly ? selectedTemplate.styles.secondary : theme.accent, color: 'white', border: 'none', width: '100%', height: 50, borderRadius: 100, fontWeight: 800, marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <MessageCircle size={18} /> Order Now
            </button>
          </section>

          {/* MENU */}
          <section style={{ padding: '30px 20px 40px' }}>
            <h3 style={{ 
              fontSize: '0.75rem', 
              fontWeight: 900, 
              letterSpacing: 2, 
              color: theme.accent, 
              marginBottom: 20, 
              textTransform: selectedTemplate.styles.isLowercase ? 'lowercase' : 'uppercase',
              paddingLeft: 10 
            }}>
              The Menu
            </h3>
            {displayProducts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {displayProducts.map((p, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.02)', border: '1px solid #F1F5F9', position: 'relative' }}>
                    {isBakerly && (p.isNew || p.onSale) && (
                      <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 5, display: 'flex', gap: 4 }}>
                        {p.isNew && <div style={{ background: '#E31837', color: 'white', padding: '2px 6px', borderRadius: 10, fontSize: '0.5rem', fontWeight: 900 }}>NEW</div>}
                      </div>
                    )}
                    <img src={p.imageUrl || p.img} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                    <div style={{ padding: 12 }}>
                      <div style={{ 
                        fontWeight: 800, 
                        fontSize: '0.75rem', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        textTransform: selectedTemplate.styles.isLowercase ? 'lowercase' : 'none'
                      }}>
                        {p.name}
                      </div>
                      {(selectedTemplate.styles.hasStars || p.rating) && <StarRating rating={p.rating || 5} color={isBakerly ? '#E31837' : '#FFB400'} />}
                      <div style={{ color: theme.text, fontWeight: 900, fontSize: '0.75rem', marginTop: 4 }}>₹{p.basePrice || p.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', background: '#F8FAFC', borderRadius: 20, color: '#94A3B8', fontWeight: 700 }}>
                Menu coming soon
              </div>
            )}
          </section>

          {/* FOOTER */}
          <section style={{ padding: '40px 20px', background: '#0F172A', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>{settings.city || 'Based in your city'}</div>
            <div style={{ fontSize: '0.65rem', opacity: 0.4 }}>Powered by Cream & Crust</div>
          </section>
        </div>
      </div>
    </div>
  );
};

const MENU_ASSETS = {
  truffle: '/assets/templates/product_truffle_1778776334868.png',
  redVelvet: '/assets/templates/product_red_velvet_1778776354239.png',
  butterscotch: '/assets/templates/playful_modern_hero_1778776279319.png',
  bento: '/assets/templates/product_bento_1778776389537.png',
  cheesecake: '/assets/templates/product_cheesecake_1778776370456.png',
  custom: '/assets/templates/wedding_premium_hero_1778776255942.png',
  darkHero: '/assets/templates/modern_dark_hero_1778776217862.png',
  luxuryHero: '/assets/templates/luxury_minimal_hero_1778776200555.png'
};

const DEFAULT_SHARED_MENU = {
  bakeryName: 'Cream & Crust',
  tagline: 'Made with love',
  heroTitle: 'Sweet Moments,\nMade Special',
  description: 'Homemade cakes & desserts for every occasion',
  whatsapp: '919876543210',
  instagram: 'creamandcrust',
  city: 'Lucknow, Uttar Pradesh',
  timings: '9:00 AM - 9:00 PM (Daily)'
};

const defaultCategories = [
  { name: 'Cakes', image: MENU_ASSETS.redVelvet },
  { name: 'Bento Cakes', image: MENU_ASSETS.bento },
  { name: 'Brownies', image: MENU_ASSETS.darkHero },
  { name: 'Cupcakes', image: MENU_ASSETS.redVelvet },
  { name: 'Desserts', image: MENU_ASSETS.cheesecake },
  { name: 'Custom Cakes', image: MENU_ASSETS.custom }
];

const defaultBestsellers = [
  { name: 'Chocolate Truffle Cake', description: 'Rich, moist chocolate cake with chocolate ganache', price: 650, image: MENU_ASSETS.truffle, bestseller: true },
  { name: 'Red Velvet Cake', description: 'Classic red velvet with cream cheese frosting', price: 600, image: MENU_ASSETS.redVelvet },
  { name: 'Butterscotch Cake', description: 'Butterscotch sponge with caramel crunch', price: 550, image: MENU_ASSETS.butterscotch }
];

const defaultCakeList = [
  { name: 'Black Forest Cake', description: 'Chocolate sponge with cherry & whipped cream', price: 600, image: MENU_ASSETS.truffle, eggless: true },
  { name: 'Pineapple Cake', description: 'Soft vanilla sponge with fresh pineapple', price: 500, image: MENU_ASSETS.butterscotch, eggless: true },
  { name: 'Blueberry Cheesecake', description: 'Creamy cheesecake with blueberry topping', price: 750, image: MENU_ASSETS.cheesecake, eggless: true },
  { name: 'Chocolate Ganache Cake', description: 'Rich chocolate cake with smooth ganache', price: 650, image: MENU_ASSETS.truffle },
  { name: 'Mocha Cake', description: 'Coffee sponge with mocha cream', price: 600, image: MENU_ASSETS.luxuryHero },
  { name: 'Caramel Cake', description: 'Soft caramel cake with butterscotch crunch', price: 550, image: MENU_ASSETS.butterscotch }
];

const menuImageForProduct = (product, index = 0) => (
  product?.imageUrl || product?.img || [MENU_ASSETS.truffle, MENU_ASSETS.redVelvet, MENU_ASSETS.butterscotch, MENU_ASSETS.cheesecake][index % 4]
);

const normalizeSharedMenuData = ({ business, products, settings }) => {
  const selectedProducts = settings.selectedProductIds?.length > 0
    ? products.filter(p => settings.selectedProductIds.includes(p.id))
    : products;
  const usableProducts = selectedProducts.filter(p => p?.name).slice(0, 9);
  const productCards = usableProducts.map((p, i) => ({
    name: p.name,
    description: p.description || 'Freshly baked with premium ingredients',
    price: p.basePrice || p.price || 650,
    image: menuImageForProduct(p, i),
    bestseller: p.bestseller || p.isBestseller
  }));
  const bestsellers = productCards.filter(p => p.bestseller).slice(0, 3);

  return {
    bakeryName: settings.bakeryName || business?.name || DEFAULT_SHARED_MENU.bakeryName,
    tagline: settings.tagline || DEFAULT_SHARED_MENU.tagline,
    heroTitle: DEFAULT_SHARED_MENU.heroTitle,
    description: settings.bio || DEFAULT_SHARED_MENU.description,
    whatsapp: settings.whatsapp || business?.whatsapp || business?.phone || DEFAULT_SHARED_MENU.whatsapp,
    instagram: (settings.instagram || business?.instagram || DEFAULT_SHARED_MENU.instagram).replace('@', ''),
    city: settings.city || business?.city || DEFAULT_SHARED_MENU.city,
    timings: settings.timings || DEFAULT_SHARED_MENU.timings,
    logo: settings.logoUrl || '/logo.png',
    shareUrl: `creamandcrust.online/menu/${business?.username || 'bharat'}`,
    categories: defaultCategories,
    bestsellers: bestsellers.length >= 3 ? bestsellers : defaultBestsellers,
    allCakes: productCards.length >= 6 ? productCards.slice(0, 6) : defaultCakeList
  };
};

const SectionTitle = ({ children, align = 'left' }) => (
  <div className={`shared-menu-section-title ${align === 'center' ? 'center' : ''}`}>
    <span>✣</span>
    <h3>{children}</h3>
    {align === 'center' && <span>✣</span>}
  </div>
);

const CategoryTile = ({ category, compact = false }) => (
  <div className={compact ? 'mobile-category-tile' : 'desktop-category-tile'}>
    <img src={category.image} alt={category.name} />
    <span>{category.name}</span>
  </div>
);

const BestsellerCard = ({ product, compact = false, onOrder }) => (
  <article className={compact ? 'mobile-bestseller-card' : 'desktop-bestseller-card'}>
    <div className="shared-product-image-wrap">
      {product.bestseller && <span className="shared-badge">Bestseller</span>}
      <img src={product.image} alt={product.name} />
    </div>
    <div className="shared-card-copy">
      <h4>{product.name}</h4>
      <p>{product.description}</p>
      <div className="shared-price-row">
        <div>
          <strong>₹{product.price}</strong>
          <small>Starting Price</small>
        </div>
        <button type="button" onClick={onOrder} aria-label={`Order ${product.name}`} className="round-plus">+</button>
      </div>
      {!compact && (
        <button type="button" onClick={onOrder} className="shared-order-button">
          <MessageCircle size={13} /> Order Now
        </button>
      )}
    </div>
  </article>
);

const ProductListItem = ({ product, onOrder }) => (
  <article className="shared-list-item">
    <img src={product.image} alt={product.name} />
    <div>
      <div className="shared-list-name">
        <h4>{product.name}</h4>
        {product.eggless && <span>Eggless</span>}
      </div>
      <p>{product.description}</p>
      <strong>₹{product.price}</strong>
    </div>
    <button type="button" onClick={onOrder} aria-label={`Order ${product.name}`}>
      <MessageCircle size={21} />
    </button>
  </article>
);

const TrustBadges = () => (
  <div className="shared-trust-row">
    {[
      { icon: Heart, title: '100% Fresh', text: 'Made to order' },
      { icon: Award, title: 'Premium Quality', text: 'Best ingredients' },
      { icon: ShoppingBag, title: 'Hygienic Kitchen', text: 'Clean & safe' },
      { icon: Clock3, title: 'On-time Delivery', text: 'Always on time' }
    ].map(item => (
      <div key={item.title} className="shared-trust-item">
        <item.icon size={24} />
        <div><strong>{item.title}</strong><span>{item.text}</span></div>
      </div>
    ))}
  </div>
);

const SharedMenuHeader = ({ data, onWhatsApp, onInstagram }) => (
  <header className="shared-menu-nav">
    <div className="shared-brand">
      <img src={data.logo} alt={`${data.bakeryName} logo`} onError={e => { e.currentTarget.src = '/logo.png'; }} />
      <div>
        <h2>{data.bakeryName}</h2>
        <p>{data.tagline} ❤</p>
      </div>
    </div>
    <div className="shared-socials">
      <button type="button" onClick={onWhatsApp}><MessageCircle size={23} /><span>WhatsApp</span></button>
      <button type="button" onClick={onInstagram}><Instagram size={23} /><span>Instagram</span></button>
    </div>
  </header>
);

const DesktopMenuPreview = ({ data, onWhatsApp, onInstagram }) => (
  <section className="desktop-menu-preview">
    <SharedMenuHeader data={data} onWhatsApp={onWhatsApp} onInstagram={onInstagram} />

    <section className="shared-hero">
      <div>
        <h1>{data.heroTitle}<span>♡</span></h1>
        <p>{data.description}</p>
        <button type="button" onClick={onWhatsApp}><MessageCircle size={16} /> Order on WhatsApp</button>
      </div>
      <img src={MENU_ASSETS.truffle} alt="Chocolate truffle cake" />
    </section>

    <section className="shared-categories">
      <SectionTitle align="center">Our Categories</SectionTitle>
      <div className="desktop-category-grid">
        {data.categories.map(category => <CategoryTile key={category.name} category={category} />)}
      </div>
    </section>

    <section className="shared-bestsellers">
      <div className="shared-row-heading"><SectionTitle>Bestseller Cakes</SectionTitle><button type="button">View all</button></div>
      <div className="desktop-bestseller-grid">
        {data.bestsellers.map(product => <BestsellerCard key={product.name} product={product} onOrder={onWhatsApp} />)}
      </div>
    </section>

    <section className="shared-all-cakes">
      <div className="shared-row-heading"><h3>All Cakes</h3><button type="button">View all</button></div>
      <div className="shared-list-grid">
        {data.allCakes.map(product => <ProductListItem key={product.name} product={product} onOrder={onWhatsApp} />)}
      </div>
    </section>

    <section className="shared-custom-banner">
      <div>
        <h3>Custom Cakes for Every Occasion</h3>
        <p>Birthdays, Anniversaries, Weddings & more</p>
        <button type="button" onClick={onWhatsApp}>Order Custom Cake</button>
      </div>
      <img src={MENU_ASSETS.custom} alt="Custom pink cake" />
    </section>

    <TrustBadges />

    <footer className="shared-menu-footer">
      <div>
        <h3>Let's Stay Connected</h3>
        <p>Follow us on Instagram for amazing creations and latest updates</p>
        <div className="footer-grid-images">
          {[MENU_ASSETS.butterscotch, MENU_ASSETS.redVelvet, MENU_ASSETS.custom, MENU_ASSETS.cheesecake].map(src => <img key={src} src={src} alt="" />)}
        </div>
        <small>© 2025 {data.bakeryName}. All Rights Reserved.</small>
      </div>
      <div className="footer-contact">
        <h3>Contact Us</h3>
        <p><MessageCircle size={18} /> <span>WhatsApp<br />+{data.whatsapp}</span></p>
        <p><MapPin size={18} /> <span>Location<br />{data.city}</span></p>
        <p><Clock size={18} /> <span>Timings<br />{data.timings}</span></p>
      </div>
    </footer>
  </section>
);

const PhoneMockup = ({ data, onWhatsApp, onInstagram }) => (
  <div className="phone-shell">
    <div className="phone-speaker" />
    <div className="phone-screen">
      <div className="phone-status"><span>9:41</span><span>▮▮▮ ◐ ▰</span></div>
      <header className="phone-topbar">
        <Menu size={18} />
        <div><img src={data.logo} alt="" /><span>{data.bakeryName}</span><small>{data.tagline} ❤</small></div>
        <div className="cart-dot"><ShoppingCart size={17} /><em>2</em></div>
      </header>
      <section className="phone-hero">
        <div>
          <h2>{data.heroTitle}</h2>
          <p>{data.description}</p>
          <button type="button" onClick={onWhatsApp}><MessageCircle size={11} /> Order on WhatsApp</button>
        </div>
        <img src={MENU_ASSETS.truffle} alt="" />
      </section>
      <div className="phone-categories">
        {data.categories.map(category => <CategoryTile key={category.name} category={category} compact />)}
      </div>
      <section className="phone-bestsellers">
        <div className="phone-section-head"><h3>✣ Bestsellers</h3><span>View all</span></div>
        <div className="phone-card-grid">
          {data.bestsellers.map(product => <BestsellerCard key={product.name} product={product} compact onOrder={onWhatsApp} />)}
        </div>
      </section>
      <section className="phone-custom">
        <div><h3>Custom Cakes for Every Occasion</h3><p>Birthdays, Anniversaries, Weddings & more</p><button type="button" onClick={onWhatsApp}>Order Custom Cake</button></div>
        <img src={MENU_ASSETS.custom} alt="" />
      </section>
      <TrustBadges />
      <footer className="phone-footer">
        <button type="button" onClick={onWhatsApp}><MessageCircle size={15} /> Whatsapp Us</button>
        <img src={data.logo} alt="" />
        <button type="button" onClick={onInstagram}><Instagram size={15} /> Follow Us</button>
      </footer>
    </div>
  </div>
);

const ShareMenuCard = ({ data, onCopy, onWhatsApp, onInstagram }) => (
  <section className="share-menu-card">
    <h2>SHARE YOUR MENU ✨</h2>
    <p>Customers can view your menu and place inquiries directly on WhatsApp</p>
    <div className="share-link-field">
      <span>{data.shareUrl}</span>
      <button type="button" onClick={onCopy}><Copy size={14} /> Copy Link</button>
    </div>
    <div className="share-action-grid">
      {[
        { label: 'WhatsApp', icon: MessageCircle, action: onWhatsApp, color: '#25D366' },
        { label: 'Instagram', icon: Instagram, action: onInstagram, color: '#E64A87' },
        { label: 'Share Link', icon: Share2, action: onCopy, color: '#4B2A1D' },
        { label: 'Download', icon: ArrowDown, action: () => showToast('Menu download preview is ready', 'info'), color: '#2F80ED' }
      ].map(item => (
        <button type="button" key={item.label} onClick={item.action}>
          <span style={{ color: item.color, background: `${item.color}14` }}><item.icon size={25} /></span>
          {item.label}
        </button>
      ))}
    </div>
  </section>
);

const WhatsAppPreviewCard = ({ data }) => (
  <section className="social-preview-card whatsapp-preview">
    <h3>SHARED ON WHATSAPP</h3>
    <div>
      <img src={MENU_ASSETS.truffle} alt="" />
      <article>
        <strong>{data.bakeryName} Menu</strong>
        <p>Sweet moments menu special ❤</p>
        <p>Check out our menu and order your favorites!</p>
        <small>creamandcrust.online</small>
      </article>
      <span>9:41 AM ✓✓</span>
    </div>
  </section>
);

const InstagramStoryPreview = ({ data }) => (
  <section className="social-preview-card insta-preview">
    <h3>SHARED ON INSTAGRAM STORIES</h3>
    <div>
      <img src={MENU_ASSETS.truffle} alt="" />
      <div className="insta-story-top"><span>@{data.instagram} 2h</span><X size={18} /></div>
      <article>
        <h4>Our Menu</h4>
        <p>{data.tagline} ❤</p>
        <button type="button"><Globe size={13} /> ORDER NOW</button>
      </article>
    </div>
  </section>
);

export default function PortfolioBuilder() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & UI State
  const [view, setView] = useState('home'); // 'home', 'editor', 'templates'
  const [activeTab, setActiveTab] = useState('appearance');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [portfolioSettings, setPortfolioSettings] = useState({
    bakeryName: '',
    tagline: '',
    bio: '',
    whatsapp: '',
    instagram: '',
    city: '',
    logoUrl: '',
    coverUrl: '',
    primaryColor: TEMPLATES[0].styles.accent,
    trustBadges: ['100% Homemade', 'Custom Orders Welcome', 'On-time Delivery'],
    font: TEMPLATES[0].styles.font,
    selectedProductIds: []
  });

  const [isUploading, setIsUploading] = useState(false);
  const logoUploadRef = useRef(null);
  const coverUploadRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    const unsubBiz = subscribeToBusiness(async (biz) => {
      setBusiness(biz);
      if (!biz.portfolioTemplate) {
        setShowOnboarding(false);
      }
      
      // Auto-generate username if missing for legacy accounts
      if (biz.id && !biz.username) {
        const generated = (biz.name || currentUser.displayName || currentUser.email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(100 + Math.random() * 900);
        await updateBusinessInDB(biz.id, { username: generated });
      } else if (biz.id && biz.username && biz.username !== biz.username.toLowerCase()) {
        // Migrate mixed-case usernames to lowercase
        await updateBusinessInDB(biz.id, { username: biz.username.toLowerCase() });
      }

      if (biz.portfolioTemplate) {
        const t = TEMPLATES.find(temp => temp.id === biz.portfolioTemplate);
        if (t) setSelectedTemplate(t);
      }
      setLoading(false);
    }, null, currentUser.uid);

    const unsubSettings = subscribeToPortfolioSettings(currentUser.uid, (settings) => {
      if (settings && Object.keys(settings).length > 0) {
        setPortfolioSettings(prev => ({ ...prev, ...settings }));
      }
    });

    const unsubProds = subscribeToProducts((prods) => setProducts(prods), null, currentUser.uid);
    const unsubStories = subscribeToStories((data) => setStories(data), currentUser.uid);
    return () => { unsubBiz(); unsubSettings(); unsubProds(); unsubStories(); };
  }, [currentUser]);

  const handleSave = async () => {
    triggerHaptic('medium');
    try {
      await updateBusinessInDB(currentUser.uid, {
        portfolioTemplate: selectedTemplate.id
      });
      await updatePortfolioSettings(currentUser.uid, portfolioSettings);
      setShowSuccess(true);
      showToast('Portfolio published!', 'success');
    } catch (error) { 
      console.error("Save error:", error);
      showToast('Failed to publish', 'error'); 
    }
  };

  const handleTemplateSelect = (temp) => {
    setSelectedTemplate(temp);
    setPortfolioSettings(prev => ({ 
      ...prev, 
      primaryColor: temp.styles.accent, 
      font: temp.styles.font 
    }));
    triggerHaptic('light');
    setView('editor');
  };

  const handleImageUpload = async (file, type) => {
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      if (type === 'logo') setPortfolioSettings(prev => ({ ...prev, logoUrl: url }));
      if (type === 'cover') setPortfolioSettings(prev => ({ ...prev, coverUrl: url }));
      showToast('Image updated!', 'success');
    } catch (e) { showToast('Upload failed', 'error'); }
    finally { setIsUploading(false); }
  };

  const toggleProductSelection = (id) => {
    const current = portfolioSettings.selectedProductIds || [];
    setPortfolioSettings(prev => ({ 
      ...prev, 
      selectedProductIds: current.includes(id) ? current.filter(pid => pid !== id) : [...current, id] 
    }));
  };

  const handleOnboardingComplete = async (data) => {
    setShowOnboarding(false);
    setLoading(true);
    try {
      await updateBusinessInDB(business.id, {
        name: data.name,
        type: data.type,
        instagram: data.instagram,
        whatsapp: data.whatsapp,
        city: data.city
      });
      await updatePortfolioSettings(business.id, {
        ...portfolioSettings,
        bakeryName: data.name,
        city: data.city,
        whatsapp: data.whatsapp,
        instagram: data.instagram,
        logoUrl: data.logo || '',
        coverUrl: data.hero || '',
        tagline: `Handcrafted in ${data.city}`
      });
      // Set a default username from the bakery name if not already set
      if (!business.username) {
        const generated = data.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(100 + Math.random() * 900);
        await updateBusinessInDB(business.id, { username: generated });
      }
      showToast('Profile created!', 'success');
    } catch (e) {
      showToast('Error saving profile', 'error');
    } finally {
      setLoading(false);
      setView('templates');
    }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <Loader2 className="animate-spin" size={40} color="#2563EB" />
      <p style={{ marginTop: 20, fontWeight: 700, color: '#64748B' }}>Loading your creative space...</p>
    </div>
  );

  const sidebarTabs = [
    { id: 'appearance', icon: Palette, label: 'Style' },
    { id: 'content', icon: List, label: 'Content' },
    { id: 'products', icon: ShoppingBag, label: 'Catalog' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  // --- RENDER HOME VIEW ---
  const renderHome = () => {
    const menuData = normalizeSharedMenuData({ business, products, settings: portfolioSettings });
    const whatsappUrl = `https://wa.me/${menuData.whatsapp}?text=${encodeURIComponent(`Hi ${menuData.bakeryName}, I saw your menu and want to order.`)}`;
    const instagramUrl = `https://instagram.com/${menuData.instagram}`;
    const handleCopyMenuLink = async () => {
      await navigator.clipboard.writeText(menuData.shareUrl);
      triggerHaptic('success');
      showToast('Menu link copied!', 'success');
    };
    const handleWhatsApp = () => window.open(whatsappUrl, '_blank');
    const handleInstagram = () => window.open(instagramUrl, '_blank');

    return (
      <div className="shared-menu-studio">
        <aside className="shared-menu-left">
          <header className="shared-preview-heading">
            <h1>SHARED MENU PREVIEW ✨</h1>
            <p>This is how your customers see your beautiful menu</p>
          </header>
          <PhoneMockup data={menuData} onWhatsApp={handleWhatsApp} onInstagram={handleInstagram} />
          <ShareMenuCard data={menuData} onCopy={handleCopyMenuLink} onWhatsApp={handleWhatsApp} onInstagram={handleInstagram} />
          <div className="social-preview-grid">
            <WhatsAppPreviewCard data={menuData} />
            <InstagramStoryPreview data={menuData} />
          </div>
        </aside>

        <main className="shared-menu-right">
          <DesktopMenuPreview data={menuData} onWhatsApp={handleWhatsApp} onInstagram={handleInstagram} />
        </main>
      </div>
    );
  };

  const renderTemplates = () => (
    <div style={{ padding: '40px', background: 'radial-gradient(circle at top, #EFF6FF, #F8FAFC)', minHeight: '100%' }} className="portfolio-container">
      <header style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 60, maxWidth: 1400, margin: '0 auto 60px' }}>
        <button onClick={() => setView('home')} style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.02)' }}>
           <ArrowLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 950, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #0F172A, #334155)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Select a Theme</h1>
          <p style={{ color: '#64748B', fontSize: '1.1rem', marginTop: 4 }}>Choose the vibe that perfectly captures your brand's essence.</p>
        </div>
      </header>

      <div className="theme-selection-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(400px, 100%), 1fr))', gap: 40, maxWidth: 1400, margin: '0 auto', paddingBottom: 100 }}>
        {TEMPLATES.map((temp, i) => (
          <motion.div 
            key={temp.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 100 }}
            whileHover={{ y: -15, scale: 1.02 }}
            onClick={() => handleTemplateSelect(temp)}
            style={{ 
              background: 'rgba(255, 255, 255, 0.7)', 
              backdropFilter: 'blur(20px)',
              borderRadius: 40, 
              overflow: 'hidden', 
              border: selectedTemplate.id === temp.id ? '4px solid #2563EB' : '1px solid rgba(255,255,255,0.8)',
              cursor: 'pointer',
              boxShadow: selectedTemplate.id === temp.id ? '0 30px 60px rgba(37, 99, 235, 0.2)' : '0 20px 40px rgba(0,0,0,0.05)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
            }}
          >
            {selectedTemplate.id === temp.id && (
              <div style={{ position: 'absolute', top: 24, right: 24, background: '#2563EB', color: 'white', padding: '8px 16px', borderRadius: 30, fontSize: '0.8rem', fontWeight: 900, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 10px 20px rgba(37,99,235,0.3)' }}>
                <CheckCircle2 size={16} /> ACTIVE
              </div>
            )}
            <div style={{ height: 320, position: 'relative', overflow: 'hidden', padding: '30px 30px 0', background: `linear-gradient(to bottom, ${temp.previewColors?.[0] || '#F8FAFC'}, ${temp.previewColors?.[1] ? temp.previewColors[1] + '10' : '#FFFFFF'})` }}>
              <div style={{ position: 'absolute', top: 30, left: 30, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', color: '#0F172A', padding: '8px 16px', borderRadius: 30, fontSize: '0.75rem', fontWeight: 950, letterSpacing: 1.5, zIndex: 10, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                {temp.badge}
              </div>
              <div style={{ width: '100%', height: '100%', background: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)', borderBottom: 'none' }}>
                <div style={{ height: 30, background: 'rgba(241, 245, 249, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 6, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                   <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                   <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                   <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E' }} />
                </div>
                <img src={temp.heroImage} style={{ width: '100%', height: 'calc(100% - 30px)', objectFit: 'cover', transition: 'transform 0.5s ease' }} className="template-img-hover" />
              </div>
            </div>
            <div style={{ padding: 32, flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 950, letterSpacing: '-0.02em' }}>{temp.name}</h3>
                  {temp.previewColors && (
                    <div style={{ display: 'flex', gap: -6 }}>
                      {temp.previewColors.map((color, idx) => (
                        <div key={idx} style={{ width: 24, height: 24, borderRadius: '50%', background: color, border: '3px solid white', marginLeft: idx > 0 ? -12 : 0, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                      ))}
                    </div>
                  )}
               </div>
               <p style={{ color: temp.styles.accent, fontSize: '0.95rem', fontWeight: 800, marginBottom: 16 }}>{temp.vibe}</p>
               <p style={{ color: '#64748B', fontSize: '1rem', lineHeight: 1.6, flex: 1 }}>{temp.description}</p>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 32, color: selectedTemplate.id === temp.id ? '#94A3B8' : '#2563EB', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {selectedTemplate.id === temp.id ? 'Currently Editing' : 'Use this template'} <ArrowRight size={20} />
               </div>
            </div>
          </motion.div>
        ))}
      </div>
      <style>{`
        .template-img-hover:hover { transform: scale(1.05); }
      `}</style>
    </div>
  );

  // --- RENDER EDITOR VIEW ---
  const renderEditor = () => (
    <div className="editor-container" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <aside className="editor-panel" style={{ width: 420, background: 'white', borderRight: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900 }}>Edit Portfolio</h3>
          <button onClick={handleSave} style={{ height: 42, padding: '0 22px', borderRadius: 100, background: '#0F172A', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>Publish</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94A3B8', letterSpacing: 2, marginBottom: 14, textTransform: 'uppercase' }}>Basic Info</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={portfolioSettings.bakeryName} onChange={e => setPortfolioSettings(p => ({ ...p, bakeryName: e.target.value }))} placeholder="Bakery Name" style={{ height: 50, borderRadius: 12, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: '0.95rem', fontWeight: 600, background: '#FAFAFA', width: '100%' }} />
              <input value={portfolioSettings.tagline} onChange={e => setPortfolioSettings(p => ({ ...p, tagline: e.target.value }))} placeholder="Tagline (e.g. Best Cakes in Town)" style={{ height: 50, borderRadius: 12, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: '0.95rem', fontWeight: 600, background: '#FAFAFA', width: '100%' }} />
              <textarea value={portfolioSettings.bio} onChange={e => setPortfolioSettings(p => ({ ...p, bio: e.target.value }))} placeholder="Short bio about your bakery..." style={{ borderRadius: 12, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: '0.95rem', minHeight: 80, fontFamily: 'inherit', background: '#FAFAFA', resize: 'none', width: '100%' }} />
              <input value={portfolioSettings.city} onChange={e => setPortfolioSettings(p => ({ ...p, city: e.target.value }))} placeholder="City (e.g. Hyderabad)" style={{ height: 50, borderRadius: 12, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: '0.95rem', fontWeight: 600, background: '#FAFAFA', width: '100%' }} />
            </div>
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94A3B8', letterSpacing: 2, marginBottom: 14, textTransform: 'uppercase' }}>Contact</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={portfolioSettings.whatsapp} onChange={e => setPortfolioSettings(p => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp (e.g. 919876543210)" style={{ height: 50, borderRadius: 12, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: '0.95rem', fontWeight: 600, background: '#FAFAFA', width: '100%' }} />
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontWeight: 700 }}>@</span>
                <input value={portfolioSettings.instagram} onChange={e => setPortfolioSettings(p => ({ ...p, instagram: e.target.value }))} placeholder="Instagram handle" style={{ height: 50, borderRadius: 12, border: '1px solid #E2E8F0', padding: '0 14px 0 32px', fontSize: '0.95rem', fontWeight: 600, background: '#FAFAFA', width: '100%' }} />
              </div>
            </div>
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94A3B8', letterSpacing: 2, marginBottom: 14, textTransform: 'uppercase' }}>Logo Photo</p>
            <div onClick={() => logoUploadRef.current.click()} style={{ width: 90, height: 90, borderRadius: '50%', border: '2px dashed #E2E8F0', overflow: 'hidden', cursor: 'pointer', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {portfolioSettings.logoUrl ? <img src={portfolioSettings.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.7rem' }}><Camera size={22} /><div>Upload</div></div>}
              {isUploading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>}
            </div>
            <input ref={logoUploadRef} type="file" hidden onChange={e => handleImageUpload(e.target.files[0], 'logo')} />
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94A3B8', letterSpacing: 2, marginBottom: 14, textTransform: 'uppercase' }}>Brand Color</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['#D4714A','#F28DA3','#2B6CB0','#8C7851','#22C55E','#7C3AED','#000000','#FF8B6B'].map(c => (
                <button key={c} onClick={() => setPortfolioSettings(p => ({ ...p, primaryColor: c }))} style={{ width: 38, height: 38, borderRadius: 10, background: c, border: portfolioSettings.primaryColor === c ? '3px solid #2563EB' : '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          {products.length > 0 && (
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94A3B8', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>Feature Products</p>
              <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 12 }}>Uncheck all to show everything.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {products.map(p => (
                  <div key={p.id} onClick={() => toggleProductSelection(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, border: portfolioSettings.selectedProductIds?.includes(p.id) ? '2px solid #2563EB' : '1px solid #F1F5F9', cursor: 'pointer', background: portfolioSettings.selectedProductIds?.includes(p.id) ? '#EFF6FF' : '#FAFAFA' }}>
                    {p.imageUrl && <img src={p.imageUrl} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />}
                    <span style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem' }}>{p.name}</span>
                    {portfolioSettings.selectedProductIds?.includes(p.id) && <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Check size={12} /></div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => setView('templates')} style={{ width: '100%', height: 50, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FAFAFA', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#0F172A' }}>
            <LayoutGrid size={16} /> Change Theme ({selectedTemplate.name})
          </button>
          <button onClick={() => window.open(`/portfolio/${business?.username}`, '_blank')} style={{ width: '100%', height: 50, borderRadius: 12, border: 'none', background: '#F0FDF4', color: '#166534', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Eye size={16} /> View Live Site
          </button>
        </div>
      </aside>
      <main className="editor-preview" style={{ flex: 1, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MobilePreview baker={business} products={products} selectedTemplate={selectedTemplate} settings={portfolioSettings} />
      </main>
    </div>
  );
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; borderRadius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }

        .shared-menu-studio {
          min-height: 100%;
          overflow-y: auto;
          display: grid;
          grid-template-columns: 400px minmax(720px, 1fr);
          gap: 28px;
          align-items: start;
          padding: 22px;
          background:
            radial-gradient(circle at 14% 6%, rgba(255,255,255,0.88), transparent 28%),
            linear-gradient(135deg, #fff7ee 0%, #f4e7db 46%, #ead8ca 100%);
          color: #27130d;
          font-family: "Plus Jakarta Sans", "Inter", sans-serif;
        }

        .shared-menu-studio * { box-sizing: border-box; }
        .shared-menu-studio button { font-family: inherit; cursor: pointer; }

        .shared-menu-left {
          display: flex;
          flex-direction: column;
          gap: 18px;
          align-items: center;
        }

        .shared-preview-heading {
          text-align: center;
          padding: 4px 8px 0;
        }

        .shared-preview-heading h1 {
          margin: 0 0 12px;
          color: #090604;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .shared-preview-heading p {
          max-width: 285px;
          margin: 0 auto;
          color: #1c1613;
          font-size: 16px;
          line-height: 1.45;
        }

        .phone-shell {
          width: 380px;
          height: 860px;
          border-radius: 54px;
          padding: 12px;
          background: #0b0b0b;
          position: relative;
          box-shadow: 0 16px 40px rgba(28, 16, 10, 0.28), inset 0 0 0 2px #292929;
        }

        .phone-shell::before {
          content: "";
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          width: 156px;
          height: 31px;
          background: #030303;
          border-radius: 0 0 22px 22px;
          z-index: 5;
        }

        .phone-speaker {
          position: absolute;
          top: 22px;
          left: 50%;
          transform: translateX(-50%);
          width: 76px;
          height: 6px;
          border-radius: 999px;
          background: #171717;
          z-index: 6;
        }

        .phone-screen {
          height: 100%;
          overflow: hidden;
          overflow-y: auto;
          border-radius: 43px;
          background: #fffaf4;
          scrollbar-width: none;
          position: relative;
        }

        .phone-screen::-webkit-scrollbar { display: none; }

        .phone-status {
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          font-size: 15px;
          font-weight: 900;
          color: #080605;
        }

        .phone-topbar {
          height: 58px;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,250,244,0.96);
        }

        .phone-topbar > div:nth-child(2) {
          display: grid;
          grid-template-columns: 34px auto;
          column-gap: 8px;
          align-items: center;
        }

        .phone-topbar img {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          object-fit: cover;
          grid-row: span 2;
          box-shadow: 0 4px 10px rgba(93,42,21,0.12);
        }

        .phone-topbar span {
          font-family: "Playfair Display", serif;
          font-weight: 800;
          font-size: 14px;
        }

        .phone-topbar small {
          color: #6b5146;
          font-size: 11px;
          line-height: 1;
        }

        .cart-dot { position: relative; }
        .cart-dot em {
          position: absolute;
          top: -7px;
          right: -9px;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: #e96d42;
          color: white;
          font-size: 9px;
          font-style: normal;
          display: grid;
          place-items: center;
        }

        .phone-hero {
          min-height: 184px;
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 4px;
          align-items: center;
          padding: 22px 16px 14px 28px;
          background: linear-gradient(90deg, rgba(255,246,238,0.98), rgba(252,225,207,0.72)), url('/assets/templates/luxury_minimal_hero_1778776200555.png');
          background-size: cover;
          background-position: center;
        }

        .phone-hero h2,
        .shared-hero h1,
        .shared-menu-nav h2,
        .shared-custom-banner h3,
        .shared-menu-footer h3,
        .phone-custom h3,
        .insta-preview h4 {
          font-family: "Playfair Display", Georgia, serif;
          letter-spacing: -0.035em;
        }

        .phone-hero h2 {
          margin: 0;
          white-space: pre-line;
          font-size: 23px;
          line-height: 1.08;
          color: #26110a;
        }

        .phone-hero p {
          margin: 12px 0;
          font-size: 11px;
          line-height: 1.45;
          color: #4d392f;
        }

        .phone-hero button,
        .shared-hero button,
        .shared-order-button,
        .shared-custom-banner button {
          border: 0;
          background: #34160d;
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 9px;
          box-shadow: 0 8px 18px rgba(49, 21, 12, 0.18);
        }

        .phone-hero button { height: 28px; padding: 0 12px; font-size: 10px; font-weight: 800; }
        .phone-hero img { width: 145px; height: 145px; object-fit: cover; border-radius: 50%; transform: translateX(8px); }

        .phone-categories {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 7px;
          padding: 22px 14px 16px;
        }

        .mobile-category-tile {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 8px;
          font-weight: 700;
          color: #27130d;
        }

        .mobile-category-tile img {
          width: 42px;
          height: 42px;
          object-fit: cover;
          border-radius: 50%;
          padding: 4px;
          background: #fff6ef;
          border: 1px solid #f0ddd2;
          box-shadow: 0 5px 12px rgba(79,42,27,0.06);
        }

        .phone-bestsellers { padding: 0 20px; }
        .phone-section-head,
        .shared-row-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .phone-section-head h3,
        .shared-row-heading h3 {
          margin: 0;
          font-family: "Playfair Display", serif;
          color: #29130c;
        }

        .phone-section-head h3 { font-size: 14px; }
        .phone-section-head span,
        .shared-row-heading button {
          color: #4d392f;
          background: transparent;
          border: 0;
          font-size: 10px;
        }

        .phone-card-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 13px;
        }

        .mobile-bestseller-card,
        .desktop-bestseller-card,
        .share-menu-card,
        .social-preview-card {
          background: rgba(255,255,255,0.86);
          border: 1px solid rgba(110,61,37,0.08);
          box-shadow: 0 12px 28px rgba(65,35,21,0.08);
          overflow: hidden;
        }

        .mobile-bestseller-card { border-radius: 9px; }
        .shared-product-image-wrap { position: relative; overflow: hidden; }
        .mobile-bestseller-card .shared-product-image-wrap { height: 96px; }
        .desktop-bestseller-card .shared-product-image-wrap { height: 160px; }
        .shared-product-image-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .shared-badge {
          position: absolute;
          top: 9px;
          left: 9px;
          z-index: 2;
          background: #ef7950;
          color: white;
          border-radius: 5px;
          padding: 3px 6px;
          font-size: 9px;
          font-weight: 900;
        }

        .mobile-bestseller-card .shared-card-copy { padding: 8px; }
        .shared-card-copy h4 {
          margin: 0 0 6px;
          color: #20110b;
          font-size: 13px;
          font-weight: 900;
        }

        .mobile-bestseller-card .shared-card-copy h4 { font-size: 9px; line-height: 1.15; }
        .shared-card-copy p {
          margin: 0 0 9px;
          color: #6f5a50;
          font-size: 11px;
          line-height: 1.45;
        }

        .mobile-bestseller-card .shared-card-copy p { font-size: 8px; line-height: 1.35; }
        .shared-price-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; }
        .shared-price-row strong { display: block; font-size: 16px; color: #180b07; }
        .mobile-bestseller-card .shared-price-row strong { font-size: 11px; }
        .shared-price-row small { display: block; color: #7a665d; font-size: 8px; margin-top: 2px; }
        .round-plus {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1px solid #dc704b;
          background: white;
          color: #dc704b;
          font-size: 17px;
          line-height: 1;
        }

        .phone-custom,
        .shared-custom-banner {
          background: linear-gradient(95deg, #fff4f0 0%, #fde3dc 54%, #f9cfc5 100%);
          border: 1px solid rgba(223,112,80,0.11);
          box-shadow: 0 14px 28px rgba(93,42,21,0.08);
          overflow: hidden;
          position: relative;
        }

        .phone-custom {
          min-height: 118px;
          margin: 14px 20px 13px;
          padding: 17px;
          border-radius: 11px;
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          align-items: center;
        }

        .phone-custom h3 { margin: 0; font-size: 15px; line-height: 1.1; }
        .phone-custom p { margin: 8px 0; color: #6b5146; font-size: 9px; }
        .phone-custom button {
          height: 25px;
          padding: 0 10px;
          border-radius: 7px;
          border: 1px solid #d98c74;
          background: #fff8f4;
          color: #4d2417;
          font-size: 8px;
          font-weight: 800;
        }

        .phone-custom img { width: 116px; height: 104px; object-fit: cover; border-radius: 15px; justify-self: end; }
        .phone-screen .shared-trust-row { padding: 6px 16px 18px; gap: 0; grid-template-columns: repeat(4, 1fr); }
        .phone-screen .shared-trust-item { padding: 0 4px; background: transparent; box-shadow: none; border: 0; flex-direction: column; text-align: center; gap: 6px; }
        .phone-screen .shared-trust-item svg { color: #8f4229; width: 19px; height: 19px; }
        .phone-screen .shared-trust-item strong { font-size: 7px; }
        .phone-screen .shared-trust-item span { font-size: 6px; }

        .phone-footer {
          position: sticky;
          bottom: 0;
          height: 66px;
          display: grid;
          grid-template-columns: 1fr 62px 1fr;
          align-items: center;
          background: #35170e;
          color: white;
          padding: 0 18px;
        }

        .phone-footer button {
          border: 0;
          background: transparent;
          color: white;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
        }

        .phone-footer img {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: white;
          padding: 4px;
          justify-self: center;
        }

        .share-menu-card {
          width: 360px;
          border-radius: 16px;
          padding: 24px;
        }

        .share-menu-card h2,
        .social-preview-card h3 {
          margin: 0 0 10px;
          color: #0d0907;
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .share-menu-card p {
          margin: 0 0 18px;
          color: #33251e;
          font-size: 13px;
          line-height: 1.55;
        }

        .share-link-field {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          height: 38px;
          padding: 4px 5px 4px 12px;
          border: 1px solid #efd8ca;
          border-radius: 10px;
          background: #fffaf7;
        }

        .share-link-field span {
          flex: 1;
          min-width: 0;
          color: #7655b6;
          font-size: 12px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .share-link-field button {
          height: 28px;
          border-radius: 8px;
          border: 1px solid #e8a27f;
          color: #8f4229;
          background: white;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .share-action-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 18px;
        }

        .share-action-grid button {
          border: 0;
          border-radius: 12px;
          min-height: 78px;
          background: #fff;
          box-shadow: 0 8px 18px rgba(65,35,21,0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 800;
          color: #29130c;
        }

        .share-action-grid span {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          display: grid;
          place-items: center;
        }

        .social-preview-grid {
          width: 400px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .social-preview-card {
          border-radius: 11px;
          padding: 11px;
        }

        .social-preview-card h3 { font-size: 12px; }
        .whatsapp-preview > div {
          min-height: 130px;
          border-radius: 10px;
          background: #effde8;
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 10px;
          padding: 9px;
          position: relative;
        }

        .whatsapp-preview img {
          width: 64px;
          height: 105px;
          object-fit: cover;
          border-radius: 7px;
        }

        .whatsapp-preview strong { font-size: 11px; }
        .whatsapp-preview p { margin: 7px 0; font-size: 8px; line-height: 1.35; }
        .whatsapp-preview small { font-size: 8px; color: #6b5146; }
        .whatsapp-preview span { position: absolute; right: 12px; bottom: 8px; color: #667c70; font-size: 8px; }

        .insta-preview > div {
          height: 180px;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          color: white;
          background: #28130c;
        }

        .insta-preview > div > img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.82;
        }

        .insta-story-top {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 9px;
          font-weight: 800;
        }

        .insta-preview article {
          position: absolute;
          left: 18px;
          right: 12px;
          bottom: 15px;
        }

        .insta-preview h4 {
          margin: 0;
          font-size: 26px;
          line-height: 1;
        }

        .insta-preview p { margin: 6px 0 10px; font-size: 10px; }
        .insta-preview button {
          height: 26px;
          border-radius: 8px;
          border: 0;
          color: #2f80ed;
          background: white;
          font-size: 10px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .shared-menu-right { min-width: 0; }

        .desktop-menu-preview {
          max-width: 930px;
          margin: 0 auto;
          overflow: hidden;
          border-radius: 14px;
          background: #fffaf5;
          box-shadow: 0 22px 48px rgba(55, 31, 20, 0.16);
          border: 1px solid rgba(117,68,45,0.08);
        }

        .shared-menu-nav {
          min-height: 88px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 34px;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(12px);
        }

        .shared-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .shared-brand img {
          width: 66px;
          height: 66px;
          object-fit: cover;
          border-radius: 50%;
          background: white;
          padding: 5px;
          box-shadow: 0 8px 22px rgba(107,61,39,0.14);
        }

        .shared-brand h2 {
          margin: 0;
          font-size: 30px;
          line-height: 1;
          color: #2a140c;
          font-weight: 600;
        }

        .shared-brand p {
          margin: 6px 0 0;
          color: #6a5146;
          font-size: 12px;
        }

        .shared-socials {
          display: flex;
          gap: 24px;
        }

        .shared-socials button {
          border: 0;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          color: #1b0e09;
          font-size: 10px;
          font-weight: 900;
        }

        .shared-socials svg {
          width: 35px;
          height: 35px;
          padding: 7px;
          border-radius: 50%;
          background: #fff6ee;
          border: 1px solid #ead4c6;
        }

        .shared-hero {
          min-height: 320px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          padding: 44px 44px 36px;
          background: linear-gradient(90deg, rgba(255,249,244,0.98), rgba(248,221,204,0.68)), url('/assets/templates/luxury_minimal_hero_1778776200555.png');
          background-size: cover;
          background-position: center;
          position: relative;
        }

        .shared-hero::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 30px;
          background: #fffaf5;
          clip-path: polygon(0 62%, 12% 72%, 26% 58%, 42% 70%, 58% 58%, 75% 71%, 90% 60%, 100% 69%, 100% 100%, 0 100%);
        }

        .shared-hero h1 {
          margin: 0;
          white-space: pre-line;
          max-width: 380px;
          color: #28120b;
          font-size: 42px;
          line-height: 1.05;
        }

        .shared-hero h1 span {
          color: #dc704b;
          font-size: 34px;
          margin-left: 12px;
          font-family: inherit;
          font-weight: 400;
        }

        .shared-hero p {
          max-width: 245px;
          margin: 18px 0 24px;
          color: #4a352b;
          font-size: 15px;
          line-height: 1.45;
        }

        .shared-hero button { height: 43px; padding: 0 22px; font-size: 13px; font-weight: 850; }
        .shared-hero img {
          justify-self: end;
          width: min(330px, 100%);
          aspect-ratio: 1;
          object-fit: cover;
          border-radius: 50%;
          filter: drop-shadow(0 24px 30px rgba(72,31,16,0.22));
        }

        .shared-categories,
        .shared-bestsellers,
        .shared-all-cakes {
          padding: 22px 28px;
        }

        .shared-menu-section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #cf714d;
        }

        .shared-menu-section-title.center {
          justify-content: center;
          margin-bottom: 18px;
        }

        .shared-menu-section-title h3 {
          margin: 0;
          font-family: "Playfair Display", serif;
          color: #29130c;
          font-size: 20px;
          line-height: 1;
        }

        .desktop-category-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }

        .desktop-category-tile {
          min-height: 118px;
          border-radius: 10px;
          background: rgba(255,255,255,0.68);
          border: 1px solid rgba(99,53,31,0.08);
          box-shadow: 0 8px 20px rgba(58,31,19,0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .desktop-category-tile img {
          width: 55px;
          height: 55px;
          object-fit: cover;
          border-radius: 12px;
        }

        .desktop-category-tile span {
          color: #1f110c;
          font-size: 12px;
          font-weight: 900;
          text-align: center;
        }

        .desktop-bestseller-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 16px;
        }

        .desktop-bestseller-card {
          border-radius: 9px;
        }

        .desktop-bestseller-card .shared-card-copy { padding: 14px 14px 16px; }
        .desktop-bestseller-card .shared-card-copy h4 { font-size: 14px; }
        .desktop-bestseller-card .shared-card-copy p { min-height: 34px; font-size: 11px; }
        .desktop-bestseller-card .shared-order-button {
          margin-top: 12px;
          width: 100%;
          height: 31px;
          font-size: 11px;
          font-weight: 850;
        }

        .shared-all-cakes { padding-top: 12px; }
        .shared-all-cakes > .shared-row-heading h3 { font-size: 20px; }

        .shared-list-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          column-gap: 34px;
          row-gap: 14px;
          margin-top: 16px;
        }

        .shared-list-item {
          display: grid;
          grid-template-columns: 64px 1fr 34px;
          gap: 12px;
          align-items: center;
        }

        .shared-list-item img {
          width: 64px;
          height: 64px;
          border-radius: 8px;
          object-fit: cover;
        }

        .shared-list-name {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .shared-list-name h4 {
          margin: 0;
          color: #1d100b;
          font-size: 12px;
          font-weight: 950;
        }

        .shared-list-name span {
          padding: 2px 6px;
          border-radius: 999px;
          background: #e9f8e9;
          color: #4f9b56;
          font-size: 8px;
          font-weight: 900;
        }

        .shared-list-item p {
          margin: 4px 0 3px;
          color: #6c554b;
          font-size: 10px;
          line-height: 1.3;
        }

        .shared-list-item strong { font-size: 12px; color: #1d100b; }
        .shared-list-item button {
          border: 0;
          background: transparent;
          color: #20b65a;
          display: grid;
          place-items: center;
        }

        .shared-list-item:nth-child(3n) button,
        .shared-list-item:nth-child(5n) button { color: #b02c20; }

        .shared-custom-banner {
          margin: 18px 28px 24px;
          min-height: 140px;
          border-radius: 10px;
          display: grid;
          grid-template-columns: 1fr 245px;
          align-items: center;
          padding: 24px 30px;
        }

        .shared-custom-banner h3 {
          margin: 0;
          color: #29130c;
          font-size: 24px;
          line-height: 1.05;
        }

        .shared-custom-banner p {
          margin: 8px 0 14px;
          color: #5a4338;
          font-size: 13px;
        }

        .shared-custom-banner button { height: 34px; padding: 0 17px; font-size: 11px; font-weight: 850; }
        .shared-custom-banner img {
          width: 230px;
          height: 120px;
          object-fit: cover;
          border-radius: 12px;
        }

        .shared-trust-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          padding: 0 28px 28px;
        }

        .shared-trust-item {
          min-height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 9px;
          background: rgba(255,255,255,0.58);
          border: 1px solid rgba(96,53,34,0.05);
        }

        .shared-trust-item svg { color: #b45a37; }
        .shared-trust-item strong {
          display: block;
          color: #21110b;
          font-size: 11px;
          font-weight: 950;
        }

        .shared-trust-item span {
          display: block;
          margin-top: 2px;
          color: #6c554b;
          font-size: 9px;
        }

        .shared-menu-footer {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 36px;
          padding: 32px 44px 24px;
          background: radial-gradient(circle at 20% 0%, #593021, #2d120a 64%, #210d07);
          color: white;
        }

        .shared-menu-footer h3 {
          margin: 0 0 12px;
          color: white;
          font-size: 20px;
        }

        .shared-menu-footer p {
          margin: 0 0 18px;
          color: rgba(255,255,255,0.72);
          font-size: 11px;
          line-height: 1.5;
        }

        .footer-grid-images {
          display: grid;
          grid-template-columns: repeat(4, 64px);
          gap: 9px;
          margin-bottom: 30px;
        }

        .footer-grid-images img {
          width: 64px;
          height: 52px;
          object-fit: cover;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.18);
        }

        .shared-menu-footer small {
          color: rgba(255,255,255,0.55);
          font-size: 10px;
        }

        .footer-contact {
          border-left: 1px solid rgba(255,255,255,0.14);
          padding-left: 34px;
        }

        .footer-contact p {
          display: flex;
          gap: 13px;
          align-items: flex-start;
          color: white;
        }

        .footer-contact span { color: rgba(255,255,255,0.78); }
        
        @media (max-width: 900px) {
          .home-header { flex-direction: column !important; align-items: flex-start !important; gap: 20px; }
          .home-grid { grid-template-columns: 1fr !important; }
          .theme-selection-grid { grid-template-columns: 1fr !important; }
          .shared-menu-studio { grid-template-columns: 1fr !important; padding: 16px !important; overflow-x: hidden; }
          .shared-menu-left { width: 100%; }
          .shared-menu-right { width: 100%; overflow-x: auto; }
          .phone-shell { width: min(380px, calc(100vw - 32px)); height: 810px; }
          .share-menu-card { width: min(360px, calc(100vw - 40px)); }
          .social-preview-grid { width: min(400px, calc(100vw - 32px)); grid-template-columns: 1fr; }
          .desktop-menu-preview { min-width: 760px; }
          
          .editor-container { flex-direction: column !important; overflow-y: auto !important; }
          .editor-nav { width: 100% !important; height: auto !important; flex-direction: row !important; padding: 10px !important; gap: 10px !important; justify-content: center !important; border-right: none !important; border-bottom: 1px solid #F1F5F9 !important; }
          .editor-panel { width: 100% !important; height: auto !important; border-right: none !important; box-shadow: none !important; border-bottom: 1px solid #E2E8F0 !important; }
          .editor-preview { min-height: 800px !important; padding: 40px 0 !important; overflow: hidden; }
          .preview-controls { display: none !important; }
        }

        @media (max-width: 600px) {
          .global-header { padding: 0 16px !important; }
          .global-header-left h2 { display: none !important; }
          .global-header-right button { padding: 0 12px !important; font-size: 0.8rem !important; }
        }
      `}</style>

      {/* Global Header */}
      {view !== 'home' && <header className="global-header" style={{ height: 80, background: 'white', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', zIndex: 100, flexShrink: 0 }}>
        <div className="global-header-left" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><ArrowLeft size={24} /></button>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #2563EB, #60A5FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
             <Wand2 size={20} />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 950 }}>Portfolio <span style={{ color: '#94A3B8', fontWeight: 500 }}>Studio</span></h2>
        </div>
        
        <div className="global-header-right" style={{ display: 'flex', gap: 16 }}>
           {view !== 'home' && <button onClick={() => setView('home')} style={{ height: 48, padding: '0 20px', borderRadius: 14, border: '1px solid #E2E8F0', background: 'white', fontWeight: 800, cursor: 'pointer' }}>Exit Editor</button>}
           <button onClick={() => setShowShare(true)} style={{ height: 48, width: 48, borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Share2 size={20} /></button>
        </div>
      </header>}

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'home' && renderHome()}
        {view === 'templates' && <div style={{ height: '100%', overflowY: 'auto' }}>{renderTemplates()}</div>}
        {view === 'editor' && renderEditor()}
      </div>

      <AnimatePresence>
        {showOnboarding && <PremiumOnboarding onComplete={handleOnboardingComplete} />}
        {showShare && business && <ShareModal username={business.username} onClose={() => setShowShare(false)} />}
        {showSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(40px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} style={{ maxWidth: 450, textAlign: 'center', background: 'white', padding: 60, borderRadius: 48, boxShadow: '0 50px 100px rgba(0,0,0,0.1)' }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#F0FDF4', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                 <CheckCircle2 size={54} />
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 950, marginBottom: 12 }}>She's Alive!</h2>
              <p style={{ color: '#64748B', fontSize: '1.1rem', marginBottom: 48, lineHeight: 1.6 }}>Your stunning bakery portfolio is now live and ready to take orders.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 <button onClick={() => { setShowSuccess(false); setView('home'); }} style={{ height: 64, borderRadius: 20, background: '#0F172A', color: 'white', border: 'none', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>Go to Dashboard</button>
                 <button onClick={() => window.open(`/portfolio/${business?.username}`, '_blank')} style={{ height: 64, borderRadius: 20, background: 'white', border: '1px solid #E2E8F0', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>View Public Site</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

