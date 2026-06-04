import React from 'react';
import { MockUI } from '../AnimatedDemo';

const { Screen, Card, Button } = MockUI;

export const customersDemoScenes = [
  {
    caption: 'Access complete history for every customer',
    duration: 2800,
    render: () => (
      <Screen title="Customers">
        <Card>
          <div style={{ fontWeight: 800, fontSize: 13 }}>💛 Anita Sharma</div>
          <div style={{ fontSize: 11, color: '#8C7A6B' }}>8 orders · ₹12,400 spent</div>
        </Card>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 13 }}>💛 Rahul Verma</div>
          <div style={{ fontSize: 11, color: '#8C7A6B' }}>3 orders · ₹5,200 spent</div>
        </Card>
      </Screen>
    ),
  },
  {
    caption: 'Call, WhatsApp, or Navigate with one tap',
    duration: 2600,
    finger: { x: 130, y: 200 },
    render: () => (
      <Screen title="Anita Sharma">
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { e: '📞', l: 'Call' },
            { e: '💬', l: 'WhatsApp' },
            { e: '📍', l: 'Navigate' },
          ].map((a, i) => (
            <Card
              key={i}
              style={{
                flex: 1,
                textAlign: 'center',
                marginBottom: 0,
                border: i === 1 ? '2px solid #B5606A' : undefined,
              }}
            >
              <div style={{ fontSize: 20 }}>{a.e}</div>
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{a.l}</div>
            </Card>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Want to repeat an order? Just tap "Order again"',
    duration: 2800,
    finger: { x: 200, y: 175 },
    render: () => (
      <Screen title="Past Orders">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 12 }}>Red Velvet 1kg</div>
              <div style={{ fontSize: 10, color: '#8C7A6B' }}>₹1,800 · delivered</div>
            </div>
            <Button highlight style={{ padding: '6px 10px', fontSize: 11 }}>
              🔄 Order again
            </Button>
          </div>
        </Card>
      </Screen>
    ),
  },
];
