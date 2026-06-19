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

    // Filter Daily Data for date ranges
    const currentDaily = dailyData.filter(d => new Date(d.date) >= startDate);
    const prevDaily = dailyData.filter(d => {
      const dDate = new Date(d.date);
      return dDate >= prevStartDate && dDate < startDate;
    });

    const sumDaily = (arr, key) => arr.reduce((sum, d) => sum + (Number(d[key]) || 0), 0);

    // ── KPIs ──────────────────────────────────────────────────────────
    let menuViews = 0, prevMenuViews = 0;
    let whatsappClicks = 0, prevWhatsappClicks = 0;
    let instagramClicks = 0, prevInstagramClicks = 0;
    let ordersReceived = 0, prevOrdersReceived = 0;
    let revenue = 0, prevRevenue = 0;
    let productViews = 0, productOpens = 0, abandonedCheckouts = 0;
    let uniqueVisitors = 0;

    if (currentDaily.length > 0) {
      // ── TIER 1: Aggregated Daily Data (fastest, date-range filtered) ──
      menuViews = sumDaily(currentDaily, 'views');
      whatsappClicks = sumDaily(currentDaily, 'whatsappClicks');
      instagramClicks = sumDaily(currentDaily, 'instagramClicks');
      ordersReceived = sumDaily(currentDaily, 'orders');
      revenue = sumDaily(currentDaily, 'revenue');
      productViews = sumDaily(currentDaily, 'productViews');
      productOpens = sumDaily(currentDaily, 'productOpens');

      prevMenuViews = sumDaily(prevDaily, 'views');
      prevWhatsappClicks = sumDaily(prevDaily, 'whatsappClicks');
      prevInstagramClicks = sumDaily(prevDaily, 'instagramClicks');
      prevOrdersReceived = sumDaily(prevDaily, 'orders');
      prevRevenue = sumDaily(prevDaily, 'revenue');

      const visitorSet = new Set();
      currentDaily.forEach(d => {
        if (d.uniqueVisitors) d.uniqueVisitors.forEach(v => visitorSet.add(v));
      });
      uniqueVisitors = visitorSet.size;

    } else if (events.length > 0) {
      // ── TIER 2: Raw Events fallback (date-range filtered) ────────────
      const futureBuffer = new Date(now.getTime() + 60 * 60 * 1000);
      const currentEvents = events.filter(e => e.date >= startDate && e.date <= futureBuffer);
      const prevEvents = events.filter(e => e.date >= prevStartDate && e.date < startDate);

      const countEvents = (evs, type) => evs.filter(e => e.eventType === type).length;
      const countUnique = (evs, type, key = 'visitorId') =>
        new Set(evs.filter(e => e.eventType === type).map(e => e[key]).filter(Boolean)).size;

      menuViews = countEvents(currentEvents, 'menu_view');
      prevMenuViews = countEvents(prevEvents, 'menu_view');
      whatsappClicks = countEvents(currentEvents, 'whatsapp_click');
      prevWhatsappClicks = countEvents(prevEvents, 'whatsapp_click');
      instagramClicks = countEvents(currentEvents, 'instagram_click');
      prevInstagramClicks = countEvents(prevEvents, 'instagram_click');
      productViews = countEvents(currentEvents, 'product_view');
      productOpens = countEvents(currentEvents, 'product_expand');
      abandonedCheckouts = countEvents(currentEvents, 'checkout_abandoned');
      uniqueVisitors = countUnique(currentEvents, 'menu_view');

      // Only menu orders — never app orders
      const menuOrders = orders.filter(o => o.orderSource === 'menu');
      const currentOrders = menuOrders.filter(o => new Date(o.createdAt || o.date) >= startDate);
      const prevOrders = menuOrders.filter(o => {
        const d = new Date(o.createdAt || o.date);
        return d >= prevStartDate && d < startDate;
      });
      ordersReceived = currentOrders.length;
      prevOrdersReceived = prevOrders.length;
      revenue = currentOrders.reduce((sum, o) => sum + (Number(o.total || o.totalAmount) || 0), 0);
      prevRevenue = prevOrders.reduce((sum, o) => sum + (Number(o.total || o.totalAmount) || 0), 0);

    } else if (summary) {
      // ── TIER 3: analytics_summary fallback (all-time totals) ─────────
      // Used when dailyData and rawEvents are both empty.
      // This is the ONLY source of truth when Firestore aggregation exists
      // but the client-side collections haven't loaded data for the period.
      console.log('[useMenuAnalytics] No daily/event data — using analytics_summary as fallback', summary);
      menuViews = summary.totalMenuViews || 0;
      whatsappClicks = summary.totalWhatsappClicks || 0;
      instagramClicks = summary.totalInstagramClicks || 0;
      ordersReceived = summary.totalOrdersCompleted || 0;
      revenue = summary.totalRevenue || 0;
      productViews = summary.totalProductViews || 0;
      productOpens = summary.totalProductOpens || 0;
      abandonedCheckouts = summary.totalCheckoutsAbandoned || 0;
      uniqueVisitors = summary.uniqueVisitors ? summary.uniqueVisitors.length : 0;
    }

    // Growth Calcs
    const calcGrowth = (curr, prev) => prev ? ((curr - prev) / prev) * 100 : 0;
    const viewsGrowth = calcGrowth(menuViews, prevMenuViews);
    const whatsappGrowth = calcGrowth(whatsappClicks, prevWhatsappClicks);
    const instagramGrowth = calcGrowth(instagramClicks, prevInstagramClicks);
    const ordersGrowth = calcGrowth(ordersReceived, prevOrdersReceived);
    const revenueGrowth = calcGrowth(revenue, prevRevenue);

    // ── Funnel Data ──────────────────────────────────────────────────
    const overallConversion = uniqueVisitors > 0 ? (ordersReceived / uniqueVisitors) * 100 : 0;
    const prevConversion = prevMenuViews > 0 ? (prevOrdersReceived / prevMenuViews) * 100 : 0;
    const conversionGrowth = overallConversion - prevConversion;

    // ── Traffic Sources ──────────────────────────────────────────────
    const sources = {};
    const devices = { mobile: 0, desktop: 0, tablet: 0 };
    events.filter(e => e.date >= startDate).forEach(e => {
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
    let hours = new Array(24).fill(0);
    if (hoursData?.hours && dateRange === 'all') {
      for (let i = 0; i < 24; i++) {
        hours[i] = hoursData.hours[i] || 0;
      }
    } else {
      events.filter(e => e.date >= startDate).forEach(e => {
        if (e.eventType === 'menu_view' || e.eventType === 'order_completed') {
          if (e.date && typeof e.date.getHours === 'function') {
            hours[e.date.getHours()]++;
          }
        }
      });
    }

    // ── Top Products ─────────────────────────────────────────────────
    const productStats = {};
    products.forEach(p => {
      productStats[p.id] = { id: p.id, name: p.name, image: p.image, views: 0, opens: 0, orders: 0, revenue: 0, whatsappClicks: 0 };
    });

    if (dateRange === 'all' && productAnalytics.length > 0) {
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
      events.filter(e => e.date >= startDate).forEach(e => {
        if (e.eventType === 'product_view' && e.productId) {
          if (productStats[e.productId]) productStats[e.productId].views++;
        }
        if (e.eventType === 'product_expand' && e.productId) {
          if (productStats[e.productId]) productStats[e.productId].opens++;
        }
        if (e.eventType === 'whatsapp_click' && e.productId) {
          if (productStats[e.productId]) productStats[e.productId].whatsappClicks++;
        }
      });
      orders.filter(o => new Date(o.createdAt || o.date) >= startDate).forEach(o => {
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
      events.filter(e => e.date >= startDate).forEach(e => {
        if (e.city) cities[e.city] = (cities[e.city] || 0) + 1;
      });
    }

    // ── Customer Insights ────────────────────────────────────────────
    let newCustomers = 0;
    let returningCustomers = 0;
    let repeatCustomers = 0;
    let avgOrdersPerCustomer = 0;
    let avgCLV = 0;
    let customerListLength = 0;

    if (dateRange === 'all' && summary) {
      newCustomers = summary.uniqueVisitors ? summary.uniqueVisitors.length : 0;
      returningCustomers = 0; // Requires raw data or specialized aggregation
    } else {
      const prevStartDateDate = new Date(prevStartDate);
      const startDateDate = new Date(startDate);
      const prevVisitors = new Set(events.filter(e => e.date >= prevStartDateDate && e.date < startDateDate && e.eventType === 'menu_view').map(e => e.visitorId).filter(Boolean));
      const currentVisitorSet = new Set(events.filter(e => e.date >= startDateDate && e.eventType === 'menu_view').map(e => e.visitorId).filter(Boolean));
      currentVisitorSet.forEach(vid => {
        if (prevVisitors.has(vid)) returningCustomers++;
      });
      newCustomers = currentVisitorSet.size - returningCustomers;
    }

    // Customer lifetime value from menu orders
    const menuOrders = orders.filter(o => o.orderSource === 'menu');
    const customerOrderCounts = {};
    menuOrders.forEach(o => {
      const vid = o.visitorId || 'unknown';
      if (!customerOrderCounts[vid]) customerOrderCounts[vid] = { orders: 0, revenue: 0 };
      customerOrderCounts[vid].orders++;
      customerOrderCounts[vid].revenue += Number(o.total || o.totalAmount || 0);
    });
    const customerList = Object.values(customerOrderCounts);
    avgOrdersPerCustomer = customerList.length > 0 
      ? customerList.reduce((s, c) => s + c.orders, 0) / customerList.length : 0;
    avgCLV = customerList.length > 0
      ? customerList.reduce((s, c) => s + c.revenue, 0) / customerList.length : 0;
    repeatCustomers = customerList.filter(c => c.orders > 1).length;
    customerListLength = customerList.length;

    // ── Instagram Analytics ──────────────────────────────────────────
    const instagramCTR = menuViews > 0 ? (instagramClicks / menuViews) * 100 : 0;
    const whatsappCTR = menuViews > 0 ? (whatsappClicks / menuViews) * 100 : 0;

    // ── Debug: log final KPI values before render ─────────────────────
    console.log('[useMenuAnalytics] KPIs →', {
      dateRange,
      dailyDocs: dailyData.length,
      currentDailyDocs: currentDaily.length,
      rawEvents: events.length,
      summaryExists: !!summary,
      menuViews, whatsappClicks, ordersReceived, revenue, productViews,
    });

    // ── Has Data Check (for empty states) ────────────────────────────
    // True when ANY of these sources indicate real data exists
    const summaryHasData = summary && (
      (summary.totalEvents > 0) ||
      (summary.totalMenuViews > 0) ||
      (summary.totalOrdersCompleted > 0) ||
      (summary.totalRevenue > 0)
    );
    const hasAnyData = events.length > 0 || !!summaryHasData || currentDaily.length > 0;

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
        totalCustomers: customerListLength,
      },
      health,
      summary,
      rawEvents: events,
      _debug: { events, summary, currentDaily }
    };
  }, [events, dateRange, products, orders, summary, productAnalytics, hoursData, citiesData, sourcesData, customersData, dailyData, health]);

  return { data: aggregatedData, loading, hasAnyData: aggregatedData.hasAnyData };
}
