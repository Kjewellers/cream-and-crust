import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ShoppingBag, CalendarDays, Users, Package, BookOpen, CreditCard, BarChart3, Settings, Menu, Database, WifiOff, LogOut, Lock, Sun, Moon } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Calendar from './pages/Calendar';
import Payments from './pages/Payments';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import Recipes from './pages/Recipes';
import Profile from './pages/Profile';
import Login from './pages/Login';
import SetupAdmin from './pages/SetupAdmin';
import { AuthProvider, useAuth } from './context/AuthContext';
import { subscribeToOrders } from './services/db';
import { ToastContainer } from './components/iOS';
import './index.css';



function Sidebar({ open, onClose, theme, toggleTheme }) {
  const { isAdmin, userRole, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((orders) => {
      const pending = orders.filter(o => ['new', 'confirmed', 'in-progress'].includes(o.status)).length;
      setPendingCount(pending);
    });
    return () => unsubscribe();
  }, []);

  const adminNavItems = [
    { section: 'MAIN', items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/orders', icon: ShoppingBag, label: 'Orders', badge: pendingCount > 0 ? pendingCount : null },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    ]},
    { section: 'BUSINESS', items: [
      { to: '/products', icon: Package, label: 'Products' },
      { to: '/customers', icon: Users, label: 'Customers' },
      { to: '/payments', icon: CreditCard, label: 'Payments' },
    ]},
    { section: 'OPERATIONS', items: [
      { to: '/inventory', icon: Package, label: 'Inventory' },
      { to: '/recipes', icon: BookOpen, label: 'Recipes' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    ]},
    { section: 'ACCOUNT', items: [
      { to: '/profile', icon: Settings, label: 'Settings' },
    ]}
  ];

  const customerNavItems = [
    { section: 'Store', items: [
      { to: '/', icon: Package, label: 'Shop Products' },
      { to: '/orders', icon: ShoppingBag, label: 'My Orders' },
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
          <img src="/logo.png" alt="Cream & Crust" className="brand-logo" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
          <span style={{ display: 'none', fontSize: '1.8rem' }}>🧁</span>
          <div>
            <h1>Cream & Crust</h1>
            <small>{isAdmin ? 'BAKERY MANAGER' : 'Customer Portal'}</small>
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
                  {item.badge != null && (
                    <motion.span
                      key={item.badge}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className="nav-badge"
                    >
                      {item.badge}
                    </motion.span>
                  )}
                  {item.locked && <Lock size={12} style={{ marginLeft: 'auto' }} />}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: 'auto', padding: '10px 0' }}>
          <button 
            onClick={toggleTheme} 
            className="nav-item" 
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 11 }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={logout} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginTop: 4, display: 'flex', alignItems: 'center', gap: 11 }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function MobileHeader({ onMenuClick }) {
  return (
    <div className="mobile-header">
      <div className="mobile-header-inner">
        <button className="hamburger" onClick={onMenuClick} style={{ color: 'var(--accent)' }}>
          <Menu size={26} strokeWidth={2.5} />
        </button>
        <span style={{ 
          fontFamily: 'var(--font)', 
          fontWeight: 700, 
          fontSize: '17px', 
          color: 'var(--text)', 
          letterSpacing: '-0.02em',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <img src="/logo.png" alt="Logo" style={{ height: '24px', objectFit: 'contain', borderRadius: '4px' }} onError={(e) => e.target.style.display='none'} />
          Cream & Crust
        </span>
        <div style={{ width: 38 }} /> {/* Spacer to balance absolute centering */}
      </div>
    </div>
  );
}

function BottomNav() {
  const { isAdmin, userRole } = useAuth();
  const isBaker = userRole === 'baker';
  
  const items = (isAdmin || isBaker) ? [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/orders', icon: ShoppingBag, label: 'Orders' },
    { to: '/calendar', icon: CalendarDays, label: 'Schedule' },
    { to: '/products', icon: Package, label: 'Products' },
    { to: '/analytics', icon: BarChart3, label: 'Stats' },
  ] : [
    { to: '/', icon: Package, label: 'Shop' },
    { to: '/orders', icon: ShoppingBag, label: 'Orders' },
    { to: '/profile', icon: Settings, label: 'Profile' },
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {items.map(item => (
          <NavLink key={item.to} to={item.to} end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const { isAdmin, userRole } = useAuth();
  const isBaker = userRole === 'baker';

  const renderRoute = (path, element) => (
    <Route path={path} element={<motion.div initial={{ opacity: 0, y: 8, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.99 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>{element}</motion.div>} />
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
            { renderRoute("/profile", <Profile />)}
          </>
        ) : (
          <>
            {renderRoute("/", <Products />)}
            {renderRoute("/orders", <Orders />)}
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
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const { currentUser, userRole } = useAuth();
  const location = useLocation();
  
  console.log("Rendering MainLayout, user:", currentUser?.email, "role:", userRole);

  return (
    <AnimatePresence mode="wait">
      {!currentUser ? (
        <motion.div key="login" exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 1.5, ease: [0.32, 0.72, 0, 1] }} style={{ height: '100vh', width: '100vw' }}>
          <Login />
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="app">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} theme={theme} toggleTheme={toggleTheme} />
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="main">
            <AnimatedRoutes />
          </main>
          <BottomNav />
        </motion.div>
      )}
    </AnimatePresence>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainLayout />
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}
