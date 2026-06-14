import React, { useState, useRef } from 'react';
import { 
  Eye, Calendar, ArrowUp, ArrowDown, ShoppingBag, 
  MessageCircle, IndianRupee, UserPlus, Users, Download, Smartphone,
  Instagram, Share2, Activity, CheckCircle, XCircle, Phone
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useMenuAnalytics } from '../../hooks/useMenuAnalytics';
import { formatCurrency } from '../../utils/date';
import { showToast } from '../../components/iOS';
import './MenuAnalytics.css';
import MenuBuilderShell from './MenuBuilderShell';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const KPICard = ({ title, value, growth, icon: Icon, colorClass }) => {
  const isPos = growth >= 0;
  return (
    <div className={`kpi-card ${colorClass}`}>
      <div className="kpi-icon-wrapper"><Icon size={20} strokeWidth={2} /></div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{title}</div>
      <div className={`kpi-growth ${isPos ? 'positive' : 'negative'}`}>
        {isPos ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
        {Math.abs(growth).toFixed(0)}% <span className="kpi-growth-vs">vs prev</span>
      </div>
    </div>
  );
};

const HealthIndicator = ({ label, active }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 600 }}>
    {active ? <CheckCircle size={14} color="#16A34A" /> : <XCircle size={14} color="#DC2626" />}
    <span style={{ color: active ? '#16A34A' : '#DC2626' }}>{label}</span>
  </div>
);

