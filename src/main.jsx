import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './i18n'; // Initialize i18n before app renders
import './index.css';

// ── Core Infrastructure ──────────────────────────────────────────────────────
// StartupManager runs the ordered initialization pipeline:
//   Environment → Error Monitor → OTA → Purchases → Notifications → Feature Flags → READY
//
// It absorbs what was previously done by:
//   - attachGlobalCrashListeners() (now inside StartupManager._initErrorMonitor)
//   - initErrorMonitor() (same)
//   - Ad-hoc OTA useEffect in App.jsx (now inside StartupManager._initOTA)
//
// ThemeService initializes the theme before React hydrates to prevent FOUC.
import { StartupManager } from './core/startup/StartupManager.js';
import { ThemeService } from './core/theme/ThemeService.js'; // eslint-disable-line no-unused-vars

// ThemeService is imported for its side effects (reads localStorage, sets
// data-theme on <html> before first paint). No explicit call needed.

// Launch the pipeline. This is non-blocking — React renders immediately
// and reads StartupManager.isReady to decide what to show.
StartupManager.run();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
