import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DailyBakeSheetModal from '../DailyBakeSheetModal';

// Mock iOS utilities
vi.mock('../../iOS', () => ({
  triggerHaptic: vi.fn(),
  showToast: vi.fn(),
}));

describe('DailyBakeSheetModal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleOrders = [
    {
      id: 'order-1',
      orderNumber: 101,
      customerName: 'Aarav Patel',
      productName: 'Belgian Chocolate Cake',
      weight: '1.5kg',
      quantity: 1,
      deliveryTime: '4:00 PM',
      deliveryDate: new Date().toISOString(),
      status: 'confirmed',
      notes: 'Happy 30th Birthday Rahul',
    },
    {
      id: 'order-2',
      orderNumber: 102,
      customerName: 'Priya Sharma',
      productName: 'Belgian Chocolate Cake',
      weight: '1kg',
      quantity: 2,
      deliveryTime: '6:30 PM',
      deliveryDate: new Date().toISOString(),
      status: 'baking',
    },
    {
      id: 'order-3',
      orderNumber: 103,
      customerName: 'Karan Mehra',
      productName: 'Strawberry Shortcake',
      weight: '500g',
      quantity: 1,
      deliveryTime: '2:00 PM',
      deliveryDate: new Date().toISOString(),
      status: 'inquiry',
    },
  ];

  it('renders nothing when open is false', () => {
    const { container } = render(
      <DailyBakeSheetModal open={false} onClose={vi.fn()} orders={sampleOrders} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and batches when open is true', () => {
    render(
      <DailyBakeSheetModal open={true} onClose={vi.fn()} orders={sampleOrders} />
    );

    expect(screen.getByText('Daily Bake & Prep Sheet')).toBeDefined();
    expect(screen.getAllByText(/Belgian Chocolate Cake/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Strawberry Shortcake/i).length).toBeGreaterThan(0);
  });

  it('aggregates weights correctly across orders', () => {
    render(
      <DailyBakeSheetModal open={true} onClose={vi.fn()} orders={sampleOrders} />
    );

    // Order 1 is 1.5kg x 1, Order 2 is 1kg x 2 = 3.5kg
    expect(screen.getByText('3.5 kg')).toBeDefined();
    // Order 3 is 500g = 0.5kg
    expect(screen.getByText('0.5 kg')).toBeDefined();
  });

  it('toggles production checklist stage and saves to localStorage', () => {
    render(
      <DailyBakeSheetModal open={true} onClose={vi.fn()} orders={sampleOrders} />
    );

    const mixButtons = screen.getAllByText('1. Mixed');
    fireEvent.click(mixButtons[0]);

    const saved = JSON.parse(localStorage.getItem('cc_daily_bake_sheet_stages') || '{}');
    expect(saved['order-1']?.mixed).toBe(true);
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <DailyBakeSheetModal open={true} onClose={handleClose} orders={sampleOrders} />
    );

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});
