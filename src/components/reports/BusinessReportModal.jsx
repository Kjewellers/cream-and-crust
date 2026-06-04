import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  TrendingUp,
  TrendingDown,
  Award,
  ShoppingBag,
  Star,
  CalendarDays,
  Users,
  Sparkles,
  Share2,
  Download,
} from 'lucide-react';
import AnimatedNumber from '../AnimatedNumber';
import { reportHeadline } from '../../utils/businessReport';
import { triggerHaptic, showToast } from '../iOS';
import { downloadReportPdf } from '../../utils/reportPdf';

const fmtINR = (n) => `\u20B9${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export default function BusinessReportModal({ open, report, onClose, bakery = {} }) {
  const [downloading, setDownloading] = React.useState(false);
  
  // Use a state to check if we're mounted to avoid SSR issues if any, 
  // and to ensure we can access document.body
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !report || !mounted) return null;

  const isMonthly = report.type === 'monthly';
  const profitPositive = report.netProfit >= 0;

  const handleDownload = async () => {
    if (downloading) return;
    triggerHaptic('light');
    setDownloading(true);
    showToast('Preparing PDF…', 'info');
    try {
      const name = await downloadReportPdf(report, bakery);
      showToast(`Saved: ${name}`, 'success');
    } catch (e) {
      console.error('Report PDF error:', e);
      showToast('Could not generate PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const share = () => {
    triggerHaptic('light');
    const lines = [
      `\u{1F4CA} ${isMonthly ? 'Monthly' : 'Weekly'} Report — ${report.periodLabel}`,
      ``,
      `Orders: ${report.orderCount}`,
      `Revenue: ${fmtINR(report.revenue)}`,
      `Expenses: ${fmtINR(report.expenseTotal)}`,
      `Net profit: ${fmtINR(report.netProfit)} (${report.margin}%)`,
      report.topProduct ? `Top seller: ${report.topProduct[0]}` : '',
      ``,
      `\u2014 via Cream & Crust`,
    ].filter(Boolean);
    const text = lines.join('\n');
    if (navigator.share) {
      navigator.share({ title: 'Business Report', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      showToast('Report copied to clipboard', 'success');
    }
  };

  const StatTile = ({ icon: Icon, label, value, tint, bg, sub }) => (
    <div
      style={{
        background: bg,
        border: `1px solid ${tint}28`,
        borderRadius: 18,
        padding: '14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tint }}>
        <Icon size={14} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 22,
          fontWeight: 700,
          color: tint,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{sub}</div>}
    </div>
  );

  const modalContent = (
    <AnimatePresence>
      <motion.div
        key="report-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20, 14, 12, 0.75)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          zIndex: 10050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Business report"
      >
        <motion.div
          key="report-sheet"
          initial={{ y: 40, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 440,
            maxHeight: 'calc(100vh - 48px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: 'var(--card, #FFFFFF)',
            borderRadius: 24,
            boxShadow: '0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 8px))',
          }}
        >
          {/* Hero band */}
          <div
            style={{
              position: 'relative',
              padding: '20px 22px 26px',
              borderRadius: '24px 24px 0 0',
              background:
                'linear-gradient(150deg, #B5606A 0%, #C97A82 45%, #E8B4BB 80%, #F6D9C4 100%)',
              overflow: 'hidden',
            }}
          >
            {/* drag pill */}
            <div
              style={{
                width: 38,
                height: 4,
                borderRadius: 99,
                background: 'rgba(255,255,255,0.6)',
                margin: '0 auto 16px',
              }}
            />
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.25)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
            >
              <X size={16} strokeWidth={2.4} />
            </button>

            {/* floating sparkles */}
            {[
              { e: '\u{1F4CA}', top: 14, right: 60, s: 22, d: 0 },
              { e: '\u2728', top: 40, right: 28, s: 16, d: 0.4 },
            ].map((f, i) => (
              <motion.div
                key={i}
                aria-hidden="true"
                animate={{ y: [0, -8, 0], rotate: [0, 8, -4, 0] }}
                transition={{ duration: 4 + f.d, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: f.top,
                  right: f.right,
                  fontSize: f.s,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
                  pointerEvents: 'none',
                }}
              >
                {f.e}
              </motion.div>
            ))}

            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.85)',
                marginBottom: 6,
              }}
            >
              {isMonthly ? 'Monthly Report' : 'Weekly Report'}
            </div>
            <div
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 26,
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                textShadow: '0 2px 12px rgba(74,40,32,0.25)',
              }}
            >
              {report.periodLabel}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 13.5,
                color: 'rgba(255,255,255,0.95)',
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              {reportHeadline(report)}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '18px 18px 8px' }}>
            {/* Hero profit line */}
            <div
              style={{
                textAlign: 'center',
                padding: '8px 0 18px',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text3)',
                  marginBottom: 4,
                }}
              >
                Net Profit
              </div>
              <div
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: 40,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: profitPositive ? '#2E7A5A' : '#D32F2F',
                  lineHeight: 1,
                }}
              >
                <AnimatedNumber value={report.netProfit} prefix="₹" duration={1.2} />
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text3)', fontWeight: 700, marginTop: 6 }}>
                {report.margin}% margin
              </div>
            </div>

            {/* Stat grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatTile
                icon={ShoppingBag}
                label="Orders"
                value={<AnimatedNumber value={report.orderCount} duration={0.9} />}
                tint="#B5606A"
                bg="rgba(181,96,106,0.07)"
                sub={report.avgOrderValue ? `avg ${fmtINR(report.avgOrderValue)}` : undefined}
              />
              <StatTile
                icon={TrendingUp}
                label="Revenue"
                value={<AnimatedNumber value={report.revenue} prefix="₹" duration={1.1} />}
                tint="#2E7A5A"
                bg="rgba(46,122,90,0.07)"
                sub={
                  <React.Fragment>
                    {report.pending > 0 ? (
                      <span style={{ color: '#D32F2F' }}>{fmtINR(report.pending)} pending</span>
                    ) : (
                      'all collected'
                    )}
                    {(!isMonthly && (report.cashCollected > 0 || report.onlineCollected > 0)) && (
                      <div style={{ marginTop: 2, fontSize: 10, opacity: 0.85, lineHeight: 1.2 }}>
                        {report.cashCollected > 0 && `Cash: ${fmtINR(report.cashCollected)}`}
                        {report.cashCollected > 0 && report.onlineCollected > 0 && <br />}
                        {report.onlineCollected > 0 && `Online: ${fmtINR(report.onlineCollected)}`}
                      </div>
                    )}
                  </React.Fragment>
                }
              />
              <StatTile
                icon={TrendingDown}
                label="Expenses"
                value={<AnimatedNumber value={report.expenseTotal} prefix="₹" duration={1.1} />}
                tint="#C2410C"
                bg="rgba(194,65,12,0.07)"
              />
              <StatTile
                icon={Users}
                label="Customers"
                value={<AnimatedNumber value={report.newCustomers} duration={0.9} />}
                tint="#7C3AED"
                bg="rgba(124,58,237,0.07)"
              />
            </div>

            {/* Highlights */}
            {(report.topProduct || report.busiestDay) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {report.topProduct && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '13px 15px',
                      borderRadius: 16,
                      background:
                        'linear-gradient(135deg, rgba(212,160,80,0.12) 0%, rgba(212,160,80,0.04) 100%)',
                      border: '1px solid rgba(212,160,80,0.2)',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 11,
                        background: 'rgba(212,160,80,0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#A06820',
                        flexShrink: 0,
                      }}
                    >
                      <Star size={17} fill="#A06820" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#A06820',
                        }}
                      >
                        Best seller
                      </div>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>
                        {report.topProduct[0]}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#A06820', fontSize: 14 }}>
                      {fmtINR(report.topProduct[1])}
                    </div>
                  </div>
                )}
                {report.busiestDay && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '13px 15px',
                      borderRadius: 16,
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 11,
                        background: 'rgba(124,58,237,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#7C3AED',
                        flexShrink: 0,
                      }}
                    >
                      <CalendarDays size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#7C3AED',
                        }}
                      >
                        Busiest day
                      </div>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>
                        {report.busiestDay[0]}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#7C3AED', fontSize: 14 }}>
                      {report.busiestDay[1]} orders
                    </div>
                  </div>
                )}
              </div>
            )}

            {report.isEmpty && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 16px',
                  color: 'var(--text3)',
                  fontSize: 14,
                }}
              >
                No orders or expenses recorded in this period.
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                onClick={share}
                aria-label="Share report"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  padding: '14px 8px',
                  borderRadius: 14,
                  border: '1.5px solid var(--border-md)',
                  background: 'var(--card)',
                  color: 'var(--text2)',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                }}
              >
                <Share2 size={16} /> Share
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                aria-label="Download PDF"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  padding: '14px 8px',
                  borderRadius: 14,
                  border: '1.5px solid rgba(181,96,106,0.25)',
                  background: '#FFFDFB',
                  color: 'var(--accent)',
                  fontWeight: 800,
                  fontSize: 13.5,
                  cursor: downloading ? 'wait' : 'pointer',
                  opacity: downloading ? 0.6 : 1,
                }}
              >
                <Download size={16} /> {downloading ? 'Saving…' : 'PDF'}
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1.2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  padding: '14px 8px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--accent) 0%, #C87A82 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(181,96,106,0.3)',
                }}
              >
                <Sparkles size={16} /> Done
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

