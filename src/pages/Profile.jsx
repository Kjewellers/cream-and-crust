import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Shield, LogOut, Camera, Star, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToOrders, subscribeToBusiness, updateBusinessInDB } from '../services/db';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useState, useEffect } from 'react';
import { showToast } from '../components/iOS';

export default function Profile() {
  const { currentUser, userRole, logout } = useAuth();
  const [orderCount, setOrderCount] = useState(0);
  const [business, setBusiness] = useState({ name: 'Cream & Crust', logo: '🧁', id: null });
  const [editingName, setEditingName] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [newName, setNewName] = useState('');
  const [userDoc, setUserDoc] = useState({ name: '', phone: '', address: 'India' });

  useEffect(() => {
    if (!currentUser) return;

    // Fetch user details
    const fetchUser = async () => {
      try {
        const uDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (uDoc.exists()) {
          setUserDoc({
            name: uDoc.data().name || currentUser.displayName || 'Customer',
            phone: uDoc.data().phone || currentUser.phoneNumber || '',
            address: uDoc.data().address || 'India'
          });
        }
      } catch(e) { console.error(e); }
    };
    fetchUser();

    const userIdFilter = userRole === 'customer' ? currentUser?.uid : null;
    const unsubOrders = subscribeToOrders((orders) => {
      setOrderCount(orders.length);
    }, userIdFilter);
    
    let unsubBiz = () => {};
    if (userRole !== 'customer') {
      unsubBiz = subscribeToBusiness((biz) => {
        setBusiness(biz);
        setNewName(biz.name);
      });
    }
    
    return () => {
      unsubOrders();
      unsubBiz();
    };
  }, [userRole, currentUser]);

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      if (userRole === 'customer') {
        // Update customer name in users collection
        await updateDoc(doc(db, "users", currentUser.uid), { name: newName });
        setUserDoc(prev => ({ ...prev, name: newName }));
        showToast('Profile name updated!', 'success');
      } else {
        // Update business name
        if (business.id) {
          await updateBusinessInDB(business.id, { name: newName });
        }
        showToast('Bakery name updated!', 'success');
      }
      setEditingName(false);
    } catch (e) {
      showToast('Failed to update name', 'error');
    }
  };

  const handleUpdateDetails = async () => {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        phone: userDoc.phone,
        address: userDoc.address
      });
      setEditingDetails(false);
      showToast('Profile details updated!', 'success');
    } catch (e) {
      showToast('Failed to update details', 'error');
    }
  };

  const userStats = [
    { label: 'Total Orders', value: orderCount.toString(), icon: Star, color: '#ffcc00' },
    { label: 'Account Type', value: userRole === 'customer' ? 'Customer' : 'Business', icon: Shield, color: 'var(--accent)' },
    { label: 'Joined', value: currentUser?.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recently', icon: Calendar, color: '#3498db' },
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
              {userRole === 'customer' ? (currentUser?.displayName?.[0]?.toUpperCase() || '👤') : (business.logo || '🧁')}
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

          {editingName ? (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
              <input 
                value={userRole === 'customer' ? (newName || userDoc.name) : newName} 
                onChange={e => setNewName(e.target.value)} 
                style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, width: '70%' }} 
              />
              <button className="btn btn-sm btn-primary" onClick={handleUpdateName}>Save</button>
            </div>
          ) : (
            <h2 style={{ marginBottom: 5, cursor: 'pointer' }} onClick={() => { 
              setNewName(userRole === 'customer' ? userDoc.name : business.name);
              setEditingName(true); 
            }}>
              {userRole === 'customer' ? userDoc.name : business.name} 
              <Edit2 size={16} style={{ verticalAlign: 'middle', opacity: 0.5, marginLeft: 6 }} />
            </h2>
          )}
          <div className={`badge ${userRole === 'admin' ? 'confirmed' : 'pending'}`} style={{ marginBottom: 20 }}>
            {userRole?.toUpperCase()}
          </div>

          <div style={{ textAlign: 'left', marginTop: 30, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h4 style={{ margin: 0, color: 'var(--text2)' }}>Contact Info</h4>
              {!editingDetails ? (
                <button className="btn-icon" onClick={() => setEditingDetails(true)}><Edit2 size={14} /></button>
              ) : (
                <button className="btn btn-sm btn-primary" onClick={handleUpdateDetails}>Save</button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15, color: 'var(--text2)' }}>
              <Mail size={18} /> <span>{currentUser?.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15, color: 'var(--text2)' }}>
              <Phone size={18} /> 
              {editingDetails ? (
                <input value={userDoc.phone} onChange={e => setUserDoc({...userDoc, phone: e.target.value})} placeholder="Phone number" style={{ padding: '4px 8px', width: '100%' }} />
              ) : (
                <span>{userDoc.phone || 'Add phone number'}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15, color: 'var(--text2)' }}>
              <MapPin size={18} />
              {editingDetails ? (
                <input value={userDoc.address} onChange={e => setUserDoc({...userDoc, address: e.target.value})} placeholder="Address" style={{ padding: '4px 8px', width: '100%' }} />
              ) : (
                <span>{userDoc.address}</span>
              )}
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
                  <div style={{ fontWeight: 600 }}>Order Alerts</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>Get browser notifications for new orders</div>
                </div>
                <input type="checkbox" defaultChecked />
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

          <div className="card" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: 'white', marginBottom: 10 }}>
                  {userRole === 'customer' ? 'Cream & Crust — Customer Portal' : 'Cream & Crust — Bakery Manager'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>
                  {userRole === 'customer' ? 'Manage your delicious orders.' : 'The ultimate tool for home bakers in India.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
