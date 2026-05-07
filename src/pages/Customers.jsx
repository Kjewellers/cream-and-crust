import React, { useState } from 'react';
import { Search, Instagram, Gift, Star, Clock, MoreVertical, MessageCircle } from 'lucide-react';

const initialCustomers = [
  { id: 'C-101', name: 'Priya Sharma', phone: '9876543210', instagram: 'priya.bakes', orders: 12, totalSpent: 24500, lastOrder: '2 days ago', tags: ['VIP', 'Chocolate Lover'], birthday: '12 Oct' },
  { id: 'C-102', name: 'Sneha Patel', phone: '9876543213', instagram: 'sneha.patel', orders: 1, totalSpent: 3500, lastOrder: 'Pending', tags: ['Hot Lead', 'Wedding'], birthday: '' },
  { id: 'C-103', name: 'Anita Desai', phone: '9876543212', instagram: 'anita_d', orders: 5, totalSpent: 8200, lastOrder: '1 month ago', tags: ['Repeat', 'Cookies'], birthday: '05 Mar' },
  { id: 'C-104', name: 'Rahul Mehta', phone: '9876543211', instagram: '', orders: 3, totalSpent: 5400, lastOrder: 'Today', tags: ['Corporate'], birthday: '22 Aug' },
  { id: 'C-105', name: 'Ayesha Khan', phone: '9876543215', instagram: 'ayesha.k', orders: 0, totalSpent: 0, lastOrder: 'Never', tags: ['Inquiry'], birthday: '' },
];

export default function Customers() {
  const [search, setSearch] = useState('');

  const filtered = initialCustomers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.instagram.toLowerCase().includes(search.toLowerCase()) ||
    c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Instagram Leads & CRM</h1>
        <p>Manage your customers, repeat orders, and hot leads</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card pink">
          <div className="stat-icon pink"><Star size={20} /></div>
          <div className="stat-label">VIP Customers</div>
          <div className="stat-value">24</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>Ordered &gt; 5 times</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><Instagram size={20} /></div>
          <div className="stat-label">IG Leads</div>
          <div className="stat-value">142</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>Converted: 68%</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple"><Gift size={20} /></div>
          <div className="stat-label">Upcoming Birthdays</div>
          <div className="stat-value">3</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>This month</div>
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>ID: {c.id}</div>
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
                    <div style={{ fontWeight: 600 }}>{c.orders} orders <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(₹{c.totalSpent.toLocaleString()})</span></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Clock size={12} /> Last: {c.lastOrder}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {c.tags.map(tag => (
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
