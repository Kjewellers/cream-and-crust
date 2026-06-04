/**
 * @file OrderChannelPicker.jsx
 *
 * Shared customer-facing order channel picker for all public menu
 * templates. Three options:
 *   1. Order via website form  (in-app, fills MenuOrderForm)
 *   2. Order via WhatsApp      (deep links to user's whatsapp)
 *   3. Order via Instagram     (opens user's instagram profile)
 *
 * Channels with no configuration are hidden automatically.
 *
 * IMPORTANT: WhatsApp / Instagram links MUST be opened synchronously
 * inside the click handler. Browsers block popups that fire after an
 * `await`. So we open the URL first and run any background logging
 * after, fire-and-forget.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Instagram, MessageCircle, X } from 'lucide-react';
import { addInquiryToDB, addNotificationToDB } from '../../services/db';
import { normalizePhone } from '../../utils/whatsappLink';

export default function OrderChannelPicker({
  open,
  onClose,
  onSelectForm,
  business,
  data,
  product,
}) {
  const whatsappRaw = data?.whatsapp || business?.whatsapp || business?.phone || '';
  // normalizePhone handles: 10-digit → prepend 91, already-12-digit → unchanged,
  // invalid/empty → '' (channel hidden). Required for wa.me on Android Chrome.
  const whatsappNumber = normalizePhone(whatsappRaw);
  const instagramRaw = data?.instagram || business?.instagram || '';
  const instagramHandle = String(instagramRaw).replace('@', '').trim();
  const bakeryName = data?.bakeryName || business?.name || 'us';
  const bakeryUid = business?.id;

  // ESC closes
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const logChannelEvent = (channel, summaryTitle, summaryMessage) => {
    if (!bakeryUid) return;
    // Fire-and-forget so we never block the redirect
    Promise.resolve()
      .then(() => addInquiryToDB({
        userId: bakeryUid,
        bakerName: bakeryName,
        name: `Anonymous (${channel})`,
        note: summaryMessage,
        channel,
        productName: product?.name || null,
        productPrice: product?.price ?? null,
      }).catch((e) => console.warn(`inquiry log (${channel}) failed:`, e?.code || e?.message)))
      .then(() => addNotificationToDB({
        userId: bakeryUid,
        type: 'order',
        title: summaryTitle,
        message: summaryMessage,
        channel,
      }).catch((e) => console.warn(`notify (${channel}) failed:`, e?.code || e?.message)));
  };

  const handleWhatsapp = () => {
    if (!whatsappNumber) return;
    let message;
    if (product && product.selectedWeight) {
      message = `Hi ${bakeryName}, I'd like to order ${product.name} (${product.selectedWeightLabel}) \u2014 \u20B9${product.price}.`;
    } else if (product) {
      message = `Hi ${bakeryName}, I'd like to order ${product.name} (\u20B9${product.price}).`;
    } else {
      message = `Hi ${bakeryName}, I'd like to place an order from your menu.`;
    }

    // Always use https://wa.me/ (NOT whatsapp:// — unreliable on Android Chrome,
    // Samsung Internet, and in-app WebViews). Must open synchronously in same
    // click tick so Android popup blocker doesn't intercept it.
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    console.log('[OrderChannelPicker] Opening WhatsApp:', url);
    window.open(url, '_blank', 'noopener,noreferrer');

    // Background logging — fire-and-forget, never blocks the redirect
    const logMsg = product && product.selectedWeight
      ? `Someone wants ${product.name} (${product.selectedWeightLabel}) \u2014 \u20B9${product.price}`
      : product ? `Someone wants ${product.name}` : 'Someone is interested in your menu.';
    logChannelEvent('whatsapp', `\u{1F389} New WhatsApp order click`, logMsg);
    onClose();
  };

  const handleInstagram = () => {
    if (!instagramHandle) return;
    const url = `https://instagram.com/${instagramHandle}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    logChannelEvent(
      'instagram',
      'Customer visited your Instagram',
      product
        ? `Someone tapped "${product.name}" and went to your Instagram.`
        : 'Someone went to your Instagram from your menu.',
    );
    onClose();
  };

  const handleFormChoice = () => {
    onSelectForm();
  };

  if (!open) return null;

  const channels = [
    {
      id: 'form',
      icon: Globe,
      title: 'Order via this Website',
      desc: 'Fill in a quick form. We\'ll get back to you.',
      hint: 'Recommended',
      onClick: handleFormChoice,
      color: '#B5606A',
      bg: 'linear-gradient(135deg, #FFF1E8 0%, #F7DCC9 100%)',
      enabled: Boolean(bakeryUid),
    },
    {
      id: 'whatsapp',
      icon: MessageCircle,
      title: 'Order via WhatsApp',
      // Show the formatted number with + prefix for display; raw digits used in link
      desc: whatsappNumber ? `Chat directly: +${whatsappNumber}` : 'WhatsApp not available',
      hint: 'Fastest',
      onClick: handleWhatsapp,
      color: '#22A85B',
      bg: 'linear-gradient(135deg, #E8FAEE 0%, #C5F1D6 100%)',
      enabled: Boolean(whatsappNumber),
    },
    {
      id: 'instagram',
      icon: Instagram,
      title: 'Order via Instagram',
      desc: instagramHandle ? `Visit @${instagramHandle}` : 'Instagram not available',
      hint: null,
      onClick: handleInstagram,
      color: '#C13584',
      bg: 'linear-gradient(135deg, #FCE8F0 0%, #F4C7DC 100%)',
      enabled: Boolean(instagramHandle),
    },
  ].filter(c => c.enabled);

  return (
    <AnimatePresence>
      <motion.div
        key="cc-channel-picker"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20, 14, 16, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 16,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Choose how to order"
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 460,
            background: '#FFFFFF',
            borderRadius: 24,
            padding: '20px 20px 24px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.18), 0 20px 60px rgba(0,0,0,0.10)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
            color: '#1A1410',
            marginBottom: 'max(env(safe-area-inset-bottom), 24px)',
          }}
        >
          <div style={{
            width: 40, height: 4, background: '#E5E0D8', borderRadius: 99, margin: '0 auto 16px',
          }} />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 14, right: 14, width: 36, height: 36,
              borderRadius: '50%', border: 'none', background: '#F5F1EC',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1A1410',
            }}
          >
            <X size={16} strokeWidth={2.4} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.32em',
              textTransform: 'uppercase', color: '#B5606A', marginBottom: 8,
            }}>
              How would you like to order?
            </div>
            <h2 style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 22, fontWeight: 700, margin: 0,
              letterSpacing: '-0.015em', color: '#1A1410', lineHeight: 1.25,
            }}>
              {product ? product.name : `Order from ${bakeryName}`}
            </h2>
            {product && (
              <div style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'italic', fontSize: 14, color: '#7C6D63', marginTop: 4,
              }}>
                {'\u20B9'}{product.price}
                {product.selectedWeightLabel
                  ? ` \u00B7 ${product.selectedWeightLabel}`
                  : product.weight ? ` \u00B7 ${product.weight}` : ''}
              </div>
            )}
            {product?.selectedWeightLabel && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                marginTop: 8, padding: '4px 12px', borderRadius: 99,
                background: '#F0E9E2', fontSize: 11, fontWeight: 700,
                fontFamily: '"Inter", sans-serif', color: '#B5606A',
                letterSpacing: '0.04em',
              }}>
                <span style={{ fontSize: 13 }}>⚖</span>
                {product.selectedWeightLabel}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {channels.map((ch) => {
              const Icon = ch.icon;
              return (
                <motion.button
                  key={ch.id}
                  type="button"
                  onClick={ch.onClick}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ y: -2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 16,
                    border: `1.5px solid ${ch.color}22`, background: ch.bg,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    fontFamily: '"Inter", sans-serif',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: ch.color, flexShrink: 0,
                    boxShadow: `0 4px 12px ${ch.color}22`,
                  }}>
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontWeight: 800, fontSize: 14, color: '#1A1410', letterSpacing: '-0.005em',
                      }}>{ch.title}</span>
                      {ch.hint && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.16em',
                          textTransform: 'uppercase', color: ch.color,
                          padding: '2px 7px', borderRadius: 99, background: '#FFFFFF',
                          border: `1px solid ${ch.color}44`,
                        }}>{ch.hint}</span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 12, color: '#5C4F46', marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{ch.desc}</div>
                  </div>
                  <span style={{ color: ch.color, fontSize: 18, flexShrink: 0 }}>{'\u2192'}</span>
                </motion.button>
              );
            })}
          </div>

          {channels.length === 0 && (
            <div style={{
              padding: '20px 12px', textAlign: 'center',
              color: '#7C6D63', fontSize: 13,
              fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic',
            }}>
              This bakery has not set up an ordering channel yet.
            </div>
          )}

          <div style={{
            marginTop: 18, fontSize: 11, color: '#9C8A80',
            textAlign: 'center', fontFamily: '"Inter", sans-serif', lineHeight: 1.5,
          }}>
            Your message goes straight to the bakery.
            <br />
            No accounts, no waiting.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
