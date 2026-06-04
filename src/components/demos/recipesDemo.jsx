import React from 'react';
import { MockUI } from '../AnimatedDemo';

const { Screen, Card, Button } = MockUI;

export const recipesDemoScenes = [
  {
    caption: 'Keep your recipes safe — with full costing',
    duration: 2800,
    render: () => (
      <Screen title="Recipe Vault 🔒">
        <Card>
          <div style={{ fontWeight: 800, fontSize: 13 }}>🎂 Chocolate Sponge</div>
          <div style={{ fontSize: 11, color: '#8C7A6B' }}>Cost: ₹240 · 8 servings</div>
        </Card>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 13 }}>🧁 Vanilla Buttercream</div>
          <div style={{ fontSize: 11, color: '#8C7A6B' }}>Cost: ₹120 · 12 cupcakes</div>
        </Card>
      </Screen>
    ),
  },
  {
    caption: 'Use the batch scaler — everything adjusts instantly',
    duration: 2600,
    finger: { x: 150, y: 130 },
    render: () => (
      <Screen title="Batch Scaler">
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          {['1x', '2x', '3x'].map((m, i) => (
            <div
              key={i}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 14,
                background: i === 1 ? 'rgba(181,96,106,0.1)' : '#F4EDE8',
                color: i === 1 ? '#B5606A' : '#8C7A6B',
                border: i === 1 ? '2px solid #B5606A' : 'none',
              }}
            >
              {m}
            </div>
          ))}
        </div>
        <Card>
          <div style={{ fontSize: 12 }}>
            Flour: <b>500g</b> → <b style={{ color: '#B5606A' }}>1000g</b>
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 12 }}>
            Sugar: <b>300g</b> → <b style={{ color: '#B5606A' }}>600g</b>
          </div>
        </Card>
      </Screen>
    ),
  },
  {
    caption: 'Generate a shopping list with just one tap',
    duration: 2600,
    finger: { x: 150, y: 280 },
    render: () => (
      <Screen title="Shopping List">
        <Card>
          <div style={{ fontSize: 12 }}>☐ Flour — 1kg</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12 }}>☐ Butter — 500g</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12 }}>☐ Sugar — 600g</div>
        </Card>
        <div style={{ marginTop: 8 }}>
          <Button primary>🛒 Generate List</Button>
        </div>
      </Screen>
    ),
  },
];
