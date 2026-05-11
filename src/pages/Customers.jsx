import React, { useState, useEffect } from 'react';
import { Search, Phone, MessageCircle, Star, Users, Clock, RefreshCw } from 'lucide-react';
import { subscribeToCustomers, subscribeToOrders } from '../services/db';
import { formatDate, formatCurrency } from '../utils/date';
import { Skeleton } from '../components/iOS';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let custLoaded = false;
    let ordersLoaded = false;
    const checkDone = () => { if (custLoaded && ordersLoaded) setLoading(false); };

    const unsubCust = subscribeToCustomers((data) => {
      setCustomers(data || []);
      custLoaded = true;
      checkDone();
    });
    const unsubOrders = subscribeToOrders((data) => {
      setOrders(data || []);
      ordersLoaded = true;
      checkDone();
    });
    return () => { unsubCust(); unsubOrders(); };
  }, []);

  // Build per-customer stats from real orders
  const customerStats = React.useMemo(() => {
    const stats = {};
    orders.forEach(o => {
      // Match by customer name (encrypted data is already decrypted at this point)
      const cName = typeof o.customer === 'object'
        ? (o.customer?.name || '')
        : (o.customerName || o.customer || '');
      const phone = o.phone || '';

      // Try to find matching customer by name or phone
      const matchedCust = customers.find(c =>
        (c.name && cName && c.name.toLowerCase() === cName.toLowerCase()) ||
        (c.phone && phone && c.phone === phone)
      );
      const key = matchedCust?.id || cName;
      if (!key) return;

      if (!stats[key]) stats[key] = { totalOrders: 0, totalSpent: 0, lastOrderDate: null };
      stats[key].totalOrders += 1;
      const amt = Number(o.total || o.totalAmount || 0);
      stats[key].totalSpent += amt;

      // Track most recent delivery date
      const dDate = o.deliveryDate || o.date || o.createdAt;
      if (dDate) {
        const d = new Date(typeof dDate === 'object' && dDate.seconds ? dDate.seconds * 1000 : dDate);
        if (!isNaN(d.getTime())) {
          if (!stats[key].lastOrderDate || d > new Date(stats[key].lastOrderDate)) {
            stats[key].lastOrderDate = d.toISOString();
          }
        }
      }
    });
    return stats;
  }, [orders, customers]);

  if (loading) return (
    <div style={{ padding: 20 }}>
      <div className="page-header">
        <Skeleton height={40} width={300} radius={8} />
        <Skeleton height={20} width={200} radius={4} style={{ marginTop: 8 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
        {[...Array(2)].map((_, i) => <Skeleton key={i} height={100} radius={12} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {[...Array(3)].map((_, i) => <Skeleton key={i} height={120} radius={12} />)}
      </div>
    </div>
  );

  const enriched = customers.map(c => {
    const st = customerStats[c.id] || {};
    const totalOrders = st.totalOrders || c.totalOrders || 0;
    const totalSpent = st.totalSpent || c.totalSpent || 0;
    const lastOrderDate = st.lastOrderDate || c.lastOrder || null;
    const isVIP = totalOrders >= 3;
    return { ...c, totalOrders, totalSpent, lastOrderDate, isVIP };
  });

  const filtered = enriched.filter(c => {
    const name = c.name || '';
    return name.toLowerCase().includes(search.toLowerCase()) ||
           (c.phone || '').includes(search) ||
           (c.instagram || '').toLowerCase().includes(search.toLowerCase());
  });

  const vipCount = enriched.filter(c => c.isVIP).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Customers</h1>
        <p>Manage your repeat customers and baking leads</p>
      </div>

      {/* Stats — 2 cards (removed Birthdays) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: isMobile ? 10 : 16,
        marginBottom: 20
      }}>
        <div className="stat-card pink">
          <div className="stat-icon pink"><Star size={18} /></div>
          <div className="stat-label">VIP Customers</div>
          <div className="stat-value" style={{ fontSize: isMobile ? '1.3rem' : undefined }}>{vipCount}</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>3+ orders</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><Users size={18} /></div>
          <div className="stat-label">Total Customers</div>
          <div className="stat-value" style={{ fontSize: isMobile ? '1.3rem' : undefined }}>{customers.length}</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>In database</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        <input
          placeholder="Search by name, phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', paddingLeft: 44, padding: '10px 16px 10px 44px', boxSizing: 'border-box' }}
        />
      </div>

      {/* Customer List */}
      {isMobile ? (
        /* ── MOBILE: cards ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>No customers found</div>
          )}
          {filtered.map(c => (
            <div key={c.id} style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '14px 16px',
              boxShadow: 'var(--shadow)'
            }}>
              {/* Name + VIP row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
                  }}>
                    {(c.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name || 'Unknown'}</div>
                    {c.phone && <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>📞 {c.phone}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {c.isVIP && (
                    <span style={{
                      background: '#FEF9EC', color: '#E5A823', border: '1px solid #F0D68E',
                      fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      textTransform: 'uppercase'
                    }}>⭐ VIP</span>
                  )}
                  <RefreshCw size={14} color="var(--text3)" />
                </div>
              </div>

              {/* Order stats */}
              <div style={{ fontSize: '0.82rem', color: 'var(--text2)', marginBottom: 10 }}>
                <span style={{ fontWeight: 600 }}>{c.totalOrders} order{c.totalOrders !== 1 ? 's' : ''}</span>
                {' · '}
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(c.totalSpent)}</span>
                {' lifetime'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                <Clock size={12} />
                Last: {c.lastOrderDate ? formatDate(c.lastOrderDate) : 'No orders yet'}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    style={{
                      flex: 1, padding: '8px 0', textAlign: 'center',
                      borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)',
                      color: 'var(--text2)', fontSize: '0.8rem', fontWeight: 600,
                      textDecoration: 'none', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 6
                    }}
                  >
                    <Phone size={14} /> Call
                  </a>
                )}
                {c.phone && (
                  <a
                    href={`https://wa.me/91${c.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1, padding: '8px 0', textAlign: 'center',
                      borderRadius: 8, background: '#E8FBF0', border: '1px solid #A8D8C8',
                      color: '#2E7A5A', fontSize: '0.8rem', fontWeight: 600,
                      textDecoration: 'none', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 6
                    }}
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── DESKTOP: table ── */
        <div className="card table-card">
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: 700 }}>
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
                        {c.name}
                        {c.isVIP && <Star size={14} color="#E5A823" fill="#E5A823" title="VIP" />}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>{c.phone}</div>
                      {c.instagram && <div style={{ fontSize: '0.8rem', color: '#E1306C' }}>@{c.instagram}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.totalOrders} orders <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({formatCurrency(c.totalSpent)})</span></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Clock size={12} /> {c.lastOrderDate ? formatDate(c.lastOrderDate) : 'No orders yet'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {c.isVIP && <span style={{ background: 'var(--cream)', color: 'var(--accent2)', border: '1px solid var(--accent2)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>VIP</span>}
                        {(c.tags || []).filter(t => t !== 'VIP').map(tag => (
                          <span key={tag} style={{ background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {c.phone && <a href={`tel:${c.phone}`} className="btn-icon" title="Call"><Phone size={16} /></a>}
                        {c.phone && <a href={`https://wa.me/91${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="btn-icon" title="WhatsApp"><MessageCircle size={16} /></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
