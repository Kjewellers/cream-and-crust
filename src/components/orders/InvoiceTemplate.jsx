import React from 'react';
import { safeDisplayValue } from '../../utils/crypto';

/**
 * @file InvoiceTemplate.jsx
 *
 * Editorial print/PDF invoice for Cream & Crust.
 *
 * Design intent: this is the "stationery" version of the in-app brand —
 * Playfair Display for the editorial titles, Inter for everything that has
 * to be readable at 11–13 px in print, and a soft rose / cream / gold leaf
 * palette that mirrors the rest of the app (`var(--accent)` ≈ `#A14F61`,
 * `var(--cream)` ≈ `#FFFDFC`, gold accent `#C8A46A`).
 *
 * Constraints honored from the existing pipeline:
 *  - Renders inside an element with id `invoice-template-container`,
 *    which `pdfGenerator.jsx` selects + html2canvas rasterizes.
 *  - Fixed 794 × 1123 px frame so html2canvas → A4 jsPDF stays 1:1.
 *  - Inline styles only (html2canvas can't traverse stylesheet rules
 *    reliably across all browsers).
 *  - QR `<img>` keeps `crossOrigin="anonymous"` so it survives canvas
 *    tainting checks.
 *
 * Same prop contract: `{ order, bakeryProfile, invoiceNumber }`.
 */

// ─── Helpers ──────────────────────────────────────────────────────────

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(asNumber(value));

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const createUpiPaymentUrl = ({ upiId, name, amount, note }) => {
  if (!upiId || amount <= 0) return '';
  const params = new URLSearchParams({
    pa: upiId,
    pn: name || 'Bakery',
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note || 'Invoice payment',
  });
  return `upi://pay?${params.toString()}`;
};

const getCustomer = (order = {}) => {
  const customer = typeof order.customer === 'object' && order.customer ? order.customer : {};
  return {
    name: safeDisplayValue(
      customer.name ||
      order.customerName ||
      (typeof order.customer === 'string' ? order.customer : ''),
      'Customer'
    ),
    phone: safeDisplayValue(customer.phone || order.phone || order.customerPhone),
    email: customer.email || order.email || '',
    address: safeDisplayValue(order.deliveryAddress || customer.address || order.address),
  };
};

const normalizeItems = (order = {}) => {
  if (Array.isArray(order.items) && order.items.length > 0) {
    const cleaned = order.items
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const qty = asNumber(item.qty || item.quantity, 1);
        const unitPrice = asNumber(item.unitPrice ?? item.price ?? item.basePrice);
        return {
          name: item.name || item.product || 'Custom bake',
          details: item.description || item.size || item.variant || item.notes || '',
          qty,
          unitPrice,
          amount: asNumber(item.amount, unitPrice * qty),
        };
      });
    if (cleaned.length > 0) return cleaned;
  }

  const total = asNumber(order.totalAmount ?? order.total);
  return [
    {
      name: order.product || 'Custom bakery order',
      details: [order.size, order.notes].filter(Boolean).join(' · ') || '',
      qty: 1,
      unitPrice: total,
      amount: total,
    },
  ];
};

const isPickup = (order = {}) => {
  if (!order) return false;
  const fulfilment = String(
    order.fulfillment || order.fulfilment || order.deliveryType || order.type || ''
  ).toLowerCase();
  if (fulfilment.includes('pickup') || fulfilment.includes('self')) return true;
  // Heuristic: orders without a delivery address are pickup orders.
  const addr = order.deliveryAddress || (order.customer && order.customer.address) || order.address;
  return !addr;
};

// Resolve the user's uploaded logo. Profile.jsx saves it as a `data:image/...`
// data URL on `business.logo`. The default seed value is the emoji `🧁`, which
// is NOT renderable as an <img> src — so we only treat the field as a real
// image when it's a data URL or an http(s) URL.
const isRenderableLogo = (val) =>
  typeof val === 'string' &&
  (val.startsWith('data:image') || val.startsWith('http://') || val.startsWith('https://'));

const getLogoSrc = (bakeryProfile = {}) => {
  if (isRenderableLogo(bakeryProfile.logoUrl)) return bakeryProfile.logoUrl;
  if (isRenderableLogo(bakeryProfile.logo)) return bakeryProfile.logo;
  return '';
};

// ─── Palette ──────────────────────────────────────────────────────────

