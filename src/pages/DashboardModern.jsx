import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Home, ShoppingBag, Plus, Box, Menu as MenuIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function DashboardModern() {
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const { orders = [], inventory = [], expenses = [] } = useData();

  const firstName = userDetails?.businessName?.split(' ')[0] || userDetails?.name?.split(' ')[0] || 'Bharat';

  // --- Real Data Calculations ---
  const { revenue, totalOrders, profit, pendingAmount, pendingCount } = useMemo(() => {
    let rev = 0;
    let ordCount = 0;
    let pendAmt = 0;
    let pendCount = 0;

    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        rev += Number(o.total || 0);
        ordCount += 1;
        if (o.paymentStatus === 'unpaid') {
          pendAmt += Number(o.total || 0);
          pendCount += 1;
        }
      }
    });

    const totalExp = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const prof = rev - totalExp;

    return { revenue: rev, totalOrders: ordCount, profit: prof, pendingAmount: pendAmt, pendingCount: pendCount };
  }, [orders, expenses]);

  // Formatter
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  // --- Smart Insights Calculations ---
  const smartInsights = useMemo(() => {
    const insights = [];
    
    // 1. Expiring Inventory
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const expiringItems = inventory.filter(i => i.expiryDate && new Date(i.expiryDate) <= soon);
    if (expiringItems.length > 0) {
      insights.push({
        id: 'exp',
        icon: '⚠️',
        title: `${expiringItems.length} items expiring soon`,
        sub: expiringItems.slice(0, 2).map(i => i.item).join(', '),
        btn: 'Take Action', btnColor: '#EF4444', btnBg: '#FEF2F2'
      });
    }

    // 2. Pending Payments
    if (pendingCount > 0) {
      insights.push({
        id: 'pay',
        icon: '💰',
        title: `${formatCurrency(pendingAmount)} payment pending`,
        sub: `${pendingCount} customers`,
        btn: 'Remind', btnColor: '#F59E0B', btnBg: '#FFFBEB'
      });
    }

    // 3. Trending Product
    if (orders.length > 0) {
      const productCounts = {};
      orders.forEach(o => { if(o.product) productCounts[o.product] = (productCounts[o.product] || 0) + 1; });
      let trendingProduct = null;
      let maxCount = 0;
      Object.entries(productCounts).forEach(([prod, count]) => {
        if (count > maxCount) { maxCount = count; trendingProduct = prod; }
      });
      if (trendingProduct && maxCount > 1) {
        insights.push({
          id: 'trend',
          icon: '🔥',
          title: `${trendingProduct} is trending`,
          sub: `${maxCount} orders recently`,
          btn: 'See Details', btnColor: '#10B981', btnBg: '#ECFDF5'
        });
      }
    }

    return insights;
  }, [inventory, pendingAmount, pendingCount, orders]);

  // --- Schedule Calculations ---
  const scheduleData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDeliveries = orders.filter(o => o.deliveryDate === todayStr && o.status !== 'delivered' && o.status !== 'cancelled');
    const todayReady = orders.filter(o => o.deliveryDate === todayStr && o.status === 'ready');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tmrwStr = tomorrow.toISOString().split('T')[0];
    const tomorrowOrders = orders.filter(o => o.deliveryDate === tmrwStr && o.status !== 'cancelled');

    return {
      deliveries: todayDeliveries.length,
      ready: todayReady.length,
      tomorrow: tomorrowOrders.length
    };
  }, [orders]);

  // SVG Wave Component
  const CardWave = ({ color }) => (
    <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40px', opacity: 0.5, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }} viewBox="0 0 100 40" preserveAspectRatio="none">
      <path d="M0,20 C30,40 70,0 100,20 L100,40 L0,40 Z" fill={color} />
    </svg>
  );

  return (
    <div style={{ paddingBottom: 100, background: '#FAFAFA', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/assets/3d/cupcake.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: '#D95371', margin: 0, lineHeight: 1.2 }}>Cream & Crust</h1>
            <p style={{ fontSize: 11, color: '#6B7280', margin: 0, fontWeight: 500 }}>Let's bake happiness!</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Bell size={22} color="#4B5563" />
            <div style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 800, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FAFAFA' }}>{pendingCount || 0}</div>
          </div>
          <img src="/assets/profiles/avatar.png" alt="User" onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=" + firstName + "&background=D95371&color=fff"; }} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        </div>
      </div>

      {/* ── Greeting ── */}
      <div style={{ padding: '0 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            Good Evening, {firstName} <span style={{ fontSize: 20 }}>👋</span>
          </h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0, fontWeight: 500 }}>Here's what's happening in your bakery today.</p>
        </div>
        <button style={{ padding: '6px 12px', borderRadius: 99, border: '1px solid #E5E7EB', background: '#FFF', display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
          Business Health <ChevronRight size={14} />
        </button>
      </div>

      {/* ── 4 Key Metrics (Horizontal Scroll) ── */}
      <div style={{ padding: '0 20px', marginBottom: 32, display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { title: 'Revenue', val: formatCurrency(revenue), sub: 'Live', color: '#10B981', bg: '#FFF1F2', wave: '#FFE4E6' },
          { title: 'Orders', val: totalOrders.toString(), sub: 'Active', color: '#10B981', bg: '#F0FDF4', wave: '#DCFCE7' },
          { title: 'Profit', val: formatCurrency(profit), sub: 'Est.', color: '#10B981', bg: '#FFFBEB', wave: '#FEF3C7' },
          { title: 'Pending', val: formatCurrency(pendingAmount), sub: `${pendingCount} payments`, color: '#EF4444', bg: '#EEF2FF', wave: '#E0E7FF' }
        ].map((item, i) => (
          <div key={i} style={{ minWidth: 120, background: '#FFF', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #F3F4F6', position: 'relative', overflow: 'hidden' }}>
            <CardWave color={item.wave} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, position: 'relative', zIndex: 1 }}>
               <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>{item.title}</div>
               <div style={{ width: 20, height: 20, borderRadius: 6, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <span style={{ fontSize: 10 }}>📋</span>
               </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4, position: 'relative', zIndex: 1 }}>{item.val}</div>
            <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
               <span style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Smart Insights ── */}
      <div style={{ padding: '0 20px', marginBottom: 32 }}>
        
        {/* Smart Insights List */}
        <div style={{ background: '#FFF', borderRadius: 24, padding: 20, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>Smart Insights</h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', cursor: 'pointer' }}>View All <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></span>
          </div>
          
          {smartInsights.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {smartInsights.map((insight, i) => (
                <div key={insight.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i !== smartInsights.length - 1 ? '1px solid #F3F4F6' : 'none', paddingBottom: i !== smartInsights.length - 1 ? 12 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 16 }}>{insight.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{insight.title}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{insight.sub}</div>
                    </div>
                  </div>
                  <button style={{ padding: '6px 12px', borderRadius: 99, border: 'none', background: insight.btnBg, color: insight.btnColor, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                    {insight.btn}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#F9FAFB', borderRadius: 16, border: '1px dashed #E5E7EB' }}>
              <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>No insights right now.</span>
            </div>
          )}
        </div>

      </div>

      {/* ── Today's Schedule ── */}
      <div style={{ padding: '0 20px', marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>Today's Schedule</h3>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', cursor: 'pointer' }}>View Calendar <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></span>
        </div>
        
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 8 }}>
          
          <div style={{ minWidth: 160, background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, position: 'relative' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#6366F1', marginBottom: 4 }}>{scheduleData.deliveries} Deliveries</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>Scheduled Today</div>
            <img src="/assets/3d/scooter.png" alt="Delivery" style={{ position: 'absolute', bottom: 10, right: 10, width: 50, height: 50, objectFit: 'contain' }} />
          </div>

          <div style={{ minWidth: 160, background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, position: 'relative' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#10B981', marginBottom: 4 }}>{scheduleData.ready} Order Ready</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Pending Pickup</div>
            <img src="/assets/3d/cake.png" alt="Cake" style={{ position: 'absolute', bottom: 10, right: 10, width: 40, height: 40, objectFit: 'contain' }} />
          </div>

          <div style={{ minWidth: 160, background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, position: 'relative' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#F59E0B', marginBottom: 4 }}>{scheduleData.tomorrow} Orders</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>Tomorrow</div>
            <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 32 }}>📅</div>
          </div>

        </div>
      </div>

      {/* ── Bottom Navigation ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFF', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '12px 20px 24px', zIndex: 50 }}>
        <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#D95371', cursor: 'pointer' }}>
          <Home size={24} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>Home</span>
        </button>
        <button onClick={() => navigate('/orders')} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#9CA3AF', cursor: 'pointer' }}>
          <ShoppingBag size={24} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>Orders</span>
        </button>
        <div style={{ position: 'relative', top: -20 }}>
          <button style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #D95371 0%, #BE185D 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', boxShadow: '0 8px 20px rgba(217, 83, 113, 0.4)', cursor: 'pointer' }}>
            <Plus size={32} />
          </button>
        </div>
        <button onClick={() => navigate('/products')} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#9CA3AF', cursor: 'pointer' }}>
          <Box size={24} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>Products</span>
        </button>
        <button style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#9CA3AF', cursor: 'pointer' }}>
          <MenuIcon size={24} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>More</span>
        </button>
      </div>



    </div>
  );
}
