export const INFORMATION_NOT_FOUND = 'Information not found';

export const INTENTS = Object.freeze({
  CREATE_ORDER: 'create_order',
  UPDATE_ORDER_STATUS: 'update_order_status',
  DELETE_ORDER: 'delete_order',
  ADD_INVENTORY: 'add_inventory',
  UPDATE_INVENTORY_STOCK: 'update_inventory_stock',
  DELETE_INVENTORY: 'delete_inventory',
  ADD_CUSTOMER: 'add_customer',
  DELETE_CUSTOMER: 'delete_customer',
  ADD_EXPENSE: 'add_expense',
  DELETE_EXPENSE: 'delete_expense',
  ADD_SHOPPING_ITEM: 'add_shopping_item',
  TOGGLE_SHOPPING_ITEM: 'toggle_shopping_item',
  DELETE_SHOPPING_ITEM: 'delete_shopping_item',
  ADD_PRODUCT: 'add_product',
  DELETE_PRODUCT: 'delete_product',
  ADD_RECIPE: 'add_recipe',
  DELETE_RECIPE: 'delete_recipe',
  ADD_MEMORY: 'add_memory',
  DELETE_MEMORY: 'delete_memory',
  SHOW_ORDERS: 'show_orders',
  SHOW_CUSTOMERS: 'show_customers',
  SHOW_EXPENSES: 'show_expenses',
  READ_INVENTORY: 'read_inventory',
  READ_ANALYTICS: 'read_analytics',
  NAVIGATE: 'navigate',
  SEND_WHATSAPP_INVOICE: 'send_whatsapp_invoice',
  EXPORT_DATA: 'export_data',
  CHANGE_THEME: 'change_theme',
  OPEN_MODAL: 'open_modal',
  BATCH_UPDATE: 'batch_update',
});

export const READ_ONLY_INTENTS = Object.freeze([
  INTENTS.SHOW_ORDERS,
  INTENTS.SHOW_CUSTOMERS,
  INTENTS.SHOW_EXPENSES,
  INTENTS.READ_INVENTORY,
  INTENTS.READ_ANALYTICS,
  INTENTS.NAVIGATE,
  INTENTS.EXPORT_DATA,
  INTENTS.CHANGE_THEME,
  INTENTS.OPEN_MODAL,
]);

export const MUTATION_INTENTS = Object.freeze(
  Object.values(INTENTS).filter((intent) => !READ_ONLY_INTENTS.includes(intent))
);

export const ORDER_STATUSES = Object.freeze([
  'new',
  'inquiry',
  'confirmed',
  'in-progress',
  'baking',
  'ready',
  'delivered',
  'cancelled',
]);

export const NAVIGATION_TARGETS = Object.freeze([
  '/',
  '/orders',
  '/calendar',
  '/products',
  '/customers',
  '/inventory',
  '/recipes',
  '/analytics',
  '/expenses',
  '/shopping-list',
  '/menu-builder',
  '/settings',
  '/profile',
]);

