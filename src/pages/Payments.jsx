import React, { useState, useEffect } from 'react';
import { CreditCard, Download, CheckCircle, Clock, Loader2, DollarSign } from 'lucide-react';
import { subscribeToOrders, updateOrderFieldsInDB } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatCurrency, formatOrderNumber } from '../utils/date';
import {
  calculatePendingPayments,
  calculateTotalRevenue,
  calculateCollectedRevenue,
  calculateOrderBalance,
  calculateCollectedForOrder,
} from '../utils/finance';
import { Skeleton, StatSkeleton, showToast, triggerHaptic } from '../components/iOS';

export default function Payments() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { currentUser } = useAuth();

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return undefined;
    setLoading(true);
    const safety = setTimeout(() => setLoading(false), 8000);
    const unsubscribe = subscribeToOrders(
      (newOrders) => {
        clearTimeout(safety);
        setOrders(newOrders || []);
        setLoading(false);
      },
      uid,
      (err) => {
        clearTimeout(safety);
        console.error('Payments load error:', err);
        setLoading(false);
      }
    );
    return () => {
      clearTimeout(safety);
      unsubscribe && unsubscribe();
    };
  }, [currentUser]);

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

  if (loading)
    return (
      <div className="fade-in" style={{ padding: 20 }}>
        <div className="page-header">
          <Skeleton height={40} width={200} radius={8} />
          <Skeleton height={20} width={300} radius={4} style={{ marginTop: 8 }} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? 10 : 16,
            marginTop: 24,
          }}
        >
          {[...Array(4)].map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      </div>
    );

  const committedOrders = orders.filter((o) => {
    const status = String(o.status || '').toLowerCase();
    return status !== 'inquiry' && status !== 'cancelled';
  });

  const totalRevenue = calculateTotalRevenue(committedOrders);
  const collected = calculateCollectedRevenue(committedOrders);
  const { amount: pending } = calculatePendingPayments(committedOrders);
  const paidCount = committedOrders.filter((o) => calculateOrderBalance(o) === 0).length;

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
    <div className="fade-in">
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1>Payments</h1>
          <p>Track advances, pending balances, and total revenue</p>
        </div>
        {!isMobile && (
          <button className="btn btn-outline">
            <Download size={18} /> Export Report
          </button>
        )}
      </div>

      {/* Stat Cards — 2×2 on mobile, 1×3 on desktop */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: isMobile ? 10 : 16,
          marginBottom: 20,
        }}
      >
        <div className="stat-card orange">
          <div className="stat-label">Total Expected</div>
          <div className="stat-value" style={{ fontSize: isMobile ? '1.2rem' : undefined }}>
            {formatCurrency(totalRevenue)}
          </div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>
            All orders
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

        {isMobile ? (
          /* ── MOBILE: card list ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 4px 4px' }}>
            {payments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
                No payments yet
              </div>
            )}
            {payments.map((p) => (
              <div
                key={p.id}
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
                {/* Header row */}
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

                {/* Date & method */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
                  {p.date} · {p.method}
                </div>

                {/* Amounts */}
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

                {/* Mark as paid button */}
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
        ) : (
          /* ── DESKTOP: table ── */
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Total</th>
                  <th>Collected</th>
                  <th>Pending</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.id}</td>
                    <td>{p.customer}</td>
                    <td style={{ fontSize: '0.85rem' }}>{p.date}</td>
                    <td style={{ color: 'var(--text3)', fontWeight: 500 }}>{p.method}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.total)}</td>
                    <td style={{ color: '#3D8B6A', fontWeight: 600 }}>
                      {formatCurrency(p.advance)}
                    </td>
                    <td
                      style={{
                        color: p.pending > 0 ? 'var(--accent2)' : 'var(--text3)',
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(p.pending)}
                    </td>
                    <td>
                      <span className={`badge ${p.status}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
