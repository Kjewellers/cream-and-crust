import {
  ACTION_SCHEMAS,
  INFORMATION_NOT_FOUND,
  INTENTS,
  NAVIGATION_TARGETS,
  ORDER_STATUSES,
  isKnownIntent,
} from './actionSchemas';

const ID_FIELDS = Object.freeze({
  [INTENTS.UPDATE_ORDER_STATUS]: ['orders', 'orderId'],
  [INTENTS.DELETE_ORDER]: ['orders', 'orderId'],
  [INTENTS.UPDATE_INVENTORY_STOCK]: ['inventory', 'itemId'],
  [INTENTS.DELETE_INVENTORY]: ['inventory', 'itemId'],
  [INTENTS.DELETE_CUSTOMER]: ['customers', 'customerId'],
  [INTENTS.DELETE_EXPENSE]: ['expenses', 'expenseId'],
  [INTENTS.TOGGLE_SHOPPING_ITEM]: ['shoppingItems', 'itemId'],
  [INTENTS.DELETE_SHOPPING_ITEM]: ['shoppingItems', 'itemId'],
  [INTENTS.DELETE_PRODUCT]: ['products', 'productId'],
  [INTENTS.DELETE_RECIPE]: ['recipes', 'recipeId'],
  [INTENTS.DELETE_MEMORY]: ['memories', 'memoryId'],
});

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function listContainsId(list, id) {
  if (!Array.isArray(list) || !id) return false;
  return list.some((item) => item?.id === id || item?.orderId === id);
}

function validateKnownDocument(action, context) {
  const lookup = ID_FIELDS[action.intent];
  if (!lookup) return [];
  const [collectionKey, idField] = lookup;
  const id = action.data?.[idField];
  if (!id) return [];

  if (!listContainsId(context?.[collectionKey], id)) {
    return [`${idField}: ${INFORMATION_NOT_FOUND}`];
  }
  return [];
}

function validateNumbers(intent, data) {
  const errors = [];
  const numericFields = {
    [INTENTS.CREATE_ORDER]: ['price'],
    [INTENTS.ADD_INVENTORY]: ['stock', 'minStock', 'cost'],
    [INTENTS.UPDATE_INVENTORY_STOCK]: ['stock'],
    [INTENTS.ADD_EXPENSE]: ['amount'],
    [INTENTS.ADD_SHOPPING_ITEM]: ['qty', 'quantity', 'estimatedCost'],
    [INTENTS.ADD_PRODUCT]: ['price', 'cost'],
  }[intent] || [];

  numericFields.forEach((field) => {
    if (!hasValue(data[field])) return;
    const value = asNumber(data[field]);
    if (value === null || value < 0) errors.push(`${field} must be a non-negative number`);
  });
  return errors;
}

function validateEnumerations(intent, data) {
  const errors = [];
  if (intent === INTENTS.UPDATE_ORDER_STATUS && !ORDER_STATUSES.includes(String(data.status || '').toLowerCase())) {
    errors.push(`status must be one of: ${ORDER_STATUSES.join(', ')}`);
  }
  if (intent === INTENTS.NAVIGATE && !NAVIGATION_TARGETS.includes(data.to)) {
    errors.push(`to must be one of: ${NAVIGATION_TARGETS.join(', ')}`);
  }
  return errors;
}

function normalizeData(intent, data = {}) {
  const next = { ...data };

  Object.keys(next).forEach((key) => {
    next[key] = normalizeString(next[key]);
  });

  if (hasValue(next.price)) next.price = asNumber(next.price);
  if (hasValue(next.total)) next.total = asNumber(next.total);
  if (hasValue(next.stock)) next.stock = asNumber(next.stock);
  if (hasValue(next.minStock)) next.minStock = asNumber(next.minStock);
  if (hasValue(next.cost)) next.cost = asNumber(next.cost);
  if (hasValue(next.amount)) next.amount = asNumber(next.amount);
  if (hasValue(next.qty)) next.qty = asNumber(next.qty);
  if (hasValue(next.quantity)) next.quantity = asNumber(next.quantity);
  if (hasValue(next.estimatedCost)) next.estimatedCost = asNumber(next.estimatedCost);
  if (intent === INTENTS.UPDATE_ORDER_STATUS && next.status) {
    next.status = String(next.status).toLowerCase();
  }

  return next;
}

export function normalizeActionDraft(draft = {}) {
  const intent = draft.intent || draft.type || draft.actionType || null;
  return {
    intent,
    data: normalizeData(intent, draft.data || {}),
    source: draft.source || 'ai',
    confirmed: draft.confirmed === true,
    requestId: draft.requestId || null,
  };
}

export function validateActionDraft(draft, context = {}) {
  const action = normalizeActionDraft(draft);
  const errors = [];

  if (!isKnownIntent(action.intent)) {
    errors.push('Unknown or unsupported intent');
    return {
      ok: false,
      action,
      schema: null,
      missing: [],
      errors,
    };
  }

  const schema = ACTION_SCHEMAS[action.intent];
  const missing = schema.required.filter((field) => !hasValue(action.data?.[field]));

  errors.push(...validateNumbers(action.intent, action.data));
  errors.push(...validateEnumerations(action.intent, action.data));
  errors.push(...validateKnownDocument(action, context));

  if (schema.confirmationRequired && action.confirmed !== true) {
    errors.push('Confirmation required before execution');
  }

  return {
    ok: missing.length === 0 && errors.length === 0,
    action,
    schema,
    missing,
    errors,
  };
}

export function getNextMissingField(draft) {
  const action = normalizeActionDraft(draft);
  if (!isKnownIntent(action.intent)) return null;
  const schema = ACTION_SCHEMAS[action.intent];
  return schema.required.find((field) => !hasValue(action.data?.[field])) || null;
}

export function createConfirmationSummary(draft) {
  const action = normalizeActionDraft(draft);
  const schema = ACTION_SCHEMAS[action.intent];
  if (!schema) return null;

  return {
    intent: action.intent,
    title: schema.label,
    confirmationRequired: schema.confirmationRequired,
    fields: Object.entries(action.data || {})
      .filter(([, value]) => hasValue(value))
      .map(([key, value]) => ({
        key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      })),
  };
}
