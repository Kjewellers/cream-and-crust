import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Shield, LogOut, Camera, Star, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToOrders, subscribeToBusiness, updateBusinessInDB } from '../services/db';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useState, useEffect, useRef } from 'react';
import { showToast } from '../components/iOS';

export default function Profile() {
  const { currentUser, userRole, logout } = useAuth();
  const [orderCount, setOrderCount] = useState(0);
  const [business, setBusiness] = useState({ name: 'Cream & Crust', logo: '🧁', id: null });
  const [editingName, setEditingName] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [newName, setNewName] = useState('');
  const [userDoc, setUserDoc] = useState({ name: '', phone: '', address: 'India' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchUser = async () => {
      try {
        const uDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (uDoc.exists()) {
          setUserDoc({
            name: uDoc.data().name || currentUser.displayName || 'Baker',
            phone: uDoc.data().phone || currentUser.phoneNumber || '',
            address: uDoc.data().address || 'India',
            photoURL: uDoc.data().photoURL || ''
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
        await updateDoc(doc(db, "users", currentUser.uid), { name: newName });
        setUserDoc(prev => ({ ...prev, name: newName }));
        showToast('Profile name updated!', 'success');
      } else {
        await updateBusinessInDB(business.id, { name: newName });
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

  // Determine display role label
  const isBakerOrAdmin = userRole === 'admin' || userRole === 'baker';
  const roleLabel = isBakerOrAdmin ? 'BAKER' : 'CUSTOMER';
  const roleBadgeClass = isBakerOrAdmin ? 'confirmed' : 'pending';

  const fileInputRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        try {
          if (userRole === 'customer') {
            await updateDoc(doc(db, "users", currentUser.uid), { photoURL: dataUrl });
            setUserDoc(prev => ({ ...prev, photoURL: dataUrl }));
            showToast('Profile photo updated!', 'success');
          } else {
            await updateBusinessInDB(business.id, { logo: dataUrl });
            showToast('Bakery logo updated!', 'success');
          }
        } catch (error) {
          console.error("Upload error:", error);
          showToast(`Failed: ${error.message || 'Unknown error'}`, 'error');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const userStats = [
    { label: 'Total Orders', value: orderCount.toString(), icon: Star, color: '#ffcc00' },
    { label: 'Account Type', value: isBakerOrAdmin ? 'Baker' : 'Customer', icon: Shield, color: 'var(--accent)' },
    { label: 'Joined', value: currentUser?.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recently', icon: Calendar, color: '#3498db' },
  ];

  const ProfileCard = () => (
    <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
      <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 16px' }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.8rem', color: 'white', fontWeight: 700,
          boxShadow: '0 8px 20px rgba(214, 158, 140, 0.3)',
          overflow: 'hidden'
        }}>
          {userRole === 'customer' ? (
            userDoc.photoURL ? <img src={userDoc.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (currentUser?.displayName?.[0]?.toUpperCase() || '👤')
          ) : (
            business.logo && business.logo.startsWith('data:image') ? <img src={business.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }} />
          )}
          {userRole !== 'customer' && <span style={{ display: 'none' }}>🧁</span>}
        </div>
        <button style={{
          position: 'absolute', bottom: 0, right: 0, padding: 7, borderRadius: '50%',
          background: 'white', border: '1px solid var(--border)', cursor: 'pointer'
        }} className="hover-effect" onClick={() => fileInputRef.current?.click()}>
          <Camera size={15} />
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} />
      </div>

      {editingName ? (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
          <input
            value={userRole === 'customer' ? (newName || userDoc.name) : newName}
            onChange={e => setNewName(e.target.value)}
            style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, width: '70%' }}
          />
          <button className="btn btn-sm btn-primary" onClick={handleUpdateName}>Save</button>
        </div>
      ) : (
        <h2 style={{ marginBottom: 8, cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => {
          setNewName(userRole === 'customer' ? userDoc.name : business.name);
          setEditingName(true);
        }}>
          {userRole === 'customer' ? userDoc.name : business.name}
          <Edit2 size={15} style={{ verticalAlign: 'middle', opacity: 0.5, marginLeft: 6 }} />
        </h2>
      )}

      {/* Only show BAKER badge, hide CUSTOMER badge */}
      {isBakerOrAdmin && (
        <div className={`badge ${roleBadgeClass}`} style={{ marginBottom: 20 }}>
          {roleLabel}
        </div>
      )}

      {/* Contact Info */}
      <div style={{ textAlign: 'left', marginTop: 20, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h4 style={{ margin: 0, color: 'var(--text2)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Info</h4>
          {!editingDetails ? (
            <button className="btn-icon" onClick={() => setEditingDetails(true)}><Edit2 size={14} /></button>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={handleUpdateDetails}>Save</button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, color: 'var(--text2)', fontSize: '0.88rem' }}>
          <Mail size={16} /> <span style={{ wordBreak: 'break-all' }}>{currentUser?.email}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, color: 'var(--text2)', fontSize: '0.88rem' }}>
          <Phone size={16} />
          {editingDetails ? (
            <input value={userDoc.phone} onChange={e => setUserDoc({...userDoc, phone: e.target.value})} placeholder="Phone number" style={{ padding: '4px 8px', width: '100%' }} />
          ) : (
            <span>{userDoc.phone || 'Add phone number'}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, color: 'var(--text2)', fontSize: '0.88rem' }}>
          <MapPin size={16} />
          {editingDetails ? (
            <input value={userDoc.address} onChange={e => setUserDoc({...userDoc, address: e.target.value})} placeholder="Address" style={{ padding: '4px 8px', width: '100%' }} />
          ) : (
            <span>{userDoc.address}</span>
          )}
        </div>
      </div>

      <button className="btn btn-outline" onClick={logout} style={{ width: '100%', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  );

  const StatsAndSettings = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {userStats.map((stat, i) => (
          <div key={i} className="stat-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <stat.icon size={18} style={{ color: stat.color }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Account Settings — removed 2FA */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Order Alerts</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>Get browser notifications for new orders</div>
            </div>
            <input type="checkbox" defaultChecked />
          </div>
        </div>
      </div>

      {/* Bakery info card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: 'white' }}>
        <h3 style={{ color: 'white', marginBottom: 8 }}>
          {isBakerOrAdmin ? 'Cream & Crust — Bakery Manager' : 'Cream & Crust — Customer Portal'}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', margin: 0 }}>
          {isBakerOrAdmin ? 'The ultimate tool for home bakers in India.' : 'Manage your delicious orders.'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your account settings and preferences.</p>
      </div>

      {isMobile ? (
        /* ── MOBILE: stacked vertically ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ProfileCard />
          <StatsAndSettings />
        </div>
      ) : (
        /* ── DESKTOP: side by side ── */
        <div className="content-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
          <ProfileCard />
          <StatsAndSettings />
        </div>
      )}
    </div>
  );
}
