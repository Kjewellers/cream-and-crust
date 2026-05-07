import React from 'react';
import { CreditCard, Download, CheckCircle, Clock } from 'lucide-react';

const payments = [
  { id: 'CC-042', customer: 'Priya Sharma', total: 2200, advance: 1000, method: 'UPI', date: '06 May, 2026', status: 'partial' },
  { id: 'CC-041', customer: 'Rahul Mehta', total: 1800, advance: 1800, method: 'Card', date: '06 May, 2026', status: 'paid' },
  { id: 'CC-040', customer: 'Sneha Patel', total: 3500, advance: 0, method: '-', date: '07 May, 2026', status: 'pending' },
  { id: 'CC-039', customer: 'Anita Desai', total: 1200, advance: 600, method: 'UPI', date: '07 May, 2026', status: 'partial' },
  { id: 'CC-038', customer: 'Vikram Singh', total: 1700, advance: 1700, method: 'Cash', date: '05 May, 2026', status: 'paid' },
];

export default function Payments() {
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
          <div className="stat-value">₹{totalRevenue.toLocaleString()}</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>This Week</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><CheckCircle size={20} /></div>
          <div className="stat-label">Collected</div>
          <div className="stat-value">₹{collected.toLocaleString()}</div>
        </div>
        <div className="stat-card pink">
          <div className="stat-icon pink"><Clock size={20} /></div>
          <div className="stat-label">Pending Balances</div>
          <div className="stat-value" style={{ color: 'var(--accent2)' }}>₹{pending.toLocaleString()}</div>
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
                  <td style={{ fontWeight: 600 }}>₹{p.total}</td>
                  <td style={{ color: '#3D8B6A', fontWeight: 600 }}>₹{p.advance}</td>
                  <td style={{ color: p.total - p.advance > 0 ? 'var(--accent2)' : 'var(--text3)', fontWeight: 600 }}>
                    ₹{p.total - p.advance}
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
