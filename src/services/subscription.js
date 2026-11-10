/**
 * subscription.js — App subscription plan configuration.
 *
 * Billing price and trial eligibility come from RevenueCat / Google Play.
 * Subscription status is mirrored only by the trusted RevenueCat webhook.
 */

export const PLAN = Object.freeze({
  name: 'Cream & Crust Pro',
  period: 'month',
  features: [
    'Advanced Recipe Studio & Costing',
    'Advanced analytics',
    'Shareable digital menu',
    'CSV exports for bakery records',
  ],
});

export const ANNUAL_PLAN = Object.freeze({
  name: 'Cream & Crust Pro (Annual)',
  period: 'year',
  features: [
    'Everything in Monthly',
    'Billed annually through Google Play',
  ],
});

/** Unified plan map — single source of truth for all UI components. */
export const PLANS = Object.freeze({
  monthly: PLAN,
  yearly: ANNUAL_PLAN,
});

/** Web-specific Pro Subscription Plans for the independent Web App. */
export const WEB_PLANS = Object.freeze({
  starter: {
    id: 'web_starter',
    name: 'Web Starter',
    price: 0,
    priceFormatted: 'Free',
    period: 'forever',
    periodLabel: 'forever',
    description: 'Basic order tracking and customer list for small home bakeries.',
    features: [
      'Up to 50 active orders',
      'Customer directory',
      'Basic recipe cards',
      'Standard invoices',
    ],
    popular: false,
  },
  monthly: {
    id: 'web_pro_monthly',
    name: 'Web Pro Monthly',
    price: 149,
    priceFormatted: '₹149',
    period: '/month',
    periodLabel: 'month',
    description: 'Full-featured bakery manager for growing bakeries with 14-day trial.',
    features: [
      'Advanced Recipe Studio & Ingredient Costing',
      'Advanced Business Analytics & Trends',
      'Live Digital Menu & Online Storefront',
      'Custom Invoices & Thermal Print PDFs',
      'Unlimited Orders & Customer History',
      'Cloud Backup & Multi-device Sync',
      'CSV / Excel Bakery Data Exports',
    ],
    trialDays: 14,
    popular: false,
  },
  yearly: {
    id: 'web_pro_annual',
    name: 'Web Pro Annual',
    price: 1499,
    priceFormatted: '₹1,499',
    period: '/year',
    periodLabel: 'year',
    monthlyEquivalent: '₹125/mo',
    savings: 'Save 17% · 2 Months Free',
    description: 'Everything in Pro with annual savings and priority cloud support.',
    features: [
      'Everything in Web Pro Monthly',
      '2 Months Free (Save ₹289/year)',
      'Priority Cloud Sync & Instant Backups',
      'Multi-device Browser Access (Desktop & Mobile)',
      'Early Access to New Web Features',
      'Dedicated Priority Customer Support',
    ],
    trialDays: 14,
    popular: true,
  },
});
