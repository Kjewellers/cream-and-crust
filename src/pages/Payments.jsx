import React, { useState, useEffect } from 'react';
import { CreditCard, Download, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { subscribeToOrders } from '../services/db';
import { formatDate, formatCurrency, formatOrderNumber } from '../utils/date';
import { Skeleton } from '../components/iOS';

export default function Payments() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((newOrders) => {
      setOrders(newOrders || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ padding: 20 }}>
      <div className="page-header">
        <Skeleton height={40} width={200} radius={8} />
        <Skeleton height={20} width={300} radius={4} style={{ marginTop: 8 }} />
      </div>
      <div className="stats-grid" style={{ marginTop: 24 }}>
        {[...Array(3)].map((_, i) => <Skeleton key={i} height={120} radius={12} />)}
      </div>
    </div>
  );

  const payments = orders.map(o => {
    const totalVal = o.total || o.totalAmount || 0;
    const totalNum = Number(totalVal);
    const advVal = o.advance || 0;
    const advNum = Number(advVal);
    const cName = typeof o.customer === 'object' ? (o.customer?.name || 'Customer') : (o.customerName || o.customer || 'Customer');

    return {
      id: formatOrderNumber(o, orders),
      customer: cName,
      total: totalNum,
      advance: advNum,
      method: o.paymentMethod || 'UPI',
      date: formatDate(o.date || o.createdAt),
      status: advNum >= totalNum ? 'paid' : advNum > 0 ? 'partial' : 'pending'
    };
  });

  const totalRevenue = payments.reduce((acc, p) => acc + p.total, 0);
  const collected = payments.reduce((acc, p) => acc + p.advance, 0);
  const pending = totalRevenue - collected;

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div><h1>Payments</h1><p>Track advances, pending balances, and total revenue</p></div>
        <button className="btn btn-outline"><Download size={18} /> Export Report</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card orange">
          <div className="stat-label">Total Expected</div>
          <div className="stat-value">{formatCurrency(totalRevenue)}</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>From all orders</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><CheckCircle size={20} /></div>
          <div className="stat-label">Collected</div>
          <div className="stat-value">{formatCurrency(collected)}</div>
        </div>
        <div className="stat-card pink">
          <div className="stat-icon pink"><Clock size={20} /></div>
          <div className="stat-label">Pending Balances</div>
          <div className="stat-value" style={{ color: 'var(--accent2)' }}>{formatCurrency(pending)}</div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-header">
          <h3>Payment History</h3>
        </div>
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
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.id}</td>
                  <td>{p.customer}</td>
                  <td style={{ fontSize: '0.85rem' }}>{p.date}</td>
                  <td style={{ color: 'var(--text3)', fontWeight: 500 }}>{p.method}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(p.total)}</td>
                  <td style={{ color: '#3D8B6A', fontWeight: 600 }}>{formatCurrency(p.advance)}</td>
                  <td style={{ color: p.total - p.advance > 0 ? 'var(--accent2)' : 'var(--text3)', fontWeight: 600 }}>
                    {formatCurrency(p.total - p.advance)}
                  </td>
                  <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
