import React from 'react';

const C = {
  cream: '#FAF6F0',
  ivory: '#F4ECDD',
  paper: '#FFFFFF',
  ink: '#1F1611',
  mute: '#7C6B5E',
  hairline: '#E5DDD0',
  rose: '#B5606A',
  gold: '#B89968',
};

const FONT_DISPLAY = '"Playfair Display", Georgia, serif';
const FONT_BODY = '"Inter", system-ui, sans-serif';

export default function ShoppingListPdfTemplate({ items = [], bakeryProfile = {} }) {
  const bakeryName = bakeryProfile.name || bakeryProfile.businessName || 'Cream & Crust';
  const logo = bakeryProfile.logo || '';
  
  const pending = items.filter(i => !i.bought);
  const bought = items.filter(i => i.bought);

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div
      id="shopping-list-template-container"
      style={{
        width: '794px', // A4 width at 96 DPI
        minHeight: '1123px', // A4 height at 96 DPI
        background: C.paper,
        color: C.ink,
        fontFamily: FONT_BODY,
        position: 'relative',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '60px 60px 40px', background: C.cream, borderBottom: `2px solid ${C.rose}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '38px', margin: '0 0 10px 0', color: C.ink, letterSpacing: '-0.02em' }}>
              Shopping List
            </h1>
            <p style={{ margin: 0, fontSize: '16px', color: C.mute, fontWeight: 500 }}>
              Generated on {dateStr}
            </p>
          </div>
          
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {logo ? (
              <img
                src={logo}
                alt="Bakery Logo"
                style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '12px', marginBottom: '12px' }}
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                fontFamily: FONT_DISPLAY, fontSize: '28px', fontStyle: 'italic', marginBottom: '12px'
              }}>
                {bakeryName.charAt(0).toUpperCase()}
              </div>
            )}
            <h2 style={{ fontFamily: FONT_DISPLAY, margin: 0, fontSize: '24px', color: C.rose }}>
              {bakeryName}
            </h2>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '50px 60px', flex: 1 }}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
          <div style={{ flex: 1, padding: '24px', background: C.ivory, borderRadius: '16px', border: `1px solid ${C.hairline}` }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mute, fontWeight: 700, marginBottom: '8px' }}>
              Pending Items
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: C.ink, fontFamily: FONT_DISPLAY }}>
              {pending.length}
            </div>
          </div>
          <div style={{ flex: 1, padding: '24px', background: 'rgba(52, 199, 89, 0.05)', borderRadius: '16px', border: `1px solid rgba(52, 199, 89, 0.2)` }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#34C759', fontWeight: 700, marginBottom: '8px' }}>
              Already Bought
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#34C759', fontFamily: FONT_DISPLAY }}>
              {bought.length}
            </div>
          </div>
        </div>

        {/* Pending Items List */}
        {pending.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '20px', fontFamily: FONT_DISPLAY, color: C.ink, borderBottom: `1px solid ${C.hairline}`, paddingBottom: '12px', marginBottom: '20px' }}>
              Items to Buy
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: C.mute, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.hairline}`, width: '40px' }}></th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: C.mute, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.hairline}` }}>Item Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 0', color: C.mute, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.hairline}` }}>Category</th>
                  <th style={{ textAlign: 'right', padding: '12px 0', color: C.mute, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.hairline}` }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.hairline}` }}>
                    <td style={{ padding: '16px 0', verticalAlign: 'middle' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${C.mute}` }}></div>
                    </td>
                    <td style={{ padding: '16px 0', fontSize: '16px', fontWeight: 600, color: C.ink }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '16px 0', fontSize: '14px', color: C.mute }}>
                      {item.category || '-'}
                    </td>
                    <td style={{ padding: '16px 0', fontSize: '16px', fontWeight: 700, color: C.ink, textAlign: 'right' }}>
                      {item.qty ? `${item.qty} ${item.unit || ''}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bought Items List (Compact) */}
        {bought.length > 0 && (
          <div>
            <h3 style={{ fontSize: '20px', fontFamily: FONT_DISPLAY, color: C.mute, borderBottom: `1px solid ${C.hairline}`, paddingBottom: '12px', marginBottom: '20px' }}>
              Completed Items
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {bought.map((item, idx) => (
                <div key={idx} style={{ padding: '6px 12px', background: 'rgba(52, 199, 89, 0.1)', color: '#34C759', borderRadius: '20px', fontSize: '14px', fontWeight: 600, textDecoration: 'line-through' }}>
                  {item.name} {item.qty ? `(${item.qty} ${item.unit || ''})` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: C.ink, padding: '30px 60px', color: C.cream, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', fontStyle: 'italic', color: C.gold, marginBottom: '4px' }}>
            {bakeryName}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            Professional atelier management
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
          Generated by<br />
          <strong style={{ color: C.cream }}>Cream & Crust App</strong>
        </div>
      </div>
    </div>
  );
}
