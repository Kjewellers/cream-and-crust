import { INTENTS } from './actionSchemas';
import { getCapability } from './capabilityMatrix';

export const CONFIRMATION_STATE = Object.freeze({
  NONE: 'none',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
});

export const FIELD_PROMPTS = Object.freeze({
  customerName: 'Customer name?',
  phone: 'Phone number?',
  deliveryAddress: 'Address? You can type "skip" if not needed.',
  product: 'Product?',
  qty: 'Quantity?',
  size: 'Size or weight? You can type "skip".',
  price: 'Price? You can type "skip".',
  deliveryDate: 'Delivery date?',
  deliveryTime: 'Delivery time?',
  name: 'Customer name?',
  item: 'Inventory item name?',
  stock: 'Stock quantity?',
  unit: 'Unit?',
  minStock: 'Minimum stock? You can type "skip".',
  expiryDate: 'Expiry date? You can type "skip".',
  cost: 'Cost? You can type "skip".',
  title: 'Expense title?',
  amount: 'Amount?',
  category: 'Category?',
  date: 'Date? You can type "skip".',
  vendor: 'Vendor? You can type "skip".',
  notes: 'Notes? You can type "skip".',
});

const OPTIONAL_DEFAULTS = Object.freeze({
  deliveryAddress: '',
  size: '1kg',
  price: 0,
  deliveryType: 'pickup',
  notes: '',
  minStock: 0,
  expiryDate: '',
  cost: 0,
  date: '',
  vendor: '',
});

const WORKFLOW_INTENTS = Object.freeze([
  INTENTS.CREATE_ORDER,
  INTENTS.ADD_CUSTOMER,
  INTENTS.ADD_INVENTORY,
  INTENTS.ADD_EXPENSE,
]);

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function isSkip(value) {
  return ['skip', 'no', 'nahi', 'nahin', 'none', 'optional'].includes(String(value || '').trim().toLowerCase());
}

function sanitizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

export function isWorkflowIntent(intent) {
  return WORKFLOW_INTENTS.includes(intent);
}

export function createEmptyConversation() {
  return {
    intent: null,
    currentStep: null,
    collectedFields: {},
    missingFields: [],
    validationErrors: {},
    confirmationState: CONFIRMATION_STATE.NONE,
    status: 'idle',
  };
}

export function getWorkflowFields(intent) {
  const capability = getCapability(intent);
  if (!capability) return [];
  return [...(capability.requiredFields || []), ...(capability.optionalFields || [])];
}

export function getMissingFields(intent, collectedFields = {}) {
  const capability = getCapability(intent);
  if (!capability) return [];
  return (capability.requiredFields || []).filter((field) => !hasValue(collectedFields[field]));
}

export function validateField(field, value, intent) {
  if (isSkip(value)) return { ok: true, value: OPTIONAL_DEFAULTS[field] ?? '' };

  const trimmed = typeof value === 'string' ? value.trim() : value;
  if (!hasValue(trimmed)) return { ok: false, error: 'Required field is missing' };

  if (field === 'phone') {
    const phone = sanitizePhone(trimmed);
    if (phone.length < 10 || phone.length > 14) {
      return { ok: false, error: 'Enter a valid phone number' };
    }
    return { ok: true, value: phone };
  }

  if (['qty', 'price', 'stock', 'minStock', 'cost', 'amount'].includes(field)) {
    const number = Number(trimmed);
    if (!Number.isFinite(number) || number < 0) {
      return { ok: false, error: 'Enter a valid non-negative number' };
    }
    return { ok: true, value: number };
  }

  return { ok: true, value: trimmed };
}

export function startConversation(intent, seedFields = {}) {
  if (!isWorkflowIntent(intent)) {
    return {
      ...createEmptyConversation(),
      status: 'blocked',
      validationErrors: { intent: 'Workflow is not supported for this intent' },
    };
  }

  const missingFields = getMissingFields(intent, seedFields);
  const optionalFields = (getCapability(intent)?.optionalFields || []).filter(
    (field) => !hasValue(seedFields[field])
  );
  const steps = [...missingFields, ...optionalFields];
  const currentStep = steps[0] || null;

  return {
    intent,
    currentStep,
    collectedFields: { ...seedFields },
    missingFields,
    validationErrors: {},
    confirmationState: currentStep ? CONFIRMATION_STATE.NONE : CONFIRMATION_STATE.PENDING,
    status: currentStep ? 'collecting' : 'awaiting_confirmation',
  };
}

export function updateField(state, field, value) {
  if (!state?.intent || !field) return state || createEmptyConversation();

  const validation = validateField(field, value, state.intent);
  if (!validation.ok) {
    return {
      ...state,
      validationErrors: { ...state.validationErrors, [field]: validation.error },
    };
  }

  const validationErrors = { ...state.validationErrors };
  delete validationErrors[field];
  const collectedFields = { ...state.collectedFields, [field]: validation.value };
  return nextStep({
    ...state,
    collectedFields,
    validationErrors,
  });
}

export function nextStep(state) {
  if (!state?.intent) return createEmptyConversation();

  const workflowFields = getWorkflowFields(state.intent);
  const next = workflowFields.find((field) => !hasValue(state.collectedFields[field]));
  const missingFields = getMissingFields(state.intent, state.collectedFields);

  if (next) {
    return {
      ...state,
      currentStep: next,
      missingFields,
      confirmationState: CONFIRMATION_STATE.NONE,
      status: 'collecting',
    };
  }

  return {
    ...state,
    currentStep: null,
    missingFields: [],
    confirmationState: CONFIRMATION_STATE.PENDING,
    status: 'awaiting_confirmation',
  };
}

export function confirmConversation(state) {
  return {
    ...state,
    confirmationState: CONFIRMATION_STATE.CONFIRMED,
    status: 'confirmed',
  };
}

export function cancelConversation(state) {
  return {
    ...(state || createEmptyConversation()),
    confirmationState: CONFIRMATION_STATE.CANCELLED,
    status: 'cancelled',
  };
}

export function resetConversation() {
  return createEmptyConversation();
}

export function getCurrentQuestion(state) {
  if (!state?.currentStep) return null;
  return FIELD_PROMPTS[state.currentStep] || `${state.currentStep}?`;
}

export function buildConfirmationAction(state) {
  if (!state?.intent || state.confirmationState !== CONFIRMATION_STATE.PENDING) return null;
  return {
    intent: state.intent,
    data: { ...state.collectedFields },
    confirmed: false,
    source: 'ai_conversation',
  };
}
