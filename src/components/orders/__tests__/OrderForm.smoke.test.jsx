import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OrderForm from '../OrderForm';

describe('OrderForm Smoke Tests', () => {
  const defaultForm = {
    customer: '',
    phone: '',
    occasion: '',
    deliveryType: 'delivery',
    deliveryAddress: '',
    date: '',
    time: '',
    items: [],
    discount: '',
    discountType: 'flat',
    advance: '',
    paymentMethod: 'Cash',
    notes: '',
  };

  it('renders without crashing on Step 1', () => {
    const setForm = vi.fn();
    const onSubmit = vi.fn();
    const showToast = vi.fn();

    render(
      <OrderForm
        form={defaultForm}
        setForm={setForm}
        onSubmit={onSubmit}
        showToast={showToast}
        recipeList={[]}
      />
    );

    expect(screen.getByText("Let's get to know your customer")).toBeInTheDocument();
    expect(screen.getByText("WHEN'S THIS SWEET TREAT DUE?")).toBeInTheDocument();
  });

  it('navigates to Step 2 when valid data is provided for Step 1', async () => {
    const validForm = {
      ...defaultForm,
      customer: 'John Doe',
      phone: '1234567890',
      date: '2023-10-10',
      time: '14:00',
    };
    
    const setForm = vi.fn();
    const onSubmit = vi.fn();
    const showToast = vi.fn();

    render(
      <OrderForm
        form={validForm}
        setForm={setForm}
        onSubmit={onSubmit}
        showToast={showToast}
        recipeList={[]}
      />
    );

    // Find the 'Next' button
    const nextButton = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextButton);

    // Ensure no toast error was shown
    expect(showToast).not.toHaveBeenCalled();

    // Should navigate to Step 2 (await because of Framer Motion)
    expect(await screen.findByText('What amazing treats are you baking?')).toBeInTheDocument();
  });
});
