/**
 * StatusUpdateModal — WhatsApp status update sheet.
 * Uses PremiumBottomSheet for consistent, premium feel.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { triggerHaptic } from '../iOS';
import PremiumBottomSheet from '../PremiumBottomSheet';

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  baking: 'Baking',
  ready: 'Ready',
  delivered: 'Delivered',
};

const STATUS_EMOJI = {
  confirmed: '✅',
  baking: '👨‍🍳',
  ready: '🎉',
  delivered: '💝',
};

const MAX_CHARS = 1000;

export default function StatusUpdateModal({ open, onClose, status, customerName, phone, message }) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDraft(message || '');
      triggerHaptic('light');
    }
  }, [open, message]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

  useEffect(() => {
    if (open) setTimeout(autoResize, 60);
  }, [open, autoResize]);

  const send = async () => {
    if (!draft.trim() || !phone) return;
    triggerHaptic('medium');
    try {
      const { openWhatsAppChat } = await import('../../utils/openLink');
      await openWhatsAppChat(phone, draft.trim());
    } catch (e) {
      console.warn('[CC:WhatsApp] StatusUpdate send failed:', e?.message);
    }
    onClose();
  };

  const charCount = draft.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSend = draft.trim() && phone && !isOverLimit;

  return (
    <PremiumBottomSheet
      open={open}
      onClose={onClose}
      title={`Update ${customerName || 'Customer'}`}
      subtitle={`Status → ${STATUS_LABELS[status] || status}`}
    >
      {/* Emoji + status badge */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>{STATUS_EMOJI[status] || '✨'}</div>
        <div
          style={{
            fontSize: 13,
            color: '#8C7A6B',
            fontWeight: 600,
          }}
        >
          {phone
            ? `+${String(phone).replace(/\D/g, '').replace(/^91/, '91 ').slice(0, 15)}`
            : 'No phone number'}
        </div>
      </div>

      {/* Message area */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <label
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#5C4F46',
            }}
          >
            Message
          </label>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: isOverLimit ? '#DC2626' : '#B5A89E',
            }}
          >
            {charCount}/{MAX_CHARS}
          </span>
        </div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            autoResize();
          }}
          placeholder="Type your message..."
          style={{
            width: '100%',
            minHeight: 80,
            maxHeight: 160,
            padding: '12px 14px',
            borderRadius: 14,
            border: '1.5px solid rgba(74, 59, 50, 0.10)',
            background: '#FAF6F0',
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.6,
            color: '#2D1B14',
            fontFamily: '"Inter", system-ui, sans-serif',
            resize: 'none',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(181, 96, 106, 0.4)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(74, 59, 50, 0.10)')}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            height: 46,
            borderRadius: 13,
            border: '1.5px solid rgba(74, 59, 50, 0.10)',
            background: 'transparent',
            color: '#8C7A6B',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          style={{
            flex: 2,
            height: 46,
            borderRadius: 13,
            border: 'none',
            background: canSend
              ? 'linear-gradient(135deg, #25D366 0%, #1EBE5A 100%)'
              : 'rgba(74, 59, 50, 0.08)',
            color: canSend ? '#fff' : '#B5A89E',
            fontSize: 14,
            fontWeight: 800,
            cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: canSend ? '0 6px 16px rgba(37, 211, 102, 0.25)' : 'none',
            fontFamily: 'inherit',
          }}
        >
          <MessageCircle size={16} strokeWidth={2.2} />
          Send on WhatsApp
        </button>
      </div>
    </PremiumBottomSheet>
  );
}
