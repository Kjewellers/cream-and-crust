const fs = require('fs');

let src = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Update DelayedFallback
const fallbackRegex = /function DelayedFallback\(\{ fullScreen \}\) \{[\s\S]*?return \([\s\S]*?<Loader2.*?size=\{28\} \/>\s*<\/div>\s*\);\s*\}/;

const newFallback = `function DelayedFallback({ fullScreen }) {
  const [show, setShow] = React.useState(false);
  const [isTakingLong, setIsTakingLong] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setShow(true), 300);
    const longTimer = setTimeout(() => setIsTakingLong(true), 5000);
    return () => { clearTimeout(timer); clearTimeout(longTimer); };
  }, []);
  if (!show) return <div style={{ minHeight: fullScreen ? '100vh' : '60vh' }} />;
  return (
    <div style={{ minHeight: fullScreen ? '100vh' : '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Loader2 className="animate-spin" color="var(--accent, #B5606A)" size={28} />
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
}`;

src = src.replace(fallbackRegex, newFallback);

// 2. Wrap public routes in AppErrorBoundary
const publicRoutesRegex = /(const content = isPublicRoute \? \(\s*<motion\.div[^>]*>)\s*<Suspense fallback=\{<DelayedFallback fullScreen \/>\}>\s*<Routes>([\s\S]*?)<\/Routes>\s*<\/Suspense>\s*(<\/motion\.div>)/;

const newPublicRoutes = `$1
      <AppErrorBoundary>
        <Suspense fallback={<DelayedFallback fullScreen />}>
          <Routes>$2</Routes>
        </Suspense>
      </AppErrorBoundary>
    $3`;

src = src.replace(publicRoutesRegex, newPublicRoutes);

fs.writeFileSync('src/App.jsx', src);
console.log('Updated App.jsx');
