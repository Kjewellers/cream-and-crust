/**
 * SubscriptionErrorBoundary.jsx
 *
 * Class-based error boundary that wraps ALL premium UI (paywall, preview,
 * celebration). Catches any render-time error inside these components and
 * presents a minimal, non-intrusive fallback instead of propagating to the
 * global AppErrorBoundary and crashing the whole app.
 *
 * Principle: A subscription UI bug must NEVER make the core app unusable.
 */
import React from 'react';
import { log } from '../../utils/logger';

export default class SubscriptionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown subscription UI error',
    };
  }

  componentDidCatch(error, info) {
    log.purchase.error(
      'SubscriptionErrorBoundary caught:',
      error?.message,
      info?.componentStack?.slice(0, 300)
    );

    // Auto-recover after 4 seconds — clears the error state so the UI is usable again
    this._recoveryTimer = setTimeout(() => {
      this.setState({ hasError: false, errorMessage: '' });
    }, 4000);
  }

  componentWillUnmount() {
    clearTimeout(this._recoveryTimer);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Minimal non-intrusive fallback — never a white screen
    return (
      <div
        role="alert"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99998,
          background: 'rgba(45,27,20,0.92)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 12,
          fontSize: 13,
          fontFamily: '"Inter", system-ui, sans-serif',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          maxWidth: 340,
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ marginRight: 8 }}>⚠️</span>
        Something went wrong with the subscription UI.
        <button
          onClick={() => this.setState({ hasError: false })}
          style={{
            marginLeft: 12,
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    );
  }
}
