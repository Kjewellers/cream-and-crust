import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mocks
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    finishTour: vi.fn(),
  }),
}));

vi.mock('../DopamineKit', () => ({
  triggerConfetti: vi.fn(),
}));

vi.mock('../iOS', () => ({
  triggerHaptic: vi.fn(),
}));

import PremiumAppTour from '../PremiumAppTour';

describe('PremiumAppTour Onboarding Gestures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial welcome step with animated gesture affordance pill', () => {
    render(<PremiumAppTour onComplete={() => {}} />);

    expect(screen.getByText('Welcome, Baker')).toBeInTheDocument();
    expect(screen.getByText('Swipe card or use arrow keys')).toBeInTheDocument();
    expect(screen.getByText('1 of 9')).toBeInTheDocument();
  });

  it('navigates with keyboard arrow keys', async () => {
    render(<PremiumAppTour onComplete={() => {}} />);

    // Press ArrowRight to advance
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByText('2 of 9')).toBeInTheDocument();
    });

    // Press ArrowLeft to go back
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await waitFor(() => {
      expect(screen.getByText('1 of 9')).toBeInTheDocument();
    });
  });

  it('navigates when clicking interactive stepper dots', async () => {
    render(<PremiumAppTour onComplete={() => {}} />);

    // Click step 3 pill (Smart Order Flow)
    const step3Btn = screen.getByLabelText('Go to step 3');
    fireEvent.click(step3Btn);

    await waitFor(() => {
      expect(screen.getByText('3 of 9')).toBeInTheDocument();
    });
    expect(screen.getByText(/Practice Gesture: Try swiping below/i)).toBeInTheDocument();
    expect(screen.getByText('🎂 Belgian Chocolate Cake')).toBeInTheDocument();
  });

  it('completes tour on final step and invokes onComplete', async () => {
    const onComplete = vi.fn();
    render(<PremiumAppTour onComplete={onComplete} />);

    // Jump to last step (step 9)
    const step9Btn = screen.getByLabelText('Go to step 9');
    fireEvent.click(step9Btn);

    await waitFor(() => {
      expect(screen.getByText('9 of 9')).toBeInTheDocument();
    });
    const finishBtn = screen.getByText('Start Baking 🎂');
    expect(finishBtn).toBeInTheDocument();

    fireEvent.click(finishBtn);
    // onComplete is invoked after confetti animation timeout
    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalled();
      },
      { timeout: 1500 }
    );
  });
});
