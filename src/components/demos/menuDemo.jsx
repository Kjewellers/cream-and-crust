import React from 'react';
import { MockUI } from '../AnimatedDemo';

const { Screen, Button, Card } = MockUI;

export const menuDemoScenes = [
  {
    caption: 'Create your online menu to get orders 24/7',
    duration: 2800,
    render: () => (
      <Screen title="Menu Builder">
        <Card style={{ background: 'linear-gradient(135deg, #FFF7F4, #FFF1F4)' }}>
          <div style={{ fontWeight: 800, fontSize: 14, textAlign: 'center' }}>✨ Cream & Crust</div>
          <div style={{ fontSize: 11, color: '#8C7A6B', textAlign: 'center', marginTop: 2 }}>
            Your beautiful online menu
          </div>
        </Card>
        <div style={{ display: 'flex', gap: 8 }}>
          <Card style={{ flex: 1, textAlign: 'center', marginBottom: 0 }}>
            <div style={{ fontSize: 22 }}>🎂</div>
            <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>Cakes</div>
          </Card>
          <Card style={{ flex: 1, textAlign: 'center', marginBottom: 0 }}>
            <div style={{ fontSize: 22 }}>🧁</div>
            <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>Cupcakes</div>
          </Card>
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Add 5 products and hit publish',
    duration: 2600,
    finger: { x: 150, y: 300 },
    render: () => (
      <Screen title="Menu Builder">
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700 }}>✅ Theme chosen</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700 }}>✅ 6 products added</div>
        </Card>
        <div style={{ marginTop: 10 }}>
          <Button primary>🚀 Publish Menu</Button>
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Share your link in your Instagram & WhatsApp bio',
    duration: 3000,
    finger: { x: 150, y: 160 },
    render: () => (
      <Screen title="Menu is Live! 🎉">
        <Card>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 18 }}>📸</span>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Add to Instagram bio</div>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Share on WhatsApp</div>
          </div>
        </Card>
        <div style={{ fontSize: 11, color: '#8C7A6B', textAlign: 'center', marginTop: 8 }}>
          creamandcrust.online/menu/...
        </div>
      </Screen>
    ),
  },
];
