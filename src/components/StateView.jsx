/**
 * StateView — reusable non-content UI states so a screen is never blank.
 *
 * Builds on the existing EmptyState / Skeleton / CardSkeleton primitives in
 * iOS.jsx. Provides Empty, Loading, Skeleton, Error (with retry), Offline, and
 * Success variants behind one component plus named convenience wrappers.
 *
 * Requirements: 12.1 (empty), 12.2 (loading/skeleton), 12.3/12.4 (error+retry),
 * 12.5 (retry persists), 12.6 (offline), 17.7/17.8 (slow-network loading).
 */
import React from 'react';
import { RefreshCw, WifiOff, CheckCircle2 } from 'lucide-react';
import { EmptyState, CardSkeleton } from './iOS.jsx';

export function LoadingView({ lines = 3, label }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" style={{ padding: 8 }}>
      <CardSkeleton lines={lines} />
      {label ? (
        <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13, marginTop: 12 }}>
          {label}
        </p>
      ) : null}
    </div>
  );
}

export function EmptyView({
  icon = '🍰',
  title = 'Nothing here yet',
  message,
  action,
  actionLabel,
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      subtitle={message}
      action={action}
      actionLabel={actionLabel}
    />
  );
}

export function ErrorView({
  title = 'Something went wrong',
  message = 'We could not load this. Please try again.',
  onRetry,
  retryLabel = 'Try again',
}) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '40px 22px',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 34 }}>😕</div>
      <h3
        style={{ fontFamily: 'var(--font-heading)', fontSize: 18, margin: 0, color: 'var(--text)' }}
      >
        {title}
      </h3>
      <p
        style={{ fontSize: 13.5, color: 'var(--text2)', maxWidth: 320, lineHeight: 1.5, margin: 0 }}
      >
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: 10,
            padding: '11px 20px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, #B5606A 0%, #9A4C56 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <RefreshCw size={15} strokeWidth={2.4} /> {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export function OfflineView({ message = 'You are offline. Connect to the internet to see this.' }) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '40px 22px',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'rgba(140, 122, 107, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <WifiOff size={28} color="#8C7A6B" />
      </div>
      <p style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 300, lineHeight: 1.5, margin: 0 }}>
        {message}
      </p>
    </div>
  );
}

export function SuccessView({ title = 'Done', message }) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '40px 22px',
        gap: 10,
      }}
    >
      <CheckCircle2 size={40} color="#4A9A80" />
      <h3
        style={{ fontFamily: 'var(--font-heading)', fontSize: 18, margin: 0, color: 'var(--text)' }}
      >
        {title}
      </h3>
      {message ? (
        <p style={{ fontSize: 13.5, color: 'var(--text2)', maxWidth: 320, margin: 0 }}>{message}</p>
      ) : null}
    </div>
  );
}

/**
 * Single entry point that dispatches to the right variant.
 * variant: 'empty' | 'loading' | 'skeleton' | 'error' | 'offline' | 'success'
 */
export function StateView({ variant = 'loading', ...props }) {
  switch (variant) {
    case 'empty':
      return <EmptyView {...props} />;
    case 'error':
      return <ErrorView {...props} />;
    case 'offline':
      return <OfflineView {...props} />;
    case 'success':
      return <SuccessView {...props} />;
    case 'loading':
    case 'skeleton':
    default:
      return <LoadingView {...props} />;
  }
}

export default StateView;
