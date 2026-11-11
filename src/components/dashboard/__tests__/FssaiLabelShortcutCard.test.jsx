import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FssaiLabelShortcutCard from '../FssaiLabelShortcutCard';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock iOS utilities
vi.mock('../../iOS', () => ({
  triggerHaptic: vi.fn(),
  showToast: vi.fn(),
}));

describe('FssaiLabelShortcutCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders FSSAI regulatory atelier banner and 3-step guided beads', () => {
    render(<FssaiLabelShortcutCard onOpenQuickModal={vi.fn()} />);

    expect(screen.getByText(/FSSAI REGULATORY ATELIER/i)).toBeInTheDocument();
    expect(screen.getByText(/Food Safety & Thermal Label Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Formula & Allergens/i)).toBeInTheDocument();
    expect(screen.getByText(/Design & Typography/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto Thermal Print/i)).toBeInTheDocument();
  });

  it('renders interactive live stamp preview card', () => {
    render(<FssaiLabelShortcutCard onOpenQuickModal={vi.fn()} />);

    expect(screen.getByText(/STAMP PREVIEW/i)).toBeInTheDocument();
    expect(screen.getByText(/Artisan Celebration Cake/i)).toBeInTheDocument();
    expect(screen.getByText(/CONTAINS: GLUTEN, MILK/i)).toBeInTheDocument();
    expect(screen.getByText(/Tap to Edit/i)).toBeInTheDocument();
  });

  it('navigates to /label-studio when Launch 3-Step Studio button is clicked', () => {
    render(<FssaiLabelShortcutCard onOpenQuickModal={vi.fn()} />);

    const launchBtn = screen.getByRole('button', { name: /Launch 3-Step Studio/i });
    fireEvent.click(launchBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/label-studio');
  });

  it('triggers onOpenQuickModal when Quick Modal button is clicked', () => {
    const handleQuickModal = vi.fn();
    render(<FssaiLabelShortcutCard onOpenQuickModal={handleQuickModal} />);

    const quickBtn = screen.getByRole('button', { name: /Quick Modal/i });
    fireEvent.click(quickBtn);

    expect(handleQuickModal).toHaveBeenCalledWith('allergen-label');
  });

  it('allows dismissing and restoring the shortcut card', () => {
    render(<FssaiLabelShortcutCard onOpenQuickModal={vi.fn()} />);

    // Click dismiss (X)
    const dismissBtn = screen.getByLabelText(/Dismiss FSSAI shortcut/i);
    fireEvent.click(dismissBtn);

    // Card should be dismissed and replaced with restore button
    expect(screen.queryByText(/Launch 3-Step Studio/i)).not.toBeInTheDocument();
    const restoreBtn = screen.getByRole('button', { name: /Show FSSAI Label Studio Shortcut/i });
    expect(restoreBtn).toBeInTheDocument();

    // Click restore
    fireEvent.click(restoreBtn);
    expect(screen.getByText(/Launch 3-Step Studio/i)).toBeInTheDocument();
  });
});

