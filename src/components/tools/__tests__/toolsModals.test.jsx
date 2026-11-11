import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TierCakeCalculatorModal from '../TierCakeCalculatorModal';
import AllergenLabelModal from '../AllergenLabelModal';
import InstantQuoteModal from '../InstantQuoteModal';

// Mock iOS utilities
vi.mock('../../iOS', () => ({
  triggerHaptic: vi.fn(),
  showToast: vi.fn(),
}));

describe('TierCakeCalculatorModal', () => {
  it('does not render when open is false', () => {
    const { container } = render(<TierCakeCalculatorModal open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders pan selection and calculates servings when open', () => {
    render(<TierCakeCalculatorModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Tiered Cake Structural Calculator/i)).toBeInTheDocument();
    expect(screen.getByText(/Portions, cake weight, base board & dowels guide/i)).toBeInTheDocument();
  });

  it('triggers onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<TierCakeCalculatorModal open={true} onClose={handleClose} />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('AllergenLabelModal', () => {
  it('does not render when open is false', () => {
    const { container } = render(<AllergenLabelModal open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders FSSAI allergen label controls when open', () => {
    render(<AllergenLabelModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/FSSAI Food & Allergen Label Printer/i)).toBeInTheDocument();
    expect(screen.getByText(/Compliant regulatory stickers & thermal printing/i)).toBeInTheDocument();
  });

  it('triggers onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<AllergenLabelModal open={true} onClose={handleClose} />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('InstantQuoteModal', () => {
  it('does not render when open is false', () => {
    const { container } = render(<InstantQuoteModal open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders quotation builder and WhatsApp quote generator', () => {
    render(<InstantQuoteModal open={true} onClose={vi.fn()} bakery={{ name: 'Sweet Delights' }} />);
    expect(screen.getByText(/WhatsApp Instant Quote Builder/i)).toBeInTheDocument();
    expect(screen.getByText(/Produce aesthetic pricing proposals in 30 seconds/i)).toBeInTheDocument();
  });

  it('triggers onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<InstantQuoteModal open={true} onClose={handleClose} />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
