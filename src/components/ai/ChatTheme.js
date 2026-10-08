/**
 * ChatTheme.js
 *
 * Cream & Crust Design System Tokens for ChatGPT-Grade Conversational Experience.
 * Preserves Cream & Crust identity: Premium Cream, Warm Beige, Rose Gold & Dark Mahogany.
 */

export const ChatTheme = {
  colors: {
    // Light Mode (Cream & Crust Signature)
    light: {
      bg: '#FFFDF9',
      surface: '#FAF7F2',
      card: '#FFFFFF',
      border: 'rgba(74, 59, 50, 0.10)',
      borderAccent: 'rgba(212, 160, 80, 0.35)',
      textPrimary: '#2D1B14',
      textSecondary: '#6E5D53',
      textMuted: '#9E8E84',
      userBubbleBg: '#2A1F1B',
      userBubbleText: '#F5EBE6',
      aiBubbleBg: '#FAF7F2',
      aiBubbleText: '#2D1B14',
      accentGold: '#D4A050',
      accentRose: '#B5606A',
    },
    // Dark Mode (Obsidian Mahogany)
    dark: {
      bg: '#0E0C0B',
      surface: '#151210',
      card: '#1C1815',
      border: 'rgba(255, 255, 255, 0.08)',
      borderAccent: 'rgba(212, 160, 80, 0.28)',
      textPrimary: '#F5EBE6',
      textSecondary: '#B8AAA1',
      textMuted: '#7E7067',
      userBubbleBg: '#2E221D',
      userBubbleText: '#F5EBE6',
      aiBubbleBg: '#181412',
      aiBubbleText: '#F5EBE6',
      accentGold: '#D4A050',
      accentRose: '#B5606A',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
    titleSize: '1.25rem',
    bodySize: '0.938rem',
    metaSize: '0.72rem',
    lineHeight: 1.55,
  },
  radii: {
    sm: '8px',
    md: '14px',
    lg: '20px',
    pill: '99px',
  },
};

/** Safe Web & Capacitor Haptics helper */
export function triggerHaptic(type = 'light') {
  try {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 35,
        success: [10, 30, 20],
        error: [40, 50, 40],
      };
      window.navigator.vibrate(patterns[type] || 10);
    }
  } catch {
    // Ignore haptic failures on unsupported runtimes
  }
}
