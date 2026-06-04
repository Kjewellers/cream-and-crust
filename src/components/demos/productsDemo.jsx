import React from 'react';
import { MockUI } from '../AnimatedDemo';

const { Screen, Button, Field, Card } = MockUI;

export const productsDemoScenes = [
  {
    caption: 'Add your beautiful products here',
    duration: 2600,
    finger: { x: 235, y: 360 },
    render: () => (
      <Screen title="Products">
        <Card>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#F4EDE8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              🎂
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Chocolate Cake</div>
              <div style={{ fontSize: 11, color: '#B5606A', fontWeight: 700 }}>₹1,200</div>
            </div>
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
    caption: 'Upload a photo, add name and price',
    duration: 2800,
    finger: { x: 150, y: 110 },
    render: () => (
      <Screen title="Add Product">
        <div
          style={{
            width: '100%',
            height: 70,
            borderRadius: 12,
            background: '#F4EDE8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
            border: '2px dashed rgba(181,96,106,0.3)',
          }}
        >
          <span style={{ fontSize: 26 }}>📸</span>
        </div>
        <Field label="Product Name" value="Red Velvet Cake" filled />
        <Field label="Price ₹" value="1,500" filled />
      </Screen>
    ),
  },
  {
    caption: 'Save it — it automatically appears on your menu',
    duration: 2600,
    finger: { x: 150, y: 290 },
    render: () => (
      <Screen title="Add Product">
        <Card>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#FFF1F4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              🍰
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Red Velvet Cake</div>
              <div style={{ fontSize: 12, color: '#B5606A', fontWeight: 800 }}>₹1,500</div>
            </div>
          </div>
        </Card>
        <div style={{ marginTop: 14 }}>
          <Button primary>✅ Save Product</Button>
        </div>
      </Screen>
    ),
  },
];
