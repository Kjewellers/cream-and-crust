import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
      <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🧁</div>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Baked with Love</h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--color-text)', maxWidth: '600px', margin: '0 auto 2rem' }}>
        Welcome to Cream & Crust. We specialize in artisan cakes, cupcakes, and pastries made fresh daily using premium ingredients.
      </p>
      <Link to="/menu" className="btn btn-primary" style={{ fontSize: '1.25rem', padding: '1rem 2rem' }}>
        Explore Our Menu
      </Link>

      <div className="product-grid" style={{ marginTop: '4rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="product-emoji">🎂</div>
          <h3>Custom Cakes</h3>
          <p>For your special moments</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="product-emoji">🥐</div>
          <h3>Fresh Pastries</h3>
          <p>Baked fresh every morning</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="product-emoji">🍪</div>
          <h3>Artisan Cookies</h3>
          <p>Melt-in-your-mouth goodness</p>
        </div>
      </div>
    </div>
  );
}
