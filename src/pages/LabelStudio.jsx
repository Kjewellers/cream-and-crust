import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Tag, ShieldCheck, Printer } from 'lucide-react';
import LabelStudioEngine from '../components/tools/LabelStudioEngine';
import { triggerHaptic } from '../components/iOS';

export default function LabelStudio() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fade-in"
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: isMobile ? '8px 8px 32px' : '16px 20px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 10 : 20,
      }}
    >
      {/* ── Studio Header Bar ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: isMobile ? '12px 14px' : '18px 24px',
          background: 'var(--surface-polished, #ffffff)',
          border: '1px solid var(--hairline, rgba(0,0,0,0.08))',
          borderRadius: isMobile ? 18 : 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14 }}>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              navigate('/');
            }}
            aria-label="Back to Dashboard"
            style={{
              width: isMobile ? 38 : 42,
              height: isMobile ? 38 : 42,
              borderRadius: isMobile ? 12 : 14,
              border: '1px solid var(--hairline, rgba(0,0,0,0.08))',
              background: 'var(--surface-card, #ffffff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text, #2D1B14)',
              transition: 'all 0.18s ease',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={isMobile ? 18 : 20} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))',
                  color: '#059669',
                  padding: '2.5px 8px',
                  borderRadius: 6,
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ShieldCheck size={11} strokeWidth={2.5} />
                FSSAI REGULATORY ATELIER
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-sub, #7C6B5E)' }}>
                3-Step Guided Engine
              </span>
            </div>
            <h1
              style={{
                fontSize: isMobile ? '1.15rem' : '1.45rem',
                fontWeight: 800,
                color: 'var(--text, #2D1B14)',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              FSSAI Food & Regulatory Label Studio
            </h1>
          </div>
        </div>

        {/* Right Badges (Desktop / Tablet) */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 12,
                background: '#F9FAFB',
                border: '1px solid rgba(0,0,0,0.06)',
                fontSize: '0.78rem',
                color: '#4B5563',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Tag size={13} color="#059669" />
              <span>5 Designer Templates</span>
            </div>

            <div
              style={{
                padding: '6px 14px',
                borderRadius: 12,
                background: '#F9FAFB',
                border: '1px solid rgba(0,0,0,0.06)',
                fontSize: '0.78rem',
                color: '#4B5563',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Printer size={13} color="#2563EB" />
              <span>58mm & 80mm Roll Auto-Adjust</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Studio Engine Card ── */}
      <div
        style={{
          background: 'var(--surface-card, #ffffff)',
          border: '1px solid var(--hairline, rgba(0,0,0,0.08))',
          borderRadius: isMobile ? 18 : 28,
          boxShadow: '0 8px 32px rgba(45, 27, 20, 0.05)',
          overflow: 'hidden',
          minHeight: isMobile ? 550 : 700,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <LabelStudioEngine />
      </div>
    </motion.div>
  );
}
