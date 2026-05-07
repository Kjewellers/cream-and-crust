import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { CartContext } from '../App';

export default function Menu() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    api.getProducts()
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading menu...</div>;

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Our Menu</h1>
      <div className="product-grid">
        {products.map(product => (
          <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1rem' }} />
            ) : (
              <div className="product-emoji">{product.emoji || '🧁'}</div>
            )}
            <h3 style={{ marginBottom: '0.5rem' }}>{product.name}</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem', minHeight: '3rem' }}>
              {product.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--color-chocolate)' }}>
                ₹{product.price}
              </span>
              <button 
                className="btn btn-primary"
                onClick={() => addToCart(product, product.sizes[0])}
                style={{ padding: '0.5rem 1rem' }}
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
