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
