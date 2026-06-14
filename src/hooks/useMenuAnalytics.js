import { useState, useEffect, useMemo } from 'react';
import { getMenuEvents, subscribeToAnalyticsSummary, getProductAnalytics, getAnalyticsHealth } from '../services/menuAnalytics';
import { useData } from '../context/DataContext';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, doc, onSnapshot } from 'firebase/firestore';

/**
 * useMenuAnalytics — Reads from aggregated collections first (fast),
 * falls back to raw event aggregation for date-range filtering.
 * 
 * Multi-tenant safe: always filters by bakeryId == uid.
 */
export function useMenuAnalytics(uid, dateRange = 'month') {
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [productAnalytics, setProductAnalytics] = useState([]);
  const [hoursData, setHoursData] = useState(null);
  const [citiesData, setCitiesData] = useState([]);
  const [sourcesData, setSourcesData] = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const { products = [], orders = [] } = useData() || {};

  // ── Fetch raw events + aggregated data ─────────────────────────────
  useEffect(() => {
    if (!uid) return;
    let isMounted = true;
    const unsubs = [];

    async function fetchAll() {
      setLoading(true);

      // 1. Subscribe to real-time summary
      const unsubSummary = subscribeToAnalyticsSummary(uid, (data) => {
        if (isMounted) setSummary(data);
      });
      unsubs.push(unsubSummary);

      // 2. Fetch product analytics
      const prods = await getProductAnalytics(uid);
      if (isMounted) setProductAnalytics(prods);

      // 3. Fetch hours data
      try {
        const hoursRef = doc(db, 'analytics_peak_hours', uid);
        const unsubHours = onSnapshot(hoursRef, (snap) => {
          if (isMounted) setHoursData(snap.exists() ? snap.data() : null);
        });
        unsubs.push(unsubHours);
      } catch { /* ignore */ }

      // 4. Fetch cities
      try {
        const citiesQ = query(
          collection(db, 'analytics_cities'),
          where('bakeryId', '==', uid)
        );
        const citiesSnap = await getDocs(citiesQ);
        const cities = [];
        citiesSnap.forEach(d => cities.push({ id: d.id, ...d.data() }));
        if (isMounted) setCitiesData(cities);
      } catch { /* ignore */ }

      // 5. Fetch sources
      try {
        const sourcesRef = doc(db, 'analytics_sources', uid);
        const unsubSources = onSnapshot(sourcesRef, (snap) => {
          if (isMounted) setSourcesData(snap.exists() ? snap.data() : null);
        });
        unsubs.push(unsubSources);
      } catch { /* ignore */ }

      // 6. Fetch customers
      try {
        const customersRef = doc(db, 'analytics_customers', uid);
        const unsubCustomers = onSnapshot(customersRef, (snap) => {
          if (isMounted) setCustomersData(snap.exists() ? snap.data() : null);
        });
        unsubs.push(unsubCustomers);
      } catch { /* ignore */ }

      // 7. Fetch daily snapshots for trend data
      try {
        const dailyQ = query(
          collection(db, 'analytics_daily'),
          where('bakeryId', '==', uid)
        );
        const dailySnap = await getDocs(dailyQ);
        const daily = [];
        dailySnap.forEach(d => daily.push({ id: d.id, ...d.data() }));
        if (isMounted) setDailyData(daily);
      } catch { /* ignore */ }

      // 8. Fetch raw events (fallback for date-range filtering)
      const rawEvents = await getMenuEvents(uid);
      if (isMounted) setEvents(rawEvents || []);

      // 9. Health check
      const h = await getAnalyticsHealth(uid);
      if (isMounted) setHealth(h);

      if (isMounted) setLoading(false);
    }

    fetchAll();
    return () => {
      isMounted = false;
      unsubs.forEach(u => { try { u(); } catch { /* ignore */ } });
    };
  }, [uid, dateRange]);

  // ── Aggregate data ─────────────────────────────────────────────────
  const aggregatedData = useMemo(() => {
    // Date range filtering
    const now = new Date();
    let startDate = new Date();
    if (dateRange === 'today') {
      startDate.setHours(0,0,0,0);
    } else if (dateRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (dateRange === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate = new Date(0); // all time
    }

    // For comparison (previous period)
    const prevStartDate = new Date(startDate);
    const duration = now.getTime() - startDate.getTime();
    prevStartDate.setTime(prevStartDate.getTime() - duration);

    // Add a 1 hour buffer to 'now' to prevent server-client clock skew from dropping real-time events
    const futureBuffer = new Date(now.getTime() + 60 * 60 * 1000);
    const currentEvents = events.filter(e => e.date >= startDate && e.date <= futureBuffer);
    const prevEvents = events.filter(e => e.date >= prevStartDate && e.date < startDate);

    // Helper to count events
    const countEvents = (evs, type) => evs.filter(e => e.eventType === type).length;
    const countUnique = (evs, type, key = 'visitorId') =>
      new Set(evs.filter(e => e.eventType === type).map(e => e[key]).filter(Boolean)).size;

    // ── KPIs ──────────────────────────────────────────────────────────
    // Map to summary if available, else fallback to raw events
    const useSummary = !!summary;
    
    const menuViews = useSummary ? (summary.totalMenuViews || 0) : countEvents(currentEvents, 'menu_view');
    const prevMenuViews = countEvents(prevEvents, 'menu_view');
    const viewsGrowth = prevMenuViews ? ((menuViews - prevMenuViews) / prevMenuViews) * 100 : 0;

    const whatsappClicks = useSummary ? (summary.totalWhatsappClicks || 0) : countEvents(currentEvents, 'whatsapp_click');
    const prevWhatsappClicks = countEvents(prevEvents, 'whatsapp_click');
    const whatsappGrowth = prevWhatsappClicks ? ((whatsappClicks - prevWhatsappClicks) / prevWhatsappClicks) * 100 : 0;

    const instagramClicks = countEvents(currentEvents, 'instagram_click');
    const prevInstagramClicks = countEvents(prevEvents, 'instagram_click');
    const instagramGrowth = prevInstagramClicks ? ((instagramClicks - prevInstagramClicks) / prevInstagramClicks) * 100 : 0;

    // Use actual orders from DataContext for accuracy, filtered by date and ONLY from menu website
    const menuOrders = orders.filter(o => o.orderSource === 'menu');
    const currentOrders = menuOrders.filter(o => new Date(o.createdAt || o.date) >= startDate);
    const prevOrders = menuOrders.filter(o => {
      const d = new Date(o.createdAt || o.date);
      return d >= prevStartDate && d < startDate;
    });

    const ordersReceived = useSummary ? (summary.totalOrdersCompleted || 0) : currentOrders.length;
    const prevOrdersReceived = prevOrders.length;
    const ordersGrowth = prevOrdersReceived ? ((ordersReceived - prevOrdersReceived) / prevOrdersReceived) * 100 : 0;

    const revenue = useSummary ? (summary.totalRevenue || 0) : currentOrders.reduce((sum, o) => sum + (Number(o.total || o.totalAmount) || 0), 0);
    const prevRevenue = prevOrders.reduce((sum, o) => sum + (Number(o.total || o.totalAmount) || 0), 0);
    const revenueGrowth = prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    // ── Funnel Data ──────────────────────────────────────────────────
    const uniqueVisitors = useSummary && summary.uniqueVisitors ? summary.uniqueVisitors.length : countUnique(currentEvents, 'menu_view');
    const productViews = useSummary ? (summary.totalProductViews || 0) : countEvents(currentEvents, 'product_view');
    const productOpens = useSummary ? (summary.totalProductOpens || 0) : countEvents(currentEvents, 'product_expand');
    const abandonedCheckouts = useSummary ? (summary.totalCheckoutsAbandoned || 0) : countEvents(currentEvents, 'checkout_abandoned');

    // Overall Conversion
    const overallConversion = uniqueVisitors > 0 ? (ordersReceived / uniqueVisitors) * 100 : 0;
    const prevConversion = countUnique(prevEvents, 'menu_view') > 0
      ? (prevOrdersReceived / countUnique(prevEvents, 'menu_view')) * 100 : 0;
    const conversionGrowth = overallConversion - prevConversion;

    // ── Traffic Sources ──────────────────────────────────────────────
    const sources = {};
    const devices = { mobile: 0, desktop: 0, tablet: 0 };
    currentEvents.forEach(e => {
      if (e.eventType === 'menu_view') {
        sources[e.source] = (sources[e.source] || 0) + 1;
        if (e.devicePlatform) {
          devices[e.devicePlatform] = (devices[e.devicePlatform] || 0) + 1;
        } else {
          devices.mobile++;
        }
      }
    });

    // ── Peak Hours ───────────────────────────────────────────────────
    // Prefer aggregated data, fall back to raw events
    let hours = new Array(24).fill(0);
    if (hoursData?.hours && dateRange === 'all') {
      // Use aggregated data for all-time view
      for (let i = 0; i < 24; i++) {
        hours[i] = hoursData.hours[i] || 0;
      }
    } else {
      // Use raw events for date-range filtered view
      currentEvents.forEach(e => {
        if (e.eventType === 'menu_view' || e.eventType === 'order_completed') {
          if (e.date && typeof e.date.getHours === 'function') {
            hours[e.date.getHours()]++;
          }
        }
      });
    }

    // ── Top Products ─────────────────────────────────────────────────
    // Use aggregated product data for all-time, raw events for filtered
    const productStats = {};
    products.forEach(p => {
      productStats[p.id] = { id: p.id, name: p.name, image: p.image, views: 0, opens: 0, orders: 0, revenue: 0, whatsappClicks: 0 };
    });

    if (dateRange === 'all' && productAnalytics.length > 0) {
      // Use aggregated product analytics
      productAnalytics.forEach(pa => {
        if (productStats[pa.productId]) {
          productStats[pa.productId].views = pa.views || 0;
          productStats[pa.productId].opens = pa.opens || 0;
          productStats[pa.productId].orders = pa.orders || 0;
          productStats[pa.productId].revenue = pa.revenue || 0;
          productStats[pa.productId].whatsappClicks = pa.whatsappClicks || 0;
          if (pa.productName && !productStats[pa.productId].name) {
            productStats[pa.productId].name = pa.productName;
          }
        } else {
          // Product from analytics not in current product list
          productStats[pa.productId] = {
            id: pa.productId,
            name: pa.productName || pa.productId,
            image: null,
            views: pa.views || 0,
            opens: pa.opens || 0,
            orders: pa.orders || 0,
            revenue: pa.revenue || 0,
            whatsappClicks: pa.whatsappClicks || 0,
          };
        }
      });
    } else {
      // Use raw events for filtered views
      currentEvents.filter(e => e.eventType === 'product_view' && e.productId).forEach(e => {
        if (productStats[e.productId]) productStats[e.productId].views++;
      });
      currentEvents.filter(e => e.eventType === 'product_expand' && e.productId).forEach(e => {
        if (productStats[e.productId]) productStats[e.productId].opens++;
      });
      currentEvents.filter(e => e.eventType === 'whatsapp_click' && e.productId).forEach(e => {
        if (productStats[e.productId]) productStats[e.productId].whatsappClicks++;
      });
      currentOrders.forEach(o => {
        const match = products.find(p => p.name === o.product || p.name === o.cakeFlavour || p.id === o.productId);
        if (match && productStats[match.id]) {
          productStats[match.id].orders++;
          productStats[match.id].revenue += Number(o.total || o.totalAmount || 0);
        }
      });
    }

    const topProducts = Object.values(productStats)
      .filter(p => p.views > 0 || p.orders > 0)
      .sort((a, b) => b.revenue - a.revenue || b.views - a.views)
      .slice(0, 10)
      .map(p => ({
        ...p,
        conversion: p.views > 0 ? (p.orders / p.views) * 100 : 0,
        ctr: p.views > 0 ? (p.whatsappClicks / p.views) * 100 : 0,
      }));

    // ── Geo (Cities) ─────────────────────────────────────────────────
    const cities = {};
    if (citiesData.length > 0 && dateRange === 'all') {
      citiesData.forEach(c => {
        if (c.city) cities[c.city] = (cities[c.city] || 0) + (c.views || 0);
      });
    } else {
      currentEvents.forEach(e => {
        if (e.city) cities[e.city] = (cities[e.city] || 0) + 1;
      });
    }

    // ── Customer Insights ────────────────────────────────────────────
    const prevVisitors = new Set(prevEvents.map(e => e.visitorId).filter(Boolean));
    const currentVisitorSet = new Set(currentEvents.filter(e => e.eventType === 'menu_view').map(e => e.visitorId).filter(Boolean));
    let returningCustomers = 0;
    currentVisitorSet.forEach(vid => {
      if (prevVisitors.has(vid)) returningCustomers++;
    });
    const newCustomers = currentVisitorSet.size - returningCustomers;

    // Customer lifetime value from menu orders
    const customerOrderCounts = {};
    menuOrders.forEach(o => {
      const vid = o.visitorId || 'unknown';
      if (!customerOrderCounts[vid]) customerOrderCounts[vid] = { orders: 0, revenue: 0 };
      customerOrderCounts[vid].orders++;
      customerOrderCounts[vid].revenue += Number(o.total || o.totalAmount || 0);
    });
    const customerList = Object.values(customerOrderCounts);
    const avgOrdersPerCustomer = customerList.length > 0 
      ? customerList.reduce((s, c) => s + c.orders, 0) / customerList.length : 0;
    const avgCLV = customerList.length > 0
      ? customerList.reduce((s, c) => s + c.revenue, 0) / customerList.length : 0;
    const repeatCustomers = customerList.filter(c => c.orders > 1).length;

    // ── Instagram Analytics ──────────────────────────────────────────
    const instagramCTR = menuViews > 0 ? (instagramClicks / menuViews) * 100 : 0;
    const whatsappCTR = menuViews > 0 ? (whatsappClicks / menuViews) * 100 : 0;

    // ── Has Data Check (for empty states) ────────────────────────────
    const hasAnyData = events.length > 0 || (summary && summary.totalEvents > 0);

    return {
      hasAnyData,
      kpis: {
        menuViews: { value: menuViews, growth: viewsGrowth },
        whatsappClicks: { value: whatsappClicks, growth: whatsappGrowth },
        instagramClicks: { value: instagramClicks, growth: instagramGrowth },
        orders: { value: ordersReceived, growth: ordersGrowth },
        revenue: { value: revenue, growth: revenueGrowth },
        uniqueVisitors: { value: uniqueVisitors, growth: 0 },
      },
      funnel: {
        visitors: uniqueVisitors,
        productViews,
        productOpens,
        whatsappClicks,
        abandoned: abandonedCheckouts,
        orders: ordersReceived,
        revenue,
      },
      conversion: {
        value: overallConversion,
        growth: conversionGrowth,
        whatsappCTR,
        instagramCTR,
      },
      sources,
      devices,
      hours,
      topProducts,
      cities,
      customers: {
        new: newCustomers,
        returning: returningCustomers,
        repeatPurchases: repeatCustomers,
        avgOrdersPerCustomer: Math.round(avgOrdersPerCustomer * 10) / 10,
        avgCLV: Math.round(avgCLV),
        totalCustomers: customerList.length,
      },
      health,
      summary,
      rawEvents: currentEvents,
      _debug: { events, summary }
    };
  }, [events, dateRange, products, orders, summary, productAnalytics, hoursData, citiesData, sourcesData, customersData, dailyData, health]);

  return { data: aggregatedData, loading };
}
