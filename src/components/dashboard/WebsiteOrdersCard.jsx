/**
 * @file WebsiteOrdersCard.jsx
 *
 * Dashboard banner that surfaces incoming website orders that are
 * still in the 'inquiry' state (i.e. unaccepted). The bakery can
 * Accept (→ status: 'confirmed') or Decline (→ status: 'cancelled')
 * each order without leaving the dashboard.
 *
 * Props:
 *   - orders: full orders array (already subscribed by Dashboard)
 *
 * Visual: a pulsing rose/peach card stack. Each order tile shows
 * customer name, phone, product, delivery date and address. Two
 * buttons: green "Accept" and outlined "Decline".
 *
 * Internals:
 *   - We filter for `channel === 'website'` AND status in {inquiry, new}
 *   - On Accept/Decline we call updateOrderStatusInDB. We never
 *     hard-delete; declined orders stay in the DB with status
 *     'cancelled' for record-keeping.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  Package,
  Globe,
  Sparkles,
  EyeOff,
} from 'lucide-react';
import { updateOrderStatusInDB } from '../../services/db';
import { showToast } from '../iOS';
import { safeDisplayValue } from '../../utils/crypto';

function pickPhone(o) {
  if (typeof o.customer === 'object' && o.customer?.phone) return safeDisplayValue(o.customer.phone);
  return safeDisplayValue(o.phone);
}
function pickName(o) {
  if (typeof o.customer === 'object' && o.customer?.name) return safeDisplayValue(o.customer.name, 'Customer');
  return safeDisplayValue(o.customerName || (typeof o.customer === 'string' ? o.customer : ''), 'Anonymous');
}

export default function WebsiteOrdersCard({ orders }) {
  const websiteInquiries = useMemo(
    () =>
      (orders || []).filter((o) => {
        if (!o) return false;
        const status = String(o.status || '').toLowerCase();
        const channel = String(o.channel || '').toLowerCase();
        return channel === 'website' && (status === 'inquiry' || status === 'new' || status === '');
      }),
    [orders]
  );

  const [busyId, setBusyId] = useState(null);
  const [dismissed, setDismissed] = useState({}); // id -> 'accepted'|'declined'|'snoozed'
  // Hide-the-whole-banner state. Persists for the session via sessionStorage
  // so a refresh brings it back, but a tab close+reopen also brings it back.
  const [bannerHidden, setBannerHidden] = useState(() => {
    try {
      return sessionStorage.getItem('cc_websiteOrdersBannerHidden') === '1';
    } catch (_) {
      return false;
    }
  });
  const hideBanner = () => {
    setBannerHidden(true);
    try {
      sessionStorage.setItem('cc_websiteOrdersBannerHidden', '1');
    } catch (_) {}
  };

  const accept = async (o) => {
    if (busyId) return;
    setBusyId(o.id);
    try {
      await updateOrderStatusInDB(o.id, 'confirmed');
      setDismissed((d) => ({ ...d, [o.id]: 'accepted' }));
      showToast(`Order from ${pickName(o)} accepted \u{1F389}`, 'success');
    } catch (e) {
      console.error('accept order failed:', e);
      showToast('Could not accept the order. Try again.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (o) => {
    if (busyId) return;
    setBusyId(o.id);
    try {
      await updateOrderStatusInDB(o.id, 'cancelled');
      setDismissed((d) => ({ ...d, [o.id]: 'declined' }));
      showToast(`Declined order from ${pickName(o)}`, 'info');
    } catch (e) {
      console.error('decline order failed:', e);
      showToast('Could not decline the order. Try again.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const sendWhatsApp = (o, message) => {
    const phone = pickPhone(o);
    if (!phone) {
      showToast('No phone on this order', 'error');
      return;
    }
    const digits = String(phone).replace(/\D/g, '');
    const fullPhone = digits.length === 10 ? '91' + digits : digits;
    window.open(
      `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const visible = websiteInquiries.filter((o) => !dismissed[o.id]);
  if (visible.length === 0) return null;
  if (bannerHidden) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        marginBottom: 16,
        position: 'relative',
        background: 'linear-gradient(135deg, #FFF1E8 0%, #FCEAE0 50%, #F7DCC9 100%)',
        border: '1.5px solid rgba(181,96,106,0.30)',
        borderRadius: 22,
        padding: '18px 18px 16px',
        boxShadow: '0 6px 22px rgba(181,96,106,0.14)',
        overflow: 'hidden',
      }}
    >
      {/* Decorative gold orb */}
      <div
        style={{
          position: 'absolute',
          right: -36,
          top: -36,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 30%, rgba(216,185,126,0.45) 0%, rgba(216,185,126,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: 'rgba(181,96,106,0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B5606A',
            }}
          >
            <Globe size={15} strokeWidth={2.4} />
          </div>
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#8B4951',
              }}
            >
              New website {visible.length === 1 ? 'order' : 'orders'}
            </div>
            <div
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 18,
                fontWeight: 700,
                color: '#3F1D22',
                letterSpacing: '-0.01em',
              }}
            >
              {visible.length} waiting your reply
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.span
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(181,96,106,0.45)',
                '0 0 0 12px rgba(181,96,106,0)',
                '0 0 0 0 rgba(181,96,106,0)',
              ],
            }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: '#B5606A',
              color: '#fff',
              borderRadius: 99,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={11} /> Live
          </motion.span>
          <button
            type="button"
            onClick={hideBanner}
            title="Hide this banner for now (re-appears next session)"
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '1px solid rgba(181,96,106,0.30)',
              background: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8B4951',
            }}
            aria-label="Hide banner"
          >
            <EyeOff size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence initial={false}>
          {visible.map((o) => {
            const name = pickName(o);
            const phone = pickPhone(o);
            const product = o.product || (o.items && o.items[0]?.name) || 'Custom order';
            const qty = Number(o.quantity || 1) || 1;
            const total = Number(o.total || o.totalAmount || 0) || 0;
            const address = o.deliveryAddress || '';
            const deliveryDate = o.deliveryDate || '';
            const notes = typeof o.notes === 'string' ? o.notes : '';

            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  x: 60,
                  height: 0,
                  marginTop: 0,
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
                transition={{ duration: 0.25 }}
                style={{
                  position: 'relative',
                  background: 'rgba(255,255,255,0.78)',
                  backdropFilter: 'blur(6px)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  border: '1px solid rgba(181,96,106,0.18)',
                }}
              >
                {/* Top row — name + total */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#1A1410',
                        letterSpacing: '-0.005em',
                        lineHeight: 1.2,
                      }}
                    >
                      {name}
                    </div>
                    {phone && (
                      <a
                        href={`tel:${String(phone).replace(/\s+/g, '')}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 3,
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#5C4F46',
                          textDecoration: 'none',
                        }}
                      >
                        <Phone size={11} color="#B5606A" /> {phone}
                      </a>
                    )}
                  </div>
                  {total > 0 && (
                    <div
                      style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#B5606A',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {'\u20B9'}
                      {total}
                    </div>
                  )}
                </div>

                {/* Meta rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                  <Meta icon={Package} text={`${product}${qty > 1 ? ` x${qty}` : ''}`} />
                  {deliveryDate && <Meta icon={Calendar} text={`Needed by ${deliveryDate}`} />}
                  {address && <Meta icon={MapPin} text={address} multiline />}
                  {notes && (
                    <div
                      style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontStyle: 'italic',
                        fontSize: 12,
                        color: '#7C6D63',
                        paddingLeft: 18,
                        marginTop: 2,
                        lineHeight: 1.5,
                      }}
                    >
                      "{notes}"
                    </div>
                  )}
                </div>

                {/* Action row */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      accept(o);
                      const msg = `Hi ${name}, your order for "${product}" is confirmed. We'll keep you posted. Thank you for choosing us \u{1F49D}`;
                      sendWhatsApp(o, msg);
                    }}
                    disabled={busyId === o.id}
                    style={{
                      flex: 1.4,
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: 'none',
                      background:
                        busyId === o.id
                          ? '#9C8A80'
                          : 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 11.5,
                      letterSpacing: '0.08em',
                      cursor: busyId === o.id ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 4px 12px rgba(16,185,129,0.30)',
                    }}
                  >
                    <Check size={14} strokeWidth={3} /> Accept &amp; reply
                  </button>
                  <button
                    type="button"
                    onClick={() => decline(o)}
                    disabled={busyId === o.id}
                    title="Politely decline"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1.5px solid #E15A3E',
                      background: '#FFFFFF',
                      color: '#E15A3E',
                      fontWeight: 800,
                      fontSize: 11.5,
                      letterSpacing: '0.08em',
                      cursor: busyId === o.id ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <X size={14} strokeWidth={3} /> Decline
                  </button>
                  {phone && (
                    <button
                      type="button"
                      title="Open WhatsApp"
                      onClick={() =>
                        sendWhatsApp(
                          o,
                          `Hi ${name}, thanks for your order from us! We'll get back to you shortly.`
                        )
                      }
                      style={{
                        width: 40,
                        padding: 0,
                        borderRadius: 12,
                        border: 'none',
                        background: '#25D366',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MessageCircle size={16} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Meta({ icon: Icon, text, multiline }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        fontSize: 12.5,
        color: '#3F2A22',
        lineHeight: 1.45,
      }}
    >
      <Icon size={12} color="#B5606A" style={{ marginTop: 3, flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          whiteSpace: multiline ? 'normal' : 'nowrap',
          overflow: multiline ? 'visible' : 'hidden',
          textOverflow: multiline ? 'clip' : 'ellipsis',
        }}
      >
        {text}
      </span>
    </div>
  );
}
