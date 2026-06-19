import { describe, expect, it } from 'vitest';
import { INTENTS, INFORMATION_NOT_FOUND } from '../actionSchemas';
import { buildAIContext, calculateRealAnalytics, getInventorySnapshot } from '../contextBuilder';
import { parseIntentResponse, parseUserIntent } from '../intentParser';
import { prepareAIAction, routeReadOnlyIntent } from '../actionRouter';
import { validateActionDraft } from '../validators';

describe('AI foundation', () => {
  it('parses structured AI intent responses without inventing fields', () => {
    const parsed = parseIntentResponse(JSON.stringify({
      intent: 'create_order',
      data: {
        customer: 'Priya',
        product: 'Chocolate Cake',
      },
    }));

    expect(parsed.intent).toBe(INTENTS.CREATE_ORDER);
    expect(parsed.data.customerName).toBe('Priya');
    expect(parsed.data.product).toBe('Chocolate Cake');
    expect(parsed.data.phone).toBeUndefined();
  });

  it('detects simple read-only user intent deterministically', () => {
    expect(parseUserIntent('butter stock kitna bacha hai').intent).toBe(INTENTS.READ_INVENTORY);
    expect(parseUserIntent('show revenue report').intent).toBe(INTENTS.READ_ANALYTICS);
  });

  it('asks for one missing field before preparing a mutation', () => {
    const result = prepareAIAction({
      intent: INTENTS.CREATE_ORDER,
      data: {
        customerName: 'Priya',
        product: 'Chocolate Cake',
      },
    });

    expect(result.status).toBe('needs_input');
    expect(result.nextMissingField).toBe('phone');
  });

  it('requires confirmation before executing mutations', () => {
    const validation = validateActionDraft({
      intent: INTENTS.ADD_EXPENSE,
      data: {
        title: 'Butter',
        amount: 250,
        category: 'Ingredients',
      },
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain('Confirmation required before execution');
  });

  it('rejects document mutations when the id is not present in real context', () => {
    const validation = validateActionDraft({
      intent: INTENTS.DELETE_ORDER,
      confirmed: true,
      data: { orderId: 'missing-order' },
    }, {
      orders: [{ id: 'real-order' }],
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors[0]).toContain(INFORMATION_NOT_FOUND);
  });

  it('returns exact inventory values from context', () => {
    const context = buildAIContext({
      inventory: [{ id: 'i1', item: 'Butter', stock: 2.5, unit: 'kg', minStock: 1 }],
    });

    const result = routeReadOnlyIntent({ intent: INTENTS.READ_INVENTORY }, context);

    expect(result.ok).toBe(true);
    expect(result.result.items).toEqual([
      {
        id: 'i1',
        item: 'Butter',
        stock: 2.5,
        unit: 'kg',
        minStock: 1,
        lowStock: false,
        expiryDate: '',
      },
    ]);
  });

  it('returns Information not found when analytics has no real data', () => {
    const result = calculateRealAnalytics(buildAIContext({}));
    expect(result.ok).toBe(false);
    expect(result.message).toBe(INFORMATION_NOT_FOUND);
  });

  it('calculates analytics from real context only', () => {
    const context = buildAIContext({
      orders: [
        { id: 'o1', product: 'Brownie', status: 'delivered', total: 500, amountPaid: 200 },
        { id: 'o2', product: 'Cake', status: 'cancelled', total: 900 },
      ],
      expenses: [{ id: 'e1', title: 'Box', amount: 100 }],
    });

    const result = calculateRealAnalytics(context);

    expect(result.ok).toBe(true);
    expect(result.revenue).toBe(500);
    expect(result.collected).toBe(200);
    expect(result.pendingPayments).toBe(300);
    expect(result.netProfit).toBe(400);
  });

  it('validates navigation target allowlist', () => {
    const result = routeReadOnlyIntent({
      intent: INTENTS.NAVIGATE,
      data: { to: 'https://evil.example' },
    });
    console.log("NAVIGATE RESULT", result);

    expect(result.ok).toBe(false);
    expect(result.errors?.[0]).toContain('to must be one of');
  });
});
