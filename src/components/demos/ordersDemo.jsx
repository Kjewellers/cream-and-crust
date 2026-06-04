import React from 'react';
import { MockUI } from '../AnimatedDemo';

const { Screen, Button, Field, Card, Chip } = MockUI;

/**
 * Orders module animated demo — shows how to create an order end-to-end.
 * Each scene is a mock screen + a finger position that taps.
 */
export const ordersDemoScenes = [
  {
    caption: 'Tap + to create a new order',
    duration: 2600,
    finger: { x: 235, y: 360 },
    render: () => (
      <Screen title="Orders">
        <Card>
          <div style={{ fontWeight: 800, fontSize: 13 }}>Anita Sharma</div>
          <div style={{ fontSize: 11, color: '#8C7A6B' }}>Chocolate Cake · ₹1,200</div>
        </Card>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 13 }}>Rahul Verma</div>
          <div style={{ fontSize: 11, color: '#8C7A6B' }}>Red Velvet · ₹1,800</div>
        </Card>
        {/* FAB */}
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
            fontWeight: 300,
            boxShadow: '0 6px 16px rgba(181,96,106,0.4)',
          }}
        >
          +
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Enter the customer\'s name and phone number',
    duration: 2800,
    finger: { x: 150, y: 150 },
    render: ({ tapping }) => (
      <Screen title="New Order">
        <Field label="Customer Name" value={tapping ? 'Priya' : 'Priya'} filled />
        <Field label="Phone Number" value="98765 43210" filled />
        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4 }}>
          <Chip active>🎂 Cake</Chip>
          <Chip>🧁 Cupcakes</Chip>
          <Chip>🍪 Cookies</Chip>
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Choose the product details and weight',
    duration: 2600,
    finger: { x: 90, y: 215 },
    render: () => (
      <Screen title="New Order">
        <Field label="Flavour & Design" value="Chocolate Truffle" filled />
        <div style={{ fontSize: 10, fontWeight: 700, color: '#8C7A6B', marginBottom: 6 }}>
          Weight
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Chip>500gm</Chip>
          <Chip active>1kg</Chip>
          <Chip>2kg</Chip>
        </div>
        <div style={{ marginTop: 10 }}>
          <Field label="Delivery Date" value="25 Dec" filled />
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Enter the amount, balance is calculated automatically',
    duration: 2600,
    finger: { x: 150, y: 250 },
    render: () => (
      <Screen title="New Order">
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Field label="Total ₹" value="1,200" filled />
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Advance ₹" value="500" filled />
          </div>
        </div>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(196,87,74,0.06)',
            border: '1px solid rgba(196,87,74,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#8C7A6B' }}>Balance Due</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#C4574A' }}>₹700</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <Button primary>✅ Save Order</Button>
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Order created! Send the receipt via WhatsApp',
    duration: 3000,
    finger: { x: 150, y: 290 },
    render: () => (
      <Screen title="Order Created 🎉">
        <Card style={{ background: 'linear-gradient(135deg, #FFF7F4, #FFF1F4)' }}>
          <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#2D1B14' }}>
            Priya · Chocolate Truffle
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#8C7A6B', marginTop: 2 }}>
            1kg · 25 Dec · ₹1,200
          </div>
        </Card>
        <div style={{ marginTop: 8 }}>
          <Button
            style={{ background: 'linear-gradient(135deg, #25D366, #1EBE5A)', color: '#fff' }}
          >
            💬 Share Order on WhatsApp
          </Button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <Button>📄 Invoice</Button>
          </div>
          <div style={{ flex: 1 }}>
            <Button>💾 Save Card</Button>
          </div>
        </div>
      </Screen>
    ),
  },
];
