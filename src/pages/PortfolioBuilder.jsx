import React, { useState } from 'react';
import { 
  Instagram, MessageCircle, Phone, MapPin, Clock, Star,
  Share2, Copy, Download, Link, Check, Plus, Heart, Menu, 
  ShoppingCart, Award, ShieldCheck, Clock3, ThumbsUp, ArrowRight, X, ArrowLeft
} from 'lucide-react';
import { showToast, triggerHaptic } from '../components/iOS';

// Curated Unsplash images for extreme realism and premium visual look
const IMAGES = {
  chocolateCake: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
  redVelvetCake: "https://images.unsplash.com/photo-1586985289688-ca9cf4993cc0?auto=format&fit=crop&w=600&q=80",
  butterscotchCake: "https://images.unsplash.com/photo-1535141192574-5d4897c13636?auto=format&fit=crop&w=600&q=80",
  
  catCakes: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=150&q=80",
  catBento: "https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=150&q=80",
  catBrownies: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=150&q=80",
  catCupcakes: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=150&q=80",
  catDesserts: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=150&q=80",
  catCustom: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=150&q=80",

  blackForest: "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=150&q=80",
  pineapple: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=150&q=80",
  blueberry: "https://images.unsplash.com/photo-1524351199679-46cddf530c04?auto=format&fit=crop&w=150&q=80",
  ganache: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=150&q=80",
  mocha: "https://images.unsplash.com/photo-1557925923-cd4648e21187?auto=format&fit=crop&w=150&q=80",
  caramel: "https://images.unsplash.com/photo-1508737027454-e6454ef45afd?auto=format&fit=crop&w=150&q=80",

  customCakesBanner: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=800&q=80",
  
  insta1: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=300&q=80",
  insta2: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=300&q=80",
  insta3: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=80",
  insta4: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=300&q=80",
  
  logo: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=150&q=80"
};

