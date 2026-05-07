import React from 'react';
import { Calendar as CalendarIcon, Clock, AlertTriangle } from 'lucide-react';

export default function Calendar() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Calendar & Bookings</h1>
        <p>Manage your baking schedule and delivery slots</p>
      </div>

      <div className="content-grid">
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <CalendarIcon size={20} color="var(--accent2)" /> May 2026
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 8 }}>
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center' }}>
            {/* Simple mock calendar */}
            {[...Array(31)].map((_, i) => {
              const date = i + 1;
              const hasOrder = [5, 6, 7, 12, 14, 20].includes(date);
              const isToday = date === 6;
              const isFull = date === 12;

              return (
                <div key={date} style={{ 
                  padding: '12px 0', 
                  borderRadius: 'var(--radius-sm)', 
                  background: isToday ? 'var(--accent)' : hasOrder ? 'var(--cream)' : 'transparent', 
                  color: isToday ? 'white' : 'var(--text)',
                  fontWeight: isToday || hasOrder ? 700 : 400,
                  border: isFull ? '1px solid var(--accent2)' : '1px solid transparent',
                  cursor: 'pointer'
                }}>
                  {date}
                  {hasOrder && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isToday ? 'white' : isFull ? 'var(--accent2)' : 'var(--accent)', margin: '4px auto 0' }} />}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16 }}>Today's Production</h3>
            <div style={{ padding: 12, background: 'var(--cream)', borderRadius: 10, marginBottom: 10, display: 'flex', gap: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--accent2)', minWidth: 60 }}>12:00 PM</div>
              <div>
                <div style={{ fontWeight: 600 }}>Custom Birthday Cake</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Sneha Patel · Delivery</div>
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--cream)', borderRadius: 10, marginBottom: 10, display: 'flex', gap: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--accent2)', minWidth: 60 }}>5:00 PM</div>
              <div>
                <div style={{ fontWeight: 600 }}>Chocolate Truffle (1.5 kg)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Priya Sharma · Delivery</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: 'var(--rose)', color: 'white' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <AlertTriangle size={24} />
              <div>
                <h4 style={{ margin: 0 }}>Fully Booked on May 12</h4>
                <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.9 }}>You have 8 cake orders. No more slots available.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
