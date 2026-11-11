import { describe, it, expect } from 'vitest';
import {
  calculateTierStack,
  suggestTierConfigurations,
  TIER_PORTIONS,
} from '../cakeCalculator';

describe('cakeCalculator', () => {
  it('calculates servings and weight for a single 8" round tier correctly', () => {
    const stack = [{ size: 8, shape: 'round' }];
    const result = calculateTierStack(stack, 'dessert');

    expect(result.tiersCount).toBe(1);
    expect(result.totalServings).toBe(24);
    expect(result.totalWeightKg).toBe(2.2);
    expect(result.baseBoardSize).toBe(10);
    expect(result.dowelsRequired).toBe(0); // 1-tier doesn't need dowels underneath another tier
  });

  it('calculates 2-tier (6" on 8") stack with correct portions and dowels', () => {
    const stack = [{ size: 6 }, { size: 8 }];
    const result = calculateTierStack(stack, 'dessert');

    expect(result.tiersCount).toBe(2);
    // 6" (12) + 8" (24) = 36 dessert portions
    expect(result.totalServings).toBe(36);
    expect(result.totalWeightKg).toBe(3.4);
    // 6" tier on top requires support dowels
    expect(result.dowelsRequired).toBe(4);
    expect(result.baseBoardSize).toBe(10);
    expect(result.structuralGuide.length).toBeGreaterThan(0);
  });

  it('calculates coffee/finger portions (higher portion count)', () => {
    const stack = [{ size: 8, shape: 'round' }];
    const result = calculateTierStack(stack, 'coffee');

    // 8" coffee portions = 48
    expect(result.totalServings).toBe(48);
  });

  it('handles empty tiers gracefully', () => {
    const result = calculateTierStack([]);
    expect(result.totalServings).toBe(0);
    expect(result.totalWeightKg).toBe(0);
  });

  it('suggests optimal tier configurations for 50 guests', () => {
    const suggestions = suggestTierConfigurations(50, 'dessert');
    expect(suggestions.length).toBeGreaterThan(0);
    // Check that all suggestions are close to 50 servings
    suggestions.forEach((cfg) => {
      expect(cfg.totalServings).toBeGreaterThanOrEqual(40);
      expect(cfg.totalServings).toBeLessThanOrEqual(75);
    });
  });
});
