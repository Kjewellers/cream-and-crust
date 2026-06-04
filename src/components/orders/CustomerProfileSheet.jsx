/**
 * CustomerProfileSheet — premium luxury bottom sheet for the
 * "Customer Profile" pop-up in Orders. Pure presentation: receives
 * a customer object + open + onClose and renders.
 *
 * Extracted from Orders.jsx so it can be smoke-tested independently
 * and re-used elsewhere (e.g. Customers page) without the heavy
 * surrounding state.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MapPin, MessageCircle, Repeat, Receipt } from 'lucide-react';
import { triggerHaptic } from '../iOS';
import AnimatedNumber from '../AnimatedNumber';
import { safeDisplayValue } from '../../utils/crypto';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {{name?: string, phone?: string, address?: string, totalOrders?: number, totalSpent?: number} | null} props.customer
 * @param {Array<Object>} [props.orders] All orders in the workspace; sheet filters by phone.
 * @param {(order: Object) => void} [props.onRepeatOrder] Optional callback fired when the
 *   user taps "Order again" on a past order row. Receives the original order object.
 */
export default function CustomerProfileSheet({
  open,
  onClose,
  customer,
  orders = [],
  onRepeatOrder,
}) {
  // Lock body scroll when open
  React.useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC closes
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && customer && (
        <motion.div
          key="cc-customer-profile-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 15, 15, 0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Customer profile"
        >
          <motion.div
            key="cc-customer-profile-sheet"
            initial={{ y: 60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              background: '#FFFDF9',
              borderRadius: 28,
              paddingTop: 12,
              paddingLeft: 22,
              paddingRight: 22,
              paddingBottom: 28,
              boxShadow: '0 24px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(181, 96, 106, 0.12)',
              position: 'relative',
              maxHeight: 'calc(100vh - 80px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              fontFamily: '"Inter", system-ui, sans-serif',
              color: '#2D1B14',
            }}
          >
            {/* Drag pill */}
            <div
              style={{
                width: 36,
                height: 4,
                background: 'rgba(181, 96, 106, 0.25)',
                borderRadius: 99,
                margin: '0 auto 20px',
              }}
            />

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose && onClose();
              }}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '1px solid rgba(181, 96, 106, 0.12)',
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8C7A6B',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <X size={15} strokeWidth={2.4} />
            </button>

            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, var(--accent, #B5606A) 0%, var(--accent2, #D4A050) 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  fontWeight: 700,
                  margin: '0 auto 14px',
                  fontFamily: '"Playfair Display", Georgia, serif',
                  letterSpacing: '-0.02em',
                  boxShadow:
                    '0 12px 28px rgba(181, 96, 106, 0.32), inset 0 1px 0 rgba(255,255,255,0.22)',
                  border: '3px solid rgba(255,255,255,0.9)',
                }}
              >
                {safeDisplayValue(customer?.name, '👤')?.charAt(0)?.toUpperCase() || '👤'}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: 'var(--accent, #B5606A)',
                  marginBottom: 6,
                  opacity: 0.85,
                }}
              >
                Customer
              </div>
              <h2
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: 24,
                  fontWeight: 700,
                  margin: '0 0 4px',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  color: '#2D1B14',
                }}
              >
                {safeDisplayValue(customer?.name, 'Unknown')}
              </h2>
              <div
                style={{
                  fontSize: 14,
                  color: '#8C7A6B',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                }}
              >
                {safeDisplayValue(customer?.phone, 'No phone on file')}
              </div>
            </div>

            {/* Quick actions */}
            {(customer?.phone || customer?.address) && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
                {customer?.phone && (
                  <a
                    href={`tel:${String(customer.phone).replace(/\D/g, '')}`}
                    onClick={() => triggerHaptic('light')}
                    style={tileStyle('rgba(181, 96, 106, 0.12)')}
                    aria-label="Call customer"
                  >
                    <div
                      style={iconWrapStyle('rgba(181, 96, 106, 0.12)', 'var(--accent, #B5606A)')}
                    >
                      <Phone size={16} strokeWidth={2.4} />
                    </div>
                    <span style={tileLabelStyle}>Call</span>
                  </a>
                )}
                {customer?.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      const digits = String(customer.phone).replace(/\D/g, '');
                      const fullPhone = digits.length === 10 ? '91' + digits : digits;
                      window.open(`https://wa.me/${fullPhone}`, '_blank', 'noopener,noreferrer');
                    }}
                    style={{ ...tileStyle('rgba(37, 211, 102, 0.18)'), fontFamily: 'inherit' }}
                    aria-label="Open WhatsApp"
                  >
                    <div style={iconWrapStyle('rgba(37, 211, 102, 0.14)', '#1EBE5A')}>
                      <MessageCircle size={16} strokeWidth={2.4} />
                    </div>
                    <span style={tileLabelStyle}>WhatsApp</span>
                  </button>
                )}
                {customer?.address && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      window.open(
                        `https://maps.google.com/maps?q=${encodeURIComponent(customer.address)}`,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }}
                    style={{ ...tileStyle('rgba(59, 130, 246, 0.18)'), fontFamily: 'inherit' }}
                    aria-label="Navigate to address"
                  >
                    <div style={iconWrapStyle('rgba(59, 130, 246, 0.12)', '#3B82F6')}>
                      <MapPin size={16} strokeWidth={2.4} />
                    </div>
                    <span style={tileLabelStyle}>Navigate</span>
                  </button>
                )}
              </div>
            )}

            {/* Address card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(181, 96, 106, 0.10)',
                borderRadius: 18,
                padding: '14px 16px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(181, 96, 106, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent, #B5606A)',
                  flexShrink: 0,
                }}
              >
                <MapPin size={14} strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#8C7A6B',
                    marginBottom: 4,
                  }}
                >
                  Saved Address
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#2D1B14',
                    lineHeight: 1.5,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {customer?.address || (
                    <span style={{ color: '#B5A89E', fontStyle: 'italic', fontWeight: 500 }}>
                      No address saved
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats pair */}
            <div style={{ display: 'flex', gap: 10 }}>
              <StatCard
                label="Total Orders"
                value={
                  <AnimatedNumber
                    value={customer?.totalOrders || 1}
                    duration={0.9}
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontWeight: 700,
                      fontSize: 28,
                      color: '#A06820',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  />
                }
                tint="#A06820"
                bg="linear-gradient(135deg, rgba(212, 160, 80, 0.10) 0%, rgba(212, 160, 80, 0.04) 100%)"
                border="rgba(212, 160, 80, 0.18)"
              />
              <StatCard
                label="Total Spent"
                value={
                  <AnimatedNumber
                    value={Math.round(customer?.totalSpent || 0)}
                    prefix="₹"
                    duration={1.2}
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontWeight: 700,
                      fontSize: 28,
                      color: '#2E7A5A',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  />
                }
                tint="#2E7A5A"
                bg="linear-gradient(135deg, rgba(46, 122, 90, 0.10) 0%, rgba(46, 122, 90, 0.04) 100%)"
                border="rgba(46, 122, 90, 0.18)"
              />
            </div>

            {/* Past orders */}
            <PastOrdersSection
              customer={customer}
              orders={orders}
              onRepeatOrder={(o) => {
                triggerHaptic('success');
                if (onRepeatOrder) onRepeatOrder(o);
                if (onClose) onClose();
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── small pure styles ────────────────────────────────────────────
const tileStyle = (borderColor) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '14px 8px',
  borderRadius: 16,
  background: 'rgba(255, 255, 255, 0.7)',
  border: `1px solid ${borderColor}`,
  textDecoration: 'none',
  color: '#2D1B14',
  cursor: 'pointer',
  transition: 'all 0.2s',
});

