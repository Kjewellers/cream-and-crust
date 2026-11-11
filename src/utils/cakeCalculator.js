/**
 * cakeCalculator.js
 *
 * Professional structural, portioning & dowel engineering calculator for custom celebration cakes.
 * Uses international bakery standards (Wilton & PME serving matrices).
 */

// Portions per single tier (standard 4" - 5" height)
export const TIER_PORTIONS = {
  round: {
    4: { dessert: 4, coffee: 8, weightKg: 0.5 },
    5: { dessert: 8, coffee: 14, weightKg: 0.8 },
    6: { dessert: 12, coffee: 24, weightKg: 1.2 },
    7: { dessert: 16, coffee: 32, weightKg: 1.6 },
    8: { dessert: 24, coffee: 48, weightKg: 2.2 },
    9: { dessert: 32, coffee: 64, weightKg: 2.8 },
    10: { dessert: 38, coffee: 76, weightKg: 3.5 },
    12: { dessert: 56, coffee: 112, weightKg: 5.0 },
    14: { dessert: 78, coffee: 156, weightKg: 7.2 },
  },
  square: {
    6: { dessert: 18, coffee: 32, weightKg: 1.5 },
    8: { dessert: 32, coffee: 64, weightKg: 2.8 },
    10: { dessert: 50, coffee: 100, weightKg: 4.5 },
    12: { dessert: 72, coffee: 144, weightKg: 6.5 },
  },
};

/**
 * Calculate servings and weight for a specific tier stack
 * @param {Array<{ size: number, shape?: 'round'|'square' }>} tiers - top to bottom
 * @param {'dessert'|'coffee'} servingStyle
 */
export function calculateTierStack(tiers = [], servingStyle = 'dessert') {
  if (!tiers || tiers.length === 0) {
    return {
      tiersCount: 0,
      totalServings: 0,
      totalWeightKg: 0,
      dowelsRequired: 0,
      baseBoardSize: 8,
      tierBreakdown: [],
      structuralGuide: [],
    };
  }

  let totalServings = 0;
  let totalWeightKg = 0;
  let dowelsRequired = 0;

  const tierBreakdown = tiers.map((tier, idx) => {
    const shape = tier.shape || 'round';
    const size = Number(tier.size) || 6;
    const lookup = TIER_PORTIONS[shape]?.[size] || { dessert: 12, coffee: 24, weightKg: 1.2 };
    const servings = servingStyle === 'coffee' ? lookup.coffee : lookup.dessert;

    totalServings += servings;
    totalWeightKg += lookup.weightKg;

    // Support dowels needed underneath this tier if there is a tier resting on it
    let dowelsNeededBelow = 0;
    if (idx < tiers.length - 1) {
      // Current tier has tiers above it; tiers below this one must support it
      dowelsNeededBelow = size <= 6 ? 4 : size <= 8 ? 5 : size <= 10 ? 7 : 9;
      dowelsRequired += dowelsNeededBelow;
    }

    return {
      tierIndex: idx + 1, // 1 is top
      size,
      shape,
      servings,
      weightKg: lookup.weightKg,
      supportDowels: dowelsNeededBelow,
    };
  });

  const bottomTier = tiers[tiers.length - 1];
  const bottomSize = Number(bottomTier.size) || 8;
  const baseBoardSize = bottomSize + (bottomSize >= 10 ? 3 : 2);

  // Structural advice
  const structuralGuide = [];
  if (tiers.length > 1) {
    structuralGuide.push(`Use a sturdy 12mm thick Masonite / MDF base board of at least ${baseBoardSize}" diameter.`);
    structuralGuide.push(`Insert a central food-grade locking dowel running through all ${tiers.length} tiers.`);
  }
  if (tiers.length >= 3) {
    structuralGuide.push('Stack bottom 2 tiers and transport top tier in a separate chilled carrier if route is over 15 km.');
  }

  return {
    tiersCount: tiers.length,
    totalServings,
    totalWeightKg: Math.round(totalWeightKg * 10) / 10,
    dowelsRequired,
    baseBoardSize,
    tierBreakdown,
    structuralGuide,
  };
}

/**
 * Suggest optimal tier stacks for a target guest count
 * @param {number} guestCount
 * @param {'dessert'|'coffee'} servingStyle
 */
export function suggestTierConfigurations(guestCount = 50, servingStyle = 'dessert') {
  const commonStacks = [
    // 1-Tier
    [{ size: 6 }],
    [{ size: 8 }],
    [{ size: 9 }],
    [{ size: 10 }],
    [{ size: 12 }],
    // 2-Tier
    [{ size: 5 }, { size: 7 }],
    [{ size: 6 }, { size: 8 }],
    [{ size: 6 }, { size: 9 }],
    [{ size: 6 }, { size: 10 }],
    [{ size: 8 }, { size: 10 }],
    [{ size: 8 }, { size: 12 }],
    // 3-Tier
    [{ size: 4 }, { size: 6 }, { size: 8 }],
    [{ size: 5 }, { size: 7 }, { size: 9 }],
    [{ size: 6 }, { size: 8 }, { size: 10 }],
    [{ size: 6 }, { size: 9 }, { size: 12 }],
    [{ size: 8 }, { size: 10 }, { size: 12 }],
  ];

  return commonStacks
    .map((stack) => {
      const result = calculateTierStack(stack, servingStyle);
      const diff = Math.abs(result.totalServings - guestCount);
      return {
        stack,
        ...result,
        difference: diff,
        label: stack.map((t) => `${t.size}"`).join(' + '),
      };
    })
    .filter((cfg) => cfg.totalServings >= guestCount * 0.85 && cfg.totalServings <= guestCount * 1.4)
    .sort((a, b) => a.difference - b.difference)
    .slice(0, 5);
}
