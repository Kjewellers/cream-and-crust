/**
 * tokens.js — JS mirror of the Design_System tokens.
 *
 * Much of the app uses inline styles, so the canonical token set is exposed
 * here as well as in index.css :root. Every animation-timing token resolves to
 * a single duration between 150 and 400 ms (Req 18.1). Brand hexes are exact
 * (Req 18.2); heading/body fonts include serif/sans-serif fallbacks (Req 18.3,
 * 18.6).
 */

export const tokens = Object.freeze({
  color: Object.freeze({
    rose: '#B5606A',
    gold: '#D4A050',
    cream: '#FAF7F5',
    text: '#4A3B32',
    text2: '#8C7A6B',
  }),
  // All motion durations are within the 150-400ms native-feel range (Req 18.1).
  motion: Object.freeze({
    fast: '180ms',
    base: '250ms',
    slow: '350ms',
  }),
  radius: Object.freeze({
    xs: '12px',
    sm: '16px',
    md: '24px',
    xl: '32px',
    pill: '999px',
  }),
  space: Object.freeze({
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  }),
  shadow: Object.freeze({
    xs: '0 2px 8px rgba(74, 59, 50, 0.04)',
    md: '0 8px 24px rgba(74, 59, 50, 0.06), 0 2px 8px rgba(74, 59, 50, 0.04)',
    lg: '0 24px 48px rgba(74, 59, 50, 0.08), 0 8px 24px rgba(74, 59, 50, 0.06)',
  }),
  font: Object.freeze({
    heading: '"Playfair Display", Georgia, serif',
    body: '"Inter", "Plus Jakarta Sans", system-ui, sans-serif',
  }),
});

export default tokens;
