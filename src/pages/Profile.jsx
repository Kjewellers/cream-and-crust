import React from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Phone, MapPin, Calendar, Shield, LogOut, Camera, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToOrders, subscribeToBusiness, updateBusinessInDB } from '../services/db';
import { changeUserPassword } from '../services/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useState, useEffect, useRef } from 'react';
import { showToast } from '../components/iOS';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';


export default function Profile() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [orderCount, setOrderCount] = useState(0);
  const [business, setBusiness] = useState({ name: 'Cream & Crust', logo: '🧁', id: null });
  const [editingName, setEditingName] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [newName, setNewName] = useState('');
  const [userDoc, setUserDoc] = useState({ 
    name: '', phone: '', address: 'India', bio: '', instagram: '', whatsapp: '', website: '', gstin: '',
    upiId: '', invoiceTagline: 'Baking memories, one slice at a time!', terms: 'Orders confirmed only after 50% advance.'
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
  const [changingPass, setChangingPass] = useState(false);


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
            photoURL: uDoc.data().photoURL || '',
            bio: uDoc.data().bio || '',
            instagram: uDoc.data().instagram || '',
            whatsapp: uDoc.data().whatsapp || '',
            website: uDoc.data().website || '',
            gstin: uDoc.data().gstin || '',
            upiId: uDoc.data().upiId || '',
            invoiceTagline: uDoc.data().invoiceTagline || 'Baking memories, one slice at a time!',
            terms: uDoc.data().terms || 'Orders confirmed only after 50% advance.',
            notifications: uDoc.data().notifications || { email: true, orders: true, whatsapp: false }
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
      }, null, currentUser.uid);
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
      if (userRole === 'customer') {
        await updateDoc(doc(db, "users", currentUser.uid), {
          phone: userDoc.phone,
          address: userDoc.address,
          bio: userDoc.bio,
          instagram: userDoc.instagram,
          whatsapp: userDoc.whatsapp,
          website: userDoc.website,
          gstin: userDoc.gstin,
          notifications: userDoc.notifications
        });
      } else {
        await updateBusinessInDB(business.id, {
          phone: userDoc.phone,
          address: userDoc.address,
          bio: userDoc.bio,
          instagram: userDoc.instagram,
          whatsapp: userDoc.whatsapp,
          website: userDoc.website,
          gstin: userDoc.gstin,
          upiId: userDoc.upiId,
          invoiceTagline: userDoc.invoiceTagline,
          terms: userDoc.terms,
          username: business.username,
          notifications: userDoc.notifications
        });
      }
      setEditingDetails(false);
      showToast('Profile details updated!', 'success');
    } catch (e) {
      showToast('Failed to update details', 'error');
    }
  };

  const calculateCompleteness = () => {
    const fields = [
      userDoc.name,
      userRole === 'customer' ? userDoc.photoURL : business.logo,
      userDoc.phone,
      userDoc.address,
      userDoc.bio,
      userRole !== 'customer' ? business.username : 'skip',
      userDoc.instagram || userDoc.whatsapp || userDoc.website ? 'filled' : ''
    ];
    const filled = fields.filter(f => f && f !== 'skip').length;
    return Math.round((filled / fields.filter(f => f !== 'skip').length) * 100);
  };

  const completeness = calculateCompleteness();

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
    { label: 'Total Orders', value: orderCount.toString(), icon: Shield, color: 'var(--accent)' },
    { label: 'Account Type', value: isBakerOrAdmin ? 'Baker' : 'Customer', icon: Shield, color: 'var(--accent)' },
    { label: 'Joined', value: currentUser?.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recently', icon: Calendar, color: '#3498db' },
  ];

  // --- RENDER HELPERS (Functions, not Components, to avoid unmounting) ---
  const renderProfileCard = () => (
    <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
      <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 16px' }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.8rem', color: 'white', fontWeight: 700,
          boxShadow: '0 8px 20px rgba(214, 158, 140, 0.3)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 2
        }}>
          {userRole === 'customer' ? (
            userDoc.photoURL ? <img src={userDoc.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (currentUser?.displayName?.[0]?.toUpperCase() || '👤')
          ) : (
            business.logo && business.logo.startsWith('data:image') ? <img src={business.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; if(e.target.nextSibling) e.target.nextSibling.style.display='inline'; }} />
          )}
          {userRole !== 'customer' && <span style={{ display: 'none' }}>🧁</span>}
        </div>
        
        {/* Completeness Ring */}
        <svg style={{ position: 'absolute', top: -10, left: -10, width: 130, height: 130, transform: 'rotate(-90deg)', zIndex: 1 }}>
          <circle cx="65" cy="65" r="60" fill="transparent" stroke="var(--bg2)" strokeWidth="6" />
          <circle cx="65" cy="65" r="60" fill="transparent" stroke="var(--accent)" strokeWidth="6" 
            strokeDasharray={2 * Math.PI * 60} 
            strokeDashoffset={2 * Math.PI * 60 * (1 - completeness / 100)} 
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'white', fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, fontWeight: 700, zIndex: 3 }}>
          {completeness}%
        </div>

        <button style={{
          position: 'absolute', bottom: 0, right: 0, padding: 7, borderRadius: '50%',
          background: 'white', border: '1px solid var(--border)', cursor: 'pointer', zIndex: 4
        }} className="hover-effect" onClick={() => fileInputRef.current?.click()}>
          <Camera size={15} />
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} />
      </div>

      {editingName ? (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, width: '70%' }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateName(); if (e.key === 'Escape') setEditingName(false); }}
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
            <input type="tel" inputMode="numeric" value={userDoc.phone} onChange={e => setUserDoc({...userDoc, phone: e.target.value})} placeholder="Phone number" style={{ padding: '4px 8px', width: '100%' }} />
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

        {/* Business Specific Fields */}
        {userRole !== 'customer' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, color: 'var(--text2)', fontSize: '0.88rem' }}>
              <UserIcon size={16} />
              {editingDetails ? (
                <input value={business.username} onChange={e => setBusiness({...business, username: e.target.value})} placeholder="Unique Username" style={{ padding: '4px 8px', width: '100%' }} />
              ) : (
                <span>@{business.username || 'set-username'}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12, color: 'var(--text2)', fontSize: '0.88rem' }}>
              <Edit2 size={16} style={{ marginTop: 4 }} />
              {editingDetails ? (
                <textarea value={userDoc.bio} onChange={e => setUserDoc({...userDoc, bio: e.target.value})} placeholder="Business Bio" style={{ padding: '4px 8px', width: '100%', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', minHeight: 60 }} />
              ) : (
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{userDoc.bio || 'Add a bio for your portfolio...'}</span>
              )}
            </div>
          </>
        )}
      </div>

      <button className="btn btn-outline" onClick={logout} style={{ width: '100%', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  );

  const renderStatsAndSettings = () => (
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

      {/* Account Security */}
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>Account Security</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {currentUser?.providerData.some(p => p.providerId === 'google.com') ? (
            <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <img src="https://www.google.com/favicon.ico" width={16} height={16} alt="Google" />
                <div style={{ fontWeight: 600 }}>Google Sign-In</div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text3)', margin: 0 }}>
                You’re signed in with Google. Manage your password at <a href="https://myaccount.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>myaccount.google.com</a>
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontWeight: 600 }}>Change Password</div>
              <button 
                className="btn btn-outline" 
                style={{ width: 'fit-content' }}
                onClick={() => setShowPasswordModal(true)}
              >
                Update Password
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>Notification Preferences</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

          {[
            { key: 'email',    label: 'Email Alerts',          desc: 'Receive order updates via email',      icon: '📧' },
            { key: 'whatsapp', label: 'WhatsApp Notifications', desc: 'Get instant updates on WhatsApp',       icon: '💬' },
            { key: 'orders',   label: 'Push Notifications',     desc: 'Real-time browser alerts for orders',   icon: '🔔' },
          ].map(({ key, label, desc, icon }) => {
            const isOn = !!userDoc.notifications?.[key];
            const toggle = () => {
              const newNotifs = { ...userDoc.notifications, [key]: !isOn };
              setUserDoc({ ...userDoc, notifications: newNotifs });
              updateDoc(doc(db, 'users', currentUser.uid), { notifications: newNotifs });
            };
            return (
              <div
                key={key}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: key !== 'orders' ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.3rem' }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: 2 }}>{desc}</div>
                  </div>
                </div>

                {/* iOS Toggle Switch */}
                <button
                  onClick={toggle}
                  aria-label={label}
                  style={{
                    flexShrink: 0,
                    width: 50, height: 28,
                    borderRadius: 99,
                    border: 'none',
                    cursor: 'pointer',
                    padding: 3,
                    background: isOn
                      ? 'linear-gradient(135deg, var(--accent), #8A3D4A)'
                      : 'rgba(0,0,0,0.12)',
                    transition: 'background 0.25s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isOn ? 'flex-end' : 'flex-start',
                    boxShadow: isOn ? '0 2px 8px rgba(181,96,106,0.35)' : 'none',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Public Menu Link */}
      {isBakerOrAdmin && business?.username && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--accent-light), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
            }}>🍽️</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Your Public Menu</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text3)' }}>Share this link so customers can browse your menu</p>
            </div>
          </div>

          <div style={{
            background: 'var(--bg)', borderRadius: 12, padding: '12px 14px',
            border: '1px solid var(--border)', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text3)', flexShrink: 0 }}>🔗</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text2)', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {window.location.origin}/menu/{business.username}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/menu/${business.username}`);
                showToast('Menu link copied! 🍽️', 'success');
              }}
            >
              Copy Link
            </button>
            <button
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => window.open(`/menu/${business.username}`, '_blank')}
            >
              Open Menu
            </button>
          </div>
        </div>
      )}

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
          {renderProfileCard()}
          {renderStatsAndSettings()}
        </div>
      ) : (
        /* ── DESKTOP: side by side ── */
        <div className="content-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
          {renderProfileCard()}
          {renderStatsAndSettings()}
        </div>
      )}
      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="modal-overlay" onClick={() => setShowPasswordModal(false)} style={{ zIndex: 1000 }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="modal" 
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 400 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>Change Password</h3>
                <button className="btn-icon" onClick={() => setShowPasswordModal(false)}><X size={18} /></button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (passForm.new !== passForm.confirm) return showToast('Passwords do not match', 'error');
                if (passForm.new.length < 6) return showToast('Password too short', 'error');
                
                setChangingPass(true);
                try {
                  const { changeUserPassword } = await import('../services/auth');
                  await changeUserPassword(passForm.current, passForm.new);
                  showToast('Password updated!', 'success');
                  setShowPasswordModal(false);
                  setPassForm({ current: '', new: '', confirm: '' });
                } catch (err) {
                  showToast(err.message || 'Failed to update password', 'error');
                } finally {
                  setChangingPass(false);
                }
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input type="password" required value={passForm.current} onChange={e => setPassForm({...passForm, current: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input type="password" required value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" required value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={changingPass} style={{ marginTop: 8 }}>
                    {changingPass ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

