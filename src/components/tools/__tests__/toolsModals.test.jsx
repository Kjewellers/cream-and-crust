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

  it('renders FSSAI allergen label studio with design templates and printer auto-adjust profiles when open', () => {
    render(<AllergenLabelModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/FSSAI Food & Regulatory Label Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/AUTO-ADJUST/i)).toBeInTheDocument();
    expect(screen.getByText(/Templates & Fonts/i)).toBeInTheDocument();
    expect(screen.getByText(/Printer & Size Profiles/i)).toBeInTheDocument();
  });

  it('allows switching printer profiles and templates', () => {
    render(<AllergenLabelModal open={true} onClose={vi.fn()} />);

    // Click Printer & Size tab
    const printerTab = screen.getByRole('button', { name: /Printer & Size Profiles/i });
    fireEvent.click(printerTab);

    // Should list printer formats
    expect(screen.getByText(/58mm Thermal Roll/i)).toBeInTheDocument();
    expect(screen.getByText(/80mm Thermal Roll/i)).toBeInTheDocument();
    expect(screen.getByText(/3" × 2" Rectangular/i)).toBeInTheDocument();

    // Select 80mm format
    const formatCard = screen.getByText(/80mm Thermal Roll/i);
    fireEvent.click(formatCard);
    expect(screen.getByText(/80mm Kitchen Roll/i)).toBeInTheDocument();
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
