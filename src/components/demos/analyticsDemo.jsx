import React from 'react';
import { MockUI } from '../AnimatedDemo';

const { Screen, Card } = MockUI;

export const analyticsDemoScenes = [
  {
    caption: 'Watch your business growth here',
    duration: 2800,
    render: () => (
      <Screen title="Analytics">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Card style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 10, color: '#8C7A6B', fontWeight: 700 }}>REVENUE</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#2E7A5A' }}>₹48,500</div>
          </Card>
          <Card style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 10, color: '#8C7A6B', fontWeight: 700 }}>PROFIT</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#B5606A' }}>₹22,100</div>
          </Card>
        </div>
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            height: 70,
            padding: '0 4px',
          }}
        >
          {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: '4px 4px 0 0',
                background: 'linear-gradient(180deg, #B5606A, #D4A050)',
              }}
            />
          ))}
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Track income across Cash, UPI, and Online',
    duration: 2600,
    render: () => (
      <Screen title="Payment Methods">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Card style={{ textAlign: 'center', marginBottom: 0 }}>
            <div style={{ fontSize: 20 }}>💵</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#2E7A5A' }}>₹18,200</div>
            <div style={{ fontSize: 9, color: '#8C7A6B' }}>CASH</div>
          </Card>
          <Card style={{ textAlign: 'center', marginBottom: 0 }}>
            <div style={{ fontSize: 20 }}>📱</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#6366F1' }}>₹26,300</div>
            <div style={{ fontSize: 9, color: '#8C7A6B' }}>UPI</div>
          </Card>
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Download and save professional PDF reports',
    duration: 2600,
    finger: { x: 150, y: 240 },
    render: () => (
      <Screen title="Top Products">
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700 }}>🥇 Chocolate Cake · 24 sold</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700 }}>🥈 Red Velvet · 18 sold</div>
        </Card>
        <div
          style={{
            marginTop: 8,
            padding: '11px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #B5606A, #D4A050)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          📄 Download PDF Report
        </div>
      </Screen>
    ),
  },
];