export const ACTION_SCHEMAS = Object.freeze({
  [INTENTS.CREATE_ORDER]: {
    label: 'Create order',
    required: ['customerName', 'phone', 'product', 'qty', 'deliveryDate', 'deliveryTime'],
    optional: ['deliveryAddress', 'size', 'price', 'deliveryType', 'notes', 'items', 'recipeId'],
    confirmationRequired: true,
  },
  [INTENTS.UPDATE_ORDER_STATUS]: {
    label: 'Update order status',
    required: ['orderId', 'status'],
    confirmationRequired: true,
  },
  [INTENTS.DELETE_ORDER]: {
    label: 'Delete order',
    required: ['orderId'],
    confirmationRequired: true,
  },
  [INTENTS.ADD_INVENTORY]: {
    label: 'Add inventory',
    required: ['item', 'stock', 'unit'],
    optional: ['minStock', 'expiryDate', 'cost'],
    confirmationRequired: true,
  },
  [INTENTS.UPDATE_INVENTORY_STOCK]: {
    label: 'Update inventory stock',
    required: ['itemId', 'stock'],
    confirmationRequired: true,
  },
  [INTENTS.DELETE_INVENTORY]: {
    label: 'Delete inventory item',
    required: ['itemId'],
    confirmationRequired: true,
  },
  [INTENTS.ADD_CUSTOMER]: {
    label: 'Add customer',
    required: ['name'],
    optional: ['phone', 'address', 'dob'],
    confirmationRequired: true,
  },
  [INTENTS.DELETE_CUSTOMER]: {
    label: 'Delete customer',
    required: ['customerId'],
    confirmationRequired: true,
  },
  [INTENTS.ADD_EXPENSE]: {
    label: 'Add expense',
    required: ['title', 'amount', 'category'],
    optional: ['date', 'vendor', 'notes'],
    confirmationRequired: true,
  },
  [INTENTS.DELETE_EXPENSE]: {
    label: 'Delete expense',
    required: ['expenseId'],
    confirmationRequired: true,
  },
  [INTENTS.ADD_SHOPPING_ITEM]: {
    label: 'Add shopping item',
    required: ['item'],
    optional: ['qty', 'quantity', 'unit', 'estimatedCost', 'notes'],
    confirmationRequired: true,
  },
  [INTENTS.TOGGLE_SHOPPING_ITEM]: {
    label: 'Toggle shopping item',
    required: ['itemId', 'bought'],
    confirmationRequired: true,
  },
  [INTENTS.DELETE_SHOPPING_ITEM]: {
    label: 'Delete shopping item',
    required: ['itemId'],
    confirmationRequired: true,
  },
  [INTENTS.ADD_PRODUCT]: {
    label: 'Add product',
    required: ['name', 'price'],
    optional: ['category', 'description', 'imageUrl', 'cost'],
    confirmationRequired: true,
  },
  [INTENTS.DELETE_PRODUCT]: {
    label: 'Delete product',
    required: ['productId'],
    confirmationRequired: true,
  },
  [INTENTS.ADD_RECIPE]: {
    label: 'Add recipe',
    required: ['name'],
    optional: ['category', 'yield', 'prepTime', 'bakeTime', 'ingredients', 'steps'],
    confirmationRequired: true,
  },
  [INTENTS.DELETE_RECIPE]: {
    label: 'Delete recipe',
    required: ['recipeId'],
    confirmationRequired: true,
  },
  [INTENTS.ADD_MEMORY]: {
    label: 'Remember preference',
    required: ['note'],
    confirmationRequired: true,
  },
  [INTENTS.DELETE_MEMORY]: {
    label: 'Delete memory',
    required: ['memoryId'],
    confirmationRequired: true,
  },
  [INTENTS.SEND_WHATSAPP_INVOICE]: {
    label: 'Send WhatsApp Invoice',
    required: ['orderId'],
    confirmationRequired: true,
  },
  [INTENTS.READ_INVENTORY]: {
    label: 'Read inventory',
    required: [],
    confirmationRequired: false,
  },
  [INTENTS.SHOW_ORDERS]: {
    label: 'Show orders',
    required: [],
    confirmationRequired: false,
  },
  [INTENTS.SHOW_CUSTOMERS]: {
    label: 'Show customers',
    required: [],
    confirmationRequired: false,
  },
  [INTENTS.SHOW_EXPENSES]: {
    label: 'Show expenses',
    required: [],
    confirmationRequired: false,
  },
  [INTENTS.READ_ANALYTICS]: {
    label: 'Read analytics',
    required: [],
    confirmationRequired: false,
  },
  [INTENTS.NAVIGATE]: {
    label: 'Navigate',
    required: ['to'],
    confirmationRequired: false,
  },
  [INTENTS.EXPORT_DATA]: {
    label: 'Export Data',
    required: ['target'], // 'orders', 'expenses', 'customers'
    confirmationRequired: false,
  },
  [INTENTS.CHANGE_THEME]: {
    label: 'Change Theme',
    required: ['theme'], // 'dark', 'light'
    confirmationRequired: false,
  },
  [INTENTS.OPEN_MODAL]: {
    label: 'Open Modal',
    required: ['modal'], // 'add_product', 'add_order', etc.
    confirmationRequired: false,
  },
  [INTENTS.BATCH_UPDATE]: {
    label: 'Batch Update',
    required: ['target', 'filters', 'updates'], 
    confirmationRequired: true,
  },
});

export function isKnownIntent(intent) {
  return Object.prototype.hasOwnProperty.call(ACTION_SCHEMAS, intent);
}
