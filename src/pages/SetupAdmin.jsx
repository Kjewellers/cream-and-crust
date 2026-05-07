import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { promoteToAdmin } from '../services/auth';
import { motion } from 'framer-motion';

export default function SetupAdmin() {
  const { currentUser, userRole, refreshRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSetup = async () => {
    if (!currentUser) {
      setMessage('Please log in first.');
      return;
    }
    setLoading(true);
    try {
      await promoteToAdmin(currentUser.uid);
      await refreshRole();
      setMessage('Success! You are now an Admin. Redirecting...');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card"
        style={{ maxWidth: 400, padding: 30, textAlign: 'center' }}
      >
        <h2>Initial Admin Setup</h2>
        <p style={{ margin: '20px 0', color: 'var(--text3)' }}>
          This is a one-time setup page. Click the button below to promote your current account to **Admin**.
        </p>
        {currentUser ? (
          <div>
            <p style={{ marginBottom: 15, fontSize: '0.9rem' }}>Logged in as: <strong>{currentUser.email}</strong></p>
            <p style={{ marginBottom: 20, fontSize: '0.9rem' }}>Current Role: <strong>{userRole || 'None'}</strong></p>
            <button 
              className="btn btn-primary" 
              onClick={handleSetup}
              disabled={loading || userRole === 'admin'}
              style={{ width: '100%' }}
            >
              {loading ? 'Processing...' : (userRole === 'admin' ? 'Already Admin' : 'Promote to Admin')}
            </button>
          </div>
        ) : (
          <p style={{ color: 'var(--accent2)' }}>You must be logged in to promote your account.</p>
        )}
        {message && <p style={{ marginTop: 20, fontWeight: 600, color: message.includes('Error') ? 'var(--accent2)' : 'var(--accent)' }}>{message}</p>}
      </motion.div>
    </div>
  );
}
