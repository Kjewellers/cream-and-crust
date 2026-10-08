import React from 'react';

/**
 * SkeletonLoader — Airbnb-style shimmer loading placeholders.
 * Replaces generic loading spinners with layout-accurate shimmer cards
 * to eliminate layout shifts (CLS = 0) and provide a polished experience.
 */

export function SkeletonBox({ width = '100%', height = '20px', borderRadius = '12px', style = {} }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        background: 'var(--border, rgba(0, 0, 0, 0.06))',
        ...style,
      }}
    />
  );
}

export function OrderCardSkeleton() {
  return (
    <div
      style={{
        padding: '18px 20px',
        borderRadius: 20,
        background: 'var(--card, #fff)',
        border: '1px solid var(--border, rgba(0,0,0,0.06))',
        marginBottom: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBox width="110px" height="18px" borderRadius="8px" />
        <SkeletonBox width="70px" height="24px" borderRadius="99px" />
      </div>
      <SkeletonBox width="75%" height="22px" borderRadius="8px" />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <SkeletonBox width="80px" height="14px" borderRadius="6px" />
        <SkeletonBox width="90px" height="14px" borderRadius="6px" />
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div
      style={{
        borderRadius: 20,
        background: 'var(--card, #fff)',
        border: '1px solid var(--border, rgba(0,0,0,0.06))',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SkeletonBox width="100%" height="160px" borderRadius="0px" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonBox width="80%" height="18px" borderRadius="6px" />
        <SkeletonBox width="40%" height="16px" borderRadius="6px" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <SkeletonBox width="60px" height="20px" borderRadius="6px" />
          <SkeletonBox width="36px" height="36px" borderRadius="12px" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '16px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              padding: 20,
              borderRadius: 20,
              background: 'var(--card, #fff)',
              border: '1px solid var(--border, rgba(0,0,0,0.06))',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <SkeletonBox width="40%" height="14px" borderRadius="6px" />
            <SkeletonBox width="70%" height="28px" borderRadius="8px" />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SkeletonBox width="140px" height="22px" borderRadius="8px" />
        {[1, 2, 3].map((i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function SkeletonList({ count = 3, type = 'order' }) {
  const Skeletons = {
    order: OrderCardSkeleton,
    product: ProductCardSkeleton,
    dashboard: DashboardSkeleton,
  };
  const Component = Skeletons[type] || OrderCardSkeleton;

  if (type === 'dashboard') return <DashboardSkeleton />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <Component key={idx} />
      ))}
    </div>
  );
}
