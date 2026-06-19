import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Copy, Check, Instagram, MessageCircle, 
  Globe, QrCode, Download, Send, Share2 
} from 'lucide-react';
import { showToast, triggerHaptic } from '../iOS';

export default function ShareModal({ username, onClose }) {
  const [copied, setCopied] = React.useState(false);
  const link = `creamcrust.app/${username}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    triggerHaptic('success');
    showToast('Link copied! 🔗', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      action: async () => {
        const url = `https://wa.me/?text=Check out my bakery portfolio: ${link}`;
        try {
          const { openLink } = await import('../../utils/openLink');
          await openLink(url);
        } catch {
          window.open(url, '_blank');
        }
      }
    },
    { name: 'Instagram', icon: Instagram, color: '#E4405F', action: () => showToast('Share to Stories coming soon!', 'info') },
    { name: 'QR Code', icon: QrCode, color: '#000000', action: () => showToast('QR generated!', 'success') },
    {
      name: 'Browser',
      icon: Globe,
      color: '#2563EB',
      action: async () => {
        const url = `/${username}`;
        try {
          const { openLink } = await import('../../utils/openLink');
          await openLink(url);
        } catch {
          window.open(url, '_blank');
        }
      }
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 5000, 
        background: 'rgba(0,0,0,0.4)', 
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        style={{ 
          width: '100%', 
          maxWidth: 450, 
          background: 'white', 
          borderRadius: 40, 
          padding: 40,
          boxShadow: '0 40px 100px rgba(0,0,0,0.2)',
          position: 'relative'
        }}
      >
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', 
            top: 24, 
            right: 24, 
            background: '#F1F5F9', 
            border: 'none', 
            width: 40, 
            height: 40, 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ 
            width: 80, 
            height: 80, 
            borderRadius: 24, 
            background: 'linear-gradient(135deg, #2563EB, #60A5FA)', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 20px 40px rgba(37,99,235,0.2)'
          }}>
            <Share2 size={32} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#0F172A' }}>Share Portfolio</h2>
          <p style={{ color: '#64748B', marginTop: 8 }}>Your storefront is ready for the world.</p>
        </div>

        <div style={{ 
          background: '#F8FAFC', 
          padding: 16, 
          borderRadius: 20, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          border: '1px solid #E2E8F0',
          marginBottom: 32
        }}>
          <Globe size={18} color="#64748B" />
          <span style={{ flex: 1, fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>{link}</span>
          <button 
            onClick={handleCopy}
            style={{ 
              background: 'white', 
              border: '1px solid #E2E8F0', 
              padding: '8px 16px', 
              borderRadius: 12, 
              fontWeight: 800, 
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {shareOptions.map((opt, i) => (
            <motion.button
              key={i}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={opt.action}
              style={{ 
                background: 'none', 
                border: 'none', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: 10,
                cursor: 'pointer'
              }}
            >
              <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: 20, 
                background: `${opt.color}10`, 
                color: opt.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${opt.color}20`
              }}>
                <opt.icon size={28} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B' }}>{opt.name}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
