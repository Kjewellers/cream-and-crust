import React, { useEffect, useRef, useState } from 'react';
import { Download, Share2, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { showToast } from '../../components/iOS';

// Minimal QR encoder using the qrcode data URI approach via a tiny inline encoder
// We use the free QR Server API to generate — no npm package needed
function QRCodeImg({ url, size = 220 }) {
  const encoded = encodeURIComponent(url);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=ffffff&color=4A3B32&qzone=2&format=png`;
  return (
    <img
      src={src}
      alt="QR Code"
      width={size}
      height={size}
      style={{ borderRadius: 12, display: 'block' }}
    />
  );
}

export default function QRCodeView({ username }) {
  const [copied, setCopied] = useState(false);
  const url = username ? `${window.location.origin}/menu/${username}` : null;

  const handleCopy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    showToast('Menu link copied! 🔗', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!url) return;
    const encoded = encodeURIComponent(url);
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encoded}&bgcolor=ffffff&color=4A3B32&qzone=2&format=png`;
    const a = document.createElement('a');
    a.href = src;
    a.download = 'menu-qr-code.png';
    a.target = '_blank';
    a.click();
    showToast('QR Code downloading… 📲', 'success');
  };

  const handleShare = async () => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Bakery Menu', url });
      } catch {}
    } else {
      handleCopy();
    }
  };

  if (!username) {
    return (
      <div style={{
        padding: '24px 20px', borderRadius: 20, border: '2px dashed var(--border)',
        textAlign: 'center', background: 'var(--bg2)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>📱</div>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 6 }}>
          Set a username first
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>
          Go to Settings → Profile to set your bakery username.
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 24,
        background: 'linear-gradient(135deg, #FFF9F6 0%, #FFDFD0 100%)',
        border: '1px solid rgba(181,96,106,0.12)',
        padding: '24px 20px',
        textAlign: 'center',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#B5606A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          📲 Scan to Order
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#4A3B32', letterSpacing: '-0.02em' }}>
          Your Menu QR Code
        </div>
        <div style={{ fontSize: '0.75rem', color: '#8C7A6B', marginTop: 4 }}>
          Print and display at your stall or counter
        </div>
      </div>

      {/* QR Code */}
      <div style={{
        display: 'inline-block',
        padding: 16,
        background: 'white',
        borderRadius: 20,
        boxShadow: '0 8px 24px rgba(74,59,50,0.10)',
        marginBottom: 20,
      }}>
        <QRCodeImg url={url} size={180} />
      </div>

      {/* URL preview */}
      <div style={{
        background: 'rgba(255,255,255,0.7)',
        borderRadius: 12,
        padding: '8px 14px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{ fontSize: '0.72rem', color: '#8C7A6B', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {url}
        </span>
        <button
          onClick={handleCopy}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B5606A', flexShrink: 0, display: 'flex' }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          onClick={handleDownloadQR}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: '#4A3B32', color: 'white',
            fontWeight: 800, fontSize: '0.82rem',
          }}
        >
          <Download size={14} /> Save QR
        </button>
        <button
          onClick={handleShare}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px', borderRadius: 14, border: '1.5px solid rgba(181,96,106,0.3)',
            cursor: 'pointer', background: 'white', color: '#B5606A',
            fontWeight: 800, fontSize: '0.82rem',
          }}
        >
          <Share2 size={14} /> Share
        </button>
      </div>
    </motion.div>
  );
}
