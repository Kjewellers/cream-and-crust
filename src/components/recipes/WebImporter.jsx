import React, { useState } from 'react';
import { DownloadCloud, Link as LinkIcon, Loader2, ArrowRight } from 'lucide-react';
import { showToast, triggerHaptic } from '../iOS';
import { api } from '../../api';

export default function WebImporter({ onImport }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    triggerHaptic('light');

    try {
      const data = await api.scrapeRecipe(url);
      
      if (data.success) {
        showToast('Recipe Extracted Successfully!', 'success');
        triggerHaptic('success');
        onImport(data.data);
        setUrl('');
      } else {
        throw new Error(data.error || 'Failed to extract recipe.');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not extract recipe from this URL', 'error');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '64px 20px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ 
          width: 80, height: 80, background: 'var(--rv-pink-light)', borderRadius: 24, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          boxShadow: 'inset 0 2px 10px rgba(181, 96, 106, 0.1)'
        }}>
          <DownloadCloud size={40} color="var(--accent)" />
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Web Recipe Importer
        </h2>
        <p style={{ color: 'var(--rv-muted)', fontSize: 16, lineHeight: 1.5 }}>
          Paste a link from your favorite food blog. Our magical engine will extract the ingredients, instructions, and images instantly.
        </p>
      </div>

      <form onSubmit={handleImport} style={{ background: '#fff', padding: 24, borderRadius: 20, boxShadow: 'var(--rv-shadow-md)', border: '1px solid var(--rv-border)' }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--rv-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recipe URL
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <LinkIcon size={20} color="#8E8E93" style={{ position: 'absolute', left: 16 }} />
            <input 
              type="url" 
              placeholder="https://sallysbakingaddiction.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              style={{
                width: '100%', padding: '16px 16px 16px 48px', fontSize: 16,
                border: '1px solid #E5E5EA', borderRadius: 12, background: '#F2F2F7',
                outline: 'none', transition: 'border 0.2s', color: '#1C1C1E'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = '#E5E5EA'}
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || !url}
          style={{
            width: '100%', background: 'var(--rv-pink-gradient)', color: '#fff', border: 'none',
            padding: 18, borderRadius: 12, fontSize: 16, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            cursor: (loading || !url) ? 'not-allowed' : 'pointer',
            opacity: (loading || !url) ? 0.7 : 1,
            boxShadow: 'var(--rv-shadow-pink)', transition: 'transform 0.1s'
          }}
          onMouseDown={(e) => { if (!loading && url) e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              Extracting Magic...
            </>
          ) : (
            <>
              Import Recipe <ArrowRight size={20} />
            </>
          )}
        </button>

        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </form>

      <div style={{ marginTop: 32, textAlign: 'center', fontSize: 13, color: '#8E8E93' }}>
        Supports 95% of major food blogs and recipe websites via Schema.org JSON-LD.
      </div>
    </div>
  );
}
