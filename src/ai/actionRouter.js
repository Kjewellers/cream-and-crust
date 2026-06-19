import { INFORMATION_NOT_FOUND, INTENTS, MUTATION_INTENTS } from './actionSchemas';
import { assertCapability } from './capabilityMatrix';
import { calculateRealAnalytics, getInventorySnapshot } from './contextBuilder';
import {
  createConfirmationSummary,
  getNextMissingField,
  normalizeActionDraft,
  validateActionDraft,
} from './validators';

function blocked(message, details = {}) {
  return {
    ok: false,
    status: 'blocked',
    message,
    ...details,
  };
}

function ready(action, details = {}) {
  return {
    ok: true,
    status: 'ready',
    action,
    ...details,
  };
}

function complete(result, details = {}) {
  return {
    ok: true,
    status: 'completed',
    result,
    ...details,
  };
}

function sanitizeExecutionError(error) {
  const message = String(error?.message || 'Action failed');
  if (/permission|auth|denied|firebase|firestore|token/i.test(message)) {
    return 'Action could not be completed securely. Please try again after refreshing.';
  }
  return message;
}

export function prepareAIAction(draft, context = {}) {
  const action = normalizeActionDraft(draft);
  const capabilityCheck = assertCapability(action.intent, context.userRole || 'admin');
  if (!capabilityCheck.ok) {
    return blocked(capabilityCheck.reason, { action });
  }
  const validation = validateActionDraft({ ...action, confirmed: false }, context);

  if (!validation.schema) {
    return blocked('Unsupported action', { errors: validation.errors });
  }

  const nextMissingField = getNextMissingField(action);
  if (nextMissingField) {
    return {
      ok: false,
      status: 'needs_input',
      action,
      missing: validation.missing,
      nextMissingField,
      message: `Missing field: ${nextMissingField}`,
    };
  }

  const withoutConfirmationErrors = validation.errors.filter(
    (error) => error !== 'Confirmation required before execution'
  );

  if (withoutConfirmationErrors.length > 0) {
    return blocked('Action validation failed', { action, errors: withoutConfirmationErrors });
  }

  if (validation.schema.confirmationRequired) {
    return ready(action, {
      confirmationRequired: true,
      confirmation: createConfirmationSummary(action),
    });
  }

  return ready(action, { confirmationRequired: false });
}

export async function executeAIAction(draft, context = {}) {
  const action = normalizeActionDraft(draft);
  const capabilityCheck = assertCapability(action.intent, context.userRole || 'admin');
  if (!capabilityCheck.ok) {
    return blocked(capabilityCheck.reason, { action });
  }

  if (!MUTATION_INTENTS.includes(action.intent)) {
    return blocked('This action is read-only or unsupported for execution');
  }

  const validation = validateActionDraft(action, context);
  if (!validation.ok) {
    return blocked('Action validation failed', {
      action: validation.action,
      missing: validation.missing,
      errors: validation.errors,
    });
  }

  try {
    const { executeServiceAction } = await import('./serviceLayer');
    const result = await executeServiceAction(validation.action);
    return complete(result, {
      action: validation.action,
      message: 'Action completed',
    });
  } catch (error) {
    return blocked(sanitizeExecutionError(error), {
      action: validation.action,
    });
  }
}

export function routeReadOnlyIntent(draft, context = {}) {
  const action = normalizeActionDraft(draft);
  const capabilityCheck = assertCapability(action.intent, context.userRole || 'admin');
  if (!capabilityCheck.ok) {
    return blocked(capabilityCheck.reason, { action });
  }

  if (action.intent === INTENTS.READ_INVENTORY) {
    const snapshot = getInventorySnapshot(context);
    if (!snapshot.ok) {
      return blocked(INFORMATION_NOT_FOUND, { action, data: snapshot });
    }
    return complete(snapshot, { action });
  }

  if (action.intent === INTENTS.READ_ANALYTICS) {
    const analytics = calculateRealAnalytics(context);
    if (!analytics.ok) {
      return blocked(INFORMATION_NOT_FOUND, { action, data: analytics });
    }
    return complete(analytics, { action });
  }

  if (action.intent === INTENTS.SHOW_ORDERS) {
    const orders = Array.isArray(context.orders) ? context.orders : [];
    if (orders.length === 0) return blocked(INFORMATION_NOT_FOUND, { action, data: { orders: [] } });
    return complete({ orders: orders.slice(0, 25) }, { action });
  }

  if (action.intent === INTENTS.SHOW_CUSTOMERS) {
    const customers = Array.isArray(context.customers) ? context.customers : [];
    if (customers.length === 0) return blocked(INFORMATION_NOT_FOUND, { action, data: { customers: [] } });
    return complete({ customers: customers.slice(0, 25) }, { action });
  }

  if (action.intent === INTENTS.SHOW_EXPENSES) {
    const expenses = Array.isArray(context.expenses) ? context.expenses : [];
    if (expenses.length === 0) return blocked(INFORMATION_NOT_FOUND, { action, data: { expenses: [] } });
    return complete({ expenses: expenses.slice(0, 25) }, { action });
  }

  if (action.intent === INTENTS.NAVIGATE) {
    const validation = validateActionDraft(action, context);
    if (!validation.ok) {
      return blocked('Navigation validation failed', {
        action,
        errors: validation.errors,
        missing: validation.missing,
      });
    }
    return complete({ intent: action.intent, to: action.data.to }, { action });
  }

  if ([INTENTS.EXPORT_DATA, INTENTS.CHANGE_THEME, INTENTS.OPEN_MODAL].includes(action.intent)) {
    const validation = validateActionDraft(action, context);
    if (!validation.ok) {
      return blocked('Action validation failed', { action, errors: validation.errors, missing: validation.missing });
    }
    return complete({ intent: action.intent, ...action.data }, { action });
  }

  return blocked('Unsupported read-only action', { action });
}

export async function routeAIAction(draft, context = {}, options = {}) {
  const action = normalizeActionDraft(draft);

  if ([
    INTENTS.SHOW_ORDERS,
    INTENTS.SHOW_CUSTOMERS,
    INTENTS.SHOW_EXPENSES,
    INTENTS.READ_INVENTORY,
    INTENTS.READ_ANALYTICS,
    INTENTS.NAVIGATE,
    INTENTS.EXPORT_DATA,
    INTENTS.CHANGE_THEME,
    INTENTS.OPEN_MODAL,
  ].includes(action.intent)) {
    return routeReadOnlyIntent(action, context);
  }

  if (options.execute === true) {
    return executeAIAction(action, context);
  }

  return prepareAIAction(action, context);
}
