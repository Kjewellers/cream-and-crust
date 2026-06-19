import React from 'react';
import { useAppVersion } from '../hooks/useAppVersion';
import { AlertOctagon, DownloadCloud, Loader2 } from 'lucide-react';

export default function SystemGuard({ children }) {
  const { needsUpdate, maintenanceMode, maintenanceMessage, loading } = useAppVersion();

  const [isTakingLong, setIsTakingLong] = React.useState(false);

  React.useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setIsTakingLong(true), 5000);
    } else {
      setIsTakingLong(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#fffaf5' }}>
        <Loader2 className="animate-spin" color="var(--accent, #B5606A)" size={32} />
        {isTakingLong && (
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              background: 'var(--accent, #B5606A)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(181,96,106,0.2)'
            }}
          >
            Reload Page
          </button>
        )}
      </div>
    );
  }

  if (maintenanceMode) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', background: '#FFFDF9' }}>
        <AlertOctagon size={56} color="#D4A050" style={{ marginBottom: 24 }} />
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 28, color: '#2D1B14', marginBottom: 12 }}>Under Maintenance</h1>
        <p style={{ color: '#5C4F46', fontSize: 16, lineHeight: 1.5, maxWidth: 400 }}>
          {maintenanceMessage}
        </p>
      </div>
    );
  }

  if (needsUpdate) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', background: '#FFFDF9' }}>
        <DownloadCloud size={56} color="#4A90E2" style={{ marginBottom: 24 }} />
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 28, color: '#2D1B14', marginBottom: 12 }}>App Update Required</h1>
        <p style={{ color: '#5C4F46', fontSize: 16, lineHeight: 1.5, maxWidth: 400, marginBottom: 32 }}>
          You are using an older version of Cream & Crust that is no longer supported. Please update to the latest version to continue.
        </p>
        <button
          onClick={() => window.location.reload(true)}
          style={{
            background: '#2D1B14',
            color: '#FFF',
            border: 'none',
            padding: '14px 28px',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(45,27,20,0.15)'
          }}
        >
          Reload App
        </button>
      </div>
    );
  }

  return children;
}
