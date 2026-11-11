import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LabelStudioEngine from '../LabelStudioEngine';

// Mock iOS utilities
vi.mock('../../iOS', () => ({
  triggerHaptic: vi.fn(),
  showToast: vi.fn(),
}));

describe('LabelStudioEngine (Mobile Specific UX)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Set mobile viewport (iPhone 14 width)
    window.innerWidth = 390;
  });

  it('renders mobile segmented view switcher on small screens', () => {
    render(<LabelStudioEngine />);

    expect(screen.getByRole('button', { name: /Step 1 Editor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Live Sticker Preview/i })).toBeInTheDocument();
  });

  it('switches between Form Editor and Live Sticker Preview on mobile tabs', () => {
    render(<LabelStudioEngine />);

    // Initially in Form Editor
    expect(screen.getByText(/Enter Recipe Information & Batch Standards/i)).toBeInTheDocument();

    // Click Live Sticker Preview tab
    const previewTab = screen.getByRole('button', { name: /Live Sticker Preview/i });
    fireEvent.click(previewTab);

    // Form editor is hidden, Live preview is visible with mobile action buttons
    expect(screen.queryByText(/Enter Recipe Information & Batch Standards/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Live Sticker Canvas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print Food Sticker Now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save 300 DPI/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Return to Step 1 Editor/i })).toBeInTheDocument();

    // Click Return to Step 1 Editor
    const returnBtn = screen.getByRole('button', { name: /Return to Step 1 Editor/i });
    fireEvent.click(returnBtn);

    // Back to form editor
    expect(screen.getByText(/Enter Recipe Information & Batch Standards/i)).toBeInTheDocument();
  });

  it('allows tapping the in-form Preview button on mobile to view the sticker', () => {
    render(<LabelStudioEngine />);

    // Click in-form Preview button
    const inFormPreviewBtn = screen.getByRole('button', { name: /^Preview$/i });
    fireEvent.click(inFormPreviewBtn);

    // Should switch to Live Sticker Canvas
    expect(screen.getByText(/Live Sticker Canvas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print Food Sticker Now/i })).toBeInTheDocument();
  });
});
