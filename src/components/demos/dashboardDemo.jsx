import React from 'react';
import { MockUI } from '../AnimatedDemo';

const { Screen, Card } = MockUI;

export const dashboardDemoScenes = [
  {
    caption: 'Everything about your business at a glance',
    duration: 2800,
    render: () => (
      <Screen title="Dashboard">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <Card style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 10, color: '#8C7A6B', fontWeight: 700 }}>TODAY'S REVENUE</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#2E7A5A' }}>₹4,500</div>
          </Card>
          <Card style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 10, color: '#8C7A6B', fontWeight: 700 }}>ORDERS</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#B5606A' }}>6</div>
          </Card>
        </div>
        <Card>
          <div style={{ fontSize: 10, color: '#8C7A6B', fontWeight: 700 }}>PENDING PAYMENTS</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#D97706' }}>₹2,100</div>
        </Card>
      </Screen>
    ),
  },
  {
    caption: 'Use Quick Actions to work faster',
    duration: 2600,
    finger: { x: 80, y: 180 },
    render: () => (
      <Screen title="Quick Actions">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { e: '🛒', l: 'New Order' },
            { e: '👥', l: 'Customers' },
            { e: '🧁', l: 'Products' },
            { e: '📋', l: 'Menu' },
          ].map((a, i) => (
            <Card
              key={i}
              style={{
                textAlign: 'center',
                marginBottom: 0,
                border: i === 0 ? '2px solid #B5606A' : undefined,
              }}
            >
              <div style={{ fontSize: 24 }}>{a.e}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{a.l}</div>
            </Card>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    caption: 'All of today\'s deliveries in one place',
    duration: 2600,
    render: () => (
      <Screen title="Today's Deliveries">
        <Card>
          <div style={{ fontWeight: 800, fontSize: 13 }}>🎂 Anita · 11 AM</div>
          <div style={{ fontSize: 11, color: '#8C7A6B' }}>Chocolate Cake 1kg</div>
        </Card>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 13 }}>🧁 Rahul · 4 PM</div>
          <div style={{ fontSize: 11, color: '#8C7A6B' }}>12 Cupcakes</div>
        </Card>
      </Screen>
    ),
  },
];
