import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Subscribe from '../Subscription';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'test-user-1', email: 'baker@example.com' },
  }),
}));

vi.mock('../../context/SubscriptionContext', () => ({
  useSubscriptionContext: () => ({
    isPro: false,
    isTrial: false,
    expiryDate: null,
  }),
}));

const mockPurchases = {
  offering: null,
  offeringsLoading: false,
  purchasing: false,
  purchase: vi.fn(),
  restore: vi.fn(),
  isNativeApp: false,
};

vi.mock('../../hooks/usePurchases', () => ({
  usePurchases: () => mockPurchases,
}));

describe('Subscription Page smoke test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Web Pro plans when isNativeApp is false', () => {
    mockPurchases.isNativeApp = false;

    render(
      <MemoryRouter>
        <Subscribe />
      </MemoryRouter>
    );

    expect(screen.getByText(/Cream & Crust Web Pro/i)).toBeInTheDocument();
    expect(screen.getByText('Web Pro Monthly')).toBeInTheDocument();
    expect(screen.getByText('Web Pro Annual')).toBeInTheDocument();
    expect(screen.getByText('₹149')).toBeInTheDocument();
    expect(screen.getByText('₹1,499')).toBeInTheDocument();
    expect(screen.queryByText('Subscribe in Android app')).not.toBeInTheDocument();
  });

  it('renders native Google Play plans when isNativeApp is true', () => {
    mockPurchases.isNativeApp = true;

    render(
      <MemoryRouter>
        <Subscribe />
      </MemoryRouter>
    );

    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
    expect(screen.getByText('Pro Monthly')).toBeInTheDocument();
    expect(screen.getByText('Pro Annual')).toBeInTheDocument();
  });
});
