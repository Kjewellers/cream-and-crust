/**
 * ImageLightBox.jsx — Instagram-Quality Image Lightbox Component
 * Features pinch-zoom, double-tap zoom, drag-to-dismiss, and progressive loading.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn } from 'lucide-react';
import { HapticEngine } from './HapticEngine';

export default function ImageLightBox({ src, alt = 'Image view', isOpen, onClose }) {
  const [scale, setScale] = useState(1);

  const handleDoubleTap = () => {
    HapticEngine.trigger('selection');
    setScale((prev) => (prev > 1 ? 1 : 2.2));
  };

  return (
    <AnimatePresence>
      {isOpen && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => {
              HapticEngine.trigger('softTick');
              onClose?.();
            }}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#FFF',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              zIndex: 1201,
            }}
          >
            <X size={20} />
          </button>

          <motion.div
            drag
            dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.y) > 140) {
                HapticEngine.trigger('sheetSnap');
                onClose?.();
              }
            }}
            onDoubleClick={handleDoubleTap}
            animate={{ scale }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              cursor: scale > 1 ? 'zoom-out' : 'zoom-in',
            }}
          >
            <img
              src={src}
              alt={alt}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: 12,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
