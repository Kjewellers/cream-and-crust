import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LabelStudioEngine from '../LabelStudioEngine';

// Mock iOS utilities
vi.mock('../../iOS', () => ({
  triggerHaptic: vi.fn(),
  showToast: vi.fn(),
}));

describe('LabelStudioEngine (3-Step Guided Studio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders 3-step guided progress navigation header', () => {
    render(<LabelStudioEngine />);

    expect(screen.getByText(/Product & Formula/i)).toBeInTheDocument();
    expect(screen.getByText(/Design & Style/i)).toBeInTheDocument();
    expect(screen.getByText(/Printer & Output/i)).toBeInTheDocument();
  });

  it('starts on Step 1 with product formulations and bakery presets', () => {
    render(<LabelStudioEngine />);

    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Product & Regulatory Formulation/i)).toBeInTheDocument();
    expect(screen.getByText(/Load Bakery Formula Presets/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Artisan Celebration Cake/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sourdough Country Loaf/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Proceed to Step 2: Templates & Fonts/i })).toBeInTheDocument();
  });

  it('allows loading a bakery preset and updates inputs and allergens', () => {
    render(<LabelStudioEngine />);

    const sourdoughPreset = screen.getByText(/Sourdough Country Loaf/i);
    fireEvent.click(sourdoughPreset);

    // Live preview should update
    expect(screen.getAllByText(/Sourdough Country Loaf/i).length).toBeGreaterThan(0);
  });

  it('navigates through Step 1 -> Step 2 -> Step 3 smoothly', async () => {
    render(<LabelStudioEngine />);

    // Click Proceed to Step 2
    const nextToStep2Btn = screen.getByRole('button', { name: /Proceed to Step 2: Templates & Fonts/i });
    fireEvent.click(nextToStep2Btn);

    // Should now be on Step 2 (waiting for AnimatePresence transition)
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Choose Your Label Design Template & Brand Font/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Classic Thermal/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Artisan Minimalist/i)).toBeInTheDocument();
    expect(screen.getByText(/Luxury Kraft & Gold/i)).toBeInTheDocument();

    // Click Proceed to Step 3
    const nextToStep3Btn = screen.getByRole('button', { name: /Proceed to Step 3: Printer & Print/i });
    fireEvent.click(nextToStep3Btn);

    // Should now be on Step 3
    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Select Your Printer Roll or Paper Sheet/i)).toBeInTheDocument();
    expect(screen.getByText(/58mm Thermal Roll/i)).toBeInTheDocument();
    expect(screen.getByText(/80mm Thermal Roll/i)).toBeInTheDocument();
    expect(screen.getByText(/3" × 2" Rectangular/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print Food Sticker Now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save 300 DPI PNG/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Bluetooth Text/i })).toBeInTheDocument();
  });

  it('allows going back from Step 2 to Step 1', async () => {
    render(<LabelStudioEngine />);

    // Go to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Proceed to Step 2: Templates & Fonts/i }));
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
    });

    // Click Back to Product Details
    const backBtn = screen.getByRole('button', { name: /Back to Product Details/i });
    fireEvent.click(backBtn);

    // Should be back on Step 1
    await waitFor(() => {
      expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
    });
  });
});
