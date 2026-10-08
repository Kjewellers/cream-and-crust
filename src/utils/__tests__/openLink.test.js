import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openLink, openWhatsAppChat, openWhatsAppLink } from '../openLink.js';

// Setup mocks
const mockBrowserOpen = vi.fn();
vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: (...args) => mockBrowserOpen(...args),
  },
}));

const mockAppOpenUrl = vi.fn();
vi.mock('@capacitor/app', () => ({
  App: {
    openUrl: (...args) => mockAppOpenUrl(...args),
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
    mockAppOpenUrl.mockClear();
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
    mockPlatform = 'android';
    await openLink('https://example.com');
    expect(mockBrowserOpen).toHaveBeenCalledWith({ url: 'https://example.com', windowName: '_blank' });
    expect(window.open).not.toHaveBeenCalled();
  });

  it('falls back to window.open if Browser.open fails on native platform', async () => {
    mockIsNative = true;
    mockPlatform = 'android';
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
    mockAppOpenUrl.mockClear();
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

  it('uses App.openUrl on native Android', async () => {
    mockIsNative = true;
    mockPlatform = 'android';
    // Mock the initial intent URL attempt to fail so it falls back to wa.me URL
    mockAppOpenUrl.mockResolvedValueOnce(false); // intent fails
    mockAppOpenUrl.mockResolvedValueOnce(true);  // wa.me succeeds

    await openWhatsAppChat('9876543210', 'Hello Android!');
    
    expect(mockAppOpenUrl).toHaveBeenLastCalledWith({
      url: 'https://wa.me/919876543210?text=Hello%20Android!',
    });
    expect(window.open).not.toHaveBeenCalled();
  });

  it('uses App.openUrl on native iOS', async () => {
    mockIsNative = true;
    mockPlatform = 'ios';
    mockAppOpenUrl.mockResolvedValueOnce(true);

    await openWhatsAppChat('9876543210', 'Hello iOS!');
    
    expect(mockAppOpenUrl).toHaveBeenCalledWith({
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
    mockAppOpenUrl.mockClear();
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
