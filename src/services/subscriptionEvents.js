export const SUBSCRIPTION_REQUIRED_EVENT = 'cc:subscription-required';

export function dispatchSubscriptionRequired(featureKey) {
  if (typeof window === 'undefined' || !featureKey) return;
  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REQUIRED_EVENT, {
    detail: { featureKey },
  }));
}
