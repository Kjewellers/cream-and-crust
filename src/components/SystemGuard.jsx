import React from 'react';
import { useAppVersion } from '../hooks/useAppVersion';
import { AlertOctagon, DownloadCloud, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

export default function SystemGuard({ children }) {
  const {
    platform,
    currentVersion,
    minVersionRequired,
    needsUpdate,
    updateUrl,
    maintenanceMode,
    maintenanceMessage,
    loading,
  } = useAppVersion();

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

  if (loading && platform === 'android') {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#fffaf5',
        }}
      >
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
              boxShadow: '0 4px 12px rgba(181,96,106,0.2)',
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
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          textAlign: 'center',
          background: '#FFFDF9',
        }}
      >
        <AlertOctagon size={56} color="#D4A050" style={{ marginBottom: 24 }} />
        <h1
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 28,
            color: '#2D1B14',
            marginBottom: 12,
          }}
        >
          {platform === 'android' ? 'Android Maintenance' : 'Web Under Maintenance'}
        </h1>
        <p style={{ color: '#5C4F46', fontSize: 16, lineHeight: 1.5, maxWidth: 420 }}>
          {maintenanceMessage}
        </p>
      </div>
    );
  }

  if (needsUpdate) {
    const isAndroid = platform === 'android';

    const handleAndroidUpdate = () => {
      try {
        window.location.href = 'market://details?id=com.creamandcrust.app';
        setTimeout(() => {
          window.location.href = updateUrl || 'https://play.google.com/store/apps/details?id=com.creamandcrust.app';
        }, 600);
      } catch {
        window.location.href = updateUrl || 'https://play.google.com/store/apps/details?id=com.creamandcrust.app';
      }
    };

    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          textAlign: 'center',
          background: '#FFFDF9',
        }}
      >
        <DownloadCloud size={56} color="#B5606A" style={{ marginBottom: 24 }} />
        <h1
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 28,
            color: '#2D1B14',
            marginBottom: 12,
          }}
        >
          {isAndroid ? 'Android App Update Required' : 'Web App Update Available'}
        </h1>
        <p
          style={{
            color: '#5C4F46',
            fontSize: 15,
            lineHeight: 1.6,
            maxWidth: 440,
            marginBottom: 28,
          }}
        >
          {isAndroid ? (
            <>
              You are currently on <strong>v{currentVersion}</strong>. Google Play requires an update to{' '}
              <strong>v{minVersionRequired}</strong> or higher to continue using Cream &amp; Crust.
            </>
          ) : (
            <>
              A fresh version of Cream &amp; Crust Web (<strong>v{minVersionRequired}</strong>) is available.
              Refresh your browser to load the latest features.
            </>
          )}
        </p>

        {isAndroid ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
            <button
              onClick={handleAndroidUpdate}
              style={{
                background: 'linear-gradient(135deg, #B5606A, #9A4C56)',
                color: '#FFF',
                border: 'none',
                padding: '14px 24px',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(181,96,106,0.3)',
              }}
            >
              <ExternalLink size={18} /> Update on Google Play
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'transparent',
                color: '#8C7A6B',
                border: 'none',
                padding: '10px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Check Again
            </button>
          </div>
        ) : (
          <button
            onClick={() => window.location.reload(true)}
            style={{
              background: 'linear-gradient(135deg, #B5606A, #9A4C56)',
              color: '#FFF',
              border: 'none',
              padding: '14px 28px',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(181,96,106,0.3)',
            }}
          >
            <RefreshCw size={18} /> Refresh Web App
          </button>
        )}
      </div>
    );
  }

  return children;
}
