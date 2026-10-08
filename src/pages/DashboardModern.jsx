import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  ChefHat,
  ChevronRight,
  Clock3,
  CreditCard,
  IndianRupee,
  Package,
  Plus,
  Sparkles,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

function isSameDate(dateValue, compareDate) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === compareDate.toISOString().slice(0, 10);
}

function MetricCard({ label, value, caption, icon: Icon, tone = 'rose' }) {
  const tones = {
    rose: ['rgba(181, 96, 106, 0.12)', 'var(--accent)'],
    sage: ['rgba(124, 154, 131, 0.16)', '#5f876b'],
    gold: ['rgba(212, 160, 80, 0.16)', '#b8872f'],
    ink: ['rgba(36, 23, 19, 0.08)', 'var(--text)'],
  };
  const [background, color] = tones[tone] || tones.rose;

  return (
    <div className="cc-command-metric">
      <div className="cc-command-metric-icon" style={{ background, color }}>
        <Icon size={18} strokeWidth={2.4} />
      </div>
      <div className="cc-command-metric-label">{label}</div>
      <div className="cc-command-metric-value">{value}</div>
      <div className="cc-command-metric-caption">{caption}</div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, caption, onClick }) {
  return (
    <button type="button" className="cc-command-action" onClick={onClick}>
      <span className="cc-command-action-icon">
        <Icon size={18} strokeWidth={2.4} />
      </span>
      <span>
        <strong>{label}</strong>
        <small>{caption}</small>
      </span>
      <ChevronRight size={16} />
    </button>
  );
}

