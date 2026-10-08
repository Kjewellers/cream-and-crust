/**
 * PremiumFeatureRegistry.js
 *
 * Single source of truth for ALL premium feature metadata.
 * Every gate, badge, paywall, and analytics event references this registry.
 * Never scatter feature names as raw strings across the codebase.
 */

export const PREMIUM_FEATURES = {
  // ── AI ──────────────────────────────────────────────────────────────────
  AI_INVOICE: {
    key: 'AI_INVOICE',
    label: 'AI Invoice Generator',
    shortLabel: 'AI Invoices',
    icon: '✨',
    badgeVariant: 'ai',
    category: 'AI',
    paywall: {
      title: 'Unlock AI Invoice Generator',
      pitch: 'Generate beautiful, branded invoices in seconds — just describe the order and AI does the rest.',
      benefits: [
        'Instant professional invoices from a single prompt',
        'Auto-fills customer details, items & GST',
        'Branded with your bakery logo and colors',
        'Saves 15–20 minutes per invoice',
      ],
      testimonial: {
        text: '"I used to spend 20 minutes per invoice. Now it takes 5 seconds. My customers are impressed."',
        author: 'Priya M., Sugar & Spice Bakery, Pune',
      },
    },
    previewScreen: {
      headline: 'AI that writes your invoices',
      description: 'Describe your order in plain words. AI generates a complete, professional invoice instantly.',
      previews: ['Customer name, items, GST auto-filled', 'PDF ready to share on WhatsApp', 'Works in English & Hindi'],
    },
  },

  // ── Analytics ────────────────────────────────────────────────────────────
  ADVANCED_ANALYTICS: {
    key: 'ADVANCED_ANALYTICS',
    label: 'Advanced Analytics',
    shortLabel: 'Analytics',
    icon: '👑',
    badgeVariant: 'pro',
    category: 'Analytics',
    paywall: {
      title: 'Unlock Smart Analytics',
      pitch: 'See exactly which products sell, when orders peak, and where your revenue is growing.',
      benefits: [
        'Daily, weekly & monthly revenue trends',
        'Top-selling products & peak hours',
        'Customer retention & repeat order rates',
        'Custom date range comparisons',
      ],
      testimonial: {
        text: '"The analytics showed me that Sunday cakes bring 40% of my revenue. I doubled my Sunday capacity."',
        author: 'Rajan K., Sweet Moments Bakery, Bengaluru',
      },
    },
    previewScreen: {
      headline: 'Know your business inside out',
      description: 'Revenue trends, bestsellers, peak times — all in one beautiful dashboard.',
      previews: ['7-day & 30-day revenue charts', 'Top products by revenue & quantity', 'Customer order frequency'],
    },
  },

  EXPORT_REPORT_PDF: {
    key: 'EXPORT_REPORT_PDF',
    label: 'Export Report PDF',
    shortLabel: 'Report Export',
    icon: '📊',
    badgeVariant: 'pro',
    category: 'Analytics',
    paywall: {
      title: 'Unlock Advanced Report Export',
      pitch: 'Download professional monthly & weekly business reports as beautifully formatted PDFs.',
      benefits: [
        'Monthly P&L summaries ready for your accountant',
        'Shareable weekly performance reports',
        'GST-ready transaction breakdowns',
        'Custom branding on every report',
      ],
      testimonial: {
        text: '"My CA loves the monthly PDF. No more manual Excel sheets."',
        author: 'Sunita B., The Bake House, Mumbai',
      },
    },
    previewScreen: {
      headline: 'Professional reports in one tap',
      description: 'Download ready-to-share PDF reports for any period you choose.',
      previews: ['Monthly revenue & expense summary', 'Product performance breakdown', 'GST transaction report'],
    },
  },

  // ── Themes & Templates ──────────────────────────────────────────────────
  PREMIUM_INVOICE_THEMES: {
    key: 'PREMIUM_INVOICE_THEMES',
    label: 'Premium Invoice Themes',
    shortLabel: 'Invoice Themes',
    icon: '🎨',
    badgeVariant: 'plus',
    category: 'Design',
    paywall: {
      title: 'Unlock Premium Themes',
      pitch: 'Make every invoice reflect your bakery brand with beautiful, customizable invoice designs.',
      benefits: [
        '12 premium invoice layouts',
        'Match your brand colors & fonts',
        'Logo placement & signature areas',
        'Impress customers with every invoice',
      ],
      testimonial: {
        text: '"Customers compliment my invoices now. It makes the bakery feel more professional."',
        author: 'Meera S., Flour Power Bakery, Delhi',
      },
    },
    previewScreen: {
      headline: 'Invoices that reflect your brand',
      description: 'Choose from 12 premium layouts and customize colors, fonts, and your logo placement.',
      previews: ['Classic Cream & Rose theme', 'Dark Espresso minimal theme', 'Golden Honey artisan theme'],
    },
  },

  MENU_TEMPLATES: {
    key: 'MENU_TEMPLATES',
    label: 'Premium Menu Templates',
    shortLabel: 'Menu Templates',
    icon: '📋',
    badgeVariant: 'plus',
    category: 'Design',
    paywall: {
      title: 'Unlock Premium Menu Templates',
      pitch: 'Publish a stunning digital menu your customers will love to browse and share.',
      benefits: [
        '8 premium digital menu layouts',
        'Product photos, descriptions & prices',
        'Share via WhatsApp link or QR code',
        'Update instantly — no printing required',
      ],
      testimonial: {
        text: '"My WhatsApp menu link gets 200+ views every week. Orders doubled after I launched it."',
        author: 'Ananya R., Little Bites Cafe, Hyderabad',
      },
    },
    previewScreen: {
      headline: 'Your menu, beautifully presented',
      description: 'A stunning digital menu your customers can browse and share from their phones.',
      previews: ['Photo-rich product cards', 'Shareable WhatsApp link', 'Instant real-time updates'],
    },
  },

  // ── Inventory ────────────────────────────────────────────────────────────
  SMART_FORECAST: {
    key: 'SMART_FORECAST',
    label: 'Smart Inventory Forecasting',
    shortLabel: 'Inventory AI',
    icon: '🔮',
    badgeVariant: 'ai',
    category: 'Inventory',
    paywall: {
      title: 'Unlock Smart Inventory Forecast',
      pitch: 'Never run out of ingredients again. AI predicts what you need before you even think of it.',
      benefits: [
        'AI predicts ingredient needs 7 days ahead',
        'Based on your order history & seasonal trends',
        'Auto-generates shopping list from forecast',
        'Reduce waste by ordering exactly what you need',
      ],
      testimonial: {
        text: '"I stopped over-ordering flour by 30%. The forecast is scarily accurate."',
        author: 'Kiran V., Sunrise Bakery, Chennai',
      },
    },
    previewScreen: {
      headline: 'Stock up smart, waste nothing',
      description: 'AI learns from your orders and tells you exactly what to buy and when.',
      previews: ['7-day ingredient forecast', 'Auto shopping list generation', 'Waste & savings tracker'],
    },
  },

  // ── Operations ───────────────────────────────────────────────────────────
  BULK_IMPORT: {
    key: 'BULK_IMPORT',
    label: 'Bulk Import & Export',
    shortLabel: 'Bulk Actions',
    icon: '📦',
    badgeVariant: 'pro',
    category: 'Operations',
    paywall: {
      title: 'Unlock Bulk Actions',
      pitch: 'Import hundreds of products, customers, or orders in one click. Export everything for backup.',
      benefits: [
        'Import products from CSV in seconds',
        'Export all orders, customers & transactions',
        'Migrate from any existing system easily',
        'Schedule automatic data backups',
      ],
      testimonial: {
        text: '"Importing my 300 products took 2 minutes. I was ready to go on day one."',
        author: 'Deepa T., Oven Fresh Bakery, Kolkata',
      },
    },
    previewScreen: {
      headline: 'Set up in minutes, not days',
      description: 'Import your entire product catalog, customer list, and historical orders from a CSV.',
      previews: ['CSV import for products & customers', 'Full data export for backup', 'One-click migration'],
    },
  },

  ADVANCED_REPORTS: {
    key: 'ADVANCED_REPORTS',
    label: 'Advanced Business Reports',
    shortLabel: 'Adv. Reports',
    icon: '📈',
    badgeVariant: 'pro',
    category: 'Analytics',
    paywall: {
      title: 'Unlock Advanced Reports',
      pitch: 'Multi-period comparisons, expense tracking, and profitability analysis in one place.',
      benefits: [
        'Compare this month vs last month',
        'Expense vs revenue profit margin',
        'Category-level performance breakdown',
        'Quarterly & annual trend reports',
      ],
      testimonial: {
        text: '"The quarterly report helped me decide to open a second location. The data was right there."',
        author: 'Anil P., Golden Oven Bakery, Jaipur',
      },
    },
    previewScreen: {
      headline: 'Reports that drive real decisions',
      description: 'Multi-period breakdowns, expense analysis, and profit margin reports.',
      previews: ['Month-over-month comparison', 'Expense & profit tracking', 'Category performance analysis'],
    },
  },
};

/** Array of all premium feature keys for iteration */
export const PREMIUM_FEATURE_KEYS = Object.keys(PREMIUM_FEATURES);

/** Lookup a feature by key, with a safe fallback */
export function getFeature(key) {
  return PREMIUM_FEATURES[key] || {
    key,
    label: 'Premium Feature',
    icon: '👑',
    badgeVariant: 'pro',
    paywall: {
      title: 'Unlock Premium Feature',
      pitch: 'This feature is available on the Pro plan.',
      benefits: [],
      testimonial: null,
    },
    previewScreen: { headline: 'Premium Feature', description: '', previews: [] },
  };
}
