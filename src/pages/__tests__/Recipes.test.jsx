import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Recipes from '../Recipes.jsx';

// ── Mocks ──
const mockAuth = {
  currentUser: { uid: 'u1', email: 'baker@x.com', displayName: 'Baker' },
};
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('../../context/PermissionContext', () => ({
  usePermissions: () => ({
    requirePermission: vi.fn((type, cb) => cb && cb()),
    hasPermission: vi.fn(() => true),
  }),
}));

vi.mock('../../services/db', () => ({
  subscribeToRecipes: (cb) => {
    cb([
      {
        id: 'rec-1',
        name: 'Dark Forest Cake',
        category: 'Cakes',
        yield: '1 kg cake',
        bakeTime: '40 mins',
        sellPrice: 950,
        status: 'Published',
        badge: 'Popular',
        ingredients: [
          { name: 'Flour', qty: '400', unit: 'g', cost: 20 },
          { name: 'Dark Chocolate', qty: '200', unit: 'g', cost: 120 },
        ],
        steps: [{ title: 'Bake', desc: 'Bake at 180C', timer: '40 mins' }],
        tags: ['Chocolate', 'Eggless'],
      },
      {
        id: 'rec-2',
        name: 'Strawberry Cupcakes',
        category: 'Cupcakes',
        yield: '6 pcs',
        bakeTime: '20 mins',
        sellPrice: 350,
        status: 'Published',
        ingredients: [
          { name: 'Flour', qty: '200', unit: 'g', cost: 10 },
          { name: 'Strawberries', qty: '100', unit: 'g', cost: 40 },
        ],
        steps: [{ title: 'Bake', desc: 'Bake at 180C', timer: '20 mins' }],
        tags: ['Fruit', 'Kids'],
      },
    ]);
    return () => {};
  },
  deleteRecipeFromDB: vi.fn(),
  addRecipeToDB: vi.fn(),
  updateRecipeInDB: vi.fn(),
}));

vi.mock('../../components/iOS', () => ({
  showToast: vi.fn(),
  triggerHaptic: vi.fn(),
}));

describe('Recipes Page', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders Recipe Studio header and formula metrics', () => {
    render(
      <MemoryRouter>
        <Recipes />
      </MemoryRouter>
    );

    expect(screen.getByText('Recipe Studio')).toBeInTheDocument();
    expect(screen.getByText(/Bakery Production & Formulas/i)).toBeInTheDocument();
    expect(screen.getByText('Formulas in Studio')).toBeInTheDocument();
    expect(screen.getByText('Avg. Batch Cost')).toBeInTheDocument();
    expect(screen.getByText('Highest Margin Formula')).toBeInTheDocument();
  });

  it('renders recipe items in grid mode', () => {
    render(
      <MemoryRouter>
        <Recipes />
      </MemoryRouter>
    );

    const grid = document.querySelector('.recipes-grid');
    expect(grid).toBeInTheDocument();
    expect(within(grid).getByText('Dark Forest Cake')).toBeInTheDocument();
    expect(within(grid).getByText('Strawberry Cupcakes')).toBeInTheDocument();
  });

  it('switches between grid and list views', () => {
    render(
      <MemoryRouter>
        <Recipes />
      </MemoryRouter>
    );

    const listBtn = screen.getByRole('button', { name: /list view/i });
    fireEvent.click(listBtn);

    const list = document.querySelector('.recipes-list');
    expect(list).toBeInTheDocument();
    expect(within(list).getByText('Dark Forest Cake')).toBeInTheDocument();

    const gridBtn = screen.getByRole('button', { name: /grid view/i });
    fireEvent.click(gridBtn);
    expect(document.querySelector('.recipes-grid')).toBeInTheDocument();
  });

  it('filters recipes by category', async () => {
    render(
      <MemoryRouter>
        <Recipes />
      </MemoryRouter>
    );

    // Click Cupcakes category filter
    const cupcakesBtn = screen.getByRole('button', { name: /Cupcakes/i });
    fireEvent.click(cupcakesBtn);

    const grid = document.querySelector('.recipes-grid');
    expect(within(grid).getByText('Strawberry Cupcakes')).toBeInTheDocument();
    await waitFor(() => {
      expect(within(grid).queryByText('Dark Forest Cake')).not.toBeInTheDocument();
    });
  });

  it('opens and closes Add Recipe modal cleanly', async () => {
    render(
      <MemoryRouter>
        <Recipes />
      </MemoryRouter>
    );

    const addBtn = screen.getByRole('button', { name: /Add Recipe/i });
    fireEvent.click(addBtn);

    expect(await screen.findByText('Add New Recipe')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Add New Recipe')).not.toBeInTheDocument();
    });
  });

  it('opens RecipeDetail when a recipe is tapped and closes with close button', async () => {
    render(
      <MemoryRouter>
        <Recipes />
      </MemoryRouter>
    );

    const grid = document.querySelector('.recipes-grid');
    const cakeCard = within(grid).getByText('Dark Forest Cake');
    fireEvent.click(cakeCard);

    expect(await screen.findByRole('button', { name: /start baking/i })).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /start baking/i })).not.toBeInTheDocument();
    });
  });
});
