import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Instagram, MessageCircle, Phone, MapPin, Globe, Menu, 
  ShoppingBag, Heart, Star, Plus, X, ArrowRight, CheckCircle2,
  LayoutGrid, MessageSquare, Send, Clock, Calendar, ArrowDown,
  Sparkles, Award, ThumbsUp, ShoppingCart, Zap, ShieldCheck,
  ChevronRight, Play, ExternalLink, Info, Users, Clock3, Search,
  Check, Coffee, UtensilsCrossed
} from 'lucide-react';

// Import Google Fonts
if (typeof document !== 'undefined') {
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Outfit:wght@300;400;500;600;700;800;900&display=swap';
  document.head.appendChild(fontLink);
}
import { 
  getBusinessByUsername, 
  subscribeToProducts, 
  subscribeToStories, 
  addInquiryToDB,
  subscribeToPortfolioSettings 
} from '../services/db';
import { TEMPLATES } from '../data/templates';
import { formatCurrency } from '../utils/date';
import { showToast, triggerHaptic } from '../components/iOS';

// --- HELPERS: STAR RATING ---
const StarRating = ({ rating = 5, color = '#FFB400' }) => (
  <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
    {[...Array(5)].map((_, i) => (
      <Star key={i} size={14} fill={i < rating ? color : 'transparent'} color={i < rating ? color : '#CBD5E1'} />
    ))}
  </div>
);

// --- HELPERS: DOODLES ---
const HandDrawnDoodle = ({ type, color, style }) => {
  if (type === 'circle') return (
    <svg viewBox="0 0 100 100" style={{ ...style, pointerEvents: 'none' }}>
      <motion.path 
        d="M50,10 C25,10 10,25 10,50 C10,75 25,90 50,90 C75,90 90,75 90,50 C90,25 75,10 52,10.5" 
        fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 2 }}
      />
    </svg>
  );
  if (type === 'heart') return (
    <svg viewBox="0 0 100 100" style={{ ...style, pointerEvents: 'none' }}>
      <motion.path 
        d="M50,30 C35,10 10,20 10,45 C10,70 50,90 50,90 C50,90 90,70 90,45 C90,20 65,10 50,30" 
        fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 2 }}
      />
    </svg>
  );
  return null;
};

// --- ANIMATION WRAPPER ---
const FadeIn = ({ children, delay = 0, y = 40, direction = 'up' }) => {
  const initialY = direction === 'up' ? y : direction === 'down' ? -y : 0;
  const initialX = direction === 'left' ? y : direction === 'right' ? -y : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: initialY, x: initialX }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

// --- PREMIUM: PARALLAX IMAGE ---
const ParallaxImage = ({ src, height = '600px', offset = 100 }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, offset]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: -1 }}>
      <motion.img 
        src={src} 
        style={{ 
          width: '100%', 
          height: `calc(100% + ${offset}px)`, 
          objectFit: 'cover', 
          y,
          filter: 'brightness(0.9) contrast(1.1)'
        }} 
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent, rgba(0,0,0,0.4))' }} />
    </div>
  );
};

// --- PREMIUM: FLOATING ELEMENT ---
const FloatingElement = ({ children, delay = 0, duration = 6 }) => (
  <motion.div
    animate={{ 
      y: [0, -20, 0],
      rotate: [0, 5, 0, -5, 0]
    }}
    transition={{ 
      duration, 
      repeat: Infinity, 
      ease: "easeInOut",
      delay 
    }}
  >
    {children}
  </motion.div>
);

const getBakeryName = (settings, baker) => {
  const rawName = String(settings?.bakeryName || baker?.name || 'Cream & Crust').trim();
  const midpoint = rawName.length / 2;

  if (rawName.length % 2 === 0 && rawName.slice(0, midpoint) === rawName.slice(midpoint)) {
    return rawName.slice(0, midpoint).trim();
  }

  return rawName;
};

