import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DesktopHeader from '../navigation/DesktopHeader';
import { OverlayProvider, useOverlay } from '../../context/OverlayContext';
import NativeBottomSheet from '../ui/NativeBottomSheet';
import NativeModal from '../ui/NativeModal';

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

function NativeBottomSheetHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open Native Sheet</button>
      <NativeBottomSheet open={open} onClose={() => setOpen(false)} title="New Order Form">
        <div>Form Content</div>
      </NativeBottomSheet>
    </div>
  );
}

function NativeModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open Native Modal</button>
      <NativeModal open={open} onClose={() => setOpen(false)} title="Calculation Result">
        <div>Calculation Content</div>
      </NativeModal>
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

  it('renders NativeBottomSheet directly in portal, locks scroll, and closes cleanly via the cross button', async () => {
    render(<NativeBottomSheetHarness />);

    // Initially closed
    expect(screen.queryByText('New Order Form')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');

    // Open sheet
    fireEvent.click(screen.getByText('Open Native Sheet'));
    expect(screen.getByText('New Order Form')).toBeInTheDocument();
    expect(screen.getByText('Form Content')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    // Click close cross button
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);

    // Closed and scroll unlocked
    await waitFor(() => {
      expect(screen.queryByText('New Order Form')).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe('');
  });

  it('renders NativeModal directly in portal, locks scroll, and closes cleanly via the cross button', async () => {
    render(<NativeModalHarness />);

    // Initially closed
    expect(screen.queryByText('Calculation Result')).not.toBeInTheDocument();

    // Open modal
    fireEvent.click(screen.getByText('Open Native Modal'));
    expect(screen.getByText('Calculation Result')).toBeInTheDocument();
    expect(screen.getByText('Calculation Content')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    // Click close cross button
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);

    // Closed and scroll unlocked
    await waitFor(() => {
      expect(screen.queryByText('Calculation Result')).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe('');
  });
});
