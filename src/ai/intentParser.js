import { INTENTS, isKnownIntent } from './actionSchemas';
import { getNextMissingField, normalizeActionDraft } from './validators';

const INTENT_ALIASES = Object.freeze({
  order_create: INTENTS.CREATE_ORDER,
  createOrder: INTENTS.CREATE_ORDER,
  create_order: INTENTS.CREATE_ORDER,
  status_update: INTENTS.UPDATE_ORDER_STATUS,
  updateOrderStatus: INTENTS.UPDATE_ORDER_STATUS,
  update_order_status: INTENTS.UPDATE_ORDER_STATUS,
  deleteOrder: INTENTS.DELETE_ORDER,
  delete_order: INTENTS.DELETE_ORDER,
  addInventory: INTENTS.ADD_INVENTORY,
  add_inventory: INTENTS.ADD_INVENTORY,
  updateInventoryStock: INTENTS.UPDATE_INVENTORY_STOCK,
  update_inventory_stock: INTENTS.UPDATE_INVENTORY_STOCK,
  deleteInventory: INTENTS.DELETE_INVENTORY,
  delete_inventory: INTENTS.DELETE_INVENTORY,
  addCustomer: INTENTS.ADD_CUSTOMER,
  add_customer: INTENTS.ADD_CUSTOMER,
  deleteCustomer: INTENTS.DELETE_CUSTOMER,
  delete_customer: INTENTS.DELETE_CUSTOMER,
  addExpense: INTENTS.ADD_EXPENSE,
  add_expense: INTENTS.ADD_EXPENSE,
  deleteExpense: INTENTS.DELETE_EXPENSE,
  delete_expense: INTENTS.DELETE_EXPENSE,
  addShoppingItem: INTENTS.ADD_SHOPPING_ITEM,
  add_shopping_item: INTENTS.ADD_SHOPPING_ITEM,
  toggleShoppingItem: INTENTS.TOGGLE_SHOPPING_ITEM,
  toggle_shopping_item: INTENTS.TOGGLE_SHOPPING_ITEM,
  deleteShoppingItem: INTENTS.DELETE_SHOPPING_ITEM,
  delete_shopping_item: INTENTS.DELETE_SHOPPING_ITEM,
  addProduct: INTENTS.ADD_PRODUCT,
  add_product: INTENTS.ADD_PRODUCT,
  deleteProduct: INTENTS.DELETE_PRODUCT,
  delete_product: INTENTS.DELETE_PRODUCT,
  addRecipe: INTENTS.ADD_RECIPE,
  add_recipe: INTENTS.ADD_RECIPE,
  deleteRecipe: INTENTS.DELETE_RECIPE,
  delete_recipe: INTENTS.DELETE_RECIPE,
  remember: INTENTS.ADD_MEMORY,
  add_memory: INTENTS.ADD_MEMORY,
  forget: INTENTS.DELETE_MEMORY,
  delete_memory: INTENTS.DELETE_MEMORY,
  show_orders: INTENTS.SHOW_ORDERS,
  orders: INTENTS.SHOW_ORDERS,
  show_customers: INTENTS.SHOW_CUSTOMERS,
  customers: INTENTS.SHOW_CUSTOMERS,
  show_expenses: INTENTS.SHOW_EXPENSES,
  expenses: INTENTS.SHOW_EXPENSES,
  inventory: INTENTS.READ_INVENTORY,
  read_inventory: INTENTS.READ_INVENTORY,
  analytics: INTENTS.READ_ANALYTICS,
  read_analytics: INTENTS.READ_ANALYTICS,
  navigate: INTENTS.NAVIGATE,
});

const FIELD_ALIASES = Object.freeze({
  customer: 'customerName',
  customer_name: 'customerName',
  name: 'name',
  productName: 'product',
  amountPaid: 'advance',
  date: 'deliveryDate',
  time: 'deliveryTime',
  address: 'deliveryAddress',
  itemName: 'item',
  quantity: 'qty',
  newStatus: 'status',
});

function safeParseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  try {
    return JSON.parse(value);
  } catch (_) {
    const match = value.match(/```json\s*([\s\S]*?)```/) || value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[1] || match[0]);
    } catch (__) {
      return null;
    }
  }
}

function normalizeIntent(intent) {
  if (!intent) return null;
  const exact = INTENT_ALIASES[intent] || intent;
  return isKnownIntent(exact) ? exact : null;
}

function normalizeData(data = {}) {
  return Object.entries(data || {}).reduce((acc, [key, value]) => {
    const normalizedKey = FIELD_ALIASES[key] || key;
    acc[normalizedKey] = value;
    return acc;
  }, {});
}

export function parseIntentResponse(response) {
  const parsed = safeParseJson(response);
  if (!parsed) {
    return {
      intent: null,
      data: {},
      response: typeof response === 'string' ? response : '',
      state: 'unknown',
      confidence: 0,
    };
  }

  const rawIntent = parsed.intent || parsed.type || parsed.action?.type || parsed.actionType;
  const intent = normalizeIntent(rawIntent);
  const data = normalizeData(parsed.data || parsed.action?.data || parsed.extracted || {});
  const draft = normalizeActionDraft({
    intent,
    data,
    source: 'ai',
    confirmed: parsed.confirmed === true,
    requestId: parsed.requestId || null,
  });

  return {
    ...draft,
    response: parsed.response || parsed.message || '',
    state: parsed.state || (getNextMissingField(draft) ? 'gathering' : 'ready'),
    confidence: Number(parsed.confidence || 0),
    raw: parsed,
  };
}

export function parseUserIntent(message = '') {
  const text = String(message || '').trim().toLowerCase();

  if (!text) {
    return { intent: null, data: {}, confidence: 0 };
  }

  if (/\b(stock|inventory|available|kitna|bach[aei]?|left)\b/.test(text)) {
    return { intent: INTENTS.READ_INVENTORY, data: {}, confidence: 0.55 };
  }
  if (/\b(show|list|open|dikhao|dekhna|view)\b/.test(text) && /\b(order|orders)\b/.test(text)) {
    return { intent: INTENTS.SHOW_ORDERS, data: {}, confidence: 0.55 };
  }
  if (/\b(show|list|open|dikhao|dekhna|view)\b/.test(text) && /\b(customer|customers|clients)\b/.test(text)) {
    return { intent: INTENTS.SHOW_CUSTOMERS, data: {}, confidence: 0.55 };
  }
  if (/\b(show|list|open|dikhao|dekhna|view)\b/.test(text) && /\b(expense|expenses|kharcha)\b/.test(text)) {
    return { intent: INTENTS.SHOW_EXPENSES, data: {}, confidence: 0.55 };
  }
  if (/\b(analytics|report|revenue|sales|profit|payment|dues?)\b/.test(text)) {
    return { intent: INTENTS.READ_ANALYTICS, data: {}, confidence: 0.55 };
  }
  if (/\b(order|cake|delivery)\b/.test(text) && /\b(create|add|new|banao|banana|book)\b/.test(text)) {
    return { intent: INTENTS.CREATE_ORDER, data: {}, confidence: 0.45 };
  }
  if (/\b(expense|kharcha|cost)\b/.test(text) && /\b(add|log|record)\b/.test(text)) {
    return { intent: INTENTS.ADD_EXPENSE, data: {}, confidence: 0.45 };
  }
  if (/\b(customer|client)\b/.test(text) && /\b(add|create|new)\b/.test(text)) {
    return { intent: INTENTS.ADD_CUSTOMER, data: {}, confidence: 0.45 };
  }

  return { intent: null, data: {}, confidence: 0 };
}

export function createIntentPrompt({ message, context }) {
  return {
    role: 'user',
    content: JSON.stringify({
      task: 'Parse this bakery app request into a supported intent and extracted fields only.',
      rules: [
        'Return JSON only.',
        'Do not invent missing fields.',
        'Use null intent if unsupported.',
        'For analytics and inventory, do not calculate values. The app will calculate from real data.',
      ],
      message,
      availableContextKeys: Object.keys(context || {}),
      supportedIntents: Object.values(INTENTS),
    }),
  };
}
