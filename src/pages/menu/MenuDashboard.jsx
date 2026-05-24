import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Copy, Eye, Package, Palette, Send, BookOpen, ArrowRight, Store, ListTree, PackagePlus, QrCode } from 'lucide-react';
import { showToast } from '../../components/iOS';
import MenuRenderer from '../../components/menu/MenuRenderer';
import { useMenuBuilderData } from './useMenuBuilderData';
import MenuBuilderShell, { PublishButton } from './MenuBuilderShell';
import MenuBuilderGuide from '../../components/menu/MenuBuilderGuide';
import QRCodeView from './QRCodeView';

const BUILD_STEPS = [
  { to: '/menu-builder/create', icon: Store, label: 'Bakery Details', desc: 'Name, logo, contact info', color: '#B5606A', bg: 'rgba(181,96,106,0.08)' },
  { to: '/menu-builder/categories', icon: ListTree, label: 'Categories', desc: 'Group your menu items', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  { to: '/menu-builder/products', icon: PackagePlus, label: 'Products', desc: 'Add photos, prices & details', color: '#EA823C', bg: 'rgba(234,130,60,0.08)' },
  { to: '/menu-builder/theme', icon: Palette, label: 'Theme', desc: 'Colours, fonts & layout', color: '#0284C7', bg: 'rgba(2,132,199,0.08)' },
];

export default function MenuDashboard() {
  const { business, username, menu, products, loading, publishMenu } = useMenuBuilderData();
  const [showGuide, setShowGuide] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const publicUrl = `${window.location.origin}/menu/${username}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    showToast('Menu link copied! 🔗', 'success');
  };

  const handlePublish = async () => {
    await publishMenu();
    showToast('Menu published! 🚀', 'success');
  };

  if (loading) return (
    <MenuBuilderShell title="Menu Builder" subtitle="Loading…">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading your menu…</div>
    </MenuBuilderShell>
  );

  const visibleProducts = products.filter(p => !p.menuHidden);
  const isPublished = menu.published;

  return (
    <>
      <AnimatePresence>
        {showGuide && <MenuBuilderGuide onClose={() => setShowGuide(false)} />}
      </AnimatePresence>

      <MenuBuilderShell
        title="Menu Builder"
        subtitle="Build and publish your shareable bakery menu."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowGuide(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', height: 38, padding: '0 12px' }}
            >
              <BookOpen size={14} /> Guide
            </button>
            <PublishButton onClick={handlePublish} />
          </div>
        }
      >
        {/* ── Status Card ── */}
        <div
          className="card"
          style={{
            padding: 20, borderRadius: 20, marginBottom: 16,
            background: isPublished
              ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
              : 'linear-gradient(135deg, #FFF8F1 0%, #FFE8D0 100%)',
            border: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: '2rem' }}>{isPublished ? '🟢' : '🟡'}</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '0.95rem', color: isPublished ? '#15803D' : '#B45309' }}>
                  {isPublished ? 'Live & Published' : 'Draft — Not Published'}
                </div>
                <div style={{ fontSize: '0.75rem', color: isPublished ? '#15803D' : '#B45309', opacity: 0.8, marginTop: 2 }}>
                  {isPublished ? `${visibleProducts.length} products visible to customers` : 'Tap Publish when ready to go live'}
                </div>
              </div>
            </div>
            {isPublished && (
              <button
                className="btn"
                onClick={() => window.open(publicUrl, '_blank')}
                style={{ 
                  gap: 6, fontSize: '0.82rem', height: 38, padding: '0 16px', 
                  backgroundColor: '#10B981', color: '#FFFFFF', border: 'none',
                  borderRadius: 99, fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                Go to Menu 🌐
              </button>
            )}
          </div>
          {isPublished && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#15803D', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {publicUrl}
              </span>
              <button onClick={handleCopy} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#15803D', display: 'flex' }}>
                <Copy size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { icon: Package, label: 'Products (Unlimited ♾️)', value: visibleProducts.length + '/' + products.length, color: '#EA823C' },
            { icon: ListTree, label: 'Categories', value: (menu.categories || []).length, color: '#7C3AED' },
            { icon: CheckCircle2, label: 'Status', value: isPublished ? 'Live' : 'Draft', color: isPublished ? '#10B981' : '#F59E0B' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: '14px 12px', borderRadius: 16, textAlign: 'center' }}>
              <stat.icon size={18} color={stat.color} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: typeof stat.value === 'string' && stat.value.length > 5 ? '0.9rem' : '1.2rem', fontWeight: 900, color: 'var(--text)' }}>{stat.value}</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Build Flow Steps ── */}
        <div className="card" style={{ padding: '16px 20px', borderRadius: 20, marginBottom: 16 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}>🛠️ Build Flow</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BUILD_STEPS.map((step, i) => (
              <Link
                key={step.to}
                to={step.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 14, textDecoration: 'none',
                  background: step.bg, border: `1.5px solid ${step.color}20`,
                  transition: 'transform 0.15s',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: step.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <step.icon size={16} color={step.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text)' }}>
                    <span style={{ color: step.color, marginRight: 4 }}>{i + 1}.</span>{step.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 1 }}>{step.desc}</div>
                </div>
                <ArrowRight size={16} color={step.color} style={{ flexShrink: 0, opacity: 0.7 }} />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={handlePublish} style={{ gap: 6, height: 46 }}>
            <Send size={16} /> Publish
          </button>
          <button className="btn btn-outline" onClick={handleCopy} style={{ gap: 6, height: 46 }}>
            <Copy size={16} /> Copy Link
          </button>
        </div>

        {/* ── QR Code ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <QrCode size={14} color="var(--accent)" /> QR Code
          </div>
          {isPublished ? (
            <QRCodeView username={username} />
          ) : (
            <div 
              className="card"
              style={{
                padding: '24px 20px', textAlign: 'center', borderRadius: 20,
                border: '2px dashed var(--border)', background: 'var(--bg2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
              }}
            >
              <div style={{ fontSize: '2rem' }}>🔒</div>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text)' }}>
                QR Code Locked
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)', maxWidth: 280 }}>
                Publish your bakery menu live to generate your custom table-stand scan QR code! 🧁
              </div>
            </div>
          )}
        </div>

        {/* ── Live Preview (collapsible on mobile) ── */}
        <div className="card" style={{ padding: '14px 16px', borderRadius: 20 }}>
          <button
            onClick={() => setShowPreview(p => !p)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 0
            }}
          >
            <div style={{ fontWeight: 900, fontSize: '0.88rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={16} color="var(--accent)" /> Menu Preview
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 800 }}>
              {showPreview ? 'Hide ▲' : 'Show ▼'}
            </span>
          </button>
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden', marginTop: 14 }}
              >
                <MenuRenderer business={business} settings={menu} products={products} preview />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MenuBuilderShell>
    </>
  );
}
