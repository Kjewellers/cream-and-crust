import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ShoppingBag, ExternalLink, Loader2, Instagram, Phone, Info } from 'lucide-react';
import { getBusinessByUsername, subscribeToProducts } from '../services/db';
import { formatCurrency } from '../utils/date';
import { showToast, triggerHaptic } from '../components/iOS';

export default function Portfolio() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [baker, setBaker] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBaker = async () => {
      const data = await getBusinessByUsername(username);
      if (data) {
        setBaker(data);
        // Once we have baker data, we can get their products
        const unsub = subscribeToProducts((prods) => {
          setProducts(prods.filter(p => p.imageUrl)); // Only show products with images in gallery
        }, null, data.userId);
        return unsub;
      } else {
        showToast('Baker not found', 'error');
      }
      setLoading(false);
    };
    fetchBaker();
  }, [username]);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <Loader2 className="animate-spin" size={32} color="var(--accent)" />
    </div>
  );

  if (!baker) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: 20 }}>🧁</div>
      <h2>Store Not Found</h2>
      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/')}>Go Home</button>
    </div>
  );

  return (
    <div className="public-page" style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 60 }}>
      {/* Hero Section */}
      <div style={{ 
        height: '40vh', 
        position: 'relative', 
        overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {baker.coverPhoto ? (
          <img src={baker.coverPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
        ) : (
          <div style={{ fontSize: '10rem', opacity: 0.2 }}>🧁</div>
        )}
        
        <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 100, background: 'linear-gradient(to top, var(--bg), transparent)' }} />
      </div>

      <div style={{ maxWidth: 800, margin: '-60px auto 0', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        {/* Profile Info */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ 
            width: 120, 
            height: 120, 
            borderRadius: '50%', 
            background: 'white', 
            padding: 6, 
            margin: '0 auto 16px',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden'
          }}>
            {baker.logo && baker.logo.startsWith('data:image') ? (
              <img src={baker.logo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                {baker.logo || '🧁'}
              </div>
            )}
          </div>
          <h1 style={{ fontSize: '2rem', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>{baker.name}</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text2)', margin: '0 0 20px 0' }}>{baker.tagline || 'Crafting sweetness for your special moments'}</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button 
              className="btn btn-primary" 
              style={{ borderRadius: 30, padding: '12px 24px', gap: 8 }}
              onClick={() => {
                triggerHaptic('light');
                navigate(`/order/${username}`);
              }}
            >
              <ShoppingBag size={18} /> Order Now
            </button>
            <a 
              href={`https://wa.me/91${baker.phone?.replace(/\D/g, '')}?text=Hi! I saw your portfolio on Cream %26 Crust and would like to inquire about a cake.`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline"
              style={{ borderRadius: 30, padding: '12px 24px', gap: 8, background: 'white' }}
            >
              <MessageCircle size={18} color="#25D366" /> WhatsApp
            </a>
          </div>
        </div>

        {/* Gallery */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Signature Creations</h3>
            <span style={{ fontSize: '0.9rem', color: 'var(--text3)' }}>{products.length} Items</span>
          </div>

          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg2)', borderRadius: 20 }}>
              <p style={{ color: 'var(--text3)' }}>No photos uploaded yet.</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
              gap: 20 
            }}>
              {products.map((p, i) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -8 }}
                  style={{ 
                    background: 'white', 
                    borderRadius: 16, 
                    overflow: 'hidden', 
                    boxShadow: 'var(--shadow-md)',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    triggerHaptic('light');
                    navigate(`/order/${username}`);
                  }}
                >
                  <div style={{ height: 250, overflow: 'hidden' }}>
                    <img src={p.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>{p.name}</h4>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(p.basePrice)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text3)' }}>{p.category}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* About / Contact */}
        <div className="card" style={{ padding: 30, borderRadius: 24 }}>
          <h3 style={{ marginBottom: 20 }}>About the Baker</h3>
          <p style={{ color: 'var(--text2)', lineHeight: 1.6, marginBottom: 24 }}>
            {baker.about || `Hello! I'm the owner of ${baker.name}. I specialize in creating custom desserts that not only look beautiful but taste divine. Every order is baked fresh with the finest ingredients and lots of love.`}
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(212,113,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Instagram size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>INSTAGRAM</div>
                <div style={{ fontWeight: 600 }}>@{baker.instagram || username}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(52,152,219,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3498db' }}>
                <Phone size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>CONTACT</div>
                <div style={{ fontWeight: 600 }}>{baker.phone || 'Available on WhatsApp'}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text3)', fontSize: '0.9rem' }}>
          Built with love on <strong>Cream & Crust</strong>
        </div>
      </div>
    </div>
  );
}
