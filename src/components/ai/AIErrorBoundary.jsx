/**
 * AIErrorBoundary.jsx
 *
 * React Error Boundary for Cream AI.
 * Protects the application from UI crashes while masking internal errors from users.
 */
import React, { Component } from 'react';
import { devLogAIError, getUserFriendlyErrorMessage } from '../../ai/devLogger';
import { RefreshCw, Sparkles } from 'lucide-react';

export default class AIErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    devLogAIError('AIErrorBoundary caught exception', { error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '24px',
            background: '#171717',
            color: '#ECECF1',
            borderRadius: '16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            margin: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#10A37F',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Sparkles size={20} color="#FFF" />
          </div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            Cream AI Assistant
          </h3>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#9B9B9B', maxWidth: '300px' }}>
            {getUserFriendlyErrorMessage()}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              background: '#10A37F',
              border: 'none',
              color: '#FFF',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            <RefreshCw size={14} /> Refresh AI Panel
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
