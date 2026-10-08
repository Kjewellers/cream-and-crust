/**
 * subscription.js — App subscription plan configuration.
 *
 * Plan: ₹149/month with 3 months free trial via Play Console.
 * Real-time status is handled by useSubscription hook reading from users/{uid}.
 * Subscription writes are handled server-side via RevenueCat webhook.
 */

export const PLAN = Object.freeze({
  name: 'Cream & Crust Pro',
  price: 149,
  currency: '₹',
  period: 'month',
  trialDays: 90, // 3 months free
  features: [
    'Unlimited orders',
    'Invoice PDF generation',
    'WhatsApp integration',
    'Analytics & reports',
    'Inventory management',
    'Recipe studio',
    'Menu builder & website',
    'Priority support',
  ],
});

export const ANNUAL_PLAN = Object.freeze({
  name: 'Cream & Crust Pro (Annual)',
  price: 1499,
  currency: '₹',
  period: 'year',
  monthlyEquivalent: 125, // ₹1,499 / 12 ≈ ₹125/mo
  savings: 289,           // ₹149×12 − ₹1,499 = ₹289 saved
  trialDays: 90,
  features: [
    'Everything in Monthly',
    '2 Months Free',
    'Advanced CSV Export',
    'Early Access to New Features',
  ],
});

/** Unified plan map — single source of truth for all UI components. */
export const PLANS = Object.freeze({
  monthly: PLAN,
  yearly: ANNUAL_PLAN,
});
