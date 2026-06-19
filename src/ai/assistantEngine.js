import { INFORMATION_NOT_FOUND, INTENTS } from './actionSchemas';
import { buildAIContext } from './contextBuilder';
import {
  buildConfirmationAction,
  cancelConversation,
  confirmConversation,
  getCurrentQuestion,
  resetConversation,
  startConversation,
  updateField,
} from './conversationState';
import { parseUserIntent } from './intentParser';
import { createConfirmationSummary } from './validators';
import { executeAIAction, routeAIAction } from './actionRouter';
import { logAIAction, saveAISessionState } from './auditLog';

const INTENT_LABELS = Object.freeze({
  [INTENTS.CREATE_ORDER]: 'create order',
  [INTENTS.ADD_CUSTOMER]: 'create customer',
  [INTENTS.ADD_INVENTORY]: 'add inventory',
  [INTENTS.ADD_EXPENSE]: 'create expense',
  [INTENTS.SHOW_ORDERS]: 'show orders',
  [INTENTS.SHOW_CUSTOMERS]: 'show customers',
  [INTENTS.SHOW_EXPENSES]: 'show expenses',
  [INTENTS.READ_INVENTORY]: 'show inventory',
  [INTENTS.READ_ANALYTICS]: 'show revenue',
});

function response(type, payload = {}) {
  return { type, ...payload };
}

function normalizeIntentFromText(message) {
  const text = String(message || '').toLowerCase();
  if (/\b(create|new|add|banao|banana|book)\b/.test(text) && /\border\b/.test(text)) {
    return INTENTS.CREATE_ORDER;
  }
  if (/\b(create|new|add)\b/.test(text) && /\b(customer|client)\b/.test(text)) {
    return INTENTS.ADD_CUSTOMER;
  }
  if (/\b(add|new|stock|inventory)\b/.test(text) && /\b(inventory|stock|item|raw material)\b/.test(text)) {
    return INTENTS.ADD_INVENTORY;
  }
  if (/\b(add|create|log|record)\b/.test(text) && /\b(expense|kharcha|cost)\b/.test(text)) {
    return INTENTS.ADD_EXPENSE;
  }
  return parseUserIntent(message).intent;
}

function extractSeedFields(intent, message) {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();
  const fields = {};

  if (intent === INTENTS.CREATE_ORDER) {
    const forMatch = text.match(/\bfor\s+([a-zA-Z][a-zA-Z ]{1,40})(?:\s|$)/i);
    if (forMatch) fields.customerName = forMatch[1].trim();
    const phoneMatch = text.match(/(\+?\d[\d\s-]{8,15}\d)/);
    if (phoneMatch) fields.phone = phoneMatch[1].replace(/[^\d+]/g, '');
    const productMatch = text.match(/\b(cake|cupcake|brownie|cookie|pastry|bread|dessert)[a-zA-Z ]*/i);
    if (productMatch) fields.product = productMatch[0].trim();
    const qtyMatch = lower.match(/\b(\d+)\s*(pcs|pieces|qty|quantity|cakes?|items?)?\b/);
    if (qtyMatch) fields.qty = Number(qtyMatch[1]);
  }

  return fields;
}

function persist(state) {
  saveAISessionState(state);
  return state;
}

export function handleAssistantMessage({
  message,
  state = resetConversation(),
  dataContext = {},
  userRole = 'admin',
  userId = null,
} = {}) {
  const context = { ...buildAIContext(dataContext), userRole };
  const trimmed = String(message || '').trim();

  if (!trimmed) return response('message', { text: 'Please type or speak a command.' });

  if (state?.status === 'collecting' && state.currentStep) {
    const nextState = persist(updateField(state, state.currentStep, trimmed));
    logAIAction({
      intent: nextState.intent,
      action: `field:${state.currentStep}`,
      status: nextState.validationErrors[state.currentStep] ? 'validation_error' : 'collected',
      userId,
      confirmationState: nextState.confirmationState,
      details: nextState.validationErrors[state.currentStep] || null,
    });

    if (nextState.validationErrors[state.currentStep]) {
      return response('question', {
        text: `${nextState.validationErrors[state.currentStep]}. ${getCurrentQuestion(state)}`,
        state: nextState,
      });
    }

    if (nextState.status === 'awaiting_confirmation') {
      const action = buildConfirmationAction(nextState);
      return response('confirmation', {
        text: 'Please confirm these details before I save anything.',
        state: nextState,
        action,
        confirmation: createConfirmationSummary(action),
      });
    }

    return response('question', {
      text: getCurrentQuestion(nextState),
      state: nextState,
    });
  }

  const intent = normalizeIntentFromText(trimmed);
  if (!intent) {
    return response('message', {
      text: 'I can help with orders, customers, inventory, expenses, stock, and revenue. Please try a specific command.',
      state,
    });
  }

  if ([
    INTENTS.SHOW_ORDERS,
    INTENTS.SHOW_CUSTOMERS,
    INTENTS.SHOW_EXPENSES,
    INTENTS.READ_INVENTORY,
    INTENTS.READ_ANALYTICS,
  ].includes(intent)) {
    const routed = routeAIAction({ intent, data: {} }, context);
    logAIAction({
      intent,
      action: INTENT_LABELS[intent],
      status: routed.ok ? 'success' : 'blocked',
      userId,
      targetEntity: intent === INTENTS.READ_INVENTORY ? 'inventory' : 'analytics',
      confirmationState: 'none',
    });
    return response(routed.ok ? 'result' : 'message', {
      text: routed.ok ? null : routed.message || INFORMATION_NOT_FOUND,
      result: routed.result,
      state,
    });
  }

  const seedFields = extractSeedFields(intent, trimmed);
  const nextState = persist(startConversation(intent, seedFields));
  logAIAction({
    intent,
    action: INTENT_LABELS[intent] || intent,
    status: nextState.status,
    userId,
    confirmationState: nextState.confirmationState,
  });

  if (nextState.status === 'awaiting_confirmation') {
    const action = buildConfirmationAction(nextState);
    return response('confirmation', {
      text: 'Please confirm these details before I save anything.',
      state: nextState,
      action,
      confirmation: createConfirmationSummary(action),
    });
  }

  return response('question', {
    text: getCurrentQuestion(nextState),
    state: nextState,
  });
}

export async function confirmAssistantAction({
  state,
  action,
  dataContext = {},
  userRole = 'admin',
  userId = null,
} = {}) {
  const confirmedState = persist(confirmConversation(state));
  const context = { ...buildAIContext(dataContext), userRole };
  const confirmedAction = {
    ...(action || buildConfirmationAction(state)),
    confirmed: true,
  };
  const result = await executeAIAction(confirmedAction, context);

  logAIAction({
    intent: confirmedAction.intent,
    action: confirmedAction.intent,
    status: result.ok ? 'success' : 'blocked',
    userId,
    targetEntity: result.result?.id || null,
    confirmationState: confirmedState.confirmationState,
    details: result.message || null,
  });

  return {
    ...result,
    state: result.ok ? resetConversation() : confirmedState,
  };
}

export function cancelAssistantAction({ state, userId = null } = {}) {
  const nextState = persist(cancelConversation(state));
  logAIAction({
    intent: state?.intent,
    action: 'cancel',
    status: 'cancelled',
    userId,
    confirmationState: nextState.confirmationState,
  });
  return nextState;
}
