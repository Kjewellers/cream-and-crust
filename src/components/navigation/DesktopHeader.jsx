import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePendingOrders } from '../../hooks/usePendingOrders';

export default function DesktopHeader({ onSearchClick, onNotificationClick, theme, toggleTheme }) {
  const { currentUser, userDetails } = useAuth();
  const navigate = useNavigate();
  const pendingCount = usePendingOrders();

  const businessName = userDetails?.businessName || userDetails?.name || currentUser?.displayName || 'Bakery Manager';
  const initials =
    currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || '👤';

  const handleNewOrder = () => {
    window.dispatchEvent(new CustomEvent('open-new-order-modal'));
  };

  return (
    <header className="desktop-header desktop-only" role="banner">
      <div className="desktop-header-inner">
        {/* Search trigger button (Cmd+K) */}
        <button
          type="button"
          onClick={onSearchClick}
          className="desktop-search-trigger"
          aria-label="Open command palette"
        >
          <Search size={16} className="desktop-search-icon" />
          <span className="desktop-search-placeholder">Search orders, products, recipes...</span>
          <kbd className="desktop-search-kbd">⌘K</kbd>
        </button>

        {/* Right side controls */}
        <div className="desktop-header-actions">
          {/* Quick Create Button */}
          <button
            type="button"
            onClick={handleNewOrder}
            className="desktop-header-btn-primary"
            title="Create New Order"
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>New Order</span>
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="desktop-header-icon-btn"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={onNotificationClick}
            className="desktop-header-icon-btn"
            title="Notifications"
            aria-label="Open notifications"
          >
            <Bell size={18} strokeWidth={2} />
            {pendingCount > 0 && (
              <span className="desktop-header-badge">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>

          {/* Profile Chip */}
          <div
            className="desktop-profile-chip"
            onClick={() => navigate('/profile')}
            role="button"
            tabIndex={0}
            title="View bakery profile"
          >
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                className="desktop-profile-avatar"
              />
            ) : (
              <div className="desktop-profile-avatar-fallback">
                {initials}
              </div>
            )}
            <div className="desktop-profile-info">
              <span className="desktop-profile-name">{businessName}</span>
              <span className="desktop-profile-status">Online</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
