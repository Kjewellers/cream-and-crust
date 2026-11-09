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
    'AI Bakery Assistant',
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
