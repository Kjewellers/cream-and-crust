/**
 * ThemeService.js — Centralized theme state manager.
 *
 * Single source of truth for application theme ('light' | 'dark').
 * Removes scattered theme logic from App.jsx, Settings.jsx, Dashboard.jsx.
 *
 * Features:
 *   - Reads initial value from localStorage (with system preference fallback)
 *   - Applies theme to <html> data-theme attribute (used by index.css vars)
 *   - Broadcasts changes via EventBus so any component can react
 *   - Supports programmatic toggle and explicit set
 *
 * Usage:
 *   import { ThemeService } from '../core/theme/ThemeService';
 *
 *   // Get current theme:
 *   ThemeService.current  // 'light' | 'dark'
 *
 *   // Toggle:
 *   ThemeService.toggle();
 *
 *   // Set explicitly:
 *   ThemeService.set('dark');
 *
 *   // React hook (auto re-renders on change):
 *   import { useTheme } from '../core/theme/ThemeService';
 *   const { theme, toggle } = useTheme();
 *
 * Migration notes:
 *   - Replaces: App.jsx theme useState + useEffect (cc-set-theme / cc-theme-changed events)
 *   - Replaces: Dashboard.jsx window.addEventListener('storage', ...) + ('dashboardThemeChanged', ...)
 *   - Replaces: Settings.jsx window.addEventListener('cc-theme-changed', ...)
 *   - Old window CustomEvents are still emitted for any third-party or missed callers (see below).
 */

import { useState, useEffect } from 'react';
import { EventBus, EVENTS } from '../eventBus/index.js';

const STORAGE_KEY = 'cc_theme';
const VALID_THEMES = ['light', 'dark'];

function getSystemPreference() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function loadTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (VALID_THEMES.includes(saved)) return saved;
  } catch {
    // localStorage unavailable (private mode, SSR)
  }
  return getSystemPreference();
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  // Apply to <html> — index.css vars respond to [data-theme="dark"]
  document.documentElement.setAttribute('data-theme', theme);
  // Keep <body> class in sync for any legacy CSS selectors
  document.body.classList.toggle('dark-mode', theme === 'dark');
  document.body.classList.toggle('light-mode', theme === 'light');
}

class ThemeServiceEngine {
  constructor() {
    this._theme = loadTheme();
    applyTheme(this._theme);
  }

  /** @returns {'light'|'dark'} */
  get current() {
    return this._theme;
  }

  /**
   * Set the theme explicitly.
   * @param {'light'|'dark'} theme
   */
  set(theme) {
    if (!VALID_THEMES.includes(theme) || theme === this._theme) return;
    this._theme = theme;
    this._persist();
    this._broadcast();
  }

  /** Toggle between light and dark. */
  toggle() {
    this.set(this._theme === 'light' ? 'dark' : 'light');
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, this._theme);
    } catch {
      // private mode — theme won't persist but app keeps working
    }
  }

  _broadcast() {
    applyTheme(this._theme);

    // Typed EventBus (primary channel)
    EventBus.emit(EVENTS.THEME_CHANGED, this._theme);

    // Legacy window CustomEvents for any components not yet migrated to EventBus
    try {
      window.dispatchEvent(new CustomEvent('cc-theme-changed', { detail: this._theme }));
      window.dispatchEvent(new CustomEvent('dashboardThemeChanged', { detail: this._theme }));
    } catch {
      // Best effort
    }
  }
}

// Singleton
export const ThemeService = new ThemeServiceEngine();

// ─── React Hook ─────────────────────────────────────────────────────────────

/**
 * React hook that subscribes to theme changes and triggers re-renders.
 *
 * @returns {{ theme: 'light'|'dark', toggle: () => void, set: (t: string) => void }}
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => ThemeService.current);

  useEffect(() => {
    // Subscribe via EventBus for typed changes from ThemeService.set/toggle
    const unsub = EventBus.on(EVENTS.THEME_CHANGED, (newTheme) => {
      setTheme(newTheme);
    });

    // Also listen for legacy window events from components not yet migrated
    const onLegacySet = (e) => {
      const next = e?.detail;
      if (VALID_THEMES.includes(next)) {
        ThemeService.set(next);
        // ThemeService.set emits THEME_CHANGED which updates state above
      } else {
        ThemeService.toggle();
      }
    };
    window.addEventListener('cc-set-theme', onLegacySet);

    return () => {
      unsub();
      window.removeEventListener('cc-set-theme', onLegacySet);
    };
  }, []);

  return {
    theme,
    toggle: () => ThemeService.toggle(),
    set: (t) => ThemeService.set(t),
    isDark: theme === 'dark',
  };
}