const iconWrapStyle = (bg, color) => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  background: bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color,
});

const tileLabelStyle = { fontSize: 11, fontWeight: 700 };

function StatCard({ label, value, tint, bg, border }) {
  const isElement = React.isValidElement(value);
  return (
    <div
      style={{
        flex: 1,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 18,
        padding: 16,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: tint,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {isElement ? (
        value
      ) : (
        <div
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 700,
            fontSize: 28,
            color: tint,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}

// ─── Past orders ──────────────────────────────────────────────────
//
// Filters the workspace orders array to just this customer's history
// (matched on phone — same key the rest of the Orders module uses)
// and renders the most recent 5 as compact rows with an "Order again"
// shortcut. The shortcut bubbles the original order back up via
// `onRepeatOrder` so the parent can prefill the New Order form.

const REPEAT_LIMIT = 5;

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function customerOrderPhone(order) {
  if (!order) return '';
  if (typeof order.customer === 'object' && order.customer) {
    return order.customer.phone || '';
  }
  return order.phone || order.customerPhone || '';
}

function orderTimestamp(order) {
  const raw =
    order?.createdAt?.seconds != null
      ? order.createdAt.seconds * 1000
      : order?.createdAt instanceof Date
        ? order.createdAt.getTime()
        : typeof order?.createdAt === 'string'
          ? Date.parse(order.createdAt)
          : typeof order?.createdAt === 'number'
            ? order.createdAt
            : null;
  if (raw && !Number.isNaN(raw)) return raw;
  // Fall back to deliveryDate so undated rows still sort sensibly.
  if (order?.deliveryDate) {
    const parsed = Date.parse(order.deliveryDate);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function shortDate(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function orderTitle(order) {
  // Prefer cake/product name; fall back to first item or "Custom order".
  const direct = order?.product || order?.itemName || order?.cakeName;
  if (direct) return direct;
  const items = Array.isArray(order?.items) ? order.items : [];
  const firstNamed = items.find((it) => it && (it.name || it.product));
  if (firstNamed) return firstNamed.name || firstNamed.product;
  return 'Custom order';
}

function orderTotal(order) {
  const t = Number(order?.total ?? order?.totalAmount ?? 0);
  return Number.isFinite(t) ? Math.round(t) : 0;
}

function PastOrdersSection({ customer, orders, onRepeatOrder }) {
  const phone = digitsOnly(customer?.phone);
  if (!phone) return null;

  const matches = (orders || [])
    .filter((o) => digitsOnly(customerOrderPhone(o)) === phone)
    .sort((a, b) => orderTimestamp(b) - orderTimestamp(a));

  if (!matches.length) return null;

  const recent = matches.slice(0, REPEAT_LIMIT);
  const more = matches.length - recent.length;

  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#8C7A6B',
          }}
        >
          Past Orders
        </div>
        <div style={{ fontSize: 11, color: '#B5A89E', fontWeight: 600 }}>
          {matches.length} total
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recent.map((o) => (
          <PastOrderRow
            key={o.id || `${orderTimestamp(o)}-${orderTitle(o)}`}
            order={o}
            onRepeat={onRepeatOrder}
          />
        ))}
      </div>

      {more > 0 && (
        <div
          style={{
            fontSize: 11,
            color: '#B5A89E',
            fontWeight: 600,
            textAlign: 'center',
            marginTop: 10,
          }}
        >
          + {more} earlier order{more === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}

function PastOrderRow({ order, onRepeat }) {
  const title = orderTitle(order);
  const total = orderTotal(order);
  const ts = orderTimestamp(order);
  const status = String(order?.status || '').toLowerCase();
  const statusTone =
    status === 'cancelled'
      ? '#B05A5A'
      : status === 'delivered'
        ? '#2E7A5A'
        : 'var(--accent, #B5606A)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 12px',
        background: 'rgba(255, 255, 255, 0.7)',
        border: '1px solid rgba(181, 96, 106, 0.10)',
        borderRadius: 14,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          background: 'rgba(181, 96, 106, 0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent, #B5606A)',
          flexShrink: 0,
        }}
      >
        <Receipt size={15} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: '#2D1B14',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={title}
        >
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: '#8C7A6B', fontWeight: 600 }}>
            ₹{total.toLocaleString()}
          </span>
          {ts > 0 && (
            <span style={{ fontSize: 11, color: '#B5A89E', fontWeight: 500 }}>
              · {shortDate(ts)}
            </span>
          )}
          {status && (
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: statusTone,
                background: 'rgba(181, 96, 106, 0.08)',
                padding: '2px 6px',
                borderRadius: 6,
              }}
            >
              {status}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRepeat && onRepeat(order)}
        aria-label={`Order ${title} again`}
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '7px 11px',
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(135deg, var(--accent, #B5606A) 0%, #C87A82 100%)',
          color: '#fff',
          fontWeight: 800,
          fontSize: 11.5,
          cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(181, 96, 106, 0.24)',
          fontFamily: 'inherit',
        }}
      >
        <Repeat size={12} strokeWidth={2.6} /> Order again
      </button>
    </div>
  );
}
