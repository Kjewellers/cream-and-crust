/**
 * @file MaisonErrorBoundary.jsx
 *
 * Catches Maison renderer crashes and shows a useful error message
 * with the FULL stack trace so we can debug from a screenshot. iOS
 * Safari truncates the .message field to just "Type error" — the
 * stack normally has the real cause.
 */

import React from 'react';

export default class MaisonErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('[MaisonMenuRenderer crashed]', error, info);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      const info = this.state.info;
      const fullText = [
        `Name: ${err?.name || 'Error'}`,
        `Message: ${err?.message || '(empty)'}`,
        '',
        'Stack:',
        String(err?.stack || '(no stack)').slice(0, 3000),
        '',
        'Component stack:',
        String(info?.componentStack || '(none)').slice(0, 2000),
      ].join('\n');

      return (
        <div
          style={{
            minHeight: '60vh',
            padding: '40px 20px',
            background: '#F8F1E7',
            color: '#1B130D',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 24,
              fontWeight: 500,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            Maison Atelier — render error
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#8E7A66',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            Copy the text below and share it so we can fix this.
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
              fontSize: 11,
              lineHeight: 1.5,
              color: '#1B130D',
              background: '#EBDFD0',
              padding: 14,
              borderRadius: 8,
              maxHeight: '60vh',
              overflowY: 'auto',
              border: '1px solid #B8996833',
            }}
          >
            {fullText}
          </pre>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(fullText);
                  alert('Error details copied to clipboard.');
                }
              }}
              style={{
                background: '#1B130D',
                color: '#F8F1E7',
                border: 'none',
                padding: '10px 22px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Copy Details
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
