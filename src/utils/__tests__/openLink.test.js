import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openLink, openWhatsAppChat, openWhatsAppLink } from '../openLink.js';

// Setup mocks
const mockBrowserOpen = vi.fn();
vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: (...args) => mockBrowserOpen(...args),
  },
}));

let mockIsNative = false;
let mockPlatform = 'web';
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockIsNative,
    getPlatform: () => mockPlatform,
  },
}));

describe('openLink utility', () => {
  const originalWindowOpen = window.open;

  beforeEach(() => {
    mockIsNative = false;
    mockPlatform = 'web';
    window.open = vi.fn();
    mockBrowserOpen.mockClear();
  });

  afterEach(() => {
    window.open = originalWindowOpen;
  });

  it('does nothing when url is empty', async () => {
    await openLink('');
    expect(window.open).not.toHaveBeenCalled();
    expect(mockBrowserOpen).not.toHaveBeenCalled();
  });

  it('uses window.open on web', async () => {
    await openLink('https://example.com');
    expect(window.open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
    expect(mockBrowserOpen).not.toHaveBeenCalled();
  });

  it('uses Browser.open on native platform', async () => {
    mockIsNative = true;
    await openLink('https://example.com');
    expect(mockBrowserOpen).toHaveBeenCalledWith({ url: 'https://example.com', windowName: '_blank' });
    expect(window.open).not.toHaveBeenCalled();
  });

  it('falls back to window.open if Browser.open fails on native platform', async () => {
    mockIsNative = true;
    mockBrowserOpen.mockRejectedValueOnce(new Error('Browser blocked'));
    await openLink('https://example.com');
    expect(mockBrowserOpen).toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
  });
});

describe('openWhatsAppChat utility', () => {
  const originalWindowOpen = window.open;

  beforeEach(() => {
    mockIsNative = false;
    mockPlatform = 'web';
    window.open = vi.fn();
    mockBrowserOpen.mockClear();
  });

  afterEach(() => {
    window.open = originalWindowOpen;
  });

  it('correctly constructs wa.me url and uses window.open on web', async () => {
    await openWhatsAppChat('9876543210', 'Hello!');
    expect(window.open).toHaveBeenCalledWith(
      'https://wa.me/919876543210?text=Hello!',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('uses Browser.open on native Android', async () => {
    mockIsNative = true;
    mockPlatform = 'android';
    await openWhatsAppChat('9876543210', 'Hello Android!');
    expect(mockBrowserOpen).toHaveBeenCalledWith({
      url: 'https://wa.me/919876543210?text=Hello%20Android!',
    });
    expect(window.open).not.toHaveBeenCalled();
  });

  it('uses Browser.open on native iOS', async () => {
    mockIsNative = true;
    mockPlatform = 'ios';
    await openWhatsAppChat('9876543210', 'Hello iOS!');
    expect(mockBrowserOpen).toHaveBeenCalledWith({
      url: 'https://wa.me/919876543210?text=Hello%20iOS!',
    });
    expect(window.open).not.toHaveBeenCalled();
  });

  it('correctly behaves with recipient-less whatsapp share links', async () => {
    await openWhatsAppChat('', 'General text');
    expect(window.open).toHaveBeenCalledWith(
      'https://wa.me/?text=General%20text',
      '_blank',
      'noopener,noreferrer'
    );
  });
});

describe('openWhatsAppLink utility', () => {
  const originalWindowOpen = window.open;

  beforeEach(() => {
    mockIsNative = false;
    mockPlatform = 'web';
    window.open = vi.fn();
    mockBrowserOpen.mockClear();
  });

  afterEach(() => {
    window.open = originalWindowOpen;
  });

  it('proxies to openLink correctly', async () => {
    await openWhatsAppLink('https://wa.me/919876543210?text=Direct');
    expect(window.open).toHaveBeenCalledWith(
      'https://wa.me/919876543210?text=Direct',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
