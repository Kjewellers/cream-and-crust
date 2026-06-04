/**
 * StatusBadge — colored pill showing an order's current status.
 * Extracted from Orders.jsx for reuse and maintainability.
 */
import React from 'react';

export const STATUS_COLORS = {
  inquiry: { bg: 'rgba(194,176,224,0.18)', color: '#7050A8' },
  confirmed: { bg: 'rgba(212,160,80,0.15)', color: '#A06820' },
  baking: { bg: 'rgba(240,184,179,0.2)', color: '#B04040' },
  ready: { bg: 'rgba(168,216,200,0.25)', color: '#2E7A5A' },
  delivered: { bg: 'rgba(0,0,0,0.06)', color: '#7A6555' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' },
};

export default function StatusBadge({ status }) {
  const s = String(status || 'inquiry').toLowerCase();
  const { bg, color } = STATUS_COLORS[s] || STATUS_COLORS.inquiry;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.01em',
        background: bg,
        color,
      }}
    >
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}
