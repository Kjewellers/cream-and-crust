import React, { useState, useEffect } from 'react';
import { Search, Instagram, Gift, Star, Clock, MoreVertical, MessageCircle, Loader2, Users } from 'lucide-react';
import { subscribeToCustomers } from '../services/db';
import { formatDate } from '../utils/date';
import { Skeleton } from '../components/iOS';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToCustomers((newCustomers) => {
      setCustomers(newCustomers || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ padding: 20 }}>
      <div className="page-header">
        <Skeleton height={40} width={300} radius={8} />
        <Skeleton height={20} width={200} radius={4} style={{ marginTop: 8 }} />
      </div>
      <div className="stats-grid" style={{ marginTop: 24 }}>
        {[...Array(3)].map((_, i) => <Skeleton key={i} height={120} radius={12} />)}
      </div>
    </div>
  );

  const filtered = customers.filter(c => {
    const name = c.name || '';
    const instagram = c.instagram || '';
    const tags = c.tags || [];
    return name.toLowerCase().includes(search.toLowerCase()) || 
           instagram.toLowerCase().includes(search.toLowerCase()) ||
           tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
  });

  const vipCount = customers.filter(c => (c.totalOrders || 0) >= 5).length;
  const birthdayCount = customers.filter(c => {
    if (!c.birthday) return false;
    // Simple check if birthday matches current month
    const currentMonth = new Date().toLocaleString('default', { month: 'short' });
    return String(c.birthday).includes(currentMonth);
  }).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Customer Database & CRM</h1>
        <p>Manage your repeat customers and baking leads</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card pink">
          <div className="stat-icon pink"><Star size={20} /></div>
          <div className="stat-label">VIP Customers</div>
          <div className="stat-value">{vipCount}</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>Ordered &gt; 5 times</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><Users size={20} /></div>
          <div className="stat-label">Total Customers</div>
          <div className="stat-value">{customers.length}</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>In your database</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple"><Gift size={20} /></div>
          <div className="stat-label">Upcoming Birthdays</div>
          <div className="stat-value">{birthdayCount}</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>Matches current month</div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-header">
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: 11, color: 'var(--text3)' }} />
            <input placeholder="Search by name, handle, or tag..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: 40, padding: '10px 16px 10px 40px' }} />
          </div>
        </div>
        <div className="table-responsive">
          <table style={{ width: '100%', minWidth: 800 }}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Order History</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.name} {c.birthday && <Gift size={14} color="var(--accent2)" title={`Birthday: ${c.birthday}`} />}
                    </div>
                  </td>
                  <td>
                    {c.instagram && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#E1306C', fontWeight: 500 }}>
                        <Instagram size={14} /> @{c.instagram}
                      </div>
                    )}
                    <div style={{ fontSize: '0.85rem', color: 'var(--text2)', marginTop: c.instagram ? 4 : 0 }}>{c.phone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.totalOrders || 0} orders <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(₹{(c.totalSpent || 0).toLocaleString()})</span></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Clock size={12} /> Last Order: {formatDate(c.lastOrder)}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(c.tags || []).map(tag => (
                        <span key={tag} style={{ background: tag === 'VIP' ? 'var(--cream)' : 'var(--bg)', color: tag === 'VIP' ? 'var(--accent2)' : 'var(--text2)', border: tag === 'VIP' ? '1px solid var(--accent2)' : '1px solid var(--border)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-icon" title="WhatsApp Message"><MessageCircle size={16} /></button>
                      <button className="btn-icon" title="Instagram DM"><Instagram size={16} /></button>
                      <button className="btn-icon"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
