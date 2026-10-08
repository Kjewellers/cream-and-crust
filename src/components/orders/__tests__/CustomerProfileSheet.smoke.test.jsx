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
  beforeEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('renders nothing when closed', () => {
    render(
      <CustomerProfileSheet open={false} onClose={() => {}} customer={fullCustomer} />
    );
    expect(document.body.textContent).toBe('');
  });

  it('renders nothing when customer is null', () => {
    render(
      <CustomerProfileSheet open={true} onClose={() => {}} customer={null} />
    );
    expect(document.body.textContent).toBe('');
  });

  it('renders a fully-populated customer', () => {
    render(
      <CustomerProfileSheet open={true} onClose={() => {}} customer={fullCustomer} />
    );
    expect(document.body.textContent).toContain('Anita Kapoor');
    expect(document.body.textContent).toContain('9876543210');
    expect(document.body.textContent).toContain('Jasmine Lane');
    expect(document.body.textContent).toContain('Customer');
    expect(document.body.textContent).toContain('Total Orders');
    expect(document.body.textContent).toContain('Total Spent');
    expect(document.body.textContent).toContain('₹');
  });

  it('shows Call + WhatsApp + Navigate when phone and address present', () => {
    render(
      <CustomerProfileSheet open={true} onClose={() => {}} customer={fullCustomer} />
    );
    expect(document.body.textContent).toContain('Call');
    expect(document.body.textContent).toContain('WhatsApp');
    expect(document.body.textContent).toContain('Navigate');
  });

  it('hides quick actions when phone and address are both missing', () => {
    render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={{ name: 'Skinny', totalOrders: 1, totalSpent: 0 }}
      />
    );
    expect(document.body.textContent).toContain('Skinny');
    expect(document.body.textContent).not.toContain('Call');
    expect(document.body.textContent).not.toContain('WhatsApp');
    expect(document.body.textContent).not.toContain('Navigate');
    expect(document.body.textContent).toContain('No address saved');
    expect(document.body.textContent).toContain('No phone on file');
  });

  it('uses fallback initial when name is missing', () => {
    render(
      <CustomerProfileSheet open={true} onClose={() => {}} customer={{ phone: '9999999999' }} />
    );
    expect(document.body.textContent).toContain('Unknown');
    expect(document.body.textContent).toContain('9999999999');
  });

  it('renders ₹0 when totalSpent is missing/zero', () => {
    render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={{ name: 'Z', phone: '8888888888' }}
      />
    );
    expect(document.body.textContent).toContain('₹0');
  });

  it('handles non-numeric totalSpent gracefully', () => {
    render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={{ name: 'X', phone: '7777777777', totalSpent: undefined, totalOrders: undefined }}
      />
    );
    expect(document.body.textContent).toContain('X');
    expect(document.body.textContent).toContain('₹0');
  });

  it('handles emoji name initial gracefully', () => {
    render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={{ name: '🧁 Anonymous', phone: '6666666666' }}
      />
    );
    expect(document.body.textContent).toContain('Anonymous');
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
      {
        id: 'other',
        phone: '1111111111',
        product: 'Croissant',
        total: 200,
      },
    ];
    render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={fullCustomer}
        orders={orders}
        onRepeatOrder={() => {}}
      />
    );
    expect(document.body.textContent).toContain('Past Orders');
    expect(document.body.textContent).toContain('Red Velvet 1kg');
    expect(document.body.textContent).toContain('Brownie Box');
    expect(document.body.textContent).not.toContain('Croissant');
    const buttons = document.body.querySelectorAll('button[aria-label^="Order "]');
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
    render(
      <CustomerProfileSheet
        open={true}
        onClose={onClose}
        customer={fullCustomer}
        orders={[past]}
        onRepeatOrder={onRepeatOrder}
      />
    );
    const btn = document.body.querySelector('button[aria-label^="Order "]');
    expect(btn).toBeTruthy();
    btn.click();
    expect(onRepeatOrder).toHaveBeenCalledTimes(1);
    expect(onRepeatOrder).toHaveBeenCalledWith(past);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render Past Orders when customer has no phone', () => {
    const orders = [{ id: 'o1', phone: '9876543210', product: 'Tart', total: 300 }];
    render(
      <CustomerProfileSheet
        open={true}
        onClose={() => {}}
        customer={{ name: 'No Phone', totalOrders: 1, totalSpent: 0 }}
        orders={orders}
      />
    );
    expect(document.body.textContent).not.toContain('Past Orders');
  });
});
