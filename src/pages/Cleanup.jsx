import React, { useState, useEffect } from 'react';
import { cleanFirestoreData } from '../utils/cleanFirestore';

export default function CleanupPage() {
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState(null);

  const runCleanup = async () => {
    setStatus('running');
    try {
      const res = await cleanFirestoreData();
      setResults(res);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setResults({ error: e.message });
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
      <h1>🧹 Firestore Cleanup</h1>
      <p style={{ color: 'var(--text2)', marginBottom: 24 }}>
        This will delete garbage data: fake orders, test customers, and invalid inventory items.
      </p>
      
      {status === 'idle' && (
        <button 
          onClick={runCleanup}
          style={{ 
            padding: '14px 28px', borderRadius: 12, background: '#C4574A', 
            color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' 
          }}
        >
          🗑️ Run Cleanup Now
        </button>
      )}
      
      {status === 'running' && (
        <div style={{ padding: 20, background: 'var(--cream)', borderRadius: 12, fontWeight: 600 }}>
          ⏳ Cleaning up Firestore...
        </div>
      )}
      
      {status === 'done' && results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 16, background: 'rgba(46,122,90,0.1)', borderRadius: 12, color: '#2E7A5A', fontWeight: 700 }}>
            ✅ Cleanup Complete!
          </div>
          <div style={{ padding: 16, background: 'var(--cream)', borderRadius: 12, fontSize: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Orders deleted: {results.ordersDeleted?.length || 0}</div>
            {results.ordersDeleted?.map((o, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginLeft: 16 }}>
                • {o.orderId || o.id} — {o.reason}
              </div>
            ))}
            <div style={{ fontWeight: 700, marginTop: 12, marginBottom: 8 }}>Inventory deleted: {results.inventoryDeleted?.length || 0}</div>
            {results.inventoryDeleted?.map((o, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginLeft: 16 }}>
                • {o.name}
              </div>
            ))}
            <div style={{ fontWeight: 700, marginTop: 12, marginBottom: 8 }}>Customers deleted: {results.customersDeleted?.length || 0}</div>
            {results.customersDeleted?.map((o, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginLeft: 16 }}>
                • "{o.name}" ({o.id})
              </div>
            ))}
            {results.errors?.length > 0 && (
              <div style={{ fontWeight: 700, marginTop: 12, color: '#C4574A' }}>
                Errors: {results.errors.join(', ')}
              </div>
            )}
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ 
              padding: '14px 28px', borderRadius: 12, background: 'var(--accent)', 
              color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' 
            }}
          >
            ✅ Done — Go to Dashboard
          </button>
        </div>
      )}
      
      {status === 'error' && (
        <div style={{ padding: 16, background: 'rgba(196,87,74,0.1)', borderRadius: 12, color: '#C4574A', fontWeight: 700 }}>
          ❌ Error: {results?.error}
        </div>
      )}
    </div>
  );
}
