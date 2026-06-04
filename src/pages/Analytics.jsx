import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Award,
  CalendarDays,
  Lock,
  Loader2,
  PieChart,
  TrendingDown,
  Target,
  Info,
  ChevronRight,
  Zap,
  Star,
  CreditCard,
  CheckCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  subscribeToOrders,
  subscribeToExpenses,
  subscribeToBusiness,
  updateOrderFieldsInDB,
} from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, formatOrderNumber, toISODate } from '../utils/date';
import {
  calculateTotalRevenue,
  calculateCollectedForOrder,
  calculateCollectedRevenue,
  calculatePendingPayments,
  calculateOrderBalance,
} from '../utils/finance';
import { Skeleton, EmptyState, triggerHaptic, showToast } from '../components/iOS';
import { downloadReportPdf } from '../utils/reportPdf';
import { Download } from 'lucide-react';
import ModuleTour from '../components/ModuleTour';
import { analyticsTourSteps } from '../components/tours/analyticsTour';
import AnimatedDemo from '../components/AnimatedDemo';
import { analyticsDemoScenes } from '../components/demos/analyticsDemo';

// ═══════════════════════════════════════════════════════════════════
// PAYMENTS SECTION — embedded tab within Analytics
// ═══════════════════════════════════════════════════════════════════
function PaymentsSection({ orders, committedOrders }) {
  const isMobile = window.innerWidth < 768;

  const collected = calculateCollectedRevenue(committedOrders);
  const totalRevenue = calculateTotalRevenue(committedOrders);
  const { amount: pending } = calculatePendingPayments(committedOrders);
  const paidCount = committedOrders.filter((o) => calculateOrderBalance(o) === 0).length;

  const handleMarkPaid = async (order) => {
    try {
      await updateOrderFieldsInDB(order.rawId, {
        advance: order.total,
        balanceDue: 0,
        isPaid: true,
        paymentStatus: 'paid',
      });
      triggerHaptic('success');
      showToast('Marked as fully paid!', 'success');
    } catch (e) {
      triggerHaptic('error');
      showToast('Failed to update payment', 'error');
    }
  };

  const payments = committedOrders.map((o) => {
    const totalNum = Number(o.total || o.totalAmount || 0);
    const advNum = calculateCollectedForOrder(o);
    const pendingAmount = calculateOrderBalance(o);
    const cName =
      typeof o.customer === 'object'
        ? o.customer?.name || 'Customer'
        : o.customerName || o.customer || 'Customer';
    return {
      rawId: o.id,
      id: formatOrderNumber(o, orders),
      customer: cName,
      total: totalNum,
      advance: advNum,
      pending: pendingAmount,
      method: o.paymentMethod || 'UPI',
      date: formatDate(o.date || o.deliveryDate || o.createdAt),
      status: pendingAmount === 0 ? 'paid' : advNum > 0 ? 'partial' : 'pending',
    };
  });

  const statusColor = { paid: '#3D8B6A', partial: '#E5A823', pending: '#C0392B' };
  const statusBg = { paid: '#EAF7F0', partial: '#FEF9EC', pending: '#FEF0EF' };

  return (
    <>
      {/* Payment Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: isMobile ? 10 : 16,
          marginBottom: 24,
        }}
      >
        <div className="stat-card orange">
          <div className="stat-label">Total Expected</div>
          <div className="stat-value" style={{ fontSize: isMobile ? '1.2rem' : undefined }}>
            {formatCurrency(totalRevenue)}
          </div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>
            {committedOrders.length} orders
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">
            <CheckCircle size={18} />
          </div>
          <div className="stat-label">Collected</div>
          <div className="stat-value" style={{ fontSize: isMobile ? '1.2rem' : undefined }}>
            {formatCurrency(collected)}
          </div>
        </div>
        <div className="stat-card pink">
          <div className="stat-icon pink">
            <Clock size={18} />
          </div>
          <div className="stat-label">Pending</div>
          <div
            className="stat-value"
            style={{ color: 'var(--accent2)', fontSize: isMobile ? '1.2rem' : undefined }}
          >
            {formatCurrency(pending)}
          </div>
        </div>
        <div
          className="stat-card"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="stat-icon" style={{ background: 'rgba(61,139,106,0.12)' }}>
            <DollarSign size={18} color="#3D8B6A" />
          </div>
          <div className="stat-label">Paid Orders</div>
          <div className="stat-value" style={{ fontSize: isMobile ? '1.2rem' : undefined }}>
            {paidCount}
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="card table-card">
        <div className="table-header">
          <h3>Payment History</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 4px 4px' }}>
          {payments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
              No payments yet
            </div>
          )}
          {payments.map((p) => (
            <div
              key={p.rawId}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {p.id} · {p.customer}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: statusBg[p.status],
                    color: statusColor[p.status],
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {p.status}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
                {p.date} · {p.method}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 2 }}>
                    Total
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {formatCurrency(p.total)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 2 }}>
                    Collected
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#3D8B6A' }}>
                    {formatCurrency(p.advance)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 2 }}>
                    Pending
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: p.pending > 0 ? 'var(--accent2)' : 'var(--text3)',
                    }}
                  >
                    {formatCurrency(p.pending)}
                  </div>
                </div>
              </div>
              {p.status !== 'paid' && (
                <button
                  className="btn btn-sm btn-primary"
                  style={{ marginTop: 4, width: '100%', justifyContent: 'center' }}
                  onClick={() => handleMarkPaid(p)}
                >
                  💰 Mark as Fully Paid
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function Analytics() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoverDay, setHoverDay] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'payments' ? 'payments' : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab); // 'overview' | 'payments'

  // Sync state to URL if it changes (optional but good practice)
  useEffect(() => {
    if (activeTab === 'payments') {
      setSearchParams({ tab: 'payments' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, setSearchParams]);

  useEffect(() => {
    if (!currentUser) return;

    const ordersUnsub = subscribeToOrders((newOrders) => {
      setOrders(newOrders || []);
      setLoading(false);
    }, currentUser.uid);

    const expensesUnsub = subscribeToExpenses((newExp) => {
      setExpenses(newExp || []);
    }, currentUser.uid);

    let bizUnsub = () => {};
    bizUnsub = subscribeToBusiness((biz) => setBusiness(biz), null, currentUser.uid);

    return () => {
      ordersUnsub();
      expensesUnsub();
      bizUnsub();
    };
  }, [currentUser]);

  // --- Calculations ---
  const committedOrders = useMemo(
    () =>
      orders.filter((o) => {
        const status = String(o.status || '').toLowerCase();
        return status !== 'inquiry' && status !== 'cancelled';
      }),
    [orders]
  );

  const totalRevenue = useMemo(() => calculateTotalRevenue(committedOrders), [committedOrders]);
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses]
  );
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown = { Cash: 0, UPI: 0, Card: 0, Online: 0, Other: 0 };
    committedOrders.forEach((o) => {
      const method = o.paymentMethod || '';
      const amount = calculateCollectedForOrder(o) || Number(o.total || 0);
      if (method === 'Cash') breakdown.Cash += amount;
      else if (method === 'UPI') breakdown.UPI += amount;
      else if (method === 'Card') breakdown.Card += amount;
      else if (method === 'Online') breakdown.Online += amount;
      else breakdown.Other += amount;
    });
    return breakdown;
  }, [committedOrders]);

  // Top Products Logic
  const topProducts = useMemo(() => {
    const counts = {};
    committedOrders.forEach((o) => {
      const p = o.product || o.cakeFlavour || 'Custom';
      counts[p] = (counts[p] || 0) + Number(o.total || 0);
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [committedOrders]);

  const last7Days = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dStr = d.toISOString().split('T')[0];
      const dayOrders = committedOrders.filter(
        (o) => (o.deliveryDate || o.date || o.createdAt?.split('T')[0]) === dStr
      );
      const amount = dayOrders.reduce((sum, o) => sum + (Number(o.total || o.totalAmount) || 0), 0);
      return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), amount, date: dStr };
    });
  }, [committedOrders]);

  const maxRev = Math.max(...last7Days.map((d) => d.amount), 1);

  // Build an all-time report object for the PDF (reuses the same shape as
  // the auto weekly/monthly report so it renders in ReportPdfTemplate).
  const handleDownloadPdf = async () => {
    if (downloading) return;
    triggerHaptic('light');
    setDownloading(true);
    showToast('Preparing analytics PDF…', 'info');
    try {
      const dayCounts = {};
      committedOrders.forEach((o) => {
        const d = new Date(o.deliveryDate || o.date || o.createdAt);
        if (Number.isNaN(d.getTime())) return;
        const key = d.toLocaleDateString('en-IN', { weekday: 'long' });
        dayCounts[key] = (dayCounts[key] || 0) + 1;
      });
      const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0] || null;

      const custSet = new Set();
      committedOrders.forEach((o) => {
        const n =
          (typeof o.customer === 'object' ? o.customer?.name : o.customer) ||
          o.customerName ||
          o.phone;
        if (n) custSet.add(String(n).toLowerCase().trim());
      });

      const expenseBreakdown = Array.from(new Set(expenses.map((e) => e.category)))
        .filter(Boolean)
        .map((cat) => [
          cat,
          expenses.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount || 0), 0),
        ])
        .sort((a, b) => b[1] - a[1]);

      const report = {
        type: 'analytics',
        periodLabel: 'All-time summary',
        orderCount: committedOrders.length,
        revenue: totalRevenue,
        collected: committedOrders.reduce((s, o) => s + calculateCollectedForOrder(o), 0),
        pending: 0,
        expenseTotal: totalExpenses,
        netProfit,
        margin: Number(margin) || 0,
        avgOrderValue: committedOrders.length
          ? Math.round(totalRevenue / committedOrders.length)
          : 0,
        topProduct: topProducts[0] || null,
        topProducts,
        expenseBreakdown,
        busiestDay,
        newCustomers: custSet.size,
        isEmpty: committedOrders.length === 0 && expenses.length === 0,
      };

      const name = await downloadReportPdf(report, business || {});
      showToast(`Saved: ${name}`, 'success');
    } catch (e) {
      console.error('Analytics PDF error:', e);
      showToast('Could not generate PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading)
    return (
      <div style={{ padding: 20 }}>
        <Skeleton height={40} width={250} style={{ marginBottom: 32 }} />
        <div className="stats-grid">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height={140} radius={20} />
          ))}
        </div>
      </div>
    );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--accent)',
                marginBottom: 8,
              }}
            >
              <Zap size={18} fill="var(--accent)" />
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Business Intelligence
              </span>
            </div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.04em' }}>
              Performance Hub
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: '1rem' }}>
              Data-driven insights for your bakery
            </p>
          </div>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 18px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent) 0%, #C87A82 100%)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: downloading ? 'wait' : 'pointer',
              opacity: downloading ? 0.6 : 1,
              boxShadow: '0 8px 20px rgba(181,96,106,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
              flexShrink: 0,
            }}
          >
            <Download size={17} /> {downloading ? 'Saving…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* ═══ Tab Switcher ═══ */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          background: 'var(--bg)',
          borderRadius: 14,
          padding: 4,
          border: '1px solid var(--border)',
        }}
      >
        {[
          { id: 'overview', label: 'Overview', icon: <BarChart3 size={15} /> },
          { id: 'payments', label: 'Payments', icon: <CreditCard size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              triggerHaptic('light');
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 11,
              border: 'none',
              background: activeTab === tab.id ? 'var(--card)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text2)',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: activeTab === tab.id ? 'var(--shadow-xs)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Main Stats */}
          <div className="stats-grid" style={{ marginBottom: 32 }}>
            <div className="stat-card green">
              <div className="stat-icon green">
                <TrendingUp size={20} />
              </div>
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">{formatCurrency(totalRevenue)}</div>
              <div className="stat-change" style={{ color: '#2E7A5A' }}>
                {committedOrders.length} confirmed orders
              </div>
            </div>
            <div className="stat-card pink">
              <div className="stat-icon pink">
                <TrendingDown size={20} />
              </div>
              <div className="stat-label">Expenses</div>
              <div className="stat-value">{formatCurrency(totalExpenses)}</div>
              <div className="stat-change" style={{ color: '#B04040' }}>
                {expenses.length} records
              </div>
            </div>
            <div className="stat-card orange">
              <div className="stat-icon orange">
                <Award size={20} />
              </div>
              <div className="stat-label">Net Profit</div>
              <div className="stat-value">{formatCurrency(netProfit)}</div>
              <div className="stat-change" style={{ fontWeight: 800 }}>
                {margin}% Profit Margin
              </div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon purple">
                <Target size={20} />
              </div>
              <div className="stat-label">Efficiency Score</div>
              <div className="stat-value">
                {Math.min(100, Math.round((netProfit / (totalExpenses || 1)) * 50))}%
              </div>
              <div className="stat-change">Profit vs Expense ratio</div>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h3
              style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 14, color: 'var(--text)' }}
            >
              💳 Earnings by Payment Method
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 10,
              }}
            >
              {[
                { label: 'Cash', amount: paymentBreakdown.Cash, emoji: '💵', color: '#2E7A5A' },
                { label: 'UPI', amount: paymentBreakdown.UPI, emoji: '📱', color: '#6366F1' },
                { label: 'Card', amount: paymentBreakdown.Card, emoji: '💳', color: '#F59E0B' },
                { label: 'Online', amount: paymentBreakdown.Online, emoji: '🌐', color: '#3B82F6' },
                { label: 'Other', amount: paymentBreakdown.Other, emoji: '📋', color: '#8C7A6B' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '14px 12px',
                    borderRadius: 14,
                    background: `${item.color}08`,
                    border: `1px solid ${item.color}18`,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{item.emoji}</div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {item.label}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: item.color, marginTop: 4 }}>
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="content-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
            {/* Revenue Chart */}
            <div className="card" style={{ padding: '32px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 32,
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Revenue Trends</h3>
                  <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>
                    Earnings over the last 7 days
                  </p>
                </div>
                <div className="badge confirmed" style={{ fontSize: '0.75rem' }}>
                  Weekly
                </div>
              </div>

              {totalRevenue === 0 ? (
                <EmptyState
                  icon="📊"
                  title="No revenue recorded"
                  subtitle="Charts will appear here once you fulfill orders."
                />
              ) : (
                <div
                  style={{
                    height: 300,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 14,
                    position: 'relative',
                  }}
                >
                  {last7Days.map((day, i) => (
                    <div
                      key={day.day}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 12,
                        height: '100%',
                      }}
                      onMouseEnter={() => {
                        setHoverDay(day);
                        triggerHaptic('light');
                      }}
                      onMouseLeave={() => setHoverDay(null)}
                    >
                      <div
                        style={{
                          flex: 1,
                          width: '100%',
                          display: 'flex',
                          alignItems: 'flex-end',
                          position: 'relative',
                        }}
                      >
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(day.amount / maxRev) * 100 || 5}%` }}
                          transition={{
                            type: 'spring',
                            damping: 20,
                            stiffness: 100,
                            delay: i * 0.05,
                          }}
                          style={{
                            width: '100%',
                            background:
                              i === 6
                                ? 'linear-gradient(to top, var(--accent), #8A3D4A)'
                                : 'linear-gradient(to top, var(--accent-lt), var(--cream))',
                            borderRadius: '10px 10px 4px 4px',
                            boxShadow: i === 6 ? '0 4px 12px rgba(181,96,106,0.3)' : 'none',
                          }}
                        />
                        <AnimatePresence>
                          {hoverDay?.date === day.date && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: -40 }}
                              exit={{ opacity: 0 }}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'var(--text)',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: 8,
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                zIndex: 10,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatCurrency(day.amount)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text3)',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}
                      >
                        {day.day}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Products */}
            <div className="card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 24 }}>
                Top Performance
              </h3>
              {topProducts.length === 0 ? (
                <EmptyState
                  icon="🍰"
                  title="No sales data"
                  subtitle="Best selling products will appear here."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {topProducts.map(([name, val], i) => (
                    <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: 'var(--cream)',
                              color: 'var(--accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            {i + 1}
                          </div>
                          <span
                            style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}
                          >
                            {name}
                          </span>
                        </div>
                        <span
                          style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' }}
                        >
                          {formatCurrency(val)}
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: 8,
                          background: 'var(--bg2)',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(val / topProducts[0][1]) * 100}%` }}
                          transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                          style={{ height: '100%', background: 'var(--accent)', borderRadius: 4 }}
                        />
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: 12,
                      padding: 16,
                      background: 'rgba(181,96,106,0.05)',
                      borderRadius: 16,
                      border: '1px dashed var(--accent-lt)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: 'var(--accent)',
                        marginBottom: 4,
                      }}
                    >
                      <Star size={14} fill="var(--accent)" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>BEST SELLER</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>{topProducts[0][0]}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
                      Generates {Math.round((topProducts[0][1] / (totalRevenue || 1)) * 100)}% of
                      your revenue.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="card" style={{ marginTop: 24, padding: 32 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 24 }}>
              Expense Optimization
            </h3>
            {expenses.length === 0 ? (
              <EmptyState
                icon="💸"
                title="No expense records"
                subtitle="Categorize your spending to optimize margins."
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 20,
                }}
              >
                {Array.from(new Set(expenses.map((e) => e.category)))
                  .filter(Boolean)
                  .map((cat) => {
                    const catTotal = expenses
                      .filter((e) => e.category === cat)
                      .reduce((s, e) => s + Number(e.amount), 0);
                    if (catTotal === 0) return null;
                    const perc = Math.round((catTotal / totalExpenses) * 100);
                    return (
                      <div
                        key={cat}
                        className="card"
                        style={{
                          background: 'var(--bg2)',
                          border: '1px solid var(--border)',
                          padding: 20,
                        }}
                      >
                        <div
                          style={{
                            color: 'var(--text3)',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            marginBottom: 8,
                          }}
                        >
                          {cat}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                          {formatCurrency(catTotal)}
                        </div>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: 4,
                              background: 'var(--border)',
                              borderRadius: 2,
                            }}
                          >
                            <div
                              style={{
                                width: `${perc}%`,
                                height: '100%',
                                background: 'var(--accent)',
                                borderRadius: 2,
                              }}
                            />
                          </div>
                          <span
                            style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)' }}
                          >
                            {perc}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
          {/* Close the overview tab */}
        </>
      )}

      {/* ═══ PAYMENTS TAB ═══ */}
      {activeTab === 'payments' && (
        <PaymentsSection orders={orders} committedOrders={committedOrders} />
      )}

      <AnimatedDemo
        moduleId="analytics"
        title="Understand Your Business"
        scenes={analyticsDemoScenes}
      />
    </motion.div>
  );
}
