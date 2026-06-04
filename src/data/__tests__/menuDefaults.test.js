import { describe, it, expect } from 'vitest';
import { mergeMenuSettings, normalizeMenuProducts } from '../menuDefaults.js';

describe('mergeMenuSettings — profile is source of truth for identity/contact', () => {
  it('pulls bakery name, contact, socials, logo from business profile', () => {
    const business = {
      name: 'Sweet Studio',
      tagline: 'Baked with joy',
      whatsapp: '9876543210',
      instagram: '@sweetstudio',
      website: 'https://sweetstudio.in',
      city: 'Mumbai',
      logo: 'data:image/png;base64,abc',
    };
    const merged = mergeMenuSettings(business, {});
    expect(merged.bakeryName).toBe('Sweet Studio');
    expect(merged.tagline).toBe('Baked with joy');
    expect(merged.whatsapp).toBe('9876543210');
    expect(merged.instagram).toBe('@sweetstudio');
    expect(merged.website).toBe('https://sweetstudio.in');
    expect(merged.city).toBe('Mumbai');
    expect(merged.logoUrl).toBe('data:image/png;base64,abc');
  });

  it('business profile overrides stale menu-settings identity', () => {
    const business = { name: 'New Name', whatsapp: '111', instagram: '@new' };
    const staleSettings = { bakeryName: 'Old Name', whatsapp: '999', instagram: '@old' };
    const merged = mergeMenuSettings(business, staleSettings);
    expect(merged.bakeryName).toBe('New Name');
    expect(merged.whatsapp).toBe('111');
    expect(merged.instagram).toBe('@new');
  });

  it('falls back to phone when whatsapp missing', () => {
    const merged = mergeMenuSettings({ name: 'X', phone: '5551234567' }, {});
    expect(merged.whatsapp).toBe('5551234567');
  });

  it('keeps menu-only fields (heroTitle, description, timings) from settings', () => {
    const merged = mergeMenuSettings(
      { name: 'X' },
      { heroTitle: 'Custom Hero', description: 'My bakery', timings: '10-6' }
    );
    expect(merged.heroTitle).toBe('Custom Hero');
    expect(merged.description).toBe('My bakery');
    expect(merged.timings).toBe('10-6');
  });

  it('derives deliveryLocations from profile deliveryAreas array when not set in menu', () => {
    const merged = mergeMenuSettings({ name: 'X', deliveryAreas: ['Bandra', 'Juhu'] }, {});
    expect(merged.deliveryLocations).toBe('Bandra, Juhu');
  });

  it('does not crash on null business / null settings', () => {
    expect(() => mergeMenuSettings(null, null)).not.toThrow();
    const merged = mergeMenuSettings(null, null);
    expect(merged.bakeryName).toBeTruthy();
  });
});

describe('normalizeMenuProducts — respects menuOrder', () => {
  it('sorts by menuOrder ascending', () => {
    const products = [
      { id: 'c', name: 'Cake C', menuOrder: 2 },
      { id: 'a', name: 'Cake A', menuOrder: 0 },
      { id: 'b', name: 'Cake B', menuOrder: 1 },
    ];
    const out = normalizeMenuProducts(products);
    expect(out.map((p) => p.name)).toEqual(['Cake A', 'Cake B', 'Cake C']);
  });

  it('products without menuOrder fall to the end in natural order', () => {
    const products = [
      { id: 'x', name: 'No Order X' },
      { id: 'a', name: 'Ordered A', menuOrder: 0 },
      { id: 'y', name: 'No Order Y' },
    ];
    const out = normalizeMenuProducts(products);
    expect(out[0].name).toBe('Ordered A');
    expect(out.map((p) => p.name)).toContain('No Order X');
    expect(out.map((p) => p.name)).toContain('No Order Y');
  });

  it('filters out hidden products', () => {
    const products = [
      { id: 'a', name: 'Visible', menuOrder: 0 },
      { id: 'b', name: 'Hidden', menuHidden: true, menuOrder: 1 },
    ];
    const out = normalizeMenuProducts(products);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Visible');
  });
});
