import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackEvent, getMenuEvents } from '../menuAnalytics';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock_timestamp'),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

describe('menuAnalytics service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock local/session storage for tests
    const store = {};
    const mockStorage = {
      getItem: vi.fn(key => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });
    Object.defineProperty(window, 'sessionStorage', { value: mockStorage, writable: true });
    
    // Default addDoc mock
    addDoc.mockResolvedValue({ id: 'mock_doc_id' });
    collection.mockReturnValue('mock_collection_ref');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('trackMenuEvent fails if no uid is provided', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await trackEvent('menu_view', null, 'menu1');
    expect(result).toBe(false);
    expect(consoleWarn).toHaveBeenCalledWith('trackEvent: bakeryId is required');
    consoleWarn.mockRestore();
  });

  it('trackEvent successfully tracks an event', async () => {
    const result = await trackEvent('product_view', 'user123', 'menu1', 'p1');
    expect(result).toBe(true);
    expect(collection).toHaveBeenCalledWith(db, 'analytics_events');
    expect(addDoc).toHaveBeenCalled();
    const eventDoc = addDoc.mock.calls[0][1];
    expect(eventDoc.bakeryId).toBe('user123');
    expect(eventDoc.eventType).toBe('product_view');
    expect(eventDoc.productId).toBe('p1');
    expect(eventDoc.visitorId).toBeDefined();
    expect(eventDoc.sessionId).toBeDefined();
    expect(eventDoc.source).toBeDefined();
  });

  it('getMenuEvents fetches events for a given uid', async () => {
    getDocs.mockResolvedValue({
      forEach: (callback) => {
        callback({ id: 'doc1', data: () => ({ bakeryId: 'user123', eventType: 'menu_view', timestamp: { toDate: () => new Date('2023-01-01') } }) });
        callback({ id: 'doc2', data: () => ({ bakeryId: 'user123', eventType: 'product_view' }) }); // no timestamp
      }
    });

    const events = await getMenuEvents('user123');
    expect(events.length).toBe(2);
    expect(events[0].id).toBe('doc1');
    expect(events[0].date).toBeInstanceOf(Date);
    expect(events[1].id).toBe('doc2');
    expect(events[1].date).toBeInstanceOf(Date);
    
    expect(query).toHaveBeenCalled();
    expect(where).toHaveBeenCalledWith('bakeryId', '==', 'user123');
  });
});