export default function PortfolioBuilder() {
  const shareUrl = "creamandcrust.online/menu/bharat";
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    triggerHaptic('light');
    showToast('Menu link copied! 📋✨', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsAppAction = (message) => {
    triggerHaptic('medium');
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/919876543210?text=${encoded}`, '_blank');
  };

  const handleInstagramAction = () => {
    triggerHaptic('medium');
    window.open('https://instagram.com/', '_blank');
  };

  const handleDownloadPDF = () => {
    triggerHaptic('medium');
    showToast('Downloading your beautiful menu PDF... 📥', 'info');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#FAF7F2', 
      color: '#4A3B32', 
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '40px 24px',
      overflowX: 'hidden'
    }}>
      {/* Google Fonts Link */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* TOP HEADER */}
      <header style={{ 
        maxWidth: '1440px', 
        margin: '0 auto 36px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '4px',
        paddingLeft: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: 800, 
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '-0.02em',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#322720'
          }}>
            SHARED MENU PREVIEW <span style={{ color: '#E59A5A' }}>✨</span>
          </h1>
        </div>
        <p style={{ 
          fontSize: '0.95rem', 
          color: '#8C7A6B', 
          fontWeight: 500,
          margin: 0
        }}>
          This is how your customers see your beautiful menu
        </p>
      </header>

      {/* MAIN TWO-COLUMN CONTAINER */}
      <div style={{ 
        maxWidth: '1440px', 
        margin: '0 auto', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(12, 1fr)', 
        gap: '40px' 
      }}>
        
        {/* ========================================================
            LEFT COLUMN: Mobile iPhone Mockup & Social Previews (~42% / 5 cols)
            ======================================================== */}
        <div style={{ 
          gridColumn: 'span 5', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '36px' 
        }}>
          
          {/* IPHONE MOCKUP PREVIEW */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ 
              width: '380px', 
              height: '780px', 
              backgroundColor: '#000000', 
              borderRadius: '52px', 
              padding: '12px', 
              boxShadow: '0 25px 60px -15px rgba(50,39,32,0.25), 0 0 0 4px #2b2521, 0 0 0 10px #1f1a17',
              position: 'relative',
              boxSizing: 'border-box',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              
              {/* iPhone Notch (Dynamic Island) */}
              <div style={{ 
                position: 'absolute', 
                top: '20px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                width: '110px', 
                height: '30px', 
                backgroundColor: '#000000', 
                borderRadius: '20px', 
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                boxSizing: 'border-box'
              }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#101010', border: '1px solid rgba(255,255,255,0.08)' }} />
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
              </div>

              {/* iPhone Screen Content */}
              <div className="hide-scrollbar" style={{ 
                width: '100%', 
                height: '100%', 
                backgroundColor: '#FAF7F2', 
                borderRadius: '42px', 
                overflowY: 'scroll', 
                position: 'relative',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: '#4A3B32'
              }}>
                
                {/* Mobile Status Bar */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '16px 28px 10px', 
                  fontSize: '0.75rem', 
                  fontWeight: '700',
                  color: '#4A3B32',
                  backgroundColor: 'transparent',
                  position: 'relative',
                  zIndex: 20
                }}>
                  <span>9:41</span>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem' }}>📶</span>
                    <span style={{ fontSize: '0.65rem' }}>🛜</span>
                    <span style={{ fontSize: '0.65rem' }}>🔋</span>
                  </div>
                </div>

                {/* Mobile Navbar */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '8px 20px',
                  borderBottom: '1px solid rgba(74, 59, 50, 0.05)'
                }}>
                  <Menu size={20} style={{ color: '#4A3B32' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      backgroundImage: `url(${IMAGES.logo})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: '1px solid rgba(74,59,50,0.1)'
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#322720' }}>Cream & Crust</span>
                      <span style={{ fontSize: '0.55rem', color: '#8C7A6B', fontWeight: 600 }}>Made with love ❤️</span>
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <ShoppingCart size={18} style={{ color: '#4A3B32' }} />
                    <span style={{ 
                      position: 'absolute', 
                      top: '-6px', 
                      right: '-6px', 
                      backgroundColor: '#E59A5A', 
                      color: 'white', 
                      fontSize: '0.55rem', 
                      padding: '1px 4px', 
                      borderRadius: '50%', 
                      fontWeight: 800 
                    }}>2</span>
                  </div>
                </div>

                {/* Mobile Hero */}
                <div style={{ padding: '24px 20px', textAlign: 'left' }}>
                  <h2 style={{ 
                    fontFamily: "'Playfair Display', serif", 
                    fontSize: '1.75rem', 
                    fontWeight: 700, 
                    color: '#322720',
                    margin: '0 0 8px 0',
                    lineHeight: 1.25
                  }}>
                    Sweet Moments, Made Special <span style={{ fontFamily: 'sans-serif', fontWeight: 300, color: '#A67C52' }}>🤎</span>
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: '#8C7A6B', margin: '0 0 16px', fontWeight: 500 }}>
                    Homemade cakes & desserts for every occasion
                  </p>
                  <button 
                    onClick={() => handleWhatsAppAction("Hi Cream & Crust, I would like to order a cake!")}
                    style={{ 
                      backgroundColor: '#261F1A', 
                      color: '#FAF7F2', 
                      border: 'none', 
                      padding: '10px 16px', 
                      borderRadius: '30px', 
                      fontSize: '0.75rem', 
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      marginBottom: '20px'
                    }}
                  >
                    <MessageCircle size={14} fill="currentColor" /> Order on WhatsApp
                  </button>
                  <img src={IMAGES.chocolateCake} style={{ 
                    width: '100%', 
                    height: '180px', 
                    objectFit: 'cover', 
                    borderRadius: '20px',
                    boxShadow: '0 8px 24px rgba(74,59,50,0.08)'
                  }} alt="Chocolate Cake" />
                </div>

                {/* Mobile Categories */}
                <div style={{ padding: '0 0 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ height: '1px', backgroundColor: 'rgba(74, 59, 50, 0.1)', flex: 1, marginLeft: '20px' }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#8C7A6B' }}>Our Categories</span>
                    <div style={{ height: '1px', backgroundColor: 'rgba(74, 59, 50, 0.1)', flex: 1, marginRight: '20px' }} />
                  </div>
                  <div className="hide-scrollbar" style={{ display: 'flex', gap: '12px', overflowX: 'scroll', padding: '0 20px' }}>
                    {[
                      { name: 'Cakes', img: IMAGES.catCakes },
                      { name: 'Bento Cakes', img: IMAGES.catBento },
                      { name: 'Brownies', img: IMAGES.catBrownies },
                      { name: 'Cupcakes', img: IMAGES.catCupcakes },
                      { name: 'Desserts', img: IMAGES.catDesserts },
                      { name: 'Custom', img: IMAGES.catCustom }
                    ].map((cat, i) => (
                      <div key={i} style={{ 
                        flexShrink: 0, 
                        width: '74px', 
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <div style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '16px', 
                          backgroundImage: `url(${cat.img})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          boxShadow: '0 4px 12px rgba(74,59,50,0.05)',
                          border: '1px solid rgba(255,255,255,0.7)'
                        }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#4A3B32' }}>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile Bestsellers */}
                <div style={{ padding: '0 20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#322720', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#E59A5A' }}>✨</span> Bestsellers
                    </span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#A67C52', cursor: 'pointer' }}>View all</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[
                      { name: "Chocolate Truffle Cake", desc: "Rich, moist chocolate cake with chocolate ganache", price: "650", img: IMAGES.chocolateCake, badge: "Bestseller" },
                      { name: "Red Velvet Cake", desc: "Classic red velvet with cream cheese frosting", price: "600", img: IMAGES.redVelvetCake, badge: "Bestseller" },
                      { name: "Butterscotch Cake", desc: "Butterscotch sponge with caramel crunch", price: "550", img: IMAGES.butterscotchCake, badge: null }
                    ].map((item, i) => (
                      <div key={i} style={{ 
                        backgroundColor: '#FFFFFF', 
                        borderRadius: '20px', 
                        overflow: 'hidden',
                        boxShadow: '0 6px 18px rgba(74,59,50,0.03)',
                        border: '1px solid rgba(74,59,50,0.03)',
                        position: 'relative'
                      }}>
                        <div style={{ position: 'relative', height: '140px' }}>
                          <img src={item.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.name} />
                          {item.badge && (
                            <span style={{ 
                              position: 'absolute', 
                              top: '12px', 
                              left: '12px', 
                              backgroundColor: '#E59A5A', 
                              color: 'white', 
                              fontSize: '0.55rem', 
                              fontWeight: 800, 
                              padding: '3px 8px', 
                              borderRadius: '20px',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase'
                            }}>{item.badge}</span>
                          )}
                        </div>
                        <div style={{ padding: '12px 14px' }}>
                          <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#322720', margin: '0 0 4px' }}>{item.name}</h4>
                          <p style={{ fontSize: '0.62rem', color: '#8C7A6B', margin: '0 0 10px', lineHeight: 1.3 }}>{item.desc}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#322720' }}>₹{item.price}</span>
                              <span style={{ fontSize: '0.55rem', color: '#8C7A6B', marginLeft: '4px' }}>Starting Price</span>
                            </div>
                            <div style={{ 
                              width: '24px', 
                              height: '24px', 
                              borderRadius: '50%', 
                              border: '1px solid #A67C52', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              color: '#A67C52',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}>+</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile Custom Cakes Card */}
                <div style={{ padding: '0 20px 24px' }}>
                  <div style={{ 
                    backgroundImage: 'linear-gradient(135deg, #FFF0F2 0%, #FFE5E9 100%)', 
                    borderRadius: '20px', 
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 6px 18px rgba(229,154,90,0.05)',
                    border: '1px solid rgba(229,154,90,0.08)'
                  }}>
                    <div style={{ flex: 1, paddingRight: '12px' }}>
                      <h4 style={{ fontSize: '0.75rem', color: '#8C4F5C', fontWeight: 800, margin: '0 0 4px' }}>Custom Cakes for</h4>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', color: '#3E1C24', fontWeight: 700, margin: '0 0 8px' }}>Every Occasion</h3>
                      <button 
                        onClick={() => handleWhatsAppAction("Hi! I would like to inquire about a custom cake order.")}
                        style={{ 
                          backgroundColor: '#3E1C24', 
                          color: '#FAF7F2', 
                          border: 'none', 
                          padding: '6px 12px', 
                          borderRadius: '30px', 
                          fontSize: '0.6rem', 
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >Order Custom Cake</button>
                    </div>
                    <img src={IMAGES.customCakesBanner} style={{ 
                      width: '74px', 
                      height: '74px', 
                      borderRadius: '14px', 
                      objectFit: 'cover',
                      border: '2.5px solid #FFFFFF',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                    }} alt="Custom Cake" />
                  </div>
                </div>

                {/* Mobile Trust Badges */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: '8px', 
                  padding: '0 20px 24px',
                  textAlign: 'center'
                }}>
                  {[
                    { label: "100% Fresh", icon: "🌱", sub: "Made to order" },
                    { label: "Premium Quality", icon: "🏆", sub: "Best ingredients" },
                    { label: "Hygienic Kitchen", icon: "🧼", sub: "Clean & safe" },
                    { label: "On-time Delivery", icon: "🕒", sub: "Always on time" }
                  ].map((badge, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '1rem' }}>{badge.icon}</span>
                      <span style={{ fontSize: '0.45rem', fontWeight: 800, color: '#322720', lineHeight: 1.1 }}>{badge.label}</span>
                      <span style={{ fontSize: '0.38rem', color: '#8C7A6B' }}>{badge.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Mobile Footer Area */}
                <div style={{ 
                  backgroundColor: '#261F1A', 
                  padding: '16px 20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  borderTopLeftRadius: '24px',
                  borderTopRightRadius: '24px'
                }}>
                  <span style={{ fontSize: '0.6rem', color: '#FAF7F2', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageCircle size={10} fill="currentColor" /> Whatsapp Us
                  </span>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    backgroundImage: `url(${IMAGES.logo})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1.5px solid #FFFFFF'
                  }} />
                  <span style={{ fontSize: '0.6rem', color: '#FAF7F2', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Instagram size={10} /> Follow Us
                  </span>
                </div>

              </div>
            </div>
          </div>

          {/* SHARE YOUR MENU CARD */}
          <div style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: '32px', 
            padding: '28px', 
            boxShadow: '0 10px 30px rgba(74,59,50,0.03)',
            border: '1px solid rgba(74,59,50,0.04)',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: 800, 
              color: '#322720',
              margin: '0 0 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              SHARE YOUR MENU <span style={{ color: '#E59A5A' }}>✨</span>
            </h3>
            <p style={{ 
              fontSize: '0.78rem', 
              color: '#8C7A6B', 
              margin: '0 0 20px', 
              fontWeight: 500,
              lineHeight: 1.45
            }}>
              Customers can view your menu and place inquiries directly on WhatsApp
            </p>

            {/* Link Input Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: '#FAF7F2', 
              borderRadius: '16px', 
              padding: '6px 6px 6px 14px',
              border: '1px solid rgba(74,59,50,0.06)',
              marginBottom: '24px'
            }}>
              <span style={{ 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                color: '#6E5D53',
                flex: 1,
                fontFamily: 'monospace'
              }}>
                {shareUrl}
              </span>
              <button 
                onClick={handleCopyLink}
                style={{ 
                  backgroundColor: '#F5EFE6', 
                  color: '#4A3B32', 
                  border: '1px solid rgba(74,59,50,0.1)', 
                  borderRadius: '10px', 
                  padding: '8px 14px', 
                  fontSize: '0.75rem', 
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: '0.2s ease'
                }}
              >
                {copied ? <Check size={12} style={{ color: '#22C55E' }} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>

            {/* Sharing Channels Icon Row */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '12px',
              textAlign: 'center'
            }}>
              {[
                { label: 'WhatsApp', color: '#22C55E', bg: '#EDFDF4', icon: <MessageCircle size={22} fill="currentColor" />, action: () => handleWhatsAppAction("Hi! Take a look at our bakery menu: creamandcrust.online/menu/bharat") },
                { label: 'Instagram', color: '#E1306C', bg: '#FDF2F4', icon: <Instagram size={22} />, action: handleInstagramAction },
                { label: 'Share Link', color: '#7c695b', bg: '#FAF6F0', icon: <Link size={20} />, action: handleCopyLink },
                { label: 'Download', color: '#2563EB', bg: '#EFF6FF', icon: <Download size={20} />, action: handleDownloadPDF }
              ].map((chan, i) => (
                <div key={i} onClick={chan.action} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '8px',
                  cursor: 'pointer'
                }}>
                  <div style={{ 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '16px', 
                    backgroundColor: chan.bg, 
                    color: chan.color, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: 'inset 0 0 0 1px rgba(74,59,50,0.03)',
                    transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }} className="share-btn">
                    {chan.icon}
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4A3B32' }}>{chan.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SHARED ON WHATSAPP PREVIEW CARD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#8C7A6B', paddingLeft: '4px' }}>
              Shared on WhatsApp
            </span>
            <div style={{ 
              backgroundColor: '#E8F5E9', 
              borderRadius: '24px', 
              padding: '12px 14px', 
              boxShadow: '0 8px 24px rgba(74,59,50,0.04)',
              border: '1px solid rgba(74,59,50,0.04)',
              alignSelf: 'flex-start',
              maxWidth: '310px',
              position: 'relative'
            }}>
              <div style={{ 
                backgroundColor: '#FFFFFF', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                border: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <img src={IMAGES.chocolateCake} style={{ width: '100%', height: '110px', objectFit: 'cover' }} alt="Cake" />
                <div style={{ padding: '10px 12px' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>Cream & Crust Menu</h4>
                  <p style={{ fontSize: '0.6rem', color: '#D97706', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    Sweet moments made special ❤️
                  </p>
                  <p style={{ fontSize: '0.58rem', color: '#4B5563', margin: '0 0 6px', lineHeight: 1.3 }}>
                    Check out our menu and order your favorites!
                  </p>
                  <span style={{ fontSize: '0.55rem', color: '#9CA3AF' }}>creamandcrust.online</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'center', gap: '3px', marginTop: '6px', fontSize: '0.55rem', color: '#6B7280' }}>
                <span>9:41 AM</span>
                <span style={{ color: '#34D399', fontSize: '0.62rem' }}>✔✔</span>
              </div>
            </div>
          </div>

          {/* SHARED ON INSTAGRAM STORIES PREVIEW */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#8C7A6B', paddingLeft: '4px' }}>
              Shared on Instagram Stories
            </span>
            <div style={{ 
              width: '200px', 
              height: '340px', 
              borderRadius: '24px', 
              overflow: 'hidden', 
              boxShadow: '0 12px 32px rgba(74,59,50,0.06)',
              border: '4px solid #FFFFFF',
              position: 'relative'
            }}>
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.4) 100%), url(${IMAGES.chocolateCake})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 1
              }} />

              {/* Story Header */}
              <div style={{ 
                position: 'absolute', 
                top: '12px', 
                left: '12px', 
                right: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    backgroundImage: `url(${IMAGES.logo})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid #FFFFFF'
                  }} />
                  <span style={{ fontSize: '0.6rem', color: '#FFFFFF', fontWeight: 800 }}>creamandcrust</span>
                  <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)' }}>3h</span>
                </div>
                <X size={14} style={{ color: '#FFFFFF' }} />
              </div>

              {/* Story Text Overlays */}
              <div style={{ 
                position: 'absolute', 
                top: '70px', 
                left: '16px', 
                zIndex: 10,
                textAlign: 'left'
              }}>
                <h2 style={{ 
                  fontFamily: "'Playfair Display', serif", 
                  fontSize: '1.6rem', 
                  fontWeight: 700, 
                  color: '#FFFFFF',
                  margin: 0,
                  lineHeight: 1.15
                }}>Our Menu</h2>
                <p style={{ 
                  fontSize: '0.62rem', 
                  color: '#FAF7F2', 
                  margin: '2px 0 0',
                  fontWeight: 600,
                  letterSpacing: '0.5px'
                }}>Made with love 🤎</p>
              </div>

              {/* Story Link Sticker */}
              <div 
                onClick={() => handleWhatsAppAction("Hi! Visited from your Instagram Story. I'd like to check out the menu!")}
                style={{ 
                  position: 'absolute', 
                  bottom: '70px', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  backgroundColor: '#FFFFFF', 
                  color: '#322720', 
                  borderRadius: '20px', 
                  padding: '8px 16px', 
                  fontSize: '0.65rem', 
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  zIndex: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: 'fit-content',
                  whiteSpace: 'nowrap'
                }}
              >
                🔗 ORDER NOW
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================
            RIGHT COLUMN: Desktop Web Menu Mockup (~58% / 7 cols)
            ======================================================== */}
        <div style={{ 
          gridColumn: 'span 7', 
          backgroundColor: '#FFFFFF', 
          borderRadius: '40px', 
          boxShadow: '0 30px 70px -10px rgba(50,39,32,0.1)',
          border: '1px solid rgba(74,59,50,0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          
          {/* DESKTOP NAVBAR */}
          <nav style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '24px 40px',
            borderBottom: '1px solid rgba(74, 59, 50, 0.05)',
            backgroundColor: '#FFFFFF',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '50%', 
                backgroundImage: `url(${IMAGES.logo})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '1px solid rgba(74,59,50,0.08)'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#322720', letterSpacing: '-0.02em' }}>Cream & Crust</span>
                <span style={{ fontSize: '0.72rem', color: '#8C7A6B', fontWeight: 600 }}>Made with love ❤️</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button 
                onClick={() => handleWhatsAppAction("Hello Cream & Crust! Visited your website.")}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.8rem', 
                  fontWeight: 700, 
                  color: '#4A3B32',
                  cursor: 'pointer'
                }}
              >
                <MessageCircle size={15} /> WhatsApp
              </button>
              <button 
                onClick={handleInstagramAction}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.8rem', 
                  fontWeight: 700, 
                  color: '#4A3B32',
                  cursor: 'pointer'
                }}
              >
                <Instagram size={15} /> Instagram
              </button>
            </div>
          </nav>

          {/* DESKTOP HERO SECTION */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(12, 1fr)', 
            padding: '54px 40px',
            alignItems: 'center',
            gap: '30px',
            backgroundColor: '#FAF7F2',
            boxSizing: 'border-box'
          }}>
            <div style={{ gridColumn: 'span 7', textAlign: 'left' }}>
              <h1 style={{ 
                fontFamily: "'Playfair Display', serif", 
                fontSize: '2.5rem', 
                fontWeight: 700, 
                color: '#322720',
                margin: '0 0 12px',
                lineHeight: 1.2
              }}>
                Sweet Moments, Made Special <span style={{ fontFamily: 'sans-serif', fontWeight: 300, color: '#A67C52' }}>🤎</span>
              </h1>
              <p style={{ 
                fontSize: '0.95rem', 
                color: '#8C7A6B', 
                margin: '0 0 24px', 
                fontWeight: 500,
                lineHeight: 1.5
              }}>
                Homemade cakes & desserts for every occasion
              </p>
              <button 
                onClick={() => handleWhatsAppAction("Hi! I would like to place an order.")}
                style={{ 
                  backgroundColor: '#261F1A', 
                  color: '#FAF7F2', 
                  border: 'none', 
                  padding: '14px 24px', 
                  borderRadius: '30px', 
                  fontSize: '0.85rem', 
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(50,39,32,0.1)'
                }}
              >
                <MessageCircle size={16} fill="currentColor" /> Order on WhatsApp
              </button>
            </div>
            <div style={{ gridColumn: 'span 5' }}>
              <img src={IMAGES.chocolateCake} style={{ 
                width: '100%', 
                height: '240px', 
                objectFit: 'cover', 
                borderRadius: '24px',
                boxShadow: '0 12px 36px rgba(74,59,50,0.1)'
              }} alt="Chocolate Cake on Gold Stand" />
            </div>
          </div>

          {/* DESKTOP CATEGORIES SECTION */}
          <div style={{ padding: '44px 40px 0', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
              <div style={{ height: '1px', backgroundColor: 'rgba(74, 59, 50, 0.1)', flex: 1 }} />
              <span style={{ 
                fontSize: '0.8rem', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                letterSpacing: '1.5px', 
                color: '#8C7A6B',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⚜️ Our Categories ⚜️
              </span>
              <div style={{ height: '1px', backgroundColor: 'rgba(74, 59, 50, 0.1)', flex: 1 }} />
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(6, 1fr)', 
              gap: '16px' 
            }}>
              {[
                { name: 'Cakes', img: IMAGES.catCakes },
                { name: 'Bento Cakes', img: IMAGES.catBento },
                { name: 'Brownies', img: IMAGES.catBrownies },
                { name: 'Cupcakes', img: IMAGES.catCupcakes },
                { name: 'Desserts', img: IMAGES.catDesserts },
                { name: 'Custom Cakes', img: IMAGES.catCustom }
              ].map((cat, i) => (
                <div key={i} style={{ 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}>
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    borderRadius: '20px', 
                    backgroundImage: `url(${cat.img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 6px 16px rgba(74,59,50,0.04)',
                    border: '1.5px solid #FFFFFF',
                    transition: 'transform 0.25s ease'
                  }} className="category-card" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4A3B32' }}>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DESKTOP BESTSELLERS SECTION */}
          <div style={{ padding: '44px 40px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
              <h2 style={{ 
                fontFamily: "'Playfair Display', serif", 
                fontSize: '1.5rem', 
                fontWeight: 700, 
                color: '#322720',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ color: '#E59A5A' }}>✨</span> Bestseller Cakes
              </h2>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#A67C52', cursor: 'pointer' }}>View all</span>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '24px' 
            }}>
              {[
                { name: "Chocolate Truffle Cake", desc: "Rich, moist chocolate cake with chocolate ganache", price: "650", img: IMAGES.chocolateCake, badge: "Bestseller" },
                { name: "Red Velvet Cake", desc: "Classic red velvet with cream cheese frosting", price: "600", img: IMAGES.redVelvetCake, badge: "Bestseller" },
                { name: "Butterscotch Cake", desc: "Butterscotch sponge with caramel crunch", price: "550", img: IMAGES.butterscotchCake, badge: null }
              ].map((item, i) => (
                <div key={i} style={{ 
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '24px', 
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(74,59,50,0.03)',
                  border: '1px solid rgba(74,59,50,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}>
                  <div style={{ position: 'relative', height: '160px' }}>
                    <img src={item.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.name} />
                    {item.badge && (
                      <span style={{ 
                        position: 'absolute', 
                        top: '14px', 
                        left: '14px', 
                        backgroundColor: '#E59A5A', 
                        color: 'white', 
                        fontSize: '0.6rem', 
                        fontWeight: 800, 
                        padding: '4px 10px', 
                        borderRadius: '20px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase'
                      }}>{item.badge}</span>
                    )}
                  </div>
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#322720', margin: '0 0 6px' }}>{item.name}</h4>
                    <p style={{ fontSize: '0.72rem', color: '#8C7A6B', margin: '0 0 16px', lineHeight: 1.45, flex: 1 }}>{item.desc}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#322720' }}>₹{item.price}</span>
                        <span style={{ fontSize: '0.62rem', color: '#8C7A6B', marginLeft: '4px' }}>Starting Price</span>
                      </div>
                      <div style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        border: '1px solid #A67C52', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#A67C52',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}>+</div>
                    </div>

                    <button 
                      onClick={() => handleWhatsAppAction(`Hi! I would like to order the ${item.name}.`)}
                      style={{ 
                        width: '100%', 
                        backgroundColor: '#261F1A', 
                        color: '#FAF7F2', 
                        border: 'none', 
                        padding: '10px 0', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <MessageCircle size={13} fill="currentColor" /> Order Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DESKTOP ALL CAKES SECTION */}
          <div style={{ padding: '0 40px 44px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
              <h2 style={{ 
                fontFamily: "'Playfair Display', serif", 
                fontSize: '1.5rem', 
                fontWeight: 700, 
                color: '#322720',
                margin: 0
              }}>All Cakes</h2>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#A67C52', cursor: 'pointer' }}>View all</span>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '24px' 
            }}>
              
              {/* Left Column of All Cakes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { name: "Black Forest Cake", desc: "Chocolate sponge with cherry & whipped cream", price: "600", img: IMAGES.blackForest, eggless: true },
                  { name: "Pineapple Cake", desc: "Soft vanilla sponge with fresh pineapple", price: "500", img: IMAGES.pineapple, eggless: true },
                  { name: "Blueberry Cheesecake", desc: "Creamy cheesecake with blueberry topping", price: "750", img: IMAGES.blueberry, eggless: true }
                ].map((cake, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '14px', 
                    backgroundColor: '#FAF7F2', 
                    padding: '12px', 
                    borderRadius: '16px',
                    border: '1px solid rgba(74,59,50,0.03)'
                  }}>
                    <img src={cake.img} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }} alt={cake.name} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#322720', margin: 0 }}>{cake.name}</h4>
                        {cake.eggless && (
                          <span style={{ 
                            fontSize: '0.52rem', 
                            fontWeight: 700, 
                            color: '#16A34A', 
                            backgroundColor: '#DCFCE7', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>Eggless</span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.62rem', color: '#8C7A6B', margin: '2px 0 4px', lineHeight: 1.3 }}>{cake.desc}</p>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#322720' }}>₹{cake.price}</span>
                    </div>
                    <MessageCircle 
                      size={18} 
                      style={{ color: '#22C55E', cursor: 'pointer' }} 
                      onClick={() => handleWhatsAppAction(`Hi! I'd like to order a ${cake.name}.`)}
                    />
                  </div>
                ))}
              </div>

              {/* Right Column of All Cakes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { name: "Chocolate Ganache Cake", desc: "Rich chocolate cake with smooth ganache", price: "650", img: IMAGES.ganache, eggless: false },
                  { name: "Mocha Cake", desc: "Coffee sponge with mocha cream", price: "600", img: IMAGES.mocha, eggless: false },
                  { name: "Caramel Cake", desc: "Soft caramel cake with butterscotch crunch", price: "550", img: IMAGES.caramel, eggless: false }
                ].map((cake, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '14px', 
                    backgroundColor: '#FAF7F2', 
                    padding: '12px', 
                    borderRadius: '16px',
                    border: '1px solid rgba(74,59,50,0.03)'
                  }}>
                    <img src={cake.img} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }} alt={cake.name} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#322720', margin: 0 }}>{cake.name}</h4>
                        {cake.eggless && (
                          <span style={{ 
                            fontSize: '0.52rem', 
                            fontWeight: 700, 
                            color: '#16A34A', 
                            backgroundColor: '#DCFCE7', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>Eggless</span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.62rem', color: '#8C7A6B', margin: '2px 0 4px', lineHeight: 1.3 }}>{cake.desc}</p>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#322720' }}>₹{cake.price}</span>
                    </div>
                    <MessageCircle 
                      size={18} 
                      style={{ color: '#22C55E', cursor: 'pointer' }} 
                      onClick={() => handleWhatsAppAction(`Hi! I'd like to order a ${cake.name}.`)}
                    />
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* DESKTOP CUSTOM CAKES BANNER */}
          <div style={{ padding: '0 40px 44px', boxSizing: 'border-box' }}>
            <div style={{ 
              backgroundImage: 'linear-gradient(135deg, #FFF0F2 0%, #FFE5E9 100%)', 
              borderRadius: '24px', 
              padding: '36px 44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 30px rgba(229,154,90,0.06)',
              border: '1px solid rgba(229,154,90,0.08)'
            }}>
              <div style={{ flex: 1, textAlign: 'left', paddingRight: '24px' }}>
                <h2 style={{ 
                  fontFamily: "'Playfair Display', serif", 
                  fontSize: '1.85rem', 
                  color: '#3E1C24', 
                  fontWeight: 700, 
                  margin: '0 0 6px' 
                }}>Custom Cakes for Every Occasion</h2>
                <p style={{ 
                  fontSize: '0.85rem', 
                  color: '#8C4F5C', 
                  fontWeight: 500, 
                  margin: '0 0 20px' 
                }}>Birthdays, Anniversaries, Weddings & more</p>
                <button 
                  onClick={() => handleWhatsAppAction("Hi! I would like to design and order a custom cake.")}
                  style={{ 
                    backgroundColor: '#3E1C24', 
                    color: '#FAF7F2', 
                    border: 'none', 
                    padding: '12px 24px', 
                    borderRadius: '30px', 
                    fontSize: '0.8rem', 
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(62,28,36,0.15)'
                  }}
                >Order Custom Cake</button>
              </div>
              <img src={IMAGES.customCakesBanner} style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '20px', 
                objectFit: 'cover',
                border: '4px solid #FFFFFF',
                boxShadow: '0 6px 18px rgba(0,0,0,0.05)'
              }} alt="Large Custom Wedding Cake" />
            </div>
          </div>

          {/* DESKTOP TRUST BADGES */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '20px', 
            padding: '24px 40px',
            backgroundColor: '#FAF7F2',
            borderTop: '1px solid rgba(74, 59, 50, 0.05)',
            borderBottom: '1px solid rgba(74, 59, 50, 0.05)',
            boxSizing: 'border-box'
          }}>
            {[
              { label: "100% Fresh", icon: "🌱", sub: "Made to order" },
              { label: "Premium Quality", icon: "🏆", sub: "Best ingredients" },
              { label: "Hygienic Kitchen", icon: "🧼", sub: "Clean & safe" },
              { label: "On-time Delivery", icon: "🕒", sub: "Always on time" }
            ].map((badge, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                <span style={{ fontSize: '1.75rem' }}>{badge.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#322720' }}>{badge.label}</span>
                  <span style={{ fontSize: '0.62rem', color: '#8C7A6B' }}>{badge.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP FOOTER */}
          <footer style={{ 
            backgroundColor: '#261F1A', 
            color: '#FAF7F2', 
            padding: '48px 40px',
            textAlign: 'left',
            boxSizing: 'border-box'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.2fr 1fr', 
              gap: '40px',
              borderBottom: '1px solid rgba(250,247,242,0.08)',
              paddingBottom: '36px'
            }}>
              
              {/* Instagram Feed column */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '0.5px' }}>Let's Stay Connected</h3>
                <p style={{ fontSize: '0.72rem', color: '#BFAFA0', margin: '0 0 16px' }}>
                  Follow us on Instagram for amazing creations and latest updates
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {[IMAGES.insta1, IMAGES.insta2, IMAGES.insta3, IMAGES.insta4].map((insta, i) => (
                    <div key={i} onClick={handleInstagramAction} style={{ 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      height: '70px',
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'opacity 0.2s'
                    }} className="insta-thumb">
                      <img src={insta} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Instagram post preview" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Us column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>Contact Us</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <MessageCircle size={16} style={{ color: '#E59A5A', marginTop: '2px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                      <span style={{ fontSize: '0.62rem', color: '#BFAFA0', fontWeight: 600 }}>WhatsApp</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FAF7F2' }}>+91 98765 43210</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <MapPin size={16} style={{ color: '#E59A5A', marginTop: '2px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                      <span style={{ fontSize: '0.62rem', color: '#BFAFA0', fontWeight: 600 }}>Location</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FAF7F2' }}>Lucknow, Uttar Pradesh</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <Clock size={16} style={{ color: '#E59A5A', marginTop: '2px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                      <span style={{ fontSize: '0.62rem', color: '#BFAFA0', fontWeight: 600 }}>Timings</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FAF7F2' }}>9:00 AM - 9:00 PM (Daily)</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Copyright area */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              paddingTop: '20px',
              fontSize: '0.68rem',
              color: '#BFAFA0',
              fontWeight: 500
            }}>
              <span>© 2025 Cream & Crust. All Rights Reserved.</span>
              <span>Made with ❤️ by <span style={{ color: '#E59A5A', fontWeight: 700 }}>Cream & Crust</span></span>
            </div>
          </footer>

        </div>

      </div>

      {/* Styled overrides for subtle micro-interactions */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .hide-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .share-btn:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 8px 16px rgba(74,59,50,0.08);
        }
        .category-card:hover {
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 10px 20px rgba(74,59,50,0.08);
        }
        .insta-thumb:hover {
          opacity: 0.85;
        }
        @media (max-width: 1024px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="gridColumn: span 5"], div[style*="gridColumn: span 7"] {
            grid-column: span 12 !important;
          }
        }
      `}} />
    </div>
  );
}
