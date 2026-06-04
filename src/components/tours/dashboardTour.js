/**
 * Dashboard module tour steps.
 * Each step highlights a real UI element on the Dashboard page.
 */
export const dashboardTourSteps = [
  {
    emoji: '👋',
    title: 'Your Command Center',
    description:
      'This is your dashboard — everything about your bakery at a glance. Revenue, orders, deliveries, all in one place.',
  },
  {
    target: '.showcase-stat-revenue, .stat-card:first-child',
    emoji: '💰',
    title: "Today's Numbers",
    description:
      'See your daily revenue, active orders, and pending payments updated in real-time.',
  },
  {
    target: '[data-tour="quick-actions"]',
    emoji: '⚡',
    title: 'Quick Actions',
    description:
      'One tap to create an order, add a product, check expenses, or open your recipe vault.',
  },
  {
    target: '[data-tour="insights"]',
    emoji: '🧠',
    title: 'Smart Insights',
    description:
      'Your bestselling product, busiest day, top customer — the app learns your patterns and surfaces what matters.',
  },
  {
    target: '[data-tour="deliveries"]',
    emoji: '🚗',
    title: "Today's Deliveries",
    description:
      'All orders due today in one scrollable list. Tap to update status, call the customer, or share on WhatsApp.',
  },
];
