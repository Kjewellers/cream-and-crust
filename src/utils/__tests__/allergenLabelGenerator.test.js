import { describe, it, expect } from 'vitest';
import {
  detectAllergens,
  generateLabelData,
} from '../allergenLabelGenerator';

describe('allergenLabelGenerator', () => {
  it('detects gluten, dairy and eggs in traditional cake ingredients', () => {
    const ingredients = ['Refined wheat flour (maida)', 'Butter', 'Eggs', 'Sugar', 'Vanilla'];
    const result = detectAllergens(ingredients);

    expect(result.allergens).toContain('Gluten (Wheat)');
    expect(result.allergens).toContain('Milk & Dairy');
    expect(result.allergens).toContain('Eggs');
    expect(result.isEggless).toBe(false);
    expect(result.hasAllergens).toBe(true);
  });

  it('marks eggless bake correctly when no eggs are present', () => {
    const ingredients = ['Wheat flour', 'Cocoa powder', 'Milk', 'Vegetable oil', 'Almonds'];
    const result = detectAllergens(ingredients);

    expect(result.isEggless).toBe(true);
    expect(result.allergens).toContain('Tree Nuts & Peanuts');
  });

  it('generates full FSSAI compliant label metadata', () => {
    const label = generateLabelData({
      productName: 'Signature Sourdough Bread',
      bakeryName: 'Cream & Crust Atelier',
      fssaiNumber: '11223344556677',
      netWeight: '450g',
      ingredients: ['Organic wheat flour', 'Water', 'Salt', 'Wild yeast starter'],
      shelfLifeDays: 3,
    });

    expect(label.productName).toBe('Signature Sourdough Bread');
    expect(label.isEggless).toBe(true);
    expect(label.fssaiNumber).toBe('11223344556677');
    expect(label.batchCode).toMatch(/^CC-\d{8}-\d{2}$/);
    expect(label.thermalText).toContain('CREAM & CRUST ATELIER');
    expect(label.thermalText).toContain('11223344556677');
  });
});
