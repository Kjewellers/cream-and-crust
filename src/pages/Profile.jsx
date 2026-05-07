import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Shield, LogOut, Camera, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';

export default function Profile() {
  const { currentUser, userRole, logout } = useAuth();
  const { subscription, isPro, daysRemaining } = useSubscription();

  const userStats = [
    { label: 'Orders Placed', value: '12', icon: Star, color: '#ffcc00' },
    { label: 'Membership', value: isPro ? 'Pro' : 'Trial', icon: Shield, color: 'var(--accent)' },
    { label: 'Member Since', value: new Date(currentUser?.metadata?.creationTime).toLocaleDateString(), icon: Calendar, color: '#3498db' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>User Profile</h1>
        <p>Manage your account settings and preferences.</p>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Left Column: Avatar & Basic Info */}
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 20px' }}>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              color: 'white',
              fontWeight: 700,
              boxShadow: '0 10px 25px rgba(214, 158, 140, 0.3)'
            }}>
              {currentUser?.email?.charAt(0).toUpperCase()}
            </div>
            <button style={{ 
              position: 'absolute', 
              bottom: 0, 
              right: 0, 
              padding: 8, 
              borderRadius: '50%', 
              background: 'white', 
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }} className="hover-effect">
              <Camera size={16} />
            </button>
          </div>

          <h2 style={{ marginBottom: 5 }}>{currentUser?.displayName || 'Bakery Owner'}</h2>
          <div className={`badge ${userRole === 'admin' ? 'confirmed' : 'pending'}`} style={{ marginBottom: 20 }}>
            {userRole?.toUpperCase()}
          </div>

          <div style={{ textAlign: 'left', marginTop: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15, color: 'var(--text2)' }}>
              <Mail size={18} /> <span>{currentUser?.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15, color: 'var(--text2)' }}>
              <Phone size={18} /> <span>+91 98765 43210</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15, color: 'var(--text2)' }}>
              <MapPin size={18} /> <span>Mumbai, India</span>
            </div>
          </div>

          <button className="btn btn-outline" onClick={logout} style={{ width: '100%', marginTop: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>

        {/* Right Column: Stats & Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {userStats.map((stat, i) => (
              <div key={i} className="stat-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <stat.icon size={20} style={{ color: stat.color }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Account Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Email Notifications</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>Receive daily order summaries</div>
                </div>
                <input type="checkbox" defaultChecked />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>SMS Alerts</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>Get notified on new orders</div>
                </div>
                <input type="checkbox" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Two-Factor Authentication</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>Secure your bakery account</div>
                </div>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Enable</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #2c3e50, #000000)', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: 'white', marginBottom: 10 }}>Current Plan: {isPro ? 'Bakery Pro' : 'Free Trial'}</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                  {isPro ? 'Enjoying all premium bakery features.' : `Your trial ends in ${daysRemaining} days.`}
                </p>
              </div>
              {!isPro && (
                <button className="btn btn-primary" onClick={() => window.location.href='/billing'}>Upgrade</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
