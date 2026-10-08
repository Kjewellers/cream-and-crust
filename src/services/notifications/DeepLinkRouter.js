/**
 * DeepLinkRouter.js
 *
 * Universal Deep Link Router for Push Notification tap actions and banner clicks.
 * Resolves payload types & IDs and navigates to the target view across all app modules.
 */

export function resolveNotificationRoute(payload) {
  if (!payload) return '/';

  const type = payload.type || payload.data?.type;
  const targetId = payload.orderId || payload.itemId || payload.customerId || payload.productId || payload.link;

  switch (type) {
    case 'NEW_ORDER':
    case 'ORDER_STATUS':
    case 'ORDER_UPDATE':
    case 'order':
      return targetId ? `/orders?id=${encodeURIComponent(targetId)}` : '/orders';

    case 'LOW_STOCK':
    case 'INVENTORY_ALERT':
    case 'inventory':
      return targetId ? `/inventory?search=${encodeURIComponent(targetId)}` : '/inventory';

    case 'CUSTOMER_QUERY':
    case 'NEW_CUSTOMER':
    case 'customer':
      return targetId ? `/customers?id=${encodeURIComponent(targetId)}` : '/customers';

    case 'PRODUCT_UPDATE':
    case 'product':
      return targetId ? `/products?id=${encodeURIComponent(targetId)}` : '/products';

    case 'RECIPE_UPDATE':
    case 'recipe':
      return targetId ? `/recipes?id=${encodeURIComponent(targetId)}` : '/recipes';

    case 'ANALYTICS_MILESTONE':
    case 'analytics':
      return '/analytics';

    case 'SUBSCRIPTION_EXPIRED':
    case 'SUBSCRIPTION_RENEWED':
    case 'subscription':
      return '/settings?tab=subscription';

    case 'SYSTEM_ALERT':
    case 'settings':
      return '/settings';

    default:
      if (payload.link && payload.link.startsWith('/')) {
        return payload.link;
      }
      return '/';
  }
}

export function handleNotificationTap(payload, navigate) {
  const route = resolveNotificationRoute(payload);
  console.log('[DeepLinkRouter] Navigating to:', route);
  if (navigate && typeof navigate === 'function') {
    navigate(route);
  } else {
    window.location.hash = route;
  }
}
