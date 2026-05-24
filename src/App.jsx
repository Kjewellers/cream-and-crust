import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ShoppingBag, CalendarDays, Users, Package, BookOpen, CreditCard, BarChart3, Settings, Menu, Database, WifiOff, LogOut, Lock, Sun, Moon, Receipt, ShoppingCart, Plus, MoreHorizontal, Bell } from 'lucide-react';
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
import MenuDashboard from './pages/MenuDashboard';
import CreateMenu from './pages/CreateMenu';
import MenuCategories from './pages/MenuCategories';
import MenuProducts from './pages/MenuProducts';
import MenuThemeCustomizer from './pages/MenuThemeCustomizer';
import MenuLivePreview from './pages/MenuLivePreview';
import PublishedMenu from './pages/PublishedMenu';
import OnboardingModal from './components/OnboardingModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { subscribeToOrders, subscribeToInventory } from './services/db';
import { ToastContainer, Loader2, showToast } from './components/iOS';
import { ConfettiCanvas, SuccessBurstOverlay, FloatingRewardLayer } from './components/DopamineKit';
import PremiumAppTour from './components/PremiumAppTour';
import { PageWrapper } from './animations';
import './index.css';

function Sidebar({ open, onClose, theme, toggleTheme }) {
  const { isAdmin, userRole, logout, currentUser } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!currentUser) { setPendingCount(0); return; }
    const unsubscribe = subscribeToOrders((orders) => {
      const pending = orders.filter(o => {
        const s = String(o.status || 'inquiry').toLowerCase();
        return ['inquiry', 'confirmed', 'baking', 'ready', 'new'].includes(s);
      }).length;
      setPendingCount(pending);
    }, currentUser.uid);
    return () => unsubscribe();
  }, [currentUser]);

  const adminNavItems = [
    { section: 'MAIN', items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/orders', icon: ShoppingBag, label: 'Orders', badge: pendingCount > 0 ? pendingCount : null },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    ]},
    { section: 'BUSINESS', items: [
      { to: '/products', icon: Package, label: 'Products' },
      { to: '/menu-builder', icon: Menu, label: 'Menu Builder' },
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
  const { currentUser } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!currentUser) { setPendingCount(0); return; }
    const unsub = subscribeToOrders((orders) => {
      const pending = orders.filter(o => {
        const s = String(o.status || 'inquiry').toLowerCase();
        return ['inquiry', 'confirmed', 'baking', 'ready', 'new'].includes(s);
      }).length;
      setPendingCount(pending);
    }, currentUser.uid);
    return () => unsub();
  }, [currentUser]);

  const handleBellClick = () => {
    try {
      window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: 'light' }));
    } catch(e){}
    import('./components/iOS').then(({ showToast }) => {
      showToast(
        pendingCount > 0
          ? `${pendingCount} active order${pendingCount > 1 ? 's' : ''} need attention! 🥐`
          : 'All orders up to date ✅',
        pendingCount > 0 ? 'info' : 'success'
      );
    });
  };

  const initials = currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || '👤';

  return (
    <div className="mobile-header" style={{
      boxShadow: 'none',
      borderBottom: '1px solid rgba(74, 59, 50, 0.05)',
      background: '#FFFFFF',
    }}>
      <div className="mobile-header-inner" style={{ padding: '0 16px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
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
            cursor: 'pointer'
          }}
        >
          <Menu size={24} strokeWidth={2} />
        </button>
        
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
            border: '1px solid rgba(181, 96, 106, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}>🧁</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
            <span style={{ 
              fontFamily: 'var(--font)', 
              fontWeight: 900, 
              fontSize: '15px', 
              color: 'var(--text)', 
              letterSpacing: '-0.02em'
            }}>Cream &amp; Crust</span>
            <span style={{ 
              fontSize: '0.62rem', 
              fontWeight: 700, 
              color: 'var(--text3)',
              letterSpacing: '0.01em'
            }}>Let's bake happiness! 🧁</span>
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
              position: 'relative'
            }}
          >
            <Bell size={21} strokeWidth={2} />
            {pendingCount > 0 && (
              <span style={{
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
              }}>{pendingCount > 99 ? '99+' : pendingCount}</span>
            )}
          </button>

          <div style={{ position: 'relative', width: 32, height: 32, cursor: 'pointer' }} onClick={() => window.location.href='/profile'}>
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL}
                alt="Avatar"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(181, 96, 106, 0.15)' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), #8A3D4A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 900, fontSize: '0.8rem',
                border: '1.5px solid rgba(181,96,106,0.2)',
              }}>{initials}</div>
            )}
            <span style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 8,
              height: 8,
              background: '#10B981',
              borderRadius: '50%',
              border: '1.5px solid white'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomNav() {
  const { isAdmin, userRole } = useAuth();
  const isBaker = userRole === 'baker';
  const navigate = useNavigate();
  const location = useLocation();

  if (!(isAdmin || isBaker)) {
    const customerItems = [
      { to: '/', icon: Package, label: 'Shop' },
      { to: '/orders', icon: ShoppingBag, label: 'Orders' },
      { to: '/profile', icon: Settings, label: 'Profile' },
    ];
    return (
      <nav className="mobile-only" style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        zIndex: 90,
        paddingBottom: 'env(safe-area-inset-bottom, 12px)',
        paddingTop: 8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {customerItems.map(item => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              end 
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                textDecoration: 'none',
                color: isActive ? '#B5606A' : '#9CA3AF',
                transition: 'all 0.3s ease',
              })}
            >
              <item.icon size={22} />
              <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    );
  }

  const handleFabClick = () => {
    try { window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: 'light' })); } catch(e){}
    
    if (location.pathname === '/orders') {
      window.dispatchEvent(new CustomEvent('open-new-order-modal'));
    } else {
      navigate('/orders?new=true');
    }
  };

  return (
    <nav className="mobile-only" style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(0, 0, 0, 0.06)',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.03)',
      zIndex: 90,
      paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      paddingTop: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', position: 'relative', padding: '0 8px' }}>
        
        <NavLink 
          to="/" 
          end 
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: 56,
            textDecoration: 'none',
            color: isActive ? '#B5606A' : '#9CA3AF',
          })}
        >
          <LayoutDashboard size={22} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Home</span>
        </NavLink>

        <NavLink 
          to="/orders" 
          end 
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: 56,
            textDecoration: 'none',
            color: isActive ? '#B5606A' : '#9CA3AF',
          })}
        >
          <ShoppingBag size={22} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Orders</span>
        </NavLink>

        <div style={{ position: 'relative', width: 60, height: 44, display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={handleFabClick}
            style={{
              position: 'absolute',
              top: -24,
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: '#B5606A',
              color: 'white',
              boxShadow: '0 6px 16px rgba(181, 96, 106, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '4px solid white',
              zIndex: 91,
            }}
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        <NavLink 
          to="/products" 
          end 
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: 56,
            textDecoration: 'none',
            color: isActive ? '#B5606A' : '#9CA3AF',
          })}
        >
          <Package size={22} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Products</span>
        </NavLink>

        <NavLink 
          to="/profile" 
          end 
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: 56,
            textDecoration: 'none',
            color: isActive ? '#B5606A' : '#9CA3AF',
          })}
        >
          <MoreHorizontal size={22} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>More</span>
        </NavLink>

      </div>
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const { isAdmin, userRole } = useAuth();
  const isBaker = userRole === 'baker';

  const renderRoute = (path, element) => (
    <Route path={path} element={<PageWrapper>{element}</PageWrapper>} />
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
            {renderRoute("/profile", <Profile />)}
            {renderRoute("/menu-builder", <MenuDashboard />)}
            {renderRoute("/menu-builder/create", <CreateMenu />)}
            {renderRoute("/menu-builder/categories", <MenuCategories />)}
            {renderRoute("/menu-builder/products", <MenuProducts />)}
            {renderRoute("/menu-builder/theme", <MenuThemeCustomizer />)}
            {renderRoute("/menu-builder/preview", <MenuLivePreview />)}
          </>
        ) : (
          <>
            {renderRoute("/", <Products />)}
            {renderRoute("/orders", <Orders />)}
            { renderRoute("/profile", <Profile />)}
          </>
        )}
        {renderRoute("/portfolio/:username", <Portfolio />)}
        {renderRoute("/menu/:username", <PublishedMenu />)}
        {renderRoute("/order/:username", <PublicOrderForm />)}
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
  const { 
    currentUser, userRole, onboardingCompleted, business, userDetails, 
    finishOnboarding, hasSeenTourV1, loading: authLoading 
  } = useAuth();
  
  const [localHasSeenTour, setLocalHasSeenTour] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const alertedItemsRef = useRef(new Set());

  useEffect(() => {
    if (!currentUser) {
      alertedItemsRef.current.clear();
      return;
    }

    const unsubscribe = subscribeToInventory((items) => {
      items.forEach((item) => {
        const isLow = Number(item.stock) <= Number(item.minStock || 0);
        if (isLow) {
          if (!alertedItemsRef.current.has(item.id)) {
            alertedItemsRef.current.add(item.id);
            showToast(`⚠️ Low Stock: "${item.item}" is down to ${item.stock} ${item.unit}!`, 'error');
            try {
              window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: 'warning' }));
            } catch(e){}
          }
        } else {
          alertedItemsRef.current.delete(item.id);
        }
      });
    }, null, currentUser.uid);

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const key = `cc_tour_v1_seen_${currentUser.uid}`;
      setLocalHasSeenTour(localStorage.getItem(key) === 'true');
    } else {
      setLocalHasSeenTour(false);
      setShowTutorial(false);
    }
  }, [currentUser]);

  const handleTourComplete = () => {
    if (currentUser) {
      localStorage.setItem(`cc_tour_v1_seen_${currentUser.uid}`, 'true');
      setLocalHasSeenTour(true);
    }
  };

  const location = useLocation();
  
  const isPublicRoute = location.pathname.startsWith('/order/') || location.pathname.startsWith('/portfolio/') || location.pathname.startsWith('/menu/');

  const content = isPublicRoute ? (
        <motion.div key="public" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Routes>
            <Route path="/order/:username" element={<PublicOrderForm />} />
            <Route path="/portfolio/:username" element={<Portfolio />} />
            <Route path="/menu/:username" element={<PublishedMenu />} />
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
          {currentUser && !localHasSeenTour && !hasSeenTourV1 && onboardingCompleted && (
            <PremiumAppTour onComplete={handleTourComplete} />
          )}
          {currentUser && !onboardingCompleted && !showTutorial && (
            <OnboardingModal 
              user={{ ...currentUser, ...userDetails }} 
              business={business} 
              onComplete={() => setShowTutorial(true)} 
            />
          )}
          {currentUser && !onboardingCompleted && showTutorial && !localHasSeenTour && (
            <PremiumAppTour onComplete={handleTourComplete} />
          )}
        </motion.div>
      ) : (
        <div key="loading" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" color="var(--accent)" />
        </div>
      );

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" />}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {content}
      </AnimatePresence>
    </>
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
