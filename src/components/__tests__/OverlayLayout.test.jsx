import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DesktopHeader from '../navigation/DesktopHeader';
import { OverlayProvider, useOverlay } from '../../context/OverlayContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'baker-1', displayName: 'Baker Joe' },
    userDetails: { businessName: 'Sugar & Spice Bakery' },
  }),
}));

vi.mock('../../hooks/usePendingOrders', () => ({
  usePendingOrders: () => 3,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

function OverlayTestHarness() {
  const { openSheet, openModal } = useOverlay();
  return (
    <div>
      <button onClick={() => openSheet({ id: 'test-sheet', title: 'Test Sheet', content: <p>Sheet Body</p> })}>
        Open Sheet
      </button>
      <button onClick={() => openModal({ id: 'test-modal', title: 'Test Modal', content: <p>Modal Body</p> })}>
        Open Modal
      </button>
    </div>
  );
}

describe('DesktopHeader & Overlay Architecture', () => {
  it('renders DesktopHeader with search trigger, notifications badge, and profile', () => {
    const onSearchClick = vi.fn();
    const onNotificationClick = vi.fn();
    const toggleTheme = vi.fn();

    render(
      <DesktopHeader
        onSearchClick={onSearchClick}
        onNotificationClick={onNotificationClick}
        theme="light"
        toggleTheme={toggleTheme}
      />
    );

    expect(screen.getByText('Sugar & Spice Bakery')).toBeInTheDocument();
    expect(screen.getByText('Search orders, products, recipes...')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // 3 pending orders badge

    fireEvent.click(screen.getByRole('button', { name: /open command palette/i }));
    expect(onSearchClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /open notifications/i }));
    expect(onNotificationClick).toHaveBeenCalledTimes(1);
  });

  it('renders GlobalSheet with proper overlay container and card hierarchy', () => {
    render(
      <OverlayProvider>
        <OverlayTestHarness />
      </OverlayProvider>
    );

    fireEvent.click(screen.getByText('Open Sheet'));

    expect(screen.getByText('Test Sheet')).toBeInTheDocument();
    expect(screen.getByText('Sheet Body')).toBeInTheDocument();

    const sheetDialog = screen.getByRole('dialog');
    expect(sheetDialog).toHaveClass('cc-sheet-wrapper');
    expect(sheetDialog.querySelector('.cc-sheet-card')).not.toBeNull();
  });

  it('renders GlobalModal with proper centered modal card structure', () => {
    render(
      <OverlayProvider>
        <OverlayTestHarness />
      </OverlayProvider>
    );

    fireEvent.click(screen.getByText('Open Modal'));

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Body')).toBeInTheDocument();

    const modalDialog = screen.getByRole('dialog');
    expect(modalDialog).toHaveClass('cc-modal-wrapper');
    expect(modalDialog.querySelector('.cc-modal-card')).not.toBeNull();
  });
});
