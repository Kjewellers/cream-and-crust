import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './i18n'; // Initialize i18n before app renders
import './index.css';
import { attachGlobalCrashListeners } from './services/crashReporting.js';

// Attach global listeners BEFORE the app renders so we catch any
// synchronous errors thrown during initialization.
// getUid reads from localStorage so it works even if Auth hasn't loaded yet.
attachGlobalCrashListeners(() => {
  try {
    const saved = localStorage.getItem('cc_currentUser');
    return saved ? JSON.parse(saved)?.uid ?? null : null;
  } catch {
    return null;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

