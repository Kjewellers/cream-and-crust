import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Eye } from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import { generateInvoicePdf, createInvoiceNumber } from '../../utils/pdfGenerator';
import { saveFileToDocuments } from '../../services/nativeShare';
import { Capacitor } from '@capacitor/core';

export default function InvoicePreviewModal({ isOpen, onClose, order, business, showToast }) {
  const [scale, setScale] = useState(0.45);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Calculate dynamic scale to fit 794px template on mobile screens
  useEffect(() => {
    if (!isOpen) return;
    const updateScale = () => {
      const modalWidth = Math.min(window.innerWidth - 32, 720); // 16px padding on sides, max 720px
      setScale(modalWidth / 820); // Scale relative to template margin width
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const invoiceNumber = createInvoiceNumber(order);

  // ─── Save to Documents folder ────────────────────────────────────────────────
  const handleSaveToDevice = async () => {
    setIsBusy(true);
    setStatusMessage('Generating PDF...');
    try {
      // 1. Generate PDF blob
      const pdfResult = await generateInvoicePdf(order, business, { scale: 2 });
      
      setStatusMessage('Saving file...');
      // 2. Save directly to public Documents folder (or trigger download on web)
      const saveResult = await saveFileToDocuments({
        blob: pdfResult.blob,
        fileName: pdfResult.fileName
      });

      if (saveResult.success) {
        if (Capacitor.isNativePlatform()) {
          showToast(`Invoice saved to Documents folder!`, 'success');
        } else {
          showToast('Invoice downloaded successfully!', 'success');
        }
        onClose();
      } else {
        throw new Error(saveResult.error || 'Failed to write file');
      }
    } catch (error) {
      console.error('Save to device failed:', error);
      showToast(error?.message || 'Failed to save invoice', 'error');
    } finally {
      setIsBusy(false);
      setStatusMessage('');
    }
  };

  // ─── Share via Native Share Sheet ────────────────────────────────────────────
  const handleShare = async () => {
    setIsBusy(true);
    setStatusMessage('Preparing share sheet...');
    try {
      const { shareInvoicePdf } = await import('../../utils/pdfGenerator');
      const shareResult = await shareInvoicePdf(order, business);
      if (shareResult.shared) {
        showToast('Invoice shared successfully!', 'success');
        onClose();
      } else {
        showToast('Invoice generated, ready for sharing.', 'info');
      }
    } catch (error) {
      console.error('Share failed:', error);
      showToast('Failed to share invoice', 'error');
    } finally {
      setIsBusy(false);
      setStatusMessage('');
    }
  };

  return (
    <AnimatePresence>
      <div style={styles.overlay}>
        {/* Backdrop glassmorphic click-away */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={styles.backdrop}
          onClick={isBusy ? null : onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          style={styles.modalCard}
        >
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <Eye size={20} style={styles.eyeIcon} />
              <div>
                <h3 style={styles.title}>Invoice Preview</h3>
                <p style={styles.subtitle}>{invoiceNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isBusy}
              style={styles.closeBtn}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body: Scrollable Invoice Content */}
          <div style={styles.previewContainer}>
            {isBusy ? (
              <div style={styles.busyOverlay}>
                <div style={styles.spinner} />
                <p style={styles.busyText}>{statusMessage}</p>
              </div>
            ) : null}

            <div style={styles.scaledWrapper}>
              <div
                style={{
                  width: '794px',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                  margin: '0 auto',
                  flexShrink: 0,
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#FFFDFC'
                }}
              >
                <InvoiceTemplate
                  order={order}
                  bakeryProfile={business}
                  invoiceNumber={invoiceNumber}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={styles.footer}>
            <button
              onClick={handleSaveToDevice}
              disabled={isBusy}
              style={styles.saveBtn}
            >
              <Download size={18} />
              {Capacitor.isNativePlatform() ? 'Save to Phone' : 'Download PDF'}
            </button>
            <button
              onClick={handleShare}
              disabled={isBusy}
              style={styles.shareBtn}
            >
              <Share2 size={18} />
              Share
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    boxSizing: 'border-box'
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(23, 17, 14, 0.45)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)'
  },
  modalCard: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '760px',
    maxHeight: '90vh',
    background: '#FAF6F0',
    borderRadius: '24px',
    boxShadow: '0 20px 50px rgba(45, 27, 20, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid rgba(140, 122, 107, 0.1)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(140, 122, 107, 0.08)',
    background: '#FAF6F0'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  eyeIcon: {
    color: '#8C7A6B'
  },
  title: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 800,
    color: '#2D1B14'
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '0.78rem',
    color: '#8C7A6B',
    fontWeight: 600
  },
  closeBtn: {
    border: 'none',
    background: 'rgba(140, 122, 107, 0.1)',
    color: '#8C7A6B',
    width: '36px',
    height: '36px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  previewContainer: {
    position: 'relative',
    flex: 1,
    overflowY: 'auto',
    padding: '20px 10px',
    background: '#F3EDE2',
    display: 'flex',
    justifyContent: 'center'
  },
  scaledWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(243, 237, 226, 0.8)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: '16px'
  },
  spinner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid rgba(140, 122, 107, 0.2)',
    borderTopColor: '#B5606A',
    animation: 'spin 0.8s linear infinite'
  },
  busyText: {
    margin: 0,
    fontSize: '0.88rem',
    fontWeight: 700,
    color: '#8C7A6B'
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid rgba(140, 122, 107, 0.08)',
    background: '#FAF6F0'
  },
  saveBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    background: '#B5606A',
    color: '#FFF',
    fontSize: '0.88rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(181, 96, 106, 0.15)'
  },
  shareBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    borderRadius: '14px',
    border: '1px solid rgba(140, 122, 107, 0.2)',
    background: '#FFF',
    color: '#2D1B14',
    fontSize: '0.88rem',
    fontWeight: 700,
    cursor: 'pointer'
  }
};
