import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ──
const mockAuth = {
  currentUser: { uid: 'u1', email: 'baker@x.com', displayName: 'Baker' },
};
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('../../context/DataContext', () => ({
  useData: () => ({
    expenses: [
      { id: '1', category: 'Ingredients', description: 'Flour', amount: 1000, date: '2026-06-01' },
      { id: '2', category: 'Packaging', description: 'Boxes', amount: 500, date: '2026-06-02' }
    ],
    setExpenses: vi.fn(),
    loading: false,
  }),
}));

vi.mock('../../services/db', () => ({
  subscribeToExpenses: (cb) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    cb([
      { id: '1', category: 'Ingredients', description: 'Flour', amount: 1000, date: `${currentMonth}-01` },
      { id: '2', category: 'Packaging', description: 'Boxes', amount: 500, date: `${currentMonth}-02` }
    ]);
    return () => {};
  },
  addExpenseToDB: vi.fn(),
  deleteExpenseFromDB: vi.fn(),
  uploadReceiptToStorage: vi.fn(),
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
  PullToRefresh: ({ children }) => <div data-testid="mock-pull-to-refresh">{children}</div>,
  CardSkeleton: () => <div data-testid="mock-card-skeleton">Loading...</div>,
  SwipeRow: ({ children }) => <div data-testid="mock-swipe-row">{children}</div>,
  BottomSheet: ({ children, open }) => open ? <div data-testid="mock-bottom-sheet">{children}</div> : null,
}));

vi.mock('../../components/DopamineKit', () => ({
  triggerConfetti: vi.fn(),
  triggerFloatingReward: vi.fn(),
}));

vi.mock('../../utils/exportUtils', () => ({
  exportToCSV: vi.fn(),
}));

// Mock react-chartjs-2 to avoid canvas issues in Node/jsdom
vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="mock-doughnut">Doughnut Chart</div>,
}));

import Expenses from '../Expenses.jsx';

const renderPage = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Expenses page smoke test', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders Expenses page with fetched data', () => {
    const { container, getByText, getByTestId } = renderPage(<Expenses />);
    expect(container.textContent).toContain('Expenses');
    expect(getByText('Flour')).toBeDefined();
    expect(getByText('Boxes')).toBeDefined();
    expect(getByTestId('mock-doughnut')).toBeDefined();
  });
});
