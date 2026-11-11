import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Tag, ShieldCheck, Printer, Sparkles, BookOpen } from 'lucide-react';
import LabelStudioEngine from '../components/tools/LabelStudioEngine';
import { triggerHaptic } from '../components/iOS';

export default function LabelStudio() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fade-in"
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '16px 20px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* ── Studio Header Bar ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          padding: '18px 24px',
          background: 'var(--surface-polished, #ffffff)',
          border: '1px solid var(--hairline, rgba(0,0,0,0.08))',
          borderRadius: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              navigate('/');
            }}
            aria-label="Back to Dashboard"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: '1px solid var(--hairline, rgba(0,0,0,0.08))',
              background: 'var(--surface-card, #ffffff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text, #2D1B14)',
              transition: 'all 0.18s ease',
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))',
                  color: '#059669',
                  padding: '3px 9px',
                  borderRadius: 6,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ShieldCheck size={12} strokeWidth={2.5} />
                FSSAI REGULATORY ATELIER
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-sub, #7C6B5E)' }}>
                3-Step Guided Engine
              </span>
            </div>
            <h1
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: 'var(--text, #2D1B14)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              FSSAI Food & Regulatory Label Studio
            </h1>
          </div>
        </div>

        {/* Right Quick Info Badges */}
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
      </div>

      {/* ── Main Studio Engine Card ── */}
      <div
        style={{
          background: 'var(--surface-card, #ffffff)',
          border: '1px solid var(--hairline, rgba(0,0,0,0.08))',
          borderRadius: 28,
          boxShadow: '0 8px 32px rgba(45, 27, 20, 0.05)',
          overflow: 'hidden',
          minHeight: 700,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <LabelStudioEngine />
      </div>
    </motion.div>
  );
}
