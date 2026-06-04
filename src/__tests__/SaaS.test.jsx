import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import SystemGuard from '../components/SystemGuard';
import SubscriptionGate from '../components/SubscriptionGate';
import OptimizedImage from '../components/OptimizedImage';

// Mock the hooks
vi.mock('../hooks/useAppVersion', () => ({
  useAppVersion: vi.fn()
}));

vi.mock('../hooks/useSubscription', () => ({
  useSubscription: vi.fn()
}));

import { useAppVersion } from '../hooks/useAppVersion';
import { useSubscription } from '../hooks/useSubscription';

describe('SaaS Guard Components', () => {
  it('SystemGuard blocks UI when under maintenance', () => {
    useAppVersion.mockReturnValue({
      needsUpdate: false,
      maintenanceMode: true,
      maintenanceMessage: 'Testing Maintenance',
      loading: false
    });

    render(<SystemGuard><div>App Content</div></SystemGuard>);
    expect(screen.getByText('Under Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Testing Maintenance')).toBeInTheDocument();
    expect(screen.queryByText('App Content')).not.toBeInTheDocument();
  });

  it('SystemGuard blocks UI when update required', () => {
    useAppVersion.mockReturnValue({
      needsUpdate: true,
      maintenanceMode: false,
      loading: false
    });

    render(<SystemGuard><div>App Content</div></SystemGuard>);
    expect(screen.getByText('App Update Required')).toBeInTheDocument();
    expect(screen.queryByText('App Content')).not.toBeInTheDocument();
  });

  it('SystemGuard renders children when all green', () => {
    useAppVersion.mockReturnValue({
      needsUpdate: false,
      maintenanceMode: false,
      loading: false
    });

    render(<SystemGuard><div>App Content</div></SystemGuard>);
    expect(screen.getByText('App Content')).toBeInTheDocument();
  });

  it('SubscriptionGate shows lock screen when inactive', () => {
    useSubscription.mockReturnValue({
      isActive: false,
      loading: false
    });

    render(
      <BrowserRouter>
        <SubscriptionGate><div>Premium Feature</div></SubscriptionGate>
      </BrowserRouter>
    );
    expect(screen.getByText('Premium Feature', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
  });

  it('SubscriptionGate renders children when active', () => {
    useSubscription.mockReturnValue({
      isActive: true,
      loading: false
    });

    render(
      <BrowserRouter>
        <SubscriptionGate><div>Premium VIP Content</div></SubscriptionGate>
      </BrowserRouter>
    );
    expect(screen.getByText('Premium VIP Content')).toBeInTheDocument();
  });

  it('OptimizedImage formats Cloudinary URLs correctly', () => {
    const rawUrl = 'https://res.cloudinary.com/dq3jareht/image/upload/v171/test.jpg';
    render(<OptimizedImage src={rawUrl} alt="Test" width={800} />);
    // We expect the image src to have f_auto,q_auto injected
    const img = document.querySelector('img');
    expect(img).not.toBeNull();
    // Since isLoaded is false initially, it doesn't render img immediately due to framer-motion setup?
    // Actually the img is rendered, we just animate opacity.
    expect(img.src).toContain('f_auto,q_auto,w_800');
  });
});
