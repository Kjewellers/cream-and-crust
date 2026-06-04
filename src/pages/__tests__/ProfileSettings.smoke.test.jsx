/**
 * Smoke test: Profile and Settings must render on a COLD reload, when
 * auth/business data is still loading (nulls, partial localStorage user).
 * A render throw here = the blank-screen-on-reload bug.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ──
const mockAuth = {
  currentUser: { uid: 'u1', email: 'baker@x.com', displayName: 'Baker' }, // restored from localStorage (no metadata)
  userRole: null, // role not resolved yet on cold load
  logout: vi.fn(),
};
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('../../services/db', () => ({
  subscribeToOrders: (cb) => {
    cb([]);
    return () => {};
  },
  subscribeToBusiness: (cb) => {
    // simulate the snapshot resolving to the default placeholder
    cb({ id: 'u1', name: 'Cream & Crust', logo: '🧁' });
    return () => {};
  },
  updateBusinessInDB: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => ({}) })),
  updateDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn(() => vi.fn()),
}));

vi.mock('../../services/firebase', () => ({ db: {} }));

vi.mock('../../components/iOS', () => ({
  showToast: vi.fn(),
  triggerHaptic: vi.fn(),
}));

import Profile from '../Profile.jsx';
import Settings from '../Settings.jsx';

const renderPage = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Profile / Settings cold-load smoke', () => {
  beforeEach(() => {
    cleanup();
    mockAuth.userRole = null;
  });

  it('Profile renders with null role + placeholder business', () => {
    const { container } = renderPage(<Profile />);
    expect(container.textContent).toContain('Profile');
  });

  it('Profile renders for admin role', () => {
    mockAuth.userRole = 'admin';
    const { container } = renderPage(<Profile />);
    expect(container.textContent).toContain('Profile');
  });

  it('Profile renders for customer role', () => {
    mockAuth.userRole = 'customer';
    const { container } = renderPage(<Profile />);
    expect(container.textContent).toBeTruthy();
  });

  it('Settings renders with null role', () => {
    const { container } = renderPage(<Settings />);
    expect(container.textContent).toContain('Settings');
  });

  it('Settings renders for admin role', () => {
    mockAuth.userRole = 'admin';
    const { container } = renderPage(<Settings />);
    expect(container.textContent).toContain('Settings');
  });
});
