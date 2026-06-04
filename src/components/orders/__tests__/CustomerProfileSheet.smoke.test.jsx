import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import CustomerProfileSheet from '../CustomerProfileSheet.jsx';

vi.mock('../../iOS', () => ({
  triggerHaptic: vi.fn(),
}));

const fullCustomer = {
  name: 'Anita Kapoor',
  phone: '9876543210',
  address: '12, Jasmine Lane, Mumbai 400001',
  totalOrders: 4,
  totalSpent: 5430.5,
};

describe('CustomerProfileSheet smoke', () => {
  beforeEach(() => cleanup());

  it('renders nothing when closed', () => {
    const { container } = render(
      <CustomerProfileSheet open={false} onClose={() => {}} customer={fullCustomer} />
    );
    expect(container.textContent).toBe('');
  });

  it('renders nothing when customer is null', () => {
    const { container } = render(
      <CustomerProfileSheet open={true} onClose={() => {}} customer={null} />
    );
    expect(container.textContent).toBe('');
  });

  it('renders a fully-populated customer', () => {
    const { container } = render(
      <CustomerProfileSheet open={true} onClose={() => {}} customer={fullCustomer} />
    );
    expect(container.textContent).toContain('Anita Kapoor');
    expect(container.textContent).toContain('9876543210');
    expect(container.textContent).toContain('Jasmine Lane');
    expect(container.textContent).toContain('Customer');
    expect(container.textContent).toContain('Total Orders');
    expect(container.textContent).toContain('Total Spent');
    // AnimatedNumber starts at 0 and animates up — initial render shows ₹0/0,
    // final (after animation) shows full value. We don't drive timers in smoke
    // tests; just confirm both stats render their currency prefix and the
    // structure isn't crashed.
    expect(container.textContent).toContain('₹');
  });

  it('shows Call + WhatsApp + Navigate when phone and address present', () => {
    const { container } = render(
      <CustomerProfileSheet open={true} onClose={() => {}} customer={fullCustomer} />
    );
    expect(container.textContent).toContain('Call');
    expect(container.textContent).toContain('WhatsApp');
    expect(container.textContent).toContain('Navigate');
  });

  it('hides quick actions when phone and address are both missing', () => {
    const { container } = render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={{ name: 'Skinny', totalOrders: 1, totalSpent: 0 }}
      />
    );
    expect(container.textContent).toContain('Skinny');
    expect(container.textContent).not.toContain('Call');
    expect(container.textContent).not.toContain('WhatsApp');
    expect(container.textContent).not.toContain('Navigate');
    expect(container.textContent).toContain('No address saved');
    expect(container.textContent).toContain('No phone on file');
  });

  it('uses fallback initial when name is missing', () => {
    const { container } = render(
      <CustomerProfileSheet open={true} onClose={() => {}} customer={{ phone: '9999999999' }} />
    );
    expect(container.textContent).toContain('Unknown');
    expect(container.textContent).toContain('9999999999');
  });

  it('renders ₹0 when totalSpent is missing/zero', () => {
    const { container } = render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={{ name: 'Z', phone: '8888888888' }}
      />
    );
    expect(container.textContent).toContain('₹0');
  });

  it('handles non-numeric totalSpent gracefully', () => {
    const { container } = render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={{ name: 'X', phone: '7777777777', totalSpent: undefined, totalOrders: undefined }}
      />
    );
    expect(container.textContent).toContain('X');
    expect(container.textContent).toContain('₹0');
  });

  it('handles emoji name initial gracefully', () => {
    const { container } = render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={{ name: '🧁 Anonymous', phone: '6666666666' }}
      />
    );
    expect(container.textContent).toContain('Anonymous');
  });

  it('renders Past Orders section and "Order again" buttons for matched orders', () => {
    const orders = [
      {
        id: 'o1',
        customer: { name: 'Anita Kapoor', phone: '9876543210' },
        product: 'Red Velvet 1kg',
        total: 1850,
        status: 'delivered',
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 },
      },
      {
        id: 'o2',
        phone: '9876543210',
        itemName: 'Brownie Box',
        total: 720,
        status: 'inquiry',
        createdAt: { seconds: Math.floor(Date.now() / 1000) - 7 * 86400 },
      },
      // unrelated customer — must NOT show
      {
        id: 'other',
        phone: '1111111111',
        product: 'Croissant',
        total: 200,
      },
    ];
    const { container } = render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={fullCustomer}
        orders={orders}
        onRepeatOrder={() => {}}
      />
    );
    expect(container.textContent).toContain('Past Orders');
    expect(container.textContent).toContain('Red Velvet 1kg');
    expect(container.textContent).toContain('Brownie Box');
    expect(container.textContent).not.toContain('Croissant');
    // "Order again" buttons should be present for each matched row.
    const buttons = container.querySelectorAll('button[aria-label^="Order "]');
    expect(buttons.length).toBe(2);
  });

  it('Order again fires onRepeatOrder with the original order then closes the sheet', () => {
    const onRepeatOrder = vi.fn();
    const onClose = vi.fn();
    const past = {
      id: 'o42',
      customer: { name: 'Anita Kapoor', phone: '9876543210' },
      product: 'Choco Truffle 500g',
      total: 950,
      status: 'delivered',
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 3 * 86400 },
    };
    const { container } = render(
      <CustomerProfileSheet
        open={true}
        onClose={onClose}
        customer={fullCustomer}
        orders={[past]}
        onRepeatOrder={onRepeatOrder}
      />
    );
    const btn = container.querySelector('button[aria-label^="Order "]');
    expect(btn).toBeTruthy();
    btn.click();
    expect(onRepeatOrder).toHaveBeenCalledTimes(1);
    expect(onRepeatOrder).toHaveBeenCalledWith(past);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render Past Orders when customer has no phone', () => {
    const orders = [{ id: 'o1', phone: '9876543210', product: 'Tart', total: 300 }];
    const { container } = render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={{ name: 'No Phone', totalOrders: 1, totalSpent: 0 }}
        orders={orders}
      />
    );
    expect(container.textContent).not.toContain('Past Orders');
  });
});
