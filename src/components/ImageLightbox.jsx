import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn } from 'lucide-react';

/**
 * ImageLightbox — Instagram-grade gesture-driven media preview modal.
 * Opens full-screen media preview when a product/cake/recipe photo is tapped.
 */

export default function ImageLightbox({ src, alt = '', title = '', onClose }) {
  if (!src) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cream-crust-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(src, '_blank');
    }
  };

  // Lock body scroll (Instagram standard)
  useEffect(() => {
    if (!src || typeof window === 'undefined') return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const origOverflow = document.body.style.overflow;
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origPosition = document.body.style.position;
    const origTop = document.body.style.top;
    const origWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origOverflow;
      document.body.style.position = origPosition;
      document.body.style.top = origTop;
      document.body.style.width = origWidth;
      try { window.scrollTo(0, scrollY); } catch (_) {}
    };
  }, [src, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          background: 'rgba(0, 0, 0, 0.92)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          pointerEvents: 'auto',
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Top Controls Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#fff',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {title && (
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: '#FFF' }}>
                {title}
              </span>
            )}
            {alt && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{alt}</span>}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDownload}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.22)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.22)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
              onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Center Image */}
        <motion.div
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '100%',
            maxHeight: '82vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <img
            src={src}
            alt={alt || title}
            style={{
              maxWidth: '100%',
              maxHeight: '82vh',
              objectFit: 'contain',
              borderRadius: 16,
            }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