const palette = {
  ink: '#2A1E1B', // primary text
  body: '#4A3A33', // body text
  muted: '#8A7A72', // labels, captions
  whisper: '#C7B8B0', // dividers
  line: '#EFE4DD', // border lines
  cream: '#FFFDFA', // page background
  paper: '#FFFFFF', // card background
  blush: '#F8E7EA', // soft rose tint
  rose: '#A14F61', // brand accent (matches app)
  gold: '#C8A46A', // gold leaf accent
  goldDeep: '#A48343',
  success: '#2F7A5A',
  successSoft: '#EFF7F2',
};

// ─── Sub-components (kept inline so html2canvas captures them) ────────

const SectionLabel = ({ children, color }) => (
  <div
    style={{
      color: color || palette.gold,
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: 2,
      textTransform: 'uppercase',
      fontFamily: 'Inter, Arial, sans-serif',
    }}
  >
    {children}
  </div>
);

const TotalsRow = ({ label, value, accent = false }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 18,
      padding: '7px 0',
      color: accent ? palette.rose : palette.body,
      fontSize: 12,
      fontWeight: 600,
      fontFamily: 'Inter, Arial, sans-serif',
    }}
  >
    <span>{label}</span>
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

// Decorative scallop divider rendered as inline SVG. We use a flat gold
// stroke (no gradient) because html2canvas v1.x has had intermittent issues
// rasterizing stroke-with-linearGradient — and at print resolution the flat
// vs gradient stroke is visually indistinguishable.
const ScallopDivider = ({ width = 698 }) => (
  <svg
    width={width}
    height={14}
    viewBox={`0 0 ${width} 14`}
    style={{ display: 'block' }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d={(() => {
        const r = 7;
        const count = Math.floor(width / (r * 2));
        let d = `M 0 7`;
        for (let i = 0; i < count; i++) {
          d += ` a ${r} ${r} 0 0 1 ${r * 2} 0`;
        }
        return d;
      })()}
      fill="none"
      stroke={palette.gold}
      strokeWidth={1.2}
      strokeLinecap="round"
    />
  </svg>
);

// ─── Main template ────────────────────────────────────────────────────

const InvoiceTemplate = ({ order = {}, bakeryProfile = {}, invoiceNumber }) => {
  const customer = getCustomer(order);
  const items = normalizeItems(order);
  const subtotal = items.reduce((sum, item) => sum + asNumber(item.amount), 0);
  const deliveryCharges = asNumber(order.deliveryCharges ?? order.deliveryCharge);
  const packagingCharges = asNumber(order.packagingCharges ?? order.packagingCharge);
  const discount = asNumber(order.discount);
  const tax = asNumber(order.tax ?? order.gstAmount);
  const computedTotal = Math.max(0, subtotal + deliveryCharges + packagingCharges + tax - discount);
  const total = asNumber(order.totalAmount ?? order.total, computedTotal) || computedTotal;
  const advancePaid = asNumber(order.advance ?? order.advancePaid ?? order.paidAmount);
  const balanceDue = Math.max(0, total - advancePaid);
  const fullyPaid = balanceDue <= 0 && total > 0;
  const paymentStatus = fullyPaid
    ? 'Paid in full'
    : advancePaid > 0
      ? 'Partially paid'
      : 'Payment pending';

  const brandName =
    bakeryProfile.name || bakeryProfile.bakeryName || bakeryProfile.businessName || 'Cream & Crust';
  const tagline = bakeryProfile.tagline || bakeryProfile.byline || 'Artisan Home Bakery';

  const logoSrc = getLogoSrc(bakeryProfile);

  // Monogram: first letter of each word in the brand name, max 2 chars.
  const monogram =
    brandName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'C';

  const generatedNumber =
    invoiceNumber ||
    `INV-${String(order.orderId || order.id || Date.now())
      .replace(/^#/, '')
      .toUpperCase()}`;

  const pickup = isPickup(order);
  const fulfilmentLabel = pickup ? 'Pickup date' : 'Delivery date';
  const fulfilmentDate = formatDate(order.date || order.deliveryDate || order.pickupDate);

  const adminUpiId = bakeryProfile.upiId || bakeryProfile.upi || bakeryProfile.paymentUpi || '';
  const paymentUrl = createUpiPaymentUrl({
    upiId: adminUpiId,
    name: brandName,
    amount: balanceDue,
    note: `${generatedNumber} ${customer.name}`,
  });

  // QR resolution priority:
  //   1. The user's uploaded UPI QR (data:image/... or http URL) — saved
  //      from Profile. This is the QR straight from their GPay/PhonePe
  //      app, so customers scanning it land on the actual merchant
  //      account they trust.
  //   2. A dynamic UPI deep-link QR generated from upiId + balanceDue.
  //      Encodes the bill amount so the customer doesn't have to type it.
  //   3. Empty state ("UPI ID not set") if no UPI is configured at all.
  const uploadedQrSrc = isRenderableLogo(bakeryProfile.upiQrUrl || bakeryProfile.upiQr)
    ? bakeryProfile.upiQrUrl || bakeryProfile.upiQr
    : '';
  const generatedQrUrl = paymentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(paymentUrl)}`
    : '';
  const qrUrl = uploadedQrSrc || generatedQrUrl;
  const usingUploadedQr = !!uploadedQrSrc;

  // Footer contact line — only show items the user actually filled in.
  const footerBits = [
    bakeryProfile.instagram,
    bakeryProfile.website || bakeryProfile.portfolioLink,
    bakeryProfile.whatsapp || bakeryProfile.phone,
  ].filter(Boolean);

  return (
    <div
      id="invoice-template-container"
      style={{
        width: 794,
        background: palette.cream,
        color: palette.ink,
        boxSizing: 'border-box',
        padding: '52px 56px 40px',
        fontFamily: 'Inter, Arial, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600&display=swap');
      `}</style>

      {/* Top gold ribbon */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: `linear-gradient(90deg, ${palette.rose} 0%, #E7B9C0 30%, ${palette.gold} 70%, ${palette.goldDeep} 100%)`,
        }}
      />

      {/* Oversized brand watermark behind the body — soft, subtle, editorial */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 360,
          right: -70,
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 280,
          fontWeight: 700,
          color: palette.blush,
          opacity: 0.45,
          lineHeight: 0.9,
          letterSpacing: -8,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {monogram}
      </div>

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 36,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          {/* Monogram badge — refined seal that prefers the user's uploaded
              logo (data: or http URL) and falls back to the brand monogram
              for the default emoji seed. */}
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: palette.paper,
              border: `1px solid ${palette.gold}`,
              boxShadow: `0 0 0 4px ${palette.cream}, 0 0 0 5px ${palette.gold}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={brandName}
                crossOrigin="anonymous"
                style={{ width: '88%', height: '88%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              <div
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: 34,
                  fontWeight: 700,
                  color: palette.rose,
                  lineHeight: 1,
                  letterSpacing: 1,
                }}
              >
                {monogram}
              </div>
            )}
          </div>

          <div>
            <SectionLabel color={palette.gold}>Established · Premium</SectionLabel>
            <div
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 36,
                fontWeight: 700,
                lineHeight: 1.04,
                color: palette.ink,
                marginTop: 6,
                letterSpacing: -0.5,
              }}
            >
              {brandName}
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 14,
                color: palette.rose,
                fontWeight: 400,
              }}
            >
              {tagline}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', minWidth: 240 }}>
          <SectionLabel color={palette.muted}>Invoice</SectionLabel>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 56,
              fontWeight: 700,
              color: palette.ink,
              lineHeight: 1,
              marginTop: 4,
              letterSpacing: -1,
            }}
          >
            {generatedNumber.replace(/^INV-?/i, '')}
          </div>
          <div
            style={{
              marginTop: 6,
              color: palette.muted,
              fontSize: 11,
              letterSpacing: 1.5,
              fontWeight: 700,
            }}
          >
            № {generatedNumber}
          </div>
        </div>
      </header>

      {/* Hairline + scallop ornament under the header */}
      <div style={{ marginTop: 22, marginBottom: 6 }}>
        <ScallopDivider />
      </div>

      {/* ── META STRIP (dates + status) ──────────────────────────── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 0,
          marginTop: 18,
          padding: '14px 0',
          borderTop: `1px solid ${palette.line}`,
          borderBottom: `1px solid ${palette.line}`,
        }}
      >
        {[
          ['Invoice date', formatDate(order.invoiceGeneratedAt || Date.now())],
          [fulfilmentLabel, fulfilmentDate],
          ['Status', paymentStatus],
        ].map(([label, value], i) => (
          <div
            key={label}
            style={{
              padding: '0 18px',
              borderLeft: i === 0 ? 'none' : `1px solid ${palette.line}`,
            }}
          >
            <SectionLabel>{label}</SectionLabel>
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                fontWeight: 700,
                color: label === 'Status' && fullyPaid ? palette.success : palette.ink,
                fontFamily: 'Inter, Arial, sans-serif',
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </section>

      {/* ── PARTIES (Billed to / From) ──────────────────────────── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 36,
          marginTop: 26,
          position: 'relative',
        }}
      >
        <div>
          <SectionLabel>Billed to</SectionLabel>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 20,
              fontWeight: 600,
              color: palette.ink,
              marginTop: 8,
              lineHeight: 1.2,
            }}
          >
            {customer.name}
          </div>
          <div
            style={{
              marginTop: 10,
              color: palette.body,
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            {customer.phone && <div>{customer.phone}</div>}
            {customer.email && <div>{customer.email}</div>}
            {customer.address ? (
              <div style={{ marginTop: 4, color: palette.muted }}>{customer.address}</div>
            ) : (
              <div style={{ marginTop: 4, color: palette.muted, fontStyle: 'italic' }}>
                Pickup order
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionLabel>From</SectionLabel>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 20,
              fontWeight: 600,
              color: palette.ink,
              marginTop: 8,
              lineHeight: 1.2,
            }}
          >
            {brandName}
          </div>
          <div
            style={{
              marginTop: 10,
              color: palette.body,
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            {(bakeryProfile.phone || bakeryProfile.whatsapp) && (
              <div>{bakeryProfile.phone || bakeryProfile.whatsapp}</div>
            )}
            {bakeryProfile.email && <div>{bakeryProfile.email}</div>}
            {(bakeryProfile.address || bakeryProfile.pickupAddress) && (
              <div style={{ marginTop: 4, color: palette.muted }}>
                {bakeryProfile.address || bakeryProfile.pickupAddress}
              </div>
            )}
            {bakeryProfile.gstNumber && (
              <div style={{ marginTop: 4, color: palette.muted }}>
                GSTIN · {bakeryProfile.gstNumber}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── ITEMS ─────────────────────────────────────────────────── */}
      <section style={{ marginTop: 32, position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <SectionLabel>Order details</SectionLabel>
          <div
            style={{
              fontSize: 11,
              color: palette.muted,
              fontWeight: 600,
            }}
          >
            Order ID · {order.orderId || order.id || '—'}
          </div>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'Inter, Arial, sans-serif',
          }}
        >
          <thead>
            <tr>
              {[
                ['Item', 'left', 0],
                ['', 'left', 0],
                ['Qty', 'center', 64],
                ['Rate', 'right', 110],
                ['Amount', 'right', 120],
              ].map(([label, align, width], i) => (
                <th
                  key={i}
                  style={{
                    textAlign: align,
                    padding: '12px 0 14px',
                    width: width || 'auto',
                    fontSize: 9,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    color: palette.gold,
                    borderBottom: `1.5px solid ${palette.gold}`,
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td
                  colSpan={2}
                  style={{
                    padding: '18px 0 16px',
                    borderBottom: `1px solid ${palette.line}`,
                    verticalAlign: 'top',
                  }}
                >
                  <div
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: 16,
                      fontWeight: 600,
                      color: palette.ink,
                      lineHeight: 1.3,
                    }}
                  >
                    {item.name}
                  </div>
                  {item.details && (
                    <div
                      style={{
                        marginTop: 4,
                        fontStyle: 'italic',
                        fontSize: 12,
                        color: palette.muted,
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontWeight: 400,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.details}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: '18px 0 16px',
                    borderBottom: `1px solid ${palette.line}`,
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: palette.body,
                    verticalAlign: 'top',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {item.qty}
                </td>
                <td
                  style={{
                    padding: '18px 0 16px',
                    borderBottom: `1px solid ${palette.line}`,
                    textAlign: 'right',
                    fontSize: 12,
                    color: palette.muted,
                    verticalAlign: 'top',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatMoney(item.unitPrice)}
                </td>
                <td
                  style={{
                    padding: '18px 0 16px',
                    borderBottom: `1px solid ${palette.line}`,
                    textAlign: 'right',
                    fontSize: 14,
                    fontWeight: 800,
                    color: palette.ink,
                    verticalAlign: 'top',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatMoney(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── PAYMENT + TOTALS ──────────────────────────────────────── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 32,
          marginTop: 26,
          alignItems: 'start',
          position: 'relative',
        }}
      >
        {/* Left column — payment / notes */}
        <div style={{ display: 'grid', gap: 20 }}>
          {balanceDue > 0 ? (
            <div>
              <SectionLabel>Pay pending balance</SectionLabel>
              <div
                style={{
                  display: 'flex',
                  gap: 18,
                  alignItems: 'center',
                  marginTop: 12,
                  padding: '16px 18px',
                  background: palette.paper,
                  border: `1px solid ${palette.line}`,
                  borderLeft: `3px solid ${palette.gold}`,
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: 96,
                    height: 96,
                    background: palette.paper,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={usingUploadedQr ? `${brandName} UPI QR` : 'UPI payment QR'}
                      crossOrigin="anonymous"
                      style={{ width: 92, height: 92, objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      style={{
                        color: palette.muted,
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        lineHeight: 1.3,
                      }}
                    >
                      UPI ID
                      <br />
                      not set
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: palette.body, lineHeight: 1.7, flex: 1 }}>
                  <div
                    style={{
                      color: palette.muted,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Scan to pay
                  </div>
                  <div>
                    <strong style={{ color: palette.ink }}>Pay to:</strong> {brandName}
                  </div>
                  <div>
                    <strong style={{ color: palette.ink }}>UPI:</strong>{' '}
                    {adminUpiId || 'Set in admin profile'}
                  </div>
                  <div style={{ marginTop: 6, color: palette.rose, fontWeight: 800 }}>
                    Pending {formatMoney(balanceDue)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <SectionLabel color={palette.success}>Payment received</SectionLabel>
              <div
                style={{
                  marginTop: 10,
                  padding: '14px 18px',
                  background: palette.successSoft,
                  border: `1px solid #CBE7DA`,
                  borderLeft: `3px solid ${palette.success}`,
                  borderRadius: 4,
                  color: palette.success,
                  fontSize: 13,
                  fontWeight: 700,
                  lineHeight: 1.6,
                }}
              >
                Paid in full · Thank you for choosing us.
              </div>
            </div>
          )}

          {(order.notes || order.customizations) && (
            <div>
              <SectionLabel>A note for you</SectionLabel>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: palette.body,
                  lineHeight: 1.7,
                  fontWeight: 400,
                  paddingLeft: 14,
                  borderLeft: `2px solid ${palette.gold}`,
                }}
              >
                "{order.notes || order.customizations}"
              </div>
            </div>
          )}
        </div>

        {/* Right column — totals card */}
        <div
          style={{
            background: palette.paper,
            border: `1px solid ${palette.line}`,
            borderRadius: 4,
            padding: '20px 22px',
            position: 'relative',
          }}
        >
          {/* "Paid in full" rubber-stamp — rectangular double-bordered
              shape with the bakery name on top, oversized "PAID" hero,
              and the date on the bottom. Built with HTML/CSS only so
              html2canvas captures it crisply (SVG textPath fails). */}
          {fullyPaid && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: -32,
                right: -38,
                transform: 'rotate(-8deg)',
                pointerEvents: 'none',
                zIndex: 2,
                padding: 6,
                border: `2.5px solid ${palette.success}`,
                borderRadius: 6,
                background: 'transparent',
              }}
            >
              <div
                style={{
                  border: `1px solid ${palette.success}`,
                  borderRadius: 3,
                  padding: '8px 18px 7px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  minWidth: 156,
                }}
              >
                {/* Bakery name across the top, spaced caps */}
                <div
                  style={{
                    fontFamily: 'Inter, Arial, sans-serif',
                    fontSize: 9,
                    fontWeight: 800,
                    color: palette.success,
                    letterSpacing: 2.4,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    paddingBottom: 4,
                    borderBottom: `1px solid ${palette.success}`,
                    width: '100%',
                    textAlign: 'center',
                  }}
                >
                  {brandName.slice(0, 28)}
                </div>
                {/* PAID hero in Playfair */}
                <div
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontSize: 32,
                    fontWeight: 700,
                    color: palette.success,
                    letterSpacing: 6,
                    lineHeight: 1.05,
                    marginTop: 4,
                  }}
                >
                  PAID
                </div>
                {/* Date row across the bottom */}
                <div
                  style={{
                    marginTop: 4,
                    paddingTop: 4,
                    borderTop: `1px solid ${palette.success}`,
                    width: '100%',
                    textAlign: 'center',
                    fontFamily: 'Inter, Arial, sans-serif',
                    fontSize: 8,
                    fontWeight: 700,
                    color: palette.success,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatDate(order.invoiceGeneratedAt || Date.now())}
                </div>
              </div>
            </div>
          )}
          {/* Gold corner accents */}
          <div
            style={{
              position: 'absolute',
              top: -1,
              left: -1,
              width: 22,
              height: 22,
              borderTop: `2px solid ${palette.gold}`,
              borderLeft: `2px solid ${palette.gold}`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: 22,
              height: 22,
              borderBottom: `2px solid ${palette.gold}`,
              borderRight: `2px solid ${palette.gold}`,
            }}
          />

          <SectionLabel>Summary</SectionLabel>
          <div style={{ marginTop: 8, marginBottom: 10, height: 1, background: palette.line }} />

          <TotalsRow label="Subtotal" value={formatMoney(subtotal)} />
          {deliveryCharges > 0 && (
            <TotalsRow label="Delivery" value={formatMoney(deliveryCharges)} />
          )}
          {packagingCharges > 0 && (
            <TotalsRow label="Packaging" value={formatMoney(packagingCharges)} />
          )}
          {tax > 0 && <TotalsRow label="Tax / GST" value={formatMoney(tax)} />}
          {discount > 0 && (
            <TotalsRow label="Discount" value={`− ${formatMoney(discount)}`} accent />
          )}

          <div
            style={{
              marginTop: 8,
              paddingTop: 12,
              borderTop: `1px solid ${palette.line}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 18,
              fontWeight: 700,
              color: palette.ink,
            }}
          >
            <span>Total</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(total)}</span>
          </div>

          {advancePaid > 0 && (
            <div style={{ marginTop: 10 }}>
              <TotalsRow label="Advance paid" value={`− ${formatMoney(advancePaid)}`} />
            </div>
          )}

          <div
            style={{
              marginTop: 14,
              padding: '14px 16px',
              background: balanceDue > 0 ? palette.blush : palette.successSoft,
              border: `1px solid ${balanceDue > 0 ? '#F1C9CF' : '#CBE7DA'}`,
              borderRadius: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: balanceDue > 0 ? palette.rose : palette.success,
                fontFamily: 'Inter, Arial, sans-serif',
              }}
            >
              {balanceDue > 0 ? 'Balance due' : 'Settled'}
            </span>
            <span
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 22,
                fontWeight: 700,
                color: balanceDue > 0 ? palette.rose : palette.success,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatMoney(balanceDue)}
            </span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer
        style={{
          marginTop: 32,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <ScallopDivider width={682} />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 24,
            color: palette.muted,
            fontSize: 11,
            lineHeight: 1.6,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 15,
                color: palette.rose,
                fontWeight: 500,
                lineHeight: 1.2,
                marginBottom: 4,
              }}
            >
              Thank you, sincerely.
            </div>
            <div style={{ color: palette.muted, fontSize: 11 }}>
              Baked fresh, packed with care, delivered with gratitude.
            </div>
          </div>

          {footerBits.length > 0 && (
            <div
              style={{
                textAlign: 'right',
                fontSize: 10,
                letterSpacing: 1,
                color: palette.muted,
                fontWeight: 600,
              }}
            >
              {footerBits.map((bit, i) => (
                <span key={bit}>
                  {bit}
                  {i < footerBits.length - 1 && (
                    <span style={{ color: palette.gold, margin: '0 8px' }}>◆</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* App attribution — refined "Powered by" badge. Sits below the
            contact strip so it never competes with the bakery's own
            branding, but gives the document a polished SaaS signature. */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px dashed ${palette.line}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Tiny rose-cream app seal */}
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${palette.rose} 0%, ${palette.gold} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 0 0 1.5px ${palette.cream}, 0 0 0 2.5px ${palette.gold}`,
              }}
            >
              <span
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1,
                }}
              >
                C
              </span>
            </div>
            <div style={{ lineHeight: 1.25 }}>
              <div
                style={{
                  fontSize: 8,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: palette.whisper,
                  fontWeight: 700,
                }}
              >
                Powered by
              </div>
              <div
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 13,
                  fontWeight: 600,
                  color: palette.rose,
                  lineHeight: 1.1,
                }}
              >
                Cream &amp; Crust
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
            <div
              style={{
                fontSize: 8,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: palette.whisper,
                fontWeight: 700,
              }}
            >
              Bakery Business OS
            </div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: palette.muted,
                letterSpacing: 0.5,
              }}
            >
              creamandcrust.online
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InvoiceTemplate;
