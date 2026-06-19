import React from 'react';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * RecipeErrorBoundary
 * Catches any render-time crash inside RecipeDetail (or any child) so the
 * user never sees a blank white screen. Logs the error to console for
 * debugging and shows a luxury-styled fallback that matches the Cream &
 * Crust pastel aesthetic.
 */
export default class RecipeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
     
    console.error('[RecipeErrorBoundary] crash:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { onClose } = this.props;
    const message = this.state.error?.message || 'Unknown error';

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 250,
          background: 'linear-gradient(160deg, #FFF7F2 0%, #FFF1F4 60%, #FAF7F5 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 22px',
          paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          fontFamily: '"Inter", system-ui, sans-serif',
          color: '#2D1B14',
        }}
      >
        <button
          type="button"
          onClick={() => {
            this.reset();
            if (onClose) onClose();
          }}
          aria-label="Close"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#fff',
            border: '1px solid rgba(181, 96, 106, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>

        <div
          style={{
            margin: 'auto 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            paddingBottom: 60,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: 'rgba(181, 96, 106, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              boxShadow: 'inset 0 2px 4px rgba(181, 96, 106, 0.08)',
            }}
          >
            <AlertCircle size={36} color="#B5606A" strokeWidth={2} />
          </div>

          <h2
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 24,
              fontWeight: 700,
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}
          >
            Couldn&apos;t open recipe
          </h2>

          <p
            style={{
              fontSize: 14,
              color: '#8C7A6B',
              lineHeight: 1.6,
              margin: '0 0 8px',
              maxWidth: 320,
            }}
          >
            Something went wrong while loading this recipe. Try again, or pick a different one from
            the library.
          </p>

          <details
            style={{
              fontSize: 11,
              color: '#B5A89E',
              marginTop: 8,
              maxWidth: 320,
            }}
          >
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Error details</summary>
            <pre
              style={{
                marginTop: 8,
                padding: 10,
                background: 'rgba(181, 96, 106, 0.05)',
                borderRadius: 8,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 10,
                fontFamily: 'ui-monospace, monospace',
                textAlign: 'left',
              }}
            >
              {message}
            </pre>
          </details>

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button
              type="button"
              onClick={this.reset}
              style={{
                padding: '12px 22px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #B5606A 0%, #9A4C56 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 20px rgba(181, 96, 106, 0.28)',
                letterSpacing: '-0.01em',
              }}
            >
              <RefreshCw size={15} strokeWidth={2.4} /> Try again
            </button>
            <button
              type="button"
              onClick={() => {
                this.reset();
                if (onClose) onClose();
              }}
              style={{
                padding: '12px 22px',
                borderRadius: 14,
                border: '1.5px solid rgba(181, 96, 106, 0.18)',
                background: '#fff',
                color: '#5C4F46',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              Back to library
            </button>
          </div>
        </div>
      </div>
    );
  }
}
