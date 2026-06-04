import React from 'react';
import { MockUI } from '../AnimatedDemo';

const { Screen, Card } = MockUI;

export const inventoryDemoScenes = [
  {
    caption: 'Track your inventory to see what\'s running low',
    duration: 2800,
    render: () => (
      <Screen title="Inventory">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 800, fontSize: 13 }}>Flour</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2E7A5A' }}>8 kg ✓</span>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 800, fontSize: 13 }}>Butter</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>Low ⚠️</span>
          </div>
        </Card>
      </Screen>
    ),
  },
  {
    caption: 'Get auto-alerts when stock is low',
    duration: 2600,
    render: () => (
      <Screen title="Inventory">
        <Card
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: '#D97706' }}>
            ⚠️ 2 items running low
          </div>
          <div style={{ fontSize: 11, color: '#8C7A6B', marginTop: 2 }}>Butter, Cocoa Powder</div>
        </Card>
      </Screen>
    ),
  },
  {
    caption: 'Stock deducts automatically when orders are placed',
    duration: 2600,
    render: () => (
      <Screen title="Auto Deduction">
        <Card>
          <div style={{ fontSize: 12 }}>Order: Chocolate Cake</div>
          <div style={{ fontSize: 11, color: '#8C7A6B', marginTop: 4 }}>
            Flour: 8kg → <b style={{ color: '#B5606A' }}>7.5kg</b>
          </div>
          <div style={{ fontSize: 11, color: '#8C7A6B' }}>
            Sugar: 5kg → <b style={{ color: '#B5606A' }}>4.7kg</b>
          </div>
        </Card>
        <div
          style={{
            fontSize: 11,
            color: '#2E7A5A',
            fontWeight: 700,
            textAlign: 'center',
            marginTop: 6,
          }}
        >
          ✅ Automatically updated!
        </div>
      </Screen>
    ),
  },
];
