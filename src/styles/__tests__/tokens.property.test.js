/**
 * Feature: production-readiness-hardening, Property 15: Design-system
 * animation-timing tokens are within range; brand/typography tokens resolve to
 * exactly one concrete value.
 *
 * Validates: Requirements 18.1, 18.2, 18.3
 */
import { describe, it, expect } from 'vitest';
import { tokens } from '../tokens.js';

describe('design tokens (Property 15)', () => {
  it('every motion token is a single duration within [150, 400] ms', () => {
    const values = Object.values(tokens.motion);
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) {
      const match = /^(\d+)ms$/.exec(v);
      expect(match).not.toBeNull();
      const ms = Number(match[1]);
      expect(ms).toBeGreaterThanOrEqual(150);
      expect(ms).toBeLessThanOrEqual(400);
    }
  });

  it('brand hexes are exact', () => {
    expect(tokens.color.rose).toBe('#B5606A');
    expect(tokens.color.gold).toBe('#D4A050');
    expect(tokens.color.cream).toBe('#FAF7F5');
  });

  it('typography tokens include serif/sans-serif fallbacks', () => {
    expect(tokens.font.heading).toMatch(/Playfair Display/);
    expect(tokens.font.heading).toMatch(/serif/);
    expect(tokens.font.body).toMatch(/Inter/);
    expect(tokens.font.body).toMatch(/sans-serif/);
  });

  it('every spacing/radius token resolves to exactly one concrete value', () => {
    for (const v of Object.values(tokens.space)) expect(/^\d+px$/.test(v)).toBe(true);
    for (const v of Object.values(tokens.radius)) expect(/^\d+px$|^999px$/.test(v)).toBe(true);
  });
});