// --- COMMON: INQUIRY MODAL ---
const InquiryModal = ({ baker, settings, theme, onClose }) => {
  const [inquiry, setInquiry] = useState({ name: '', phone: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const bakeryName = getBakeryName(settings, baker);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inquiry.name || !inquiry.phone) return;
    setSubmitting(true);
    try {
      await addInquiryToDB({ ...inquiry, userId: baker.id, bakerName: bakeryName });
      showToast('Enquiry sent!', 'success');
      const msg = `Hi ${bakeryName}, I saw your portfolio and I'm interested in ordering! %0A%0AName: ${inquiry.name}%0A%0ANote: ${inquiry.note}`;
      window.open(`https://wa.me/${settings.whatsapp || baker.whatsapp || baker.phone || ''}?text=${msg}`, '_blank');
      onClose();
    } catch (e) {
      showToast('Failed to send', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(30px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
       <motion.div 
         initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }}
         style={{ width: '100%', maxWidth: 500, background: 'white', borderRadius: 40, padding: 40, position: 'relative', boxShadow: '0 40px 100px rgba(0,0,0,0.2)' }}
       >
          <button onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, background: '#F1F5F9', border: 'none', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={24} /></button>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 950, marginBottom: 12, color: '#0F172A', letterSpacing: '-0.02em' }}>Inquiry</h2>
          <p style={{ color: '#64748B', marginBottom: 40, fontSize: '1.1rem' }}>Tell us about your occasion and we'll handle the rest.</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', marginLeft: 4 }}>YOUR NAME</label>
                <input required placeholder="Full Name" value={inquiry.name} onChange={e => setInquiry({...inquiry, name: e.target.value})} style={{ height: 64, borderRadius: 20, border: '1px solid #E2E8F0', padding: '0 24px', fontSize: '1.1rem', background: '#F8FAFC' }} />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', marginLeft: 4 }}>WHATSAPP</label>
                <input required placeholder="+91 ..." type="tel" value={inquiry.phone} onChange={e => setInquiry({...inquiry, phone: e.target.value})} style={{ height: 64, borderRadius: 20, border: '1px solid #E2E8F0', padding: '0 24px', fontSize: '1.1rem', background: '#F8FAFC' }} />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', marginLeft: 4 }}>REQUIREMENTS</label>
                <textarea placeholder="Date, Flavors, Quantity..." value={inquiry.note} onChange={e => setInquiry({...inquiry, note: e.target.value})} style={{ height: 140, borderRadius: 20, border: '1px solid #E2E8F0', padding: '24px', fontSize: '1.1rem', resize: 'none', background: '#F8FAFC' }} />
             </div>
             <button disabled={submitting} style={{ height: 72, background: theme.accent, color: 'white', border: 'none', borderRadius: 20, fontSize: '1.2rem', fontWeight: 900, boxShadow: `0 20px 40px ${theme.accent}33`, marginTop: 10 }}>{submitting ? 'Sending...' : 'Send Request'}</button>
          </form>
       </motion.div>
    </motion.div>
  );
};

// --- STORY VIEWER ---
const StoryViewer = ({ stories, initialIndex, onClose }) => {
  const [activeStoryIdx, setActiveStoryIdx] = useState(initialIndex);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  const story = stories[activeStoryIdx];
  if (!story) return null;
  const media = [story.imageUrl, ...(story.media || [])];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (mediaIdx < media.length - 1) {
            setMediaIdx(prev => prev + 1);
            return 0;
          } else {
            if (activeStoryIdx < stories.length - 1) {
              setActiveStoryIdx(prev => prev + 1);
              setMediaIdx(0);
              return 0;
            } else {
              onClose();
              return 100;
            }
          }
        }
        return prev + 1.2;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [activeStoryIdx, mediaIdx, media.length, stories.length, onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 6000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
       <div style={{ width: '100%', maxWidth: 450, height: '100%', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 20, left: 10, right: 10, display: 'flex', gap: 4, zIndex: 10 }}>
             {media.map((_, i) => (
               <div key={i} style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1 }}>
                  <div style={{ width: i < mediaIdx ? '100%' : i === mediaIdx ? `${progress}%` : '0%', height: '100%', background: 'white' }} />
               </div>
             ))}
          </div>
          <div style={{ position: 'absolute', top: 40, left: 20, right: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'white' }}>
                <img src={story.imageUrl} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid white' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{story.title}</div>
             </div>
             <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white' }}><X size={32} /></button>
          </div>
          <img src={media[mediaIdx]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
       </div>
    </motion.div>
  );
};

