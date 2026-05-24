import React from 'react';
import { motion } from 'framer-motion';
import { Award, Clock3, Heart, Instagram, MapPin, MessageCircle, ShoppingBag } from 'lucide-react';
import { MENU_TEMPLATE_ASSETS, mergeMenuSettings, normalizeMenuProducts } from '../../data/menuDefaults';
import './MenuRenderer.css';

const fade = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 }
};

const SectionTitle = ({ children, center = false }) => (
  <div className={`menu-section-title ${center ? 'center' : ''}`}>
    <span>✣</span>
    <h2>{children}</h2>
    {center && <span>✣</span>}
  </div>
);

const CategoryPill = ({ category, active, onClick }) => (
  <button type="button" className={`menu-category-pill ${active ? 'active' : ''}`} onClick={onClick}>
    <img src={category.image || MENU_TEMPLATE_ASSETS.redVelvet} alt="" />
    <span>{category.name}</span>
  </button>
);

const ProductCard = ({ product, onOrder }) => (
  <motion.article variants={fade} className="menu-product-card">
    <div className="menu-product-media">
      {product.bestseller && <span className="menu-badge">Bestseller</span>}
      <img src={product.image} alt={product.name} />
    </div>
    <div className="menu-product-copy">
      <div className="menu-product-head">
        <h3>{product.name}</h3>
        {product.eggless && <span>Eggless</span>}
      </div>
      <p>{product.description}</p>
      {product.weight && <small>{product.weight}</small>}
      <div className="menu-product-footer">
        <strong>₹{product.price}</strong>
        <button type="button" onClick={() => onOrder(product)} aria-label={`Order ${product.name}`}>
          <MessageCircle size={16} /> Order
        </button>
      </div>
    </div>
  </motion.article>
);

const TrustBadges = () => (
  <div className="menu-trust-grid">
    {[
      { icon: Heart, title: '100% Fresh', text: 'Made to order' },
      { icon: Award, title: 'Premium Quality', text: 'Best ingredients' },
      { icon: ShoppingBag, title: 'Hygienic Kitchen', text: 'Clean & safe' },
      { icon: Clock3, title: 'On-time Delivery', text: 'Always on time' }
    ].map(item => (
      <div key={item.title} className="menu-trust-item">
        <item.icon size={22} />
        <div><strong>{item.title}</strong><span>{item.text}</span></div>
      </div>
    ))}
  </div>
);

