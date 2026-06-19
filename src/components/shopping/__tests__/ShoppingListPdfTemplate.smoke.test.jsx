import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ShoppingListPdfTemplate from '../ShoppingListPdfTemplate';

describe('ShoppingListPdfTemplate', () => {
  it('renders without crashing with empty data', () => {
    const { container } = render(<ShoppingListPdfTemplate items={[]} bakeryProfile={{}} />);
    expect(container).toBeInTheDocument();
  });

  it('renders bakery name and items correctly', () => {
    const items = [
      { name: 'Flour', qty: '2', unit: 'kg', bought: false },
      { name: 'Sugar', qty: '1', unit: 'kg', bought: true },
    ];
    const bakeryProfile = { name: 'My Test Bakery' };
    
    const { getByText, getAllByText } = render(<ShoppingListPdfTemplate items={items} bakeryProfile={bakeryProfile} />);
    
    // Check bakery name is rendered (it appears in header and footer)
    expect(getAllByText('My Test Bakery').length).toBeGreaterThan(0);
    
    // Check pending item is rendered
    expect(getByText('Flour')).toBeInTheDocument();
    expect(getByText('2 kg')).toBeInTheDocument();
    
    // Check bought item is rendered
    expect(getByText('Sugar (1 kg)')).toBeInTheDocument();
  });
});
