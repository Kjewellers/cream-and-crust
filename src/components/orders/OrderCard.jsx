/**
 * OrderCard — inline expandable order row.
 *
 * Replaces the hidden StatusUpdateModal for status changes: the card expands
 * IN PLACE (no Modal_System, no portal) to reveal status + action controls,
 * keeping the list scroll position. Expansion is controlled by the parent so
 * at most one card is open at a time. Status changes are optimistic with
 * rollback + error toast on failure.
 *
 * Requirements: 3.1 (expand in place, no modal), 3.2 (scroll preserved by
 * parent), 3.3 (apply + reflect status), 3.4 (rollback + error toast),
 * 3.5/3.6 (single expand via parent), 3.8 (transition <= 350ms), 5.3 (memo).
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { showToast } from '../iOS.jsx';

const STATUS_FLOW = ['inquiry', 'confirmed', 'delivered'];

const STATUS_LABEL = {
  inquiry: 'Inquiry',
  confirmed: 'Confirmed',
  baking: 'Baking',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function StatusPill({ status }) {
  const s = String(status || 'inquiry').toLowerCase();
  const isDelivered = s === 'delivered';
  
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 999,
        background: isDelivered ? '#E8F5E9' : 'var(--accent-lt, rgba(181,96,106,0.12))',
        color: isDelivered ? '#2E7D32' : 'var(--accent, #B5606A)',
        textTransform: 'capitalize',
        boxShadow: isDelivered ? '0 0 12px rgba(76, 175, 80, 0.4)' : 'none',
        border: isDelivered ? '1px solid #81C784' : 'none',
        display: 'inline-block',
      }}
    >
      {isDelivered && <span style={{ marginRight: 4 }}>🎉</span>}
      {STATUS_LABEL[s] || s}
    </span>
  );
}

function OrderCard({
  order,
  expanded = false,
  onToggleExpand,
  onStatusChange,
  onWhatsApp,
  onTogglePayment,
}) {
  const [pendingStatus, setPendingStatus] = useState(null);
  const status = String(order?.status || 'inquiry').toLowerCase();
  const displayStatus = pendingStatus || status;

  const handleStatusSelect = async (next) => {
    if (next === status || !onStatusChange) return;
    setPendingStatus(next); // optimistic
    try {
      await onStatusChange(order, next);
    } catch {
      setPendingStatus(null); // rollback (Req 3.4)
      showToast('Could not update status. Please try again.', 'error');
      return;
    }
    setPendingStatus(null);
  };

  return (
    <div
      style={{
        background: 'var(--card, #fff)',
        border: '1px solid var(--border, rgba(74,59,50,0.06))',
        borderRadius: 'var(--radius-sm, 16px)',
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      {/* Summary row */}
      <button
        type="button"
        onClick={() => onToggleExpand?.(order.id)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text, #4A3B32)' }}>
            {order.customerName || 'Customer'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text2, #8C7A6B)', marginTop: 2 }}>
            {order.product || 'Custom Order'}
            {order.date ? ` · ${order.date}` : ''}
          </div>
        </div>
        <div style={{ perspective: 1000, display: 'flex', alignItems: 'center' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={displayStatus}
              initial={{ rotateX: 90, opacity: 0, scale: 0.8 }}
              animate={{ rotateX: 0, opacity: 1, scale: 1 }}
              exit={{ rotateX: -90, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
              style={{ transformOrigin: 'center' }}
            >
              <StatusPill status={displayStatus} />
            </motion.div>
          </AnimatePresence>
        </div>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={18} color="#8C7A6B" />
        </motion.span>
      </button>

      {/* Inline expansion — no modal, transition <= 350ms */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '4px 16px 16px' }}>
              {/* Financial summary */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: 'var(--text2, #8C7A6B)',
                  marginBottom: 12,
                }}
              >
                <span>Total ₹{order.total}</span>
                <span>Advance ₹{order.advance}</span>
                <span>Balance ₹{order.balance}</span>
              </div>

              {/* Status actions */}
              <div
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}
              >
                Update status
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {STATUS_FLOW.map((s) => {
                  const active = displayStatus === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStatusSelect(s)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: active
                          ? '1px solid var(--accent, #B5606A)'
                          : '1px solid var(--border-md, rgba(74,59,50,0.1))',
                        background: active ? 'var(--accent, #B5606A)' : 'transparent',
                        color: active ? '#fff' : 'var(--text, #4A3B32)',
                      }}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  );
                })}
              </div>

              {/* Quick actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                {onWhatsApp && (
                  <button
                    type="button"
                    onClick={() => onWhatsApp(order)}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: 'none',
                      background: '#25D366',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                )}
                {onTogglePayment && (
                  <button
                    type="button"
                    onClick={() => onTogglePayment(order)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid var(--border-md, rgba(74,59,50,0.1))',
                      background: 'transparent',
                      color: 'var(--text, #4A3B32)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {order.balance <= 0 ? 'Mark Pending' : 'Mark Paid'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Memoize so equal props skip re-render (Req 5.3).
export default React.memo(OrderCard);
