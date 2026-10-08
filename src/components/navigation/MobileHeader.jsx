import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePendingOrders } from '../../hooks/usePendingOrders';

export default function MobileHeader({ onMenuClick, onNotificationClick }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const pendingCount = usePendingOrders();

  const handleBellClick = () => {
    try {
      window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: 'light' }));
    } catch (e) {}
    if (onNotificationClick && typeof onNotificationClick === 'function') {
      onNotificationClick();
    }
  };

  const initials =
    currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || '👤';

  return (
    <div
      className="mobile-header"
      style={{
        boxShadow: 'none',
        borderBottom: '1px solid rgba(74, 59, 50, 0.05)',
        background: '#FFFFFF',
      }}
    >
      <div
        className="mobile-header-inner"
        style={{
          padding: '0 16px',
          height: 62,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <button
          className="hamburger"
          onClick={onMenuClick}
          style={{
            color: 'var(--text)',
            background: 'none',
            padding: 0,
            width: 'auto',
            height: 'auto',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Menu size={24} strokeWidth={2} />
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
              border: '1px solid rgba(181, 96, 106, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            🧁
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              lineHeight: 1.15,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font)',
                fontWeight: 900,
                fontSize: '15px',
                color: 'var(--text)',
                letterSpacing: '-0.02em',
              }}
            >
              Cream &amp; Crust
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'var(--text3)',
                letterSpacing: '0.01em',
              }}
            >
              Let's bake happiness! 🧁
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleBellClick}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
              position: 'relative',
            }}
          >
            <Bell size={21} strokeWidth={2} />
            {pendingCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -1,
                  right: -1,
                  background: '#E15A3E',
                  color: 'white',
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  padding: '1px 4.5px',
                  borderRadius: 99,
                  border: '1.5px solid white',
                  boxShadow: '0 2px 4px rgba(225,90,62,0.15)',
                  minWidth: 16,
                  textAlign: 'center',
                }}
              >
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>

          <div
            style={{ position: 'relative', width: 32, height: 32, cursor: 'pointer' }}
            onClick={() => navigate('/profile')}
          >
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid rgba(181, 96, 106, 0.15)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), #8A3D4A)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  border: '1.5px solid rgba(181,96,106,0.2)',
                }}
              >
                {initials}
              </div>
            )}
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 8,
                height: 8,
                background: '#10B981',
                borderRadius: '50%',
                border: '1.5px solid white',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
