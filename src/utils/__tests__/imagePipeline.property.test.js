/**
 * Feature: production-readiness-hardening, Property 10: Image fit never exceeds
 * the maximum edge.
 *
 * Validates: Requirements 11.2, 11.5
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { fitWithin } from '../imagePipeline.js';

describe('fitWithin (Property 10)', () => {
  it('longest edge never exceeds maxEdge and aspect ratio is preserved', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12000 }),
        fc.integer({ min: 1, max: 12000 }),
        fc.constantFrom(120, 480, 1024, 2048, 4096),
        (w, h, max) => {
          const out = fitWithin(w, h, max);
          const longest = Math.max(out.width, out.height);
          expect(longest).toBeLessThanOrEqual(max);
          expect(out.width).toBeGreaterThanOrEqual(1);
          expect(out.height).toBeGreaterThanOrEqual(1);

          // Aspect ratio preserved within a small tolerance (integer rounding).
          const srcRatio = w / h;
          const outRatio = out.width / out.height;
          const tolerance = 0.06 + 1 / Math.min(out.width, out.height);
          expect(Math.abs(srcRatio - outRatio)).toBeLessThanOrEqual(srcRatio * tolerance + 0.05);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('does not upscale images already within bounds', () => {
    expect(fitWithin(100, 80, 2048)).toEqual({ width: 100, height: 80 });
  });

  it('handles invalid dimensions without throwing', () => {
    expect(() => fitWithin(0, 0, 2048)).not.toThrow();
    expect(fitWithin(-5, 10, 2048)).toEqual({ width: 0, height: 0 });
  });
});