export default function DashboardModern() {
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const { orders = [], inventory = [], expenses = [], loading } = useData();

  const businessName = userDetails?.businessName || userDetails?.name || 'Cream & Crust';
  const firstName = businessName.split(' ')[0] || 'Baker';

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const metrics = useMemo(() => {
    let revenue = 0;
    let activeOrders = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    let readyToday = 0;
    let deliveriesToday = 0;
    let tomorrowOrders = 0;

    orders.forEach((order) => {
      if (order.status === 'cancelled') return;

      const total = Number(order.total || 0);
      revenue += total;
      activeOrders += 1;

      if (order.paymentStatus === 'unpaid') {
        pendingAmount += total;
        pendingCount += 1;
      }
      if (isSameDate(order.deliveryDate, today)) {
        if (order.status === 'ready') readyToday += 1;
        if (order.status !== 'delivered') deliveriesToday += 1;
      }
      if (isSameDate(order.deliveryDate, tomorrow)) {
        tomorrowOrders += 1;
      }
    });

    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const profit = revenue - totalExpenses;

    return {
      revenue,
      activeOrders,
      pendingAmount,
      pendingCount,
      profit,
      readyToday,
      deliveriesToday,
      tomorrowOrders,
    };
  }, [expenses, orders]);

  const insights = useMemo(() => {
    const nextThreeDays = new Date();
    nextThreeDays.setDate(nextThreeDays.getDate() + 3);

    const expiringItems = inventory.filter((item) => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      return !Number.isNaN(expiry.getTime()) && expiry <= nextThreeDays;
    });

    const lowStockItems = inventory.filter(
      (item) => Number(item.stock || 0) <= Number(item.minStock || 0)
    );

    return [
      expiringItems.length
        ? {
          title: `${expiringItems.length} ingredients need attention`,
          caption: expiringItems.slice(0, 2).map((item) => item.item).join(', '),
          icon: AlertTriangle,
          action: 'Review stock',
          route: '/inventory',
        }
        : null,
      metrics.pendingCount
        ? {
          title: `${formatCurrency(metrics.pendingAmount)} still unpaid`,
          caption: `${metrics.pendingCount} customer payment${metrics.pendingCount > 1 ? 's' : ''} pending`,
          icon: CreditCard,
          action: 'Open orders',
          route: '/orders',
        }
        : null,
      lowStockItems.length
        ? {
          title: `${lowStockItems.length} low-stock item${lowStockItems.length > 1 ? 's' : ''}`,
          caption: lowStockItems.slice(0, 2).map((item) => item.item).join(', '),
          icon: Package,
          action: 'Plan purchase',
          route: '/shopping-list',
        }
        : null,
    ].filter(Boolean);
  }, [inventory, metrics.pendingAmount, metrics.pendingCount]);

  return (
    <div className="cc-command-center">
      <section className="cc-command-hero">
        <div>
          <div className="cc-command-kicker">
            <Sparkles size={15} />
            Atelier command center
          </div>
          <h1>{firstName}, your bakery is in motion.</h1>
          <p>
            Track today&apos;s production, money, and menu work from one quiet, fast cockpit.
          </p>
        </div>

        <div className="cc-command-hero-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/calendar')}>
            <CalendarDays size={17} /> Today&apos;s calendar
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/orders')}>
            <Plus size={17} /> New order
          </button>
        </div>
      </section>

      <section className="cc-command-grid" aria-busy={loading ? 'true' : 'false'}>
        <MetricCard
          label="Revenue"
          value={formatCurrency(metrics.revenue)}
          caption="Confirmed non-cancelled orders"
          icon={IndianRupee}
          tone="rose"
        />
        <MetricCard
          label="Profit"
          value={formatCurrency(metrics.profit)}
          caption="Revenue minus logged expenses"
          icon={TrendingUp}
          tone="sage"
        />
        <MetricCard
          label="Active Orders"
          value={metrics.activeOrders}
          caption={`${metrics.deliveriesToday} due today`}
          icon={ShoppingBag}
          tone="gold"
        />
        <MetricCard
          label="Pending Cash"
          value={formatCurrency(metrics.pendingAmount)}
          caption={`${metrics.pendingCount} unpaid order${metrics.pendingCount === 1 ? '' : 's'}`}
          icon={CreditCard}
          tone="ink"
        />
      </section>

      <section className="cc-command-layout">
        <div className="cc-command-panel cc-command-schedule">
          <div className="cc-command-panel-header">
            <div>
              <span>Production Rhythm</span>
              <h2>Today&apos;s schedule</h2>
            </div>
            <button type="button" onClick={() => navigate('/calendar')}>
              View all <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="cc-command-timeline">
            <div>
              <Clock3 size={18} />
              <strong>{metrics.deliveriesToday} deliveries</strong>
              <span>Need handoff today</span>
            </div>
            <div>
              <ChefHat size={18} />
              <strong>{metrics.readyToday} ready</strong>
              <span>Waiting for pickup or dispatch</span>
            </div>
            <div>
              <CalendarDays size={18} />
              <strong>{metrics.tomorrowOrders} tomorrow</strong>
              <span>Prep list for the next bake day</span>
            </div>
          </div>
        </div>

        <div className="cc-command-panel">
          <div className="cc-command-panel-header">
            <div>
              <span>Smart Focus</span>
              <h2>What needs attention</h2>
            </div>
          </div>

          {insights.length ? (
            <div className="cc-command-insights">
              {insights.map((insight) => (
                <button
                  type="button"
                  key={insight.title}
                  className="cc-command-insight"
                  onClick={() => navigate(insight.route)}
                >
                  <span className="cc-command-insight-icon">
                    <insight.icon size={17} strokeWidth={2.4} />
                  </span>
                  <span>
                    <strong>{insight.title}</strong>
                    <small>{insight.caption}</small>
                  </span>
                  <em>{insight.action}</em>
                </button>
              ))}
            </div>
          ) : (
            <div className="cc-command-empty">
              <Sparkles size={18} />
              <strong>Nothing urgent right now</strong>
              <span>Your orders, stock, and payments look calm.</span>
            </div>
          )}
        </div>
      </section>

      <section className="cc-command-actions-grid">
        <ActionButton
          icon={ShoppingBag}
          label="Manage orders"
          caption="Baking, delivery, payment"
          onClick={() => navigate('/orders')}
        />
        <ActionButton
          icon={Package}
          label="Update products"
          caption="Prices, photos, menu items"
          onClick={() => navigate('/products')}
        />
        <ActionButton
          icon={ChefHat}
          label="Recipe studio"
          caption="Costing and production prep"
          onClick={() => navigate('/recipes')}
        />
        <ActionButton
          icon={Sparkles}
          label="Cream AI"
          caption="Ask, draft, summarize"
          onClick={() => navigate('/ai-assistant')}
        />
      </section>
    </div>
  );
}
