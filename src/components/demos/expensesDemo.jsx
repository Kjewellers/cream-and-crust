import React from 'react';
import { MockUI } from '../AnimatedDemo';

const { Screen, Card, Field, Button } = MockUI;

export const expensesDemoScenes = [
  {
    caption: 'Log every business expense easily',
    duration: 2600,
    finger: { x: 235, y: 360 },
    render: () => (
      <Screen title="Expenses">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 800, fontSize: 12 }}>🛒 Ingredients</span>
            <span style={{ fontWeight: 800, fontSize: 12, color: '#C4574A' }}>₹2,400</span>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 800, fontSize: 12 }}>📦 Packaging</span>
            <span style={{ fontWeight: 800, fontSize: 12, color: '#C4574A' }}>₹800</span>
          </div>
        </Card>
        <div
          style={{
            position: 'absolute',
            right: 18,
            bottom: 30,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #B5606A, #D4A050)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 28,
            boxShadow: '0 6px 16px rgba(181,96,106,0.4)',
          }}
        >
          +
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Select a category, enter amount, and save',
    duration: 2800,
    finger: { x: 150, y: 270 },
    render: () => (
      <Screen title="Add Expense">
        <Field label="Category" value="Ingredients" filled />
        <Field label="Amount ₹" value="2,400" filled />
        <div style={{ marginTop: 10 }}>
          <Button primary>✅ Save Expense</Button>
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Net profit is calculated automatically',
    duration: 2600,
    render: () => (
      <Screen title="This Month">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#8C7A6B' }}>Revenue</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#2E7A5A' }}>₹48,500</span>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#8C7A6B' }}>Expenses</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#C4574A' }}>₹26,400</span>
          </div>
        </Card>
        <Card
          style={{ background: 'rgba(46,122,90,0.06)', border: '1px solid rgba(46,122,90,0.2)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>Profit</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#2E7A5A' }}>₹22,100</span>
          </div>
        </Card>
      </Screen>
    ),
  },
];
