/**
 * Smoke test: mount RecipeDetail with varied recipe shapes and assert
 * it does NOT crash. Exists to flag the "white screen on tap" regression.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import RecipeDetail from '../RecipeDetail.jsx';
import RecipeErrorBoundary from '../RecipeErrorBoundary.jsx';

// jspdf and html2canvas are dynamically imported only on Export click,
// so no need to mock them. lucide-react / framer-motion render fine in jsdom.

// Silence triggerHaptic / showToast / Cookies usage by mocking the iOS
// helper module so tests don't rely on browser APIs.
vi.mock('../../iOS', () => ({
  showToast: vi.fn(),
  triggerHaptic: vi.fn(),
}));

const baseRecipe = {
  id: 'r1',
  name: 'Chocolate Truffle Cake',
  category: 'Cakes',
  yield: '1 kg cake',
  imageUrl: 'https://example.com/cake.jpg',
  difficulty: 'Medium',
  prepTime: '30 mins',
  bakeTime: '45 mins',
  status: 'Published',
  sellPrice: 900,
  packaging: 40,
  gas: 25,
  labor: 80,
  platformFee: 5,
  other: 11,
  ingredients: [
    { name: 'Flour', qty: 500, unit: 'g', cost: 20 },
    { name: 'Cocoa', qty: 60, unit: 'g', cost: 30 },
  ],
  steps: [
    { title: 'Preheat', desc: 'Preheat oven to 180C.', timer: '5 mins' },
    { title: 'Mix', desc: 'Mix dry ingredients.' },
  ],
  tags: ['chocolate', 'eggless'],
  notes: 'Use 70% dark chocolate.',
};

const renderInBoundary = (ui) =>
  render(<RecipeErrorBoundary onClose={() => {}}>{ui}</RecipeErrorBoundary>);

describe('RecipeDetail smoke', () => {
  beforeEach(() => cleanup());

  it('renders a fully-populated recipe without crashing', () => {
    const { container } = renderInBoundary(<RecipeDetail recipe={baseRecipe} onClose={() => {}} />);
    // Boundary has no error → recipe title is in the DOM.
    expect(container.textContent).toContain('Chocolate Truffle Cake');
    expect(container.textContent).not.toContain("Couldn't open recipe");
  });

  it('renders when ingredients is missing', () => {
    const { container } = renderInBoundary(
      <RecipeDetail recipe={{ ...baseRecipe, ingredients: undefined }} onClose={() => {}} />
    );
    expect(container.textContent).toContain('Chocolate Truffle Cake');
    expect(container.textContent).not.toContain("Couldn't open recipe");
  });

  it('renders when steps is missing', () => {
    const { container } = renderInBoundary(
      <RecipeDetail recipe={{ ...baseRecipe, steps: undefined }} onClose={() => {}} />
    );
    expect(container.textContent).toContain('Chocolate Truffle Cake');
    expect(container.textContent).not.toContain("Couldn't open recipe");
  });

  it('renders when tags is missing', () => {
    const { container } = renderInBoundary(
      <RecipeDetail recipe={{ ...baseRecipe, tags: undefined }} onClose={() => {}} />
    );
    expect(container.textContent).toContain('Chocolate Truffle Cake');
    expect(container.textContent).not.toContain("Couldn't open recipe");
  });

  it('renders with only id+name (skinny Firestore doc)', () => {
    const skinny = { id: 'r2', name: 'Skinny Recipe' };
    const { container } = renderInBoundary(<RecipeDetail recipe={skinny} onClose={() => {}} />);
    expect(container.textContent).toContain('Skinny Recipe');
    expect(container.textContent).not.toContain("Couldn't open recipe");
  });

  it('renders when imageUrl is null', () => {
    const { container } = renderInBoundary(
      <RecipeDetail recipe={{ ...baseRecipe, imageUrl: null }} onClose={() => {}} />
    );
    expect(container.textContent).toContain('Chocolate Truffle Cake');
    expect(container.textContent).not.toContain("Couldn't open recipe");
  });

  it('error boundary catches if recipe is null (recipe component returns null cleanly)', () => {
    const { container } = renderInBoundary(<RecipeDetail recipe={null} onClose={() => {}} />);
    // RecipeDetail has its own null-guard; it returns null without throwing.
    expect(container.textContent).not.toContain("Couldn't open recipe");
  });

  it('renders when ingredients contain malformed entries', () => {
    const malformed = {
      ...baseRecipe,
      ingredients: [
        { name: 'Flour', qty: '500', unit: 'g' }, // qty as string, no cost
        null, // a null entry
        { name: 'Sugar' }, // missing qty/unit/cost
      ],
    };
    const { container } = renderInBoundary(<RecipeDetail recipe={malformed} onClose={() => {}} />);
    // The boundary should NOT have caught — but if it does, surface the issue.
    expect(container.textContent).not.toContain("Couldn't open recipe");
  });
});
