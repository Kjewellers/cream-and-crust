import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Users, MessageSquare, Instagram, 
  ArrowUpRight, ArrowDownRight, Globe, MousePointer2 
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    style={{ 
      background: 'white', 
      padding: 24, 
      borderRadius: 24, 
      boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
      border: '1px solid #F1F5F9',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ 
        width: 48, 
        height: 48, 
        borderRadius: 14, 
        background: `${color}15`, 
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={24} />
      </div>
        {trend !== 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4, 
            fontSize: '0.8rem', 
            fontWeight: 700,
            color: trend >= 0 ? '#10B981' : '#EF4444',
            background: trend >= 0 ? '#10B98115' : '#EF444415',
            padding: '4px 8px',
            borderRadius: 8
          }}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
    </div>
    <div>
      <div style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#0F172A', marginTop: 4 }}>{value}</div>
    </div>
  </motion.div>
);

export default function PortfolioAnalytics() {
  const stats = [
    { title: 'Total Visitors', value: '--', icon: Users, trend: 0, color: '#2563EB' },
    { title: 'WhatsApp Leads', value: '--', icon: MessageSquare, trend: 0, color: '#10B981' },
    { title: 'Product Clicks', value: '--', icon: MousePointer2, trend: 0, color: '#F59E0B' },
    { title: 'Insta Visits', value: '--', icon: Instagram, trend: 0, color: '#EC4899' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ background: '#EFF6FF', padding: '16px 24px', borderRadius: 20, color: '#1E40AF', fontSize: '0.9rem', fontWeight: 700, border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Globe size={18} />
        <span>Analytics tracking coming soon! We are currently setting up secure data streams for your portfolio.</span>
      </div>

      <div className="portfolio-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, width: '100%' }}>
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div style={{ 
        background: 'white', 
        padding: 32, 
        borderRadius: 32, 
        border: '1px solid #F1F5F9',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
        opacity: 0.6,
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 950 }}>Visitor Traffic</h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Real-time performance tracking is being initialized.</p>
          </div>
        </div>

        {/* Mock Chart Area - Blurred/Placeholder */}
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: 24, border: '2px dashed #E2E8F0' }}>
           <div style={{ textAlign: 'center', color: '#94A3B8' }}>
              <TrendingUp size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <div style={{ fontWeight: 800 }}>Charts will appear here once tracking starts</div>
           </div>
        </div>
      </div>
    </div>
  );
}
