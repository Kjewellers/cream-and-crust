import React from 'react';
import { MockUI } from '../AnimatedDemo';

const { Screen, Card } = MockUI;

export const calendarDemoScenes = [
  {
    caption: 'View all your orders on a single calendar',
    duration: 2800,
    render: () => (
      <Screen title="Calendar">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {Array.from({ length: 21 }).map((_, i) => {
            const busy = [4, 9, 15].includes(i);
            const today = i === 9;
            return (
              <div
                key={i}
                style={{
                  aspectRatio: '1',
                  borderRadius: 7,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: today ? '#B5606A' : busy ? 'rgba(245,158,11,0.12)' : 'transparent',
                  border: busy && !today ? '1px solid rgba(245,158,11,0.4)' : 'none',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: today ? '#fff' : '#2D1B14' }}>
                  {i + 1}
                </span>
                {busy && (
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      background: today ? '#fff' : '#D97706',
                      marginTop: 1,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Screen>
    ),
  },
  {
    caption: 'Tap on a day to see its scheduled orders',
    duration: 2600,
    finger: { x: 150, y: 250 },
    render: () => (
      <Screen title="25 Dec · 3 orders · ₹4,500">
        <div style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B', marginBottom: 6 }}>
          🌅 MORNING · 1
        </div>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 12 }}>Anita · 11 AM · 🚚</div>
        </Card>
        <div
          style={{ fontSize: 10, fontWeight: 800, color: '#3B82F6', marginTop: 6, marginBottom: 6 }}
        >
          ☀️ AFTERNOON · 2
        </div>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 12 }}>Rahul · 3 PM · 🏪</div>
        </Card>
      </Screen>
    ),
  },
  {
    caption: 'Get smart prep alerts before busy days',
    duration: 2600,
    render: () => (
      <Screen title="Calendar">
        <Card
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: '#D97706' }}>⚠️ Busy day ahead</div>
          <div style={{ fontSize: 11, color: '#8C7A6B', marginTop: 2 }}>Start prep today! 🧑‍🍳</div>
        </Card>
      </Screen>
    ),
  },
];
