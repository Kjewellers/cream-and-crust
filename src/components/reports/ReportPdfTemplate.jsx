import React from 'react';

/**
 * ReportPdfTemplate — editorial A4 business-report sheet, rasterised by
 * html2canvas → jsPDF. Same design language as the invoice: Playfair
 * titles, rose/cream/gold palette, inline styles only (html2canvas can't
 * read stylesheet rules reliably).
 *
 * Renders inside an element with id `report-pdf-container` at 794px wide.
 *
 * Props: { report, bakery }
 *   report — the object from buildReport()
 *   bakery — business profile (name, logo, tagline)
 */

const palette = {
  ink: '#2A1E1B',
  body: '#4A3A33',
  muted: '#8A7A72',
  line: '#EFE4DD',
  cream: '#FFFDFA',
  paper: '#FFFFFF',
  blush: '#F8E7EA',
  rose: '#A14F61',
  gold: '#C8A46A',
  goldDeep: '#A48343',
  green: '#2F7A5A',
  red: '#C2410C',
};

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const isRenderableLogo = (val) =>
  typeof val === 'string' &&
  (val.startsWith('data:image') || val.startsWith('http://') || val.startsWith('https://'));

const Label = ({ children, color }) => (
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

const StatBox = ({ label, value, tint, sub }) => (
  <div
    style={{
      flex: 1,
      border: `1px solid ${palette.line}`,
      borderRadius: 12,
      padding: '14px 16px',
      background: palette.paper,
    }}
  >
    <div
      style={{
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: palette.muted,
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: '"Playfair Display", Georgia, serif',
        fontSize: 24,
        fontWeight: 700,
        color: tint || palette.ink,
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}
    >
      {value}
    </div>
    {sub && <div style={{ fontSize: 10, color: palette.muted, marginTop: 5 }}>{sub}</div>}
  </div>
);

export default function ReportPdfTemplate({ report = {}, bakery = {} }) {
  const brandName = bakery.name || bakery.bakeryName || 'Cream & Crust';
  const tagline = bakery.tagline || 'Artisan Home Bakery';
  const logoSrc = isRenderableLogo(bakery.logoUrl)
    ? bakery.logoUrl
    : isRenderableLogo(bakery.logo)
      ? bakery.logo
      : '';
  const monogram =
    brandName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'C';

  const isMonthly = report.type === 'monthly';
  const profitPositive = (report.netProfit || 0) >= 0;
  const generatedOn = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const topProductRows = Array.isArray(report.topProducts) ? report.topProducts : [];
  const expenseRows = Array.isArray(report.expenseBreakdown) ? report.expenseBreakdown : [];

  return (
    <div
      id="report-pdf-container"
      style={{
        width: 794,
        background: palette.cream,
        color: palette.ink,
        boxSizing: 'border-box',
        padding: '48px 52px 40px',
        fontFamily: 'Inter, Arial, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap');`}</style>

      {/* Top ribbon */}
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

      {/* Watermark monogram */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 320,
          right: -60,
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 280,
          fontWeight: 700,
          color: palette.blush,
          opacity: 0.4,
          lineHeight: 0.9,
          pointerEvents: 'none',
        }}
      >
        {monogram}
      </div>

      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 28,
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            style={{
              width: 76,
              height: 76,
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
                  fontSize: 30,
                  fontWeight: 700,
                  color: palette.rose,
                }}
              >
                {monogram}
              </div>
            )}
          </div>
          <div>
            <Label color={palette.gold}>{isMonthly ? 'Monthly' : 'Weekly'} Report</Label>
            <div
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 32,
                fontWeight: 700,
                color: palette.ink,
                marginTop: 4,
                letterSpacing: '-0.5px',
              }}
            >
              {brandName}
            </div>
            <div
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 13,
                color: palette.rose,
              }}
            >
              {tagline}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Label color={palette.muted}>Period</Label>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 20,
              fontWeight: 700,
              color: palette.ink,
              marginTop: 4,
            }}
          >
            {report.periodLabel || ''}
          </div>
          <div style={{ fontSize: 11, color: palette.muted, marginTop: 6 }}>
            Generated {generatedOn}
          </div>
        </div>
      </header>

      <div style={{ height: 1, background: palette.line, margin: '24px 0 26px' }} />

      {/* Hero profit */}
      <div
        style={{
          textAlign: 'center',
          padding: '6px 0 22px',
        }}
      >
        <Label color={palette.muted}>Net Profit</Label>
        <div
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 52,
            fontWeight: 700,
            color: profitPositive ? palette.green : palette.red,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            marginTop: 6,
          }}
        >
          {fmtINR(report.netProfit)}
        </div>
        <div style={{ fontSize: 12, color: palette.muted, fontWeight: 700, marginTop: 8 }}>
          {report.margin || 0}% profit margin
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <StatBox
          label="Orders"
          value={report.orderCount || 0}
          tint={palette.rose}
          sub={report.avgOrderValue ? `avg ${fmtINR(report.avgOrderValue)}` : undefined}
        />
        <StatBox
          label="Revenue"
          value={fmtINR(report.revenue)}
          tint={palette.green}
          sub={report.pending ? `${fmtINR(report.pending)} pending` : 'all collected'}
        />
      </div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 26 }}>
        <StatBox label="Expenses" value={fmtINR(report.expenseTotal)} tint={palette.red} />
        <StatBox label="New Customers" value={report.newCustomers || 0} tint="#7C3AED" />
      </div>

      {/* Highlights */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 26 }}>
        <div
          style={{
            flex: 1,
            border: `1px solid ${palette.line}`,
            borderLeft: `3px solid ${palette.gold}`,
            borderRadius: 10,
            padding: '14px 16px',
            background: palette.paper,
          }}
        >
          <Label color={palette.goldDeep}>Best Seller</Label>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 17,
              fontWeight: 700,
              marginTop: 6,
              color: palette.ink,
            }}
          >
            {report.topProduct ? report.topProduct[0] : '—'}
          </div>
          {report.topProduct && (
            <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>
              {fmtINR(report.topProduct[1])} in sales
            </div>
          )}
        </div>
        <div
          style={{
            flex: 1,
            border: `1px solid ${palette.line}`,
            borderLeft: `3px solid ${palette.rose}`,
            borderRadius: 10,
            padding: '14px 16px',
            background: palette.paper,
          }}
        >
          <Label color={palette.rose}>Busiest Day</Label>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 17,
              fontWeight: 700,
              marginTop: 6,
              color: palette.ink,
            }}
          >
            {report.busiestDay ? report.busiestDay[0] : '—'}
          </div>
          {report.busiestDay && (
            <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>
              {report.busiestDay[1]} orders
            </div>
          )}
        </div>
      </div>

      {/* Top products table */}
      {topProductRows.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Label>Top Products</Label>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
            <tbody>
              {topProductRows.slice(0, 5).map(([name, val], i) => (
                <tr key={i}>
                  <td
                    style={{
                      padding: '9px 0',
                      borderBottom: `1px solid ${palette.line}`,
                      fontSize: 13,
                      color: palette.body,
                    }}
                  >
                    <span style={{ color: palette.gold, fontWeight: 800, marginRight: 8 }}>
                      {i + 1}
                    </span>
                    {name}
                  </td>
                  <td
                    style={{
                      padding: '9px 0',
                      borderBottom: `1px solid ${palette.line}`,
                      textAlign: 'right',
                      fontSize: 13,
                      fontWeight: 800,
                      color: palette.ink,
                    }}
                  >
                    {fmtINR(val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expense breakdown */}
      {expenseRows.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Label>Expense Breakdown</Label>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
            <tbody>
              {expenseRows.map(([cat, val], i) => (
                <tr key={i}>
                  <td
                    style={{
                      padding: '9px 0',
                      borderBottom: `1px solid ${palette.line}`,
                      fontSize: 13,
                      color: palette.body,
                    }}
                  >
                    {cat}
                  </td>
                  <td
                    style={{
                      padding: '9px 0',
                      borderBottom: `1px solid ${palette.line}`,
                      textAlign: 'right',
                      fontSize: 13,
                      fontWeight: 700,
                      color: palette.red,
                    }}
                  >
                    {fmtINR(val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 28,
          paddingTop: 14,
          borderTop: `1.5px solid ${palette.line}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: palette.muted,
            fontStyle: 'italic',
            fontFamily: '"Playfair Display", Georgia, serif',
          }}
        >
          Baked with care, measured with love.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${palette.rose}, ${palette.gold})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: '"Playfair Display", Georgia, serif',
            }}
          >
            C
          </div>
          <div style={{ fontSize: 10, color: palette.muted, fontWeight: 700, letterSpacing: 0.5 }}>
            Powered by Cream &amp; Crust · creamandcrust.online
          </div>
        </div>
      </div>
    </div>
  );
}