// --- PRODUCT CARD ---
const ProductCard = ({ product, theme, onInquiry }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -12 }}
      style={{ 
        background: theme.cardBg,
        borderRadius: theme.radius === '0px' ? '0px' : '32px',
        overflow: 'hidden',
        boxShadow: isHovered ? '0 40px 80px rgba(0,0,0,0.12)' : '0 20px 40px rgba(0,0,0,0.04)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: '0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        border: '1px solid rgba(0,0,0,0.03)'
      }}
    >
      {/* Visual Badge */}
      {(product.isNew || product.onSale) && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', gap: 8 }}>
           {product.isNew && <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', color: '#000', padding: '6px 16px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 900, letterSpacing: 1.5, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>NEW ARRIVAL</div>}
        </div>
      )}

      {/* Image Container */}
      <div style={{ height: 320, position: 'relative', overflow: 'hidden' }}>
         <motion.img 
           src={product.imageUrl || product.img} 
           animate={{ scale: isHovered ? 1.1 : 1 }}
           transition={{ duration: 0.8 }}
           style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
         />
         <AnimatePresence>
           {isHovered && (
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             >
                <motion.button 
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  onClick={onInquiry}
                  style={{ background: 'white', color: 'black', padding: '16px 32px', borderRadius: 100, fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
                >
                  ENQUIRE NOW <ChevronRight size={18} />
                </motion.button>
             </motion.div>
           )}
         </AnimatePresence>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
               <h3 style={{ 
                 fontSize: '1.6rem', 
                 fontWeight: 950, 
                 margin: '0 0 8px 0', 
                 fontFamily: theme.styles.font,
                 textTransform: theme.styles.isLowercase ? 'lowercase' : 'none',
                 letterSpacing: '-0.04em',
                 lineHeight: 1.1,
                 color: theme.text
               }}>
                 {product.name}
               </h3>
               {(theme.styles.hasStars || product.rating) && (
                  <StarRating rating={product.rating || 5} color={theme.accent} />
               )}
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.4rem', color: theme.accent, fontFamily: 'Montserrat, sans-serif' }}>
               ₹{product.basePrice || product.price}
            </div>
         </div>
         
         <p style={{ fontSize: '0.95rem', color: theme.text, opacity: 0.6, margin: 0, lineHeight: 1.6, fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}>
           {product.description || `Handcrafted with premium ingredients. Available for custom orders.`}
         </p>
      </div>
    </motion.div>
  );
};
export default function Portfolio() {
  const { username } = useParams();
  const [baker, setBaker] = useState(null);
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInquiry, setShowInquiry] = useState(false);
  const [activeStoryIdx, setActiveStoryIdx] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await getBusinessByUsername(username);
        if (!userData) {
          setLoading(false);
          return;
        }
        // The business doc itself has portfolioTemplate, name, username etc.
        setBaker({ ...userData, id: userData.id });

        const unsubSettings = subscribeToPortfolioSettings(userData.id, (data) => {
          setSettings(data || {});
        });

        const unsubProds = subscribeToProducts((prods) => {
          setProducts(prods || []);
        }, null, userData.id);

        const unsubStories = subscribeToStories((data) => {
          setStories(data || []);
        }, userData.id);

        setLoading(false);

        return () => {
          unsubSettings();
          unsubProds();
          unsubStories();
        };
      } catch (err) {
        console.error("Initialization error:", err);
        setLoading(false);
      }
    };

    init();
  }, [username]);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
       <Sparkles className="animate-spin" size={48} color="#F28DA3" />
    </div>
  );

  if (!baker) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 40, textAlign: 'center' }}>
       <h1 style={{ fontSize: '3rem', fontWeight: 950, marginBottom: 20 }}>Bakery Not Found</h1>
       <p style={{ color: '#64748B', fontSize: '1.2rem' }}>The link you're looking for doesn't exist or has moved.</p>
    </div>
  );

  const selectedTemplate = TEMPLATES.find(t => t.id === baker.portfolioTemplate) || TEMPLATES[0];
  
  const theme = {
    ...selectedTemplate,
    accent: settings?.primaryColor || selectedTemplate.styles.accent,
    bg: selectedTemplate.styles.bg || '#FFFBFA',
    text: selectedTemplate.styles.text || '#0F172A',
    font: settings?.font || selectedTemplate.styles.font,
    radius: selectedTemplate.styles.radius || '32px',
    cardBg: selectedTemplate.styles.cardBg || 'white',
    button: selectedTemplate.styles.button || 'pill',
    shadow: selectedTemplate.styles.shadow || '0 20px 50px rgba(0,0,0,0.05)',
    styles: {
      ...selectedTemplate.styles,
      accent: settings?.primaryColor || selectedTemplate.styles.accent,
      font: settings?.font || selectedTemplate.styles.font
    }
  };

  const displayProducts = settings?.selectedProductIds?.length > 0 
    ? products.filter(p => settings.selectedProductIds.includes(p.id))
    : products;
  const bakeryName = getBakeryName(settings, baker);

  return (
    <div style={{ 
      background: theme.bg, 
      color: theme.text, 
      minHeight: '100vh', 
      fontFamily: "'Montserrat', sans-serif",
      overflowX: 'hidden'
    }}>
       {/* PREMIUM PARALLAX HERO */}
       <section style={{ 
         height: '90vh',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         textAlign: 'center', 
         position: 'relative',
         padding: '0 20px',
         background: '#000'
       }}>
          <ParallaxImage src={theme.heroImage} offset={200} />
          
          {/* Floating Ingredients for depth */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
             <div style={{ position: 'absolute', top: '20%', left: '15%' }}>
                <FloatingElement delay={0} duration={5}><Coffee size={40} color="white" opacity={0.4} /></FloatingElement>
             </div>
             <div style={{ position: 'absolute', bottom: '30%', right: '18%' }}>
                <FloatingElement delay={1} duration={7}><UtensilsCrossed size={48} color="white" opacity={0.4} /></FloatingElement>
             </div>
             <div style={{ position: 'absolute', top: '45%', right: '10%' }}>
                <FloatingElement delay={2} duration={6}><Heart size={32} color="white" opacity={0.4} /></FloatingElement>
             </div>
          </div>

          <FadeIn direction="up" y={60}>
            <div style={{ maxWidth: 1000, position: 'relative', zIndex: 10 }}>
              {settings?.logoUrl && (
                <motion.img 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  src={settings.logoUrl} 
                  style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', marginBottom: 40 }} 
                />
              )}
              <h1 style={{ 
                fontSize: 'clamp(3.5rem, 8vw, 6.5rem)', 
                fontWeight: 950, 
                margin: 0, 
                fontFamily: theme.styles.font, 
                letterSpacing: '-0.05em', 
                lineHeight: 0.9,
                color: 'white',
                textShadow: '0 10px 40px rgba(0,0,0,0.4)',
                textTransform: theme.styles.isLowercase ? 'lowercase' : 'none'
              }}>
                {bakeryName}
              </h1>
              <p style={{ 
                color: 'white', 
                opacity: 0.95, 
                fontSize: 'clamp(1.1rem, 2.5vw, 1.8rem)', 
                marginTop: 24, 
                fontWeight: 600, 
                textShadow: '0 2px 15px rgba(0,0,0,0.5)',
                textTransform: theme.styles.isLowercase ? 'lowercase' : 'none',
                fontFamily: 'Montserrat, sans-serif'
              }}>
                {settings?.tagline || 'Artisanal Bakes & Sweet Moments'}
              </p>
              
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 60 }}>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowInquiry(true); triggerHaptic('medium'); }}
                  style={{ 
                    background: 'white', 
                    color: 'black', 
                    padding: '0 54px', 
                    height: 76, 
                    borderRadius: 100, 
                    fontWeight: 900, 
                    fontSize: '1.2rem', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 12, 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)', 
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  Order Now <ArrowRight size={24} />
                </motion.button>
              </div>
            </div>
          </FadeIn>

          {/* Scroll Down Indicator */}
          <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ position: 'absolute', bottom: 40, color: 'white', opacity: 0.6 }}
          >
             <ArrowDown size={32} />
          </motion.div>
       </section>

       {/* STORY HIGHLIGHTS */}
       {stories.length > 0 && (
         <section style={{ padding: '20px 0 60px', overflowX: 'auto' }} className="hide-scrollbar">
            <div style={{ display: 'flex', gap: 24, padding: '0 40px' }}>
               {stories.map((s, i) => (
                 <div key={i} onClick={() => setActiveStoryIdx(i)} style={{ flexShrink: 0, textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ width: 90, height: 90, borderRadius: '50%', background: `linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)`, padding: 3 }}>
                       <img src={s.imageUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', border: '3px solid white', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, marginTop: 10 }}>{s.title}</div>
                 </div>
               ))}
            </div>
         </section>
       )}

       {/* OUR STORY - CINEMATIC VERSION */}
       <section style={{ padding: '160px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `${theme.accent}05`, transform: 'skewY(-3deg)', transformOrigin: 'top left', zIndex: -1 }} />
          
          <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
            <FadeIn>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: 6, color: theme.accent, marginBottom: 32, textTransform: 'uppercase' }}>Our Heritage</h3>
              <div style={{ 
                padding: '80px 40px', 
                background: 'white', 
                borderRadius: 48, 
                boxShadow: '0 40px 100px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.02)',
                position: 'relative'
              }}>
                <UtensilsCrossed size={40} style={{ color: theme.accent, opacity: 0.2, marginBottom: 32 }} />
                <p style={{ 
                  fontSize: 'clamp(1.5rem, 4vw, 2.8rem)', 
                  lineHeight: 1.3, 
                  margin: 0, 
                  color: theme.text, 
                  fontFamily: theme.styles.font,
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  fontStyle: 'italic'
                }}>
                  "{settings?.bio || 'Crafting artisanal treats with the finest ingredients. Every creation tells a story of passion and perfection.'}"
                </p>
                <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                   <div style={{ width: 40, height: 1, background: theme.accent, opacity: 0.3 }} />
                   <span style={{ fontWeight: 800, fontSize: '0.9rem', color: theme.accent, letterSpacing: 2 }}>EST. 2024</span>
                   <div style={{ width: 40, height: 1, background: theme.accent, opacity: 0.3 }} />
                </div>
              </div>
            </FadeIn>
          </div>
       </section>

       {/* THE MENU */}
        <section style={{ padding: '100px 20px 140px', position: 'relative' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 100 }}>
               <FadeIn>
                 <h2 style={{ 
                   fontSize: 'clamp(3rem, 6vw, 5rem)', 
                   fontWeight: 950, 
                   fontFamily: theme.styles.font, 
                   letterSpacing: '-0.04em',
                   lineHeight: 1,
                   marginBottom: 20,
                   textTransform: theme.styles.isLowercase ? 'lowercase' : 'none'
                 }}>
                   The Collection
                 </h2>
                 <p style={{ color: theme.text, opacity: 0.5, fontSize: '1.4rem', fontWeight: 500, fontFamily: 'Montserrat, sans-serif' }}>Explore our seasonal artisanal favorites.</p>
               </FadeIn>
            </div>

            {displayProducts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 48 }}>
                {displayProducts.map((p, i) => (
                  <FadeIn key={i} delay={i * 0.1}>
                    <ProductCard product={p} theme={theme} onInquiry={() => { setShowInquiry(true); triggerHaptic('medium'); }} />
                  </FadeIn>
                ))}
              </div>
            ) : (
              <div style={{ padding: 120, textAlign: 'center', background: '#F8FAFC', borderRadius: 40, color: '#94A3B8' }}>
                <ShoppingBag size={80} style={{ marginBottom: 24, opacity: 0.2 }} />
                <h3 style={{ fontWeight: 800, fontSize: '1.5rem' }}>Curating our next collection</h3>
              </div>
            )}
          </div>
       </section>

       {/* FOOTER - BOUTIQUE VERSION */}
       <footer style={{ 
         padding: '160px 20px 80px', 
         background: '#0F172A', 
         color: 'white', 
         position: 'relative',
         overflow: 'hidden'
       }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.03, pointerEvents: 'none' }}>
             <UtensilsCrossed size={800} style={{ position: 'absolute', top: -200, right: -200 }} />
          </div>

          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 80, marginBottom: 120, textAlign: 'left' }}>
               <div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 950, marginBottom: 24, fontFamily: theme.styles.font, color: 'white' }}>
                    {bakeryName}
                  </h2>
                  <p style={{ color: '#94A3B8', fontSize: '1.1rem', lineHeight: 1.8, maxWidth: 400 }}>
                    Crafting extraordinary moments through artisanal baking. Every crumb is a testament to our dedication to quality and taste.
                  </p>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 900, color: 'white', letterSpacing: 4, textTransform: 'uppercase' }}>Connect</h4>
                  {settings?.instagram && (
                    <a href={`https://instagram.com/${settings.instagram}`} target="_blank" style={{ color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 16, fontWeight: 700, fontSize: '1.3rem', textDecoration: 'none' }}>
                       <Instagram size={32} /> @{settings.instagram}
                    </a>
                  )}
                  <div style={{ color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 16, fontWeight: 700, fontSize: '1.3rem' }}>
                     <MapPin size={32} /> {settings?.city || 'Local Delivery'}
                  </div>
               </div>

               <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 900, color: 'white', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 32 }}>Location</h4>
                  <div style={{ padding: 32, background: 'rgba(255,255,255,0.05)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
                     <p style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Serving {settings?.city || 'the community'} with love.</p>
                     <p style={{ color: '#64748B', marginTop: 8 }}>Available for delivery and pick-up orders.</p>
                  </div>
               </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
               <div style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>© {new Date().getFullYear()} {bakeryName}. All rights reserved.</div>
               <div style={{ display: 'flex', gap: 32, color: '#64748B', fontWeight: 600, fontSize: '0.9rem' }}>
                  <span>Privacy Policy</span>
                  <span>Terms of Service</span>
               </div>
            </div>
          </div>
       </footer>

       <AnimatePresence>
          {showInquiry && <InquiryModal baker={baker} settings={settings} theme={theme} onClose={() => setShowInquiry(false)} />}
          {activeStoryIdx !== null && <StoryViewer stories={stories} initialIndex={activeStoryIdx} onClose={() => setActiveStoryIdx(null)} />}
       </AnimatePresence>
    </div>
  );
}
