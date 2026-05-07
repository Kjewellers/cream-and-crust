import React from 'react';
import { BarChart3, TrendingUp, Award, CalendarDays, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubscription } from '../context/SubscriptionContext';

export default function Analytics() {
  const { isPro } = useSubscription();

  return (
    <motion.div className="fade-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'relative' }}>
      <div className="page-header">
        <h1>Analytics & Insights</h1>
        <p>Understand your business performance and growth</p>
      </div>



      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon green"><TrendingUp size={20} /></div>
          <div className="stat-label">Monthly Revenue</div>
          <div className="stat-value">₹1,45,200</div>
          <div className="stat-change" style={{ color: '#3D8B6A' }}>+12% vs last month</div>
        </div>
        <div className="stat-card pink">
          <div className="stat-icon pink"><Award size={20} /></div>
          <div className="stat-label">Best Seller</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>Choco Truffle</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>32 orders this month</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><BarChart3 size={20} /></div>
          <div className="stat-label">Avg Order Value</div>
          <div className="stat-value">₹1,850</div>
          <div className="stat-change" style={{ color: '#3D8B6A' }}>+₹150 vs last month</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple"><CalendarDays size={20} /></div>
          <div className="stat-label">Peak Order Day</div>
          <div className="stat-value">Friday</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>Most deliveries on Sat</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Revenue Trend (Last 6 Months)</h3>
          <div style={{ height: 250, display: 'flex', alignItems: 'flex-end', gap: 16, padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
            {[40, 60, 45, 80, 65, 100].map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: '100%', background: i === 5 ? 'var(--accent)' : 'var(--cream)', height: `${h}%`, borderRadius: '4px 4px 0 0', transition: 'var(--transition)' }} className="hover-effect" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>{['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Customer Demographics</h3>
          <div style={{ padding: 16, background: 'var(--cream)', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>New Customers</span>
              <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>65%</span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'white', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: '65%', height: '100%', background: 'var(--accent2)' }} />
            </div>
          </div>
          
          <div style={{ padding: 16, background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Repeat Customers</span>
              <span style={{ fontWeight: 700, color: '#3D8B6A' }}>35%</span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'white', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: '35%', height: '100%', background: '#3D8B6A' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 8 }}>Goal: Increase repeat rate to 45%</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
