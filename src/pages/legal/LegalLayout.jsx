import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Shared shell for the Privacy Policy and Terms pages. Works whether the
 * visitor is logged in (in-app) or not (public link from Play Store /
 * App Store listing). No auth required.
 */
export default function LegalLayout({ title, subtitle, updated, children }) {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #FFF7F2 0%, #FAF7F5 100%)',
        color: '#3A2820',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(255,253,250,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(181,96,106,0.12)',
          padding: 'calc(14px + env(safe-area-inset-top, 0px)) 18px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label="Back"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: '1px solid rgba(181,96,106,0.15)',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#8C7A6B',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 11, color: '#A0897C', fontWeight: 600 }}>Cream &amp; Crust</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 22px 60px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#B5606A',
            marginBottom: 8,
          }}
        >
          {subtitle}
        </div>
        <h1
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 'clamp(28px, 7vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            margin: '0 0 10px',
            color: '#2D1B14',
          }}
        >
          {title}
        </h1>
        <div style={{ fontSize: 13, color: '#8C7A6B', marginBottom: 28 }}>
          Last updated: {updated}
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(181,96,106,0.10)',
            borderRadius: 20,
            padding: 'clamp(20px, 5vw, 34px)',
            boxShadow: '0 8px 30px rgba(181,96,106,0.06)',
            lineHeight: 1.7,
            fontSize: 14.5,
            color: '#4A3A33',
          }}
        >
          {children}
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 28,
            fontSize: 12,
            color: '#A0897C',
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 15,
              color: '#B5606A',
            }}
          >
            Cream &amp; Crust
          </div>
          Bakery Business OS · creamandcrust.online
        </div>
      </div>
    </div>
  );
}

/* Reusable section heading + paragraph helpers */
export function H2({ children }) {
  return (
    <h2
      style={{
        fontFamily: '"Playfair Display", Georgia, serif',
        fontSize: 19,
        fontWeight: 700,
        color: '#2D1B14',
        margin: '28px 0 10px',
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </h2>
  );
}

export function P({ children }) {
  return <p style={{ margin: '0 0 12px' }}>{children}</p>;
}

export function UL({ items }) {
  return (
    <ul style={{ margin: '0 0 12px', paddingLeft: 0, listStyle: 'none' }}>
      {items.map((it, i) => (
        <li
          key={i}
          style={{
            position: 'relative',
            paddingLeft: 20,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 1,
              color: '#C8A46A',
            }}
          >
            ◆
          </span>
          {it}
        </li>
      ))}
    </ul>
  );
}
