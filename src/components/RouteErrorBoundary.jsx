import React from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

/**
 * RouteErrorBoundary — per-route error boundary for lazy-loaded pages.
 *
 * Designed to be wrapped around individual Route elements so a crash in
 * one page (e.g. Analytics) does NOT take down the entire app. The sidebar,
 * bottom nav, and header all stay alive. Shows a compact "this page hit a
 * snag" card with Retry and Go Home actions.
 *
 * Falls back to "Go Home" after 3 retry failures to prevent infinite loops.
 */
export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[RouteErrorBoundary] Page crash:', error?.message, info?.componentStack?.slice(0, 500));

    // Report to ErrorMonitor if available (fire-and-forget)
    try {
      import('../services/ErrorMonitor.js').then(({ captureReactCrash }) => {
        captureReactCrash(error, info, null);
      }).catch(() => {});
    } catch { /* monitor must never throw */ }
  }

  handleRetry = () => {
    this.setState((s) => ({
      hasError: false,
      error: null,
      retryCount: s.retryCount + 1,
    }));
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, retryCount: 0 });
    if (typeof window !== 'undefined') {
      window.location.hash = '#/';
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const maxRetriesReached = this.state.retryCount >= 3;

    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
        }}
      >
        <div
          style={{
            maxWidth: 380,
            width: '100%',
            textAlign: 'center',
            padding: '36px 24px',
            borderRadius: 24,
            background: 'var(--card, #fff)',
            border: '1px solid var(--border, rgba(0,0,0,0.06))',
            boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: 'rgba(181, 96, 106, 0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}
          >
            <AlertTriangle size={28} color="#B5606A" strokeWidth={2} />
          </div>

          <h2
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 22,
              fontWeight: 700,
              margin: '0 0 8px',
              color: 'var(--text, #2D1B14)',
              letterSpacing: '-0.02em',
            }}
          >
            This page hit a snag
          </h2>
          <p
            style={{
              fontSize: 13.5,
              color: 'var(--text2, #8C7A6B)',
              lineHeight: 1.55,
              margin: '0 0 24px',
            }}
          >
            {maxRetriesReached
              ? 'This page keeps crashing. Try going home or refreshing the app.'
              : "Something went wrong loading this page. Your data is safe — let's try again."}
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {!maxRetriesReached && (
              <button
                type="button"
                onClick={this.handleRetry}
                style={{
                  padding: '11px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #B5606A 0%, #9A4C56 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  boxShadow: '0 6px 16px rgba(181, 96, 106, 0.25)',
                }}
              >
                <RefreshCw size={14} strokeWidth={2.4} /> Try again
              </button>
            )}
            <button
              type="button"
              onClick={this.handleGoHome}
              style={{
                padding: '11px 20px',
                borderRadius: 12,
                border: '1.5px solid var(--border-md, rgba(181, 96, 106, 0.15))',
                background: 'var(--card, #fff)',
                color: 'var(--text2, #5C4F46)',
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <Home size={14} strokeWidth={2.4} /> Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
