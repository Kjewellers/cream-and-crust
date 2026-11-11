import { describe, it, expect } from 'vitest';
import {
  DISPATCH_CHECKLIST,
  generateRiderInstructions,
} from '../deliverySafetyProtocol';

describe('deliverySafetyProtocol', () => {
  it('contains essential safety steps in checklist', () => {
    expect(DISPATCH_CHECKLIST.length).toBeGreaterThanOrEqual(4);
    const ids = DISPATCH_CHECKLIST.map((c) => c.id);
    expect(ids).toContain('board_secured');
    expect(ids).toContain('box_taped');
    expect(ids).toContain('fragile_sticker');
  });

  it('generates bilingual rider instructions in English and Hindi', () => {
    const text = generateRiderInstructions({
      orderNumber: 204,
      customerName: 'Vikram Seth',
      deliveryAddress: 'Flat 402, Lotus Towers, Indiranagar',
      customerPhone: '9876543210',
    });

    expect(text).toContain('Order #204');
    expect(text).toContain('Vikram Seth');
    expect(text).toContain('KEEP 100% FLAT');
    expect(text).toContain('हिंदी');
    expect(text).toContain('समतल');
  });
});
