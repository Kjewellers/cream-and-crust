/**
 * Smoke test: InvoiceTemplate must render across many order/profile shapes
 * without crashing (it's rasterised by html2canvas — a render throw produces
 * a blank PDF / failed export).
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import InvoiceTemplate from '../InvoiceTemplate.jsx';

const fullOrder = {
  orderId: 'CC-101',
  customer: { name: 'Anita Kapoor', phone: '9876543210', email: 'a@x.com' },
  deliveryAddress: '12 Jasmine Lane, Mumbai',
  items: [
    { name: 'Chocolate Cake', size: '1 kg', qty: 1, unitPrice: 900, amount: 900 },
    { name: 'Cupcakes', qty: 6, unitPrice: 80, amount: 480 },
  ],
  total: 1380,
  advance: 500,
  notes: 'Happy Birthday Riya!',
  date: '2026-06-01',
  invoiceGeneratedAt: '2026-05-29',
};

const bakery = {
  name: 'Sweet Studio',
  tagline: 'Home Bakery',
  phone: '9000000000',
  email: 'studio@x.com',
  address: 'Shop 4, Bandra',
  upiId: 'studio@upi',
  instagram: '@sweetstudio',
};

describe('InvoiceTemplate smoke', () => {
  beforeEach(() => cleanup());

  it('renders fully-populated invoice', () => {
    const { container } = render(
      <InvoiceTemplate order={fullOrder} bakeryProfile={bakery} invoiceNumber="INV-101" />
    );
    expect(container.textContent).toContain('Sweet Studio');
    expect(container.textContent).toContain('Anita Kapoor');
    expect(container.textContent).toContain('Chocolate Cake');
    expect(container.textContent.toLowerCase()).toContain('powered by');
  });

  it('renders with empty order + empty profile (defaults)', () => {
    const { container } = render(<InvoiceTemplate order={{}} bakeryProfile={{}} />);
    expect(container.textContent).toContain('Cream'); // default brand
  });

  it('renders when items contain a null entry', () => {
    const { container } = render(
      <InvoiceTemplate
        order={{ ...fullOrder, items: [fullOrder.items[0], null, { name: 'X' }] }}
        bakeryProfile={bakery}
      />
    );
    expect(container.textContent).toContain('Sweet Studio');
  });

  it('renders when order has only a total (no items array)', () => {
    const { container } = render(
      <InvoiceTemplate
        order={{ product: 'Custom Cake', total: 1200, customerName: 'Bob' }}
        bakeryProfile={bakery}
      />
    );
    expect(container.textContent).toContain('Custom Cake');
    expect(container.textContent).toContain('Bob');
  });

  it('renders paid-in-full state', () => {
    const { container } = render(
      <InvoiceTemplate
        order={{ ...fullOrder, advance: 1380 }}
        bakeryProfile={bakery}
        invoiceNumber="INV-200"
      />
    );
    expect(container.textContent).toContain('PAID');
  });

  it('renders pickup order (no address)', () => {
    const { container } = render(
      <InvoiceTemplate
        order={{ orderId: 'P1', customerName: 'Zoe', total: 400 }}
        bakeryProfile={bakery}
      />
    );
    expect(container.textContent).toContain('Zoe');
  });

  it('does not crash with null customer object', () => {
    const { container } = render(
      <InvoiceTemplate order={{ customer: null, total: 100 }} bakeryProfile={bakery} />
    );
    expect(container.textContent).toContain('Customer');
  });
});
