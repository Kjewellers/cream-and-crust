import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ShoppingBag, CalendarDays, Users, Package, BookOpen, CreditCard, BarChart3, Settings, Menu, Database, WifiOff, LogOut, Lock, Sun, Moon, Receipt, ShoppingCart } from 'lucide-react';
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
import Expenses from './pages/Expenses';
import ShoppingList from './pages/ShoppingList';
import Login from './pages/Login';
import SetupAdmin from './pages/SetupAdmin';
import PublicOrderForm from './pages/PublicOrderForm';
import Portfolio from './pages/Portfolio';
import { AuthProvider, useAuth } from './context/AuthContext';
import { subscribeToOrders } from './services/db';
import { ToastContainer, Loader2 } from './components/iOS';
import { ConfettiCanvas, SuccessBurstOverlay, FloatingRewardLayer } from './components/DopamineKit';
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
      { to: '/expenses', icon: Receipt, label: 'Expenses' },
      { to: '/shopping-list', icon: ShoppingCart, label: 'Shopping List' },
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
          <img src="/logo.png" alt="Cream & Crust" className="brand-logo" style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '8px', flexShrink: 0 }} onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
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

function MobileHeader({ onMenuClick, theme, toggleTheme }) {
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
        <button
          onClick={toggleTheme}
          style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--cream)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', flexShrink: 0 }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
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
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
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
            {renderRoute("/expenses", <Expenses />)}
            {renderRoute("/shopping-list", <ShoppingList />)}
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

function SplashScreen() {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, 
        background: 'linear-gradient(180deg, #FFF9F7 0%, #FFFFFF 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      {/* Background Decorative Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, 0],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{ 
          position: 'absolute', width: '120vw', height: '120vh', 
          background: 'radial-gradient(circle at 30% 30%, var(--accent-light) 0%, transparent 60%)',
          zIndex: -1, pointerEvents: 'none'
        }}
      />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{ position: 'relative' }}
        >
          {/* Logo Glow */}
          <motion.div
            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              position: 'absolute', inset: -15, borderRadius: 28,
              background: 'var(--accent)', filter: 'blur(20px)', zIndex: -1
            }}
          />
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              width: 120, height: 120, objectFit: 'contain', 
              borderRadius: 24, boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
              background: 'white', padding: 2
            }} 
          />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{ marginTop: 32, textAlign: 'center' }}
        >
          <h1 style={{ 
            fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.05em', 
            margin: 0, color: 'var(--text)', lineHeight: 1.1 
          }}>
            Cream & Crust
          </h1>
          <p style={{ 
            marginTop: 8, fontSize: '1rem', color: 'var(--text2)', 
            fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase'
          }}>
            Bakery Manager
          </p>
        </motion.div>

        {/* Elegant Loader */}
        <div style={{ marginTop: 48, width: 200, height: 3, background: 'rgba(0,0,0,0.04)', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
          <motion.div
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ 
              position: 'absolute', top: 0, bottom: 0, width: '40%', 
              background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
              borderRadius: 10
            }}
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        style={{ position: 'absolute', bottom: 40, fontSize: '0.8rem', color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.05em' }}
      >
        MADE FOR PREMIUM BAKERS
      </motion.div>
    </motion.div>
  );
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const location = useLocation();
  
  const isPublicRoute = location.pathname.startsWith('/order/') || location.pathname.startsWith('/portfolio/');

  return (
    <AnimatePresence mode="wait">
      {showSplash && <SplashScreen key="splash" />}
      
      {isPublicRoute ? (
        <motion.div key="public" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Routes>
            <Route path="/order/:username" element={<PublicOrderForm />} />
            <Route path="/portfolio/:username" element={<Portfolio />} />
          </Routes>
        </motion.div>
      ) : !currentUser && !authLoading ? (
        <motion.div key="login" exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }} style={{ height: '100vh', width: '100vw' }}>
          <Login />
        </motion.div>
      ) : currentUser ? (
        <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="app">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} theme={theme} toggleTheme={toggleTheme} />
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} theme={theme} toggleTheme={toggleTheme} />
          <main className="main">
            <AnimatedRoutes />
          </main>
          <BottomNav />
        </motion.div>
      ) : (
        <div key="loading" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" color="var(--accent)" />
        </div>
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
        <ConfettiCanvas />
        <SuccessBurstOverlay />
        <FloatingRewardLayer />
      </AuthProvider>
    </BrowserRouter>
  );
}