const EmptyAnalytics = () => (
  <div style={{ textAlign: 'center', padding: '48px 20px', color: '#7B6E6A' }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2D2323', margin: '0 0 8px' }}>No analytics collected yet</h3>
    <p style={{ fontSize: '0.9rem', margin: '0 0 4px', lineHeight: 1.5 }}>
      Waiting for menu visitors. Share your menu link to start tracking.
    </p>
    <p style={{ fontSize: '0.8rem', color: '#9C8A80', margin: 0 }}>
      Analytics will appear here once your first visitor opens your menu.
    </p>
  </div>
);

export default function MenuAnalytics() {
  const { currentUser } = useAuth();
  const [dateRange, setDateRange] = useState('month');
  const { business } = useData() || {};
  const milestoneRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const { data, loading, hasAnyData, _debug } = useMenuAnalytics(currentUser?.uid, dateRange);

  if (loading) {
    return (
      <MenuBuilderShell hideProgressBar>
        <div className="analytics-dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <div style={{ color: '#7B6E6A' }}>Loading analytics...</div>
        </div>
      </MenuBuilderShell>
    );
  }

  const { kpis, funnel, conversion, topProducts, sources, devices, hours, cities, customers, health } = data;

  const exportToCSV = () => {
    const rows = [
      ['Menu Analytics Export'], ['Date Range', dateRange], [''],
      ['KPI', 'Value', 'Growth %'],
      ['Menu Views', kpis.menuViews.value, kpis.menuViews.growth.toFixed(1)],
      ['WhatsApp Clicks', kpis.whatsappClicks.value, kpis.whatsappClicks.growth.toFixed(1)],
      ['Orders Received', kpis.orders.value, kpis.orders.growth.toFixed(1)],
      ['Revenue', kpis.revenue.value, kpis.revenue.growth.toFixed(1)],
      [''], ['Top Products', 'Views', 'Orders', 'Revenue'],
      ...topProducts.map(p => [p.name, p.views, p.orders, p.revenue]),
    ];
    const csvContent = rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `menu_analytics_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleShareMilestone = async () => {
    if (!milestoneRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(milestoneRef.current, { scale: 2, backgroundColor: '#FFF', useCORS: true });
      const image = canvas.toDataURL("image/png");
      const text = `We just hit ${kpis.orders.value} orders! 🧁 Thank you to all our amazing customers!`;
      try {
        const blob = await (await fetch(image)).blob();
        const file = new File([blob], 'milestone_story.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'Menu Milestone', text, files: [file] });
          showToast('Shared successfully!', 'success');
          setSharing(false);
          return;
        }
      } catch { /* fallback */ }
      const link = document.createElement('a');
      link.download = 'milestone_story.png';
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (navigator.clipboard) await navigator.clipboard.writeText(text).catch(() => {});
      showToast('Image saved & caption copied!', 'success');
    } catch { showToast('Failed to generate image', 'error'); }
    finally { setSharing(false); }
  };

  // Chart Data
  const conversionData = {
    labels: ['Converted', 'Did not convert'],
    datasets: [{ data: [conversion.value, 100 - conversion.value], backgroundColor: ['#C95C74', '#FDECEF'], borderWidth: 0, cutout: '75%' }]
  };

  const trafficData = {
    labels: Object.keys(sources).length ? Object.keys(sources) : ['No Data'],
    datasets: [{
      data: Object.keys(sources).length ? Object.values(sources) : [100],
      backgroundColor: Object.keys(sources).length ? ['#C95C74', '#16A34A', '#9333EA', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'] : ['#EFEBE9'],
      borderWidth: 0,
    }]
  };

  const deviceData = {
    labels: ['Mobile', 'Desktop', 'Tablet'],
    datasets: [{
      data: [devices.mobile, devices.desktop, devices.tablet].some(d => d > 0) ? [devices.mobile, devices.desktop, devices.tablet] : [100, 0, 0],
      backgroundColor: ['#C95C74', '#D8B97E', '#7B6E6A'], borderWidth: 0,
    }]
  };

  const peakHoursData = {
    labels: ['12 AM','','','','','','6 AM','','','','','','12 PM','','','','','','6 PM','','','','','11 PM'],
    datasets: [{ data: hours, backgroundColor: '#ECA5B5', hoverBackgroundColor: '#C95C74', borderRadius: 4 }]
  };

  const funnelSteps = [
    { label: 'Menu Visitors', value: funnel.visitors, pct: 100, color: '#C95C74', width: '100%' },
    { label: 'Product Views', value: funnel.productViews, pct: funnel.visitors ? (funnel.productViews/funnel.visitors)*100 : 0, color: '#ECA5B5', width: '85%' },
    { label: 'Product Opens', value: funnel.productOpens, pct: funnel.visitors ? (funnel.productOpens/funnel.visitors)*100 : 0, color: '#F3C5D0', width: '70%' },
    { label: 'WhatsApp Clicks', value: funnel.whatsappClicks, pct: funnel.visitors ? (funnel.whatsappClicks/funnel.visitors)*100 : 0, color: '#22A85B', width: '55%' },
    { label: 'Orders Placed', value: funnel.orders, pct: funnel.visitors ? (funnel.orders/funnel.visitors)*100 : 0, color: '#9333EA', width: '40%' }
  ];

  return (
    <MenuBuilderShell hideProgressBar>
      <div className="analytics-dashboard">
        
        <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="analytics-title">Menu Analytics</h1>
            <p className="analytics-subtitle">Track performance of your menu and grow your bakery business.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select className="date-picker-btn" value={dateRange} onChange={(e) => setDateRange(e.target.value)}
                style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <button className="date-picker-btn" onClick={exportToCSV} style={{ padding: '8px 16px', borderRadius: '8px' }}>
              Export
            </button>
          </div>
        </div>

        {/* Empty State Overlay if needed, but we render the dashboard below */}
        {!hasAnyData && (
          <div style={{ background: '#FFFDF9', border: '1px dashed #D8B97E', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', color: '#B5606A', fontWeight: 600 }}>
            Share your menu link to start collecting live data! Showing 0s until your first visitor.
          </div>
        )}

        {/* KPIs */}
            <div className="kpi-grid">
              <KPICard title="Menu Views" value={kpis.menuViews.value.toLocaleString()} growth={kpis.menuViews.growth} icon={Eye} colorClass="pink" />
              <KPICard title="WhatsApp Clicks" value={kpis.whatsappClicks.value.toLocaleString()} growth={kpis.whatsappClicks.growth} icon={MessageCircle} colorClass="purple" />
              <KPICard title="Orders Received" value={kpis.orders.value.toLocaleString()} growth={kpis.orders.growth} icon={ShoppingBag} colorClass="green" />
              <KPICard title="Revenue" value={formatCurrency(kpis.revenue.value)} growth={kpis.revenue.growth} icon={IndianRupee} colorClass="orange" />
            </div>

            {/* Funnel & Conversion */}
            <div className="two-col-grid">
              <div className="dashboard-section" style={{ marginBottom: 0 }}>
                <h2 className="section-title">Sales Funnel</h2>
                <div className="funnel-container">
                  <div className="funnel-chart">
                    {funnelSteps.map((s, i) => (
                      <div key={i} className="funnel-segment" style={{ width: s.width, background: s.color }} />
                    ))}
                  </div>
                  <div className="funnel-list">
                    {funnelSteps.map((s, i) => (
                      <div key={i} className="funnel-item">
                        <span className="funnel-item-label">{s.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="funnel-item-value">{s.value.toLocaleString()}</span>
                          {i > 0 && <span className="funnel-item-pct">{s.pct.toFixed(0)}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="dashboard-section" style={{ marginBottom: 0 }}>
                <h2 className="section-title">Conversion Rate</h2>
                <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto' }}>
                  <Doughnut data={conversionData} options={{ cutout: '80%', plugins: { tooltip: { enabled: false }, legend: { display: false } } }} />
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2D2323' }}>{conversion.value.toFixed(1)}%</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#7B6E6A', fontWeight: 600 }}>WhatsApp CTR</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#22A85B' }}>{(conversion.whatsappCTR || 0).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#7B6E6A', fontWeight: 600 }}>Instagram CTR</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#C13584' }}>{(conversion.instagramCTR || 0).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="dashboard-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="section-title" style={{ margin: 0 }}>Top Selling Products</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="product-table">
                  <thead><tr>
                    <th>#</th><th>Product</th><th style={{ textAlign: 'right' }}>Views</th>
                    <th style={{ textAlign: 'right' }}>Orders</th><th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Conversion</th>
                  </tr></thead>
                  <tbody>
                    {topProducts.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', color: '#7B6E6A', padding: '20px' }}>No product data yet. Waiting for menu visitors.</td></tr>
                    ) : topProducts.map((p, i) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700 }}>{i + 1}</td>
                        <td>
                          <div className="product-info">
                            {p.image ? <img src={p.image} alt={p.name} className="product-img" /> : <div className="product-img" style={{ background: '#F5F1EE' }} />}
                            <div><div className="product-name">{p.name}</div></div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.views}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.orders}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.revenue)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.conversion.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Traffic & Peak Hours */}
            <div className="two-col-grid">
              <div className="dashboard-section" style={{ marginBottom: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <h2 className="section-title">Traffic Sources</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '100px', height: '100px' }}>
                        <Doughnut data={trafficData} options={{ plugins: { legend: { display: false }, tooltip: { enabled: false } }, cutout: '65%' }} />
                      </div>
                      <div style={{ width: '100%' }}>
                        {trafficData.labels.map((label, i) => {
                          const val = trafficData.datasets[0].data[i];
                          const total = trafficData.datasets[0].data.reduce((a,b)=>a+b, 0) || 1;
                          const pct = (val/total*100).toFixed(0);
                          const color = trafficData.datasets[0].backgroundColor[i];
                          return (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                                <span style={{ color: '#2D2323', fontWeight: 600, textTransform: 'capitalize' }}>{label}</span>
                              </div>
                              <span style={{ fontWeight: 700, color: '#2D2323' }}>{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h2 className="section-title"><Smartphone size={14} style={{ display: 'inline', verticalAlign: 'text-bottom'}}/> Devices</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '100px', height: '100px' }}>
                        <Doughnut data={deviceData} options={{ plugins: { legend: { display: false }, tooltip: { enabled: false } }, cutout: '65%' }} />
                      </div>
                      <div style={{ width: '100%' }}>
                        {deviceData.labels.map((label, i) => {
                          const val = deviceData.datasets[0].data[i];
                          const total = deviceData.datasets[0].data.reduce((a,b)=>a+b, 0) || 1;
                          const pct = (val/total*100).toFixed(0);
                          const color = deviceData.datasets[0].backgroundColor[i];
                          return (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                                <span style={{ color: '#2D2323', fontWeight: 600 }}>{label}</span>
                              </div>
                              <span style={{ fontWeight: 700, color: '#2D2323' }}>{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dashboard-section" style={{ marginBottom: 0 }}>
                <h2 className="section-title" style={{ margin: '0 0 16px' }}>Peak Ordering Time</h2>
                <div style={{ height: '120px' }}>
                  <Bar data={peakHoursData} options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: {
                      x: { grid: { display: false }, ticks: { maxRotation: 0, font: { size: 9 }, color: '#7B6E6A' }, border: { display: false } },
                      y: { display: false }
                    }
                  }} />
                </div>
              </div>
            </div>

            {/* Geo & Customer Insights */}
            <div className="two-col-grid">
              <div className="dashboard-section" style={{ marginBottom: 0 }}>
                <h2 className="section-title">Top Cities</h2>
                {Object.keys(cities).length === 0 ? (
                  <div style={{ color: '#7B6E6A', fontSize: '0.8rem' }}>No location data available yet. City data appears after visitors open your menu.</div>
                ) : (
                  Object.entries(cities).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([city, val], i, arr) => {
                    const max = arr[0][1];
                    const pct = Math.max((val/max)*100, 5);
                    const opacity = 1 - (i * 0.15);
                    return (
                      <div key={city} className="horiz-bar-container">
                        <div className="horiz-bar-label">{city}</div>
                        <div className="horiz-bar-track">
                          <div className="horiz-bar-fill" style={{ width: `${pct}%`, opacity }} />
                        </div>
                        <div className="horiz-bar-pct">{val}</div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="dashboard-section" style={{ marginBottom: 0 }}>
                <h2 className="section-title">Customer Insights</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="insight-subcard">
                    <div className="insight-subcard-header"><UserPlus size={16} color="#C95C74" /> New</div>
                    <div className="insight-subcard-val">{customers.new}</div>
                  </div>
                  <div className="insight-subcard">
                    <div className="insight-subcard-header"><Users size={16} color="#16A34A" /> Returning</div>
                    <div className="insight-subcard-val">{customers.returning}</div>
                  </div>
                  <div className="insight-subcard">
                    <div className="insight-subcard-header">Repeat Purchases</div>
                    <div className="insight-subcard-val">{customers.repeatPurchases || 0}</div>
                  </div>
                  <div className="insight-subcard">
                    <div className="insight-subcard-header">Avg CLV</div>
                    <div className="insight-subcard-val">{formatCurrency(customers.avgCLV || 0)}</div>
                  </div>
                </div>
              </div>
            </div>
      </div>

      {/* Hidden Milestone Card */}
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -10, opacity: 0, pointerEvents: 'none' }}>
        <div ref={milestoneRef} style={{ width: 320, padding: 24, borderRadius: 24, background: 'linear-gradient(135deg, #FFF 0%, #FFFDF9 100%)' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#B5606A', marginBottom: 8 }}>{business?.name || 'Cream & Crust'}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#2D2323', marginBottom: 16 }}>Thank You! 🎉</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#2D2323', lineHeight: 1 }}>{kpis.orders.value}</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#7B6E6A', marginTop: 4, marginBottom: 24 }}>Orders this {dateRange === 'all' ? 'year' : dateRange}</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFF', background: '#2D2323', padding: '12px 16px', borderRadius: 12, textAlign: 'center' }}>Link in bio to order 🧁</div>
        </div>
      </div>
    </MenuBuilderShell>
  );
}
