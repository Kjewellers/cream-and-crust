import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ShoppingBag, CalendarDays, Users, Package, BookOpen, CreditCard, BarChart3, Settings, Menu, Database, WifiOff, LogOut, Lock } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Calendar from './pages/Calendar';
import Payments from './pages/Payments';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import Recipes from './pages/Recipes';
import Billing from './pages/Billing';
import Profile from './pages/Profile';
import Login from './pages/Login';
import SetupAdmin from './pages/SetupAdmin';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import './index.css';

function FirebaseStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: 'var(--text3)' }}>
      {isOnline ? (
        <><Database size={16} color="var(--accent)" /> <span>Database Connected</span></>
      ) : (
        <><WifiOff size={16} color="var(--accent2)" /> <span style={{color: 'var(--accent2)'}}>Database Offline</span></>
      )}
    </div>
  );
}

function Sidebar({ open, onClose }) {
  const { isAdmin, userRole, logout } = useAuth();
  const { isPro } = useSubscription();

  const adminNavItems = [
    { section: 'Main', items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/orders', icon: ShoppingBag, label: 'Orders' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    ]},
    { section: 'Business', items: [
      { to: '/products', icon: Package, label: 'Products' },
      { to: '/customers', icon: Users, label: 'Customers' },
      { to: '/payments', icon: CreditCard, label: 'Payments' },
    ]},
    { section: 'Operations', items: [
      { to: '/inventory', icon: Package, label: 'Inventory' },
      { to: '/recipes', icon: BookOpen, label: 'Recipes' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    ]},
    { section: 'Account', items: [
      { to: '/billing', icon: CreditCard, label: 'Billing' },
      { to: '/profile', icon: Settings, label: 'Settings' },
    ]}
  ];

  const customerNavItems = [
    { section: 'Store', items: [
      { to: '/', icon: Package, label: 'Shop Products' },
      { to: '/orders', icon: ShoppingBag, label: 'My Orders' },
      { to: '/billing', icon: CreditCard, label: 'Billing' },
    ]},
    { section: 'Account', items: [
      { to: '/profile', icon: Settings, label: 'Profile' },
    ]}
  ];

  const isBaker = userRole === 'baker';
  const navItems = (isAdmin || isBaker) ? adminNavItems : customerNavItems;

  return (
    <>
      <div className={`overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-brand">
          <span>🧁</span>
          <div>
            <h1>Cream & Crust</h1>
            <small>{isAdmin ? 'Bakery Manager' : 'Customer Portal'}</small>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {navItems.map(section => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => (
                <NavLink key={item.to} to={item.to} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose} style={{ opacity: item.locked ? 0.6 : 1 }}>
                  <item.icon />
                  {item.label}
                  {item.locked && <Lock size={12} style={{ marginLeft: 'auto' }} />}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: 'auto' }}>
          <button onClick={logout} className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text2)', borderRadius: 0 }}>
            <LogOut size={18} /> Logout
          </button>
          <FirebaseStatus />
        </div>
      </aside>
    </>
  );
}

function MobileHeader({ onMenuClick }) {
  return (
    <div className="mobile-header">
      <div className="mobile-header-inner">
        <button className="hamburger" onClick={onMenuClick}><Menu /></button>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.1rem' }}>🧁 Cream & Crust</span>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const { isAdmin, userRole } = useAuth();
  const isBaker = userRole === 'baker';

  const renderRoute = (path, element) => (
    <Route path={path} element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>{element}</motion.div>} />
  );

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {(isAdmin || isBaker) ? (
          <>
            {renderRoute("/", <Dashboard />)}
            {renderRoute("/orders", <Orders />)}
            {renderRoute("/calendar", <Calendar />)}
            {renderRoute("/products", <Products />)}
            {renderRoute("/customers", <Customers />)}
            {renderRoute("/payments", <Payments />)}
            {renderRoute("/inventory", <Inventory />)}
            {renderRoute("/recipes", <Recipes />)}
            {renderRoute("/analytics", <Analytics />)}
            { renderRoute("/billing", <Billing />)}
            { renderRoute("/profile", <Profile />)}
          </>
        ) : (
          <>
            {renderRoute("/", <Products />)}
            {renderRoute("/orders", <Orders />)}
            { renderRoute("/billing", <Billing />)}
            { renderRoute("/profile", <Profile />)}
          </>
        )}
        {renderRoute("/setup-admin", <SetupAdmin />)}
        <Route path="*" element={<div style={{ padding: 40, textAlign: 'center' }}><h2>404 - Page Not Found</h2><button className="btn btn-primary" onClick={() => window.location.href='/'} style={{ marginTop: 20 }}>Go Home</button></div>} />
      </Routes>
    </AnimatePresence>
  );
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, userRole } = useAuth();
  const { isBlocked, loading: subLoading } = useSubscription();
  const location = useLocation();
  
  console.log("Rendering MainLayout, user:", currentUser?.email, "role:", userRole);

  if (!currentUser) {
    console.log("No user, rendering Login");
    return <Login />;
  }

  if (subLoading) return <div className="loading">Loading Subscription...</div>;

  // Strict Access Control: Redirect to billing if trial expired
  if (isBlocked && location.pathname !== '/billing' && location.pathname !== '/profile') {
    return (
      <div className="app">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="main">
          <div style={{ padding: 40, textAlign: 'center', background: 'white', borderRadius: 'var(--radius)', margin: 20 }}>
            <div style={{ width: 80, height: 80, background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Lock size={40} />
            </div>
            <h2>Trial Expired</h2>
            <p style={{ color: 'var(--text3)', maxWidth: 400, margin: '10px auto 30px' }}>
              Your 7-day free trial has ended. To continue managing your bakery, please upgrade to the Pro plan.
            </p>
            <NavLink to="/billing" className="btn btn-primary">Go to Billing</NavLink>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
      <main className="main">
        <AnimatedRoutes />
      </main>
    </div>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <MainLayout />
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
