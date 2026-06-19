import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { logCrashToFirestore } from '../services/crashReporting.js';
import { log } from '../utils/logger';

/**
 * AppErrorBoundary — top-level fallback. Wraps the routed pages so any
 * render-time crash anywhere in the authenticated app produces a styled,
 * recoverable screen instead of a blank one.
 *
 * Logs the error + component stack to the console (visible in remote
 * debuggers) and remembers a `key` we can bump to force-reset after
 * a navigation, so the user can return to the app without a hard reload.
 */
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryKey: 0, autoRetries: 0 };
    this._retryTimer = null;
    this._retryDelays = [1500, 3000, 5000]; // Exponential backoff
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
     
    console.error('[AppErrorBoundary] crash:', error, info);

    // 1. Local Firebase Analytics event (PII-free, truncated)
    import('../services/analytics.js').then(({ logError }) => {
      try {
        logError(error?.message, { stack: info?.componentStack });
      } catch {
        /* analytics is best-effort */
      }
    }).catch(() => {});

    // 2. Persist full crash report to Firestore `crash_reports` collection
    //    so we can instantly query and fix production crashes.
    try {
      const uid = this.props.uid || null;
      logCrashToFirestore(error, {
        type: 'react_boundary',
        componentStack: info?.componentStack,
        uid,
      });
    } catch {
      /* crash reporter must never throw */
    }

    // Auto-retry for transient errors that happen during auth-token
    // validation, lazy chunk loading, or null-data access from Firestore.
    // Up to 3 retries with exponential backoff (1.5s → 3s → 5s).
    const msg = String(error?.message || '').toLowerCase();
    const name = String(error?.name || '').toLowerCase();
    const isTransient =
      msg.includes('permission') ||
      msg.includes('missing or insufficient') ||
      msg.includes('network') ||
      msg.includes('unavailable') ||
      msg.includes('failed to fetch') ||
      msg.includes('load failed') ||
      msg.includes('loading chunk') ||
      msg.includes('loading css chunk') ||
      msg.includes('dynamically imported module') ||
      msg.includes('cannot read properties of null') ||
      msg.includes('cannot read properties of undefined') ||
      msg.includes('undefined is not an object') ||
      msg.includes('null is not an object') ||
      name === 'typeerror' ||
      name === 'chunkerror';

    if (isTransient && this.state.autoRetries < 3) {
      const delay = this._retryDelays[this.state.autoRetries] || 5000;
      log.boundary(`Auto-retrying in ${delay}ms (attempt ${this.state.autoRetries + 1}/3):`, msg.slice(0, 100));
      this._retryTimer = setTimeout(() => {
        this.setState((s) => ({
          hasError: false,
          error: null,
          retryKey: s.retryKey + 1,
          autoRetries: s.autoRetries + 1,
        }));
      }, delay);
      return;
    }
  }

  componentWillUnmount() {
    if (this._retryTimer) clearTimeout(this._retryTimer);
  }

  reset = () => {
    if (this._retryTimer) clearTimeout(this._retryTimer);
    // Bump retryKey so the child subtree re-mounts fresh, without a full
    // page reload. If it throws again, the boundary re-catches and the
    // fallback (with both actions) stays visible.
    this.setState((s) => ({
      hasError: false,
      error: null,
      retryKey: s.retryKey + 1,
      autoRetries: 0,
    }));
  };

  goHome = () => {
    this.reset();
    if (typeof window !== 'undefined') window.location.href = '/';
  };

  hardReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      // Keyed fragment so reset() forces a fresh mount of the subtree.
      return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
    }

    // During auto-retry, show a subtle spinner instead of the full error screen.
    const msg = String(this.state.error?.message || '').toLowerCase();
    const name = String(this.state.error?.name || '').toLowerCase();
    const isTransient =
      msg.includes('permission') ||
      msg.includes('missing or insufficient') ||
      msg.includes('network') ||
      msg.includes('unavailable') ||
      msg.includes('failed to fetch') ||
      msg.includes('load failed') ||
      msg.includes('loading chunk') ||
      msg.includes('loading css chunk') ||
      msg.includes('dynamically imported module') ||
      msg.includes('cannot read properties of null') ||
      msg.includes('cannot read properties of undefined') ||
      msg.includes('undefined is not an object') ||
      msg.includes('null is not an object') ||
      name === 'typeerror' ||
      name === 'chunkerror';
    if (isTransient && this.state.autoRetries < 3) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RefreshCw size={24} color="var(--accent, #B5606A)" className="animate-spin" />
        </div>
      );
    }

    const message = this.state.error?.message || 'Unknown error';

    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #FFF7F2 0%, #FFF1F4 60%, #FAF7F5 100%)',
          color: '#2D1B14',
          fontFamily: '"Inter", system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 22px',
          paddingTop: 'calc(40px + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div
          style={{
            margin: 'auto 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 28,
              background: 'rgba(181, 96, 106, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 22,
              boxShadow: 'inset 0 2px 4px rgba(181, 96, 106, 0.08)',
            }}
          >
            <AlertCircle size={40} color="#B5606A" strokeWidth={2} />
          </div>

          <h1
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 28,
              fontWeight: 700,
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            Something’s a little undercooked
          </h1>
          <p
            style={{
              fontSize: 14.5,
              color: '#8C7A6B',
              lineHeight: 1.6,
              margin: '0 0 4px',
              maxWidth: 360,
            }}
          >
            We hit an unexpected error. Try again, head home, or refresh the app.
          </p>

          <details
            style={{
              fontSize: 11,
              color: '#B5A89E',
              marginTop: 18,
              maxWidth: 360,
            }}
          >
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Error details</summary>
            <pre
              style={{
                marginTop: 8,
                padding: 12,
                background: 'rgba(181, 96, 106, 0.05)',
                borderRadius: 10,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
                textAlign: 'left',
                lineHeight: 1.5,
              }}
            >
              {message}
            </pre>
          </details>

          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 32,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={this.reset}
              style={{
                padding: '13px 22px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #B5606A 0%, #9A4C56 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 20px rgba(181, 96, 106, 0.28)',
              }}
            >
              <RefreshCw size={15} strokeWidth={2.4} /> Try again
            </button>
            <button
              type="button"
              onClick={this.goHome}
              style={{
                padding: '13px 22px',
                borderRadius: 14,
                border: '1.5px solid rgba(181, 96, 106, 0.18)',
                background: '#fff',
                color: '#5C4F46',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Home size={15} strokeWidth={2.4} /> Home
            </button>
            <button
              type="button"
              onClick={this.hardReload}
              style={{
                padding: '13px 22px',
                borderRadius: 14,
                border: 'none',
                background: 'transparent',
                color: '#8C7A6B',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Refresh app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