export default function MenuRenderer({ business, settings, products, preview = false }) {
  const data = mergeMenuSettings(business, settings);
  const productCards = normalizeMenuProducts(products);
  const visibleCategories = data.categories.filter(category => category.visible !== false);
  const bestsellers = productCards.filter(product => product.bestseller).slice(0, 4);
  const displayProducts = productCards.filter(product => product.featured !== false);
  const [activeCategory, setActiveCategory] = React.useState('All');

  const filteredProducts = activeCategory === 'All'
    ? displayProducts
    : displayProducts.filter(product => product.category === activeCategory);

  const whatsappNumber = String(data.whatsapp || '').replace(/[^\d]/g, '');
  const instagram = String(data.instagram || '').replace('@', '');
  const orderProduct = (product) => {
    const message = product
      ? `Hi ${data.bakeryName}, I want to order ${product.name}.`
      : `Hi ${data.bakeryName}, I saw your menu and want to order.`;
    if (whatsappNumber) window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const sectionRenderers = {
    hero: () => (
      <motion.section key="hero" initial="hidden" animate="visible" variants={fade} transition={{ duration: 0.45 }} className="menu-hero">
        <div className="menu-hero-copy">
          <h1>{data.heroTitle}</h1>
          <p>{data.description}</p>
          <button type="button" onClick={() => orderProduct()}><MessageCircle size={17} /> Order on WhatsApp</button>
        </div>
        <img className="menu-hero-image" src={data.heroImage || MENU_TEMPLATE_ASSETS.truffle} alt="Featured cake" />
      </motion.section>
    ),
    categories: () => (
      <section key="categories" className="menu-categories-section">
        <SectionTitle center>Our Categories</SectionTitle>
        <div className="menu-category-row">
          <CategoryPill category={{ name: 'All', image: MENU_TEMPLATE_ASSETS.truffle }} active={activeCategory === 'All'} onClick={() => setActiveCategory('All')} />
          {visibleCategories.map(category => (
            <CategoryPill key={category.id || category.name} category={category} active={activeCategory === category.name} onClick={() => setActiveCategory(category.name)} />
          ))}
        </div>
      </section>
    ),
    bestsellers: () => bestsellers.length > 0 && (
      <section key="bestsellers" className="menu-section">
        <SectionTitle>Bestseller Cakes</SectionTitle>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} transition={{ staggerChildren: 0.06 }} className="menu-product-grid">
          {bestsellers.map(product => <ProductCard key={product.id} product={product} onOrder={orderProduct} />)}
        </motion.div>
      </section>
    ),
    products: () => (
      <section key="products" className="menu-section">
        <SectionTitle>{activeCategory === 'All' ? 'All Cakes' : activeCategory}</SectionTitle>
        {filteredProducts.length > 0 ? (
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} transition={{ staggerChildren: 0.05 }} className="menu-product-grid">
            {filteredProducts.map(product => <ProductCard key={product.id} product={product} onOrder={orderProduct} />)}
          </motion.div>
        ) : (
          <div className="menu-empty-state">
            <ShoppingBag size={32} />
            <h3>No visible products yet</h3>
            <p>Add products in the builder to make this menu share-ready.</p>
          </div>
        )}
      </section>
    ),
    custom: () => (
      <section key="custom" className="menu-custom-banner">
        <div>
          <h2>Custom Cakes for Every Occasion</h2>
          <p>Birthdays, anniversaries, weddings and signature celebrations.</p>
          <button type="button" onClick={() => orderProduct()}>Order Custom Cake</button>
        </div>
        <img src={MENU_TEMPLATE_ASSETS.custom} alt="Custom cake" />
      </section>
    ),
    trust: () => <TrustBadges key="trust" />,
    footer: () => (
      <footer key="footer" className="menu-footer">
        <div>
          <h2>Let's Stay Connected</h2>
          <p>Follow us for fresh bakes, custom creations and seasonal updates.</p>
          <small>© {new Date().getFullYear()} {data.bakeryName}. All Rights Reserved.</small>
        </div>
        <div className="menu-footer-contact">
          <h3>Contact Us</h3>
          {whatsappNumber && <p><MessageCircle size={18} /><span>+{whatsappNumber}</span></p>}
          <p><MapPin size={18} /><span>{data.deliveryLocations || data.city || 'Local delivery available'}</span></p>
          <p><Clock3 size={18} /><span>{data.timings}</span></p>
        </div>
      </footer>
    )
  };

  return (
    <div
      className={`published-menu ${preview ? 'preview' : ''}`}
      style={{
        '--menu-primary': data.theme.primaryColor,
        '--menu-secondary': data.theme.secondaryColor,
        '--menu-radius': `${data.theme.cardRadius}px`,
        '--menu-font': `"${data.theme.font}", "Plus Jakarta Sans", system-ui, sans-serif`,
        '--menu-button-radius': data.theme.buttonStyle === 'classic' ? '8px' : data.theme.buttonStyle === 'soft' ? '14px' : '999px',
        '--menu-density': data.theme.spacingDensity === 'compact' ? '0.82' : data.theme.spacingDensity === 'airy' ? '1.18' : '1'
      }}
    >
      <header className="menu-topbar">
        <div className="menu-brand">
          <img src={data.logoUrl || '/logo.png'} alt={`${data.bakeryName} logo`} onError={e => { e.currentTarget.src = '/logo.png'; }} />
          <div>
            <strong>{data.bakeryName}</strong>
            <span>{data.tagline}</span>
          </div>
        </div>
        <div className="menu-socials">
          <button type="button" onClick={() => orderProduct()}><MessageCircle size={18} /><span>WhatsApp</span></button>
          {instagram && <button type="button" onClick={() => window.open(`https://instagram.com/${instagram}`, '_blank')}><Instagram size={18} /><span>Instagram</span></button>}
        </div>
      </header>

      {(data.theme.sectionOrder || []).map(section => sectionRenderers[section]?.()).filter(Boolean)}
    </div>
  );
}
