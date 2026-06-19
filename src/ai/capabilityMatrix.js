import { INTENTS } from './actionSchemas';

export const AI_ROLES = Object.freeze({
  ADMIN: 'admin',
  BAKER: 'baker',
  CUSTOMER: 'customer',
});

const STAFF_ROLES = Object.freeze([AI_ROLES.ADMIN, AI_ROLES.BAKER]);

export const CAPABILITIES = Object.freeze({
  show_orders: {
    intent: INTENTS.SHOW_ORDERS,
    operation: 'read',
    confirmationRequired: false,
    requiredFields: [],
    allowedRoles: STAFF_ROLES,
    target: 'orders',
  },
  show_customers: {
    intent: INTENTS.SHOW_CUSTOMERS,
    operation: 'read',
    confirmationRequired: false,
    requiredFields: [],
    allowedRoles: STAFF_ROLES,
    target: 'customers',
  },
  show_inventory: {
    intent: INTENTS.READ_INVENTORY,
    operation: 'read',
    confirmationRequired: false,
    requiredFields: [],
    allowedRoles: STAFF_ROLES,
    target: 'inventory',
  },
  show_expenses: {
    intent: INTENTS.SHOW_EXPENSES,
    operation: 'read',
    confirmationRequired: false,
    requiredFields: [],
    allowedRoles: STAFF_ROLES,
    target: 'expenses',
  },
  show_revenue: {
    intent: INTENTS.READ_ANALYTICS,
    operation: 'read',
    confirmationRequired: false,
    requiredFields: [],
    allowedRoles: STAFF_ROLES,
    target: 'analytics',
  },
  create_order: {
    intent: INTENTS.CREATE_ORDER,
    operation: 'create',
    confirmationRequired: true,
    requiredFields: ['customerName', 'phone', 'product', 'qty', 'deliveryDate', 'deliveryTime'],
    optionalFields: ['deliveryAddress', 'size', 'price', 'deliveryType', 'notes'],
    allowedRoles: STAFF_ROLES,
    target: 'orders',
  },
  create_customer: {
    intent: INTENTS.ADD_CUSTOMER,
    operation: 'create',
    confirmationRequired: true,
    requiredFields: ['name', 'phone'],
    optionalFields: ['address', 'dob'],
    allowedRoles: STAFF_ROLES,
    target: 'customers',
  },
  add_inventory: {
    intent: INTENTS.ADD_INVENTORY,
    operation: 'create',
    confirmationRequired: true,
    requiredFields: ['item', 'stock', 'unit'],
    optionalFields: ['minStock', 'expiryDate', 'cost'],
    allowedRoles: STAFF_ROLES,
    target: 'inventory',
  },
  create_expense: {
    intent: INTENTS.ADD_EXPENSE,
    operation: 'create',
    confirmationRequired: true,
    requiredFields: ['title', 'amount', 'category'],
    optionalFields: ['date', 'vendor', 'notes'],
    allowedRoles: STAFF_ROLES,
    target: 'expenses',
  },
  update_order_status: {
    intent: INTENTS.UPDATE_ORDER_STATUS,
    operation: 'update',
    confirmationRequired: true,
    requiredFields: ['orderId', 'status'],
    allowedRoles: STAFF_ROLES,
    target: 'orders',
  },
  update_inventory_stock: {
    intent: INTENTS.UPDATE_INVENTORY_STOCK,
    operation: 'update',
    confirmationRequired: true,
    requiredFields: ['itemId', 'stock'],
    allowedRoles: STAFF_ROLES,
    target: 'inventory',
  },
  delete_order: {
    intent: INTENTS.DELETE_ORDER,
    operation: 'delete',
    confirmationRequired: true,
    requiredFields: ['orderId'],
    allowedRoles: STAFF_ROLES,
    target: 'orders',
  },
  delete_customer: {
    intent: INTENTS.DELETE_CUSTOMER,
    operation: 'delete',
    confirmationRequired: true,
    requiredFields: ['customerId'],
    allowedRoles: STAFF_ROLES,
    target: 'customers',
  },
  delete_inventory: {
    intent: INTENTS.DELETE_INVENTORY,
    operation: 'delete',
    confirmationRequired: true,
    requiredFields: ['itemId'],
    allowedRoles: STAFF_ROLES,
    target: 'inventory',
  },
  delete_expense: {
    intent: INTENTS.DELETE_EXPENSE,
    operation: 'delete',
    confirmationRequired: true,
    requiredFields: ['expenseId'],
    allowedRoles: STAFF_ROLES,
    target: 'expenses',
  },
  navigate: {
    intent: INTENTS.NAVIGATE,
    operation: 'read',
    confirmationRequired: false,
    requiredFields: ['to'],
    allowedRoles: STAFF_ROLES,
    target: 'app',
  },
  send_whatsapp_invoice: {
    intent: INTENTS.SEND_WHATSAPP_INVOICE,
    operation: 'read',
    confirmationRequired: true,
    requiredFields: ['orderId'],
    allowedRoles: STAFF_ROLES,
    target: 'orders',
  },
  export_data: {
    intent: INTENTS.EXPORT_DATA,
    operation: 'read',
    confirmationRequired: false,
    requiredFields: ['target'],
    allowedRoles: STAFF_ROLES,
    target: 'app',
  },
  change_theme: {
    intent: INTENTS.CHANGE_THEME,
    operation: 'update',
    confirmationRequired: false,
    requiredFields: ['theme'],
    allowedRoles: STAFF_ROLES,
    target: 'app',
  },
  open_modal: {
    intent: INTENTS.OPEN_MODAL,
    operation: 'read',
    confirmationRequired: false,
    requiredFields: ['modal'],
    allowedRoles: STAFF_ROLES,
    target: 'app',
  },
  batch_update: {
    intent: INTENTS.BATCH_UPDATE,
    operation: 'update',
    confirmationRequired: true,
    requiredFields: ['target', 'filters', 'updates'],
    allowedRoles: STAFF_ROLES,
    target: 'app',
  },
});

const INTENT_TO_CAPABILITY = Object.freeze(
  Object.values(CAPABILITIES).reduce((acc, capability) => {
    acc[capability.intent] = capability;
    return acc;
  }, {})
);

export function getCapability(intent) {
  return CAPABILITIES[intent] || INTENT_TO_CAPABILITY[intent] || null;
}

export function assertCapability(intent, role = AI_ROLES.ADMIN) {
  const capability = getCapability(intent);
  if (!capability) {
    return { ok: false, reason: 'Capability not registered' };
  }
  if (!capability.allowedRoles.includes(role)) {
    return { ok: false, reason: 'Role not allowed for this AI action', capability };
  }
  return { ok: true, capability };
}
