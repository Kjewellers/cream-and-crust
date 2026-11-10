import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavigationMenu from '../NavigationMenu';
import { OverlayProvider, useOverlay } from '../../../context/OverlayContext';
import { DataContext } from '../../../context/DataContext';

// Mock AuthContext
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'test_user', displayName: 'Baker Test' },
    isAdmin: true,
    userRole: 'admin',
    logout: vi.fn(),
  }),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

function DrawerTestApp() {
  const { openDrawer, closeOverlay } = useOverlay();

  return (
    <div>
      <button
        data-testid="open-sidebar"
        onClick={() =>
          openDrawer({
            id: 'main-nav',
            content: <NavigationMenu onClose={() => closeOverlay('main-nav')} theme="light" toggleTheme={vi.fn()} />,
          })
        }
      >
        Open Menu
      </button>
    </div>
  );
}

describe('Sidebar / NavigationMenu Drawer Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders NavigationMenu within OverlayProvider and Router without crashing', () => {
    const mockDataContext = {
      orders: [{ id: '1', status: 'confirmed' }],
      customers: [],
      inventory: [],
      expenses: [],
      shoppingItems: [],
      products: [],
      loading: false,
    };

    render(
      <MemoryRouter>
        <DataContext.Provider value={mockDataContext}>
          <OverlayProvider>
            <DrawerTestApp />
          </OverlayProvider>
        </DataContext.Provider>
      </MemoryRouter>
    );

    // Click the button that opens the drawer
    const openBtn = screen.getByTestId('open-sidebar');
    fireEvent.click(openBtn);

    // Verify brand and nav items are rendered
    expect(screen.getByText('Cream & Crust')).toBeInTheDocument();
    expect(screen.getByText('BAKERY MANAGER')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('nav.orders')).toBeInTheDocument();
  });
});

