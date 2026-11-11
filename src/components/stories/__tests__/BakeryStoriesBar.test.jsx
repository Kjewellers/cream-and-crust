import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BakeryStoriesBar from '../BakeryStoriesBar';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../iOS', () => ({
  triggerHaptic: vi.fn(),
  showToast: vi.fn(),
}));

describe('BakeryStoriesBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all story bubbles including the three new bakery tools', () => {
    render(
      <BrowserRouter>
        <BakeryStoriesBar onOpenToolModal={vi.fn()} />
      </BrowserRouter>
    );

    // Verify the 3 new features are present as story bubbles
    expect(screen.getByText('Tier Stack')).toBeInTheDocument();
    expect(screen.getByText('FSSAI Labels')).toBeInTheDocument();
    expect(screen.getByText('Instant Quote')).toBeInTheDocument();

    // Verify existing stories
    expect(screen.getByText('Sales Insights')).toBeInTheDocument();
    expect(screen.getByText('Digital Store')).toBeInTheDocument();
  });

  it('opens story modal when Tier Stack bubble is clicked, and launches tool on CTA', () => {
    const handleOpenTool = vi.fn();
    render(
      <BrowserRouter>
        <BakeryStoriesBar onOpenToolModal={handleOpenTool} />
      </BrowserRouter>
    );

    // Click Tier Stack story bubble
    const tierBubble = screen.getByRole('button', { name: /Open story: Tier Stack/i });
    fireEvent.click(tierBubble);

    // Story viewer should be open with slide heading & CTA
    expect(screen.getByText(/Multi-Tier Structural Calculator/i)).toBeInTheDocument();
    const ctaBtn = screen.getByRole('button', { name: /Launch Tier Calculator/i });
    expect(ctaBtn).toBeInTheDocument();

    // Click CTA
    fireEvent.click(ctaBtn);
    expect(handleOpenTool).toHaveBeenCalledWith('cake-calculator');
  });

  it('opens FSSAI label story and launches allergen tool on CTA', () => {
    const handleOpenTool = vi.fn();
    render(
      <BrowserRouter>
        <BakeryStoriesBar onOpenToolModal={handleOpenTool} />
      </BrowserRouter>
    );

    const fssaiBubble = screen.getByRole('button', { name: /Open story: FSSAI Labels/i });
    fireEvent.click(fssaiBubble);

    expect(screen.getByText(/FSSAI Food & Allergen Labels/i)).toBeInTheDocument();
    const ctaBtn = screen.getByRole('button', { name: /Generate Food Label/i });
    fireEvent.click(ctaBtn);
    expect(handleOpenTool).toHaveBeenCalledWith('allergen-label');
  });

  it('opens Instant Quote story and launches quote builder tool on CTA', () => {
    const handleOpenTool = vi.fn();
    render(
      <BrowserRouter>
        <BakeryStoriesBar onOpenToolModal={handleOpenTool} />
      </BrowserRouter>
    );

    const quoteBubble = screen.getByRole('button', { name: /Open story: Instant Quote/i });
    fireEvent.click(quoteBubble);

    expect(screen.getByText(/WhatsApp Instant Quote Builder/i)).toBeInTheDocument();
    const ctaBtn = screen.getByRole('button', { name: /Create WhatsApp Quote/i });
    fireEvent.click(ctaBtn);
    expect(handleOpenTool).toHaveBeenCalledWith('instant-quote');
  });

  it('closes story when close cross button is tapped', async () => {
    render(
      <BrowserRouter>
        <BakeryStoriesBar onOpenToolModal={vi.fn()} />
      </BrowserRouter>
    );

    const tierBubble = screen.getByRole('button', { name: /Open story: Tier Stack/i });
    fireEvent.click(tierBubble);

    expect(screen.getByText(/Multi-Tier Structural Calculator/i)).toBeInTheDocument();
    const closeBtn = screen.getByRole('button', { name: /Close story/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Multi-Tier Structural Calculator/i)).not.toBeInTheDocument();
    });
  });
});
