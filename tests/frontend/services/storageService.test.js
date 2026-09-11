import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  openStorageDb,
  saveSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  saveFavoriteStation,
  removeFavoriteStation,
  getFavoriteStations,
  isFavoriteStation
} from '../../../src/services/storageService.js';

describe('Storage Service (IndexedDB Persistence)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty results or false when indexedDB is not supported', async () => {
    const originalIDB = window.indexedDB;
    Object.defineProperty(window, 'indexedDB', {
      value: undefined,
      configurable: true
    });

    await expect(openStorageDb()).rejects.toThrow('IndexedDB is not supported');
    expect(await saveSearchHistory('Roma', { lat: 41.9, lng: 12.5 })).toBeNull();
    expect(await getSearchHistory()).toEqual([]);
    expect(await clearSearchHistory()).toBe(false);
    expect(await saveFavoriteStation({ id: 1, name: 'Eni' })).toBe(false);
    expect(await removeFavoriteStation(1)).toBe(false);
    expect(await getFavoriteStations()).toEqual([]);
    expect(await isFavoriteStation(1)).toBe(false);

    Object.defineProperty(window, 'indexedDB', {
      value: originalIDB,
      configurable: true
    });
  });

  it('handles invalid inputs safely', async () => {
    expect(await saveSearchHistory(null)).toBeNull();
    expect(await saveFavoriteStation(null)).toBe(false);
    expect(await saveFavoriteStation({})).toBe(false);
    expect(await removeFavoriteStation(null)).toBe(false);
    expect(await isFavoriteStation(null)).toBe(false);
  });

  it('handles indexeddb open error rejection', async () => {
    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: vi.fn().mockImplementation(() => {
          const req = { onerror: null, error: new Error('IDB open failed') };
          setTimeout(() => req.onerror && req.onerror(), 0);
          return req;
        })
      },
      configurable: true
    });

    await expect(openStorageDb()).rejects.toThrow('IDB open failed');
  });

  it('handles onupgradeneeded when object stores already exist', async () => {
    const mockDb = {
      objectStoreNames: {
        contains: (name) => true
      }
    };

    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: vi.fn().mockImplementation(() => {
          const req = {
            onsuccess: null,
            onupgradeneeded: null,
            result: mockDb
          };
          setTimeout(() => {
            if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: mockDb } });
            if (req.onsuccess) req.onsuccess();
          }, 0);
          return req;
        })
      },
      configurable: true
    });

    const db = await openStorageDb();
    expect(db).toBe(mockDb);
  });

  it('performs mock IndexedDB operations successfully and deduplicates search history', async () => {
    const mockStoreData = new Map();
    const mockSearches = [
      { id: 1, city: 'Palermo', timestamp: 100 },
      { id: 2, city: 'palermo', timestamp: 200 }, // Duplicate city to test deduplication
      { id: 3, city: 'Catania', timestamp: 300 }
    ];

    const mockDb = {
      objectStoreNames: {
        contains: () => true
      },
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn().mockImplementation((entry) => {
            mockSearches.push(entry);
            const req = { onsuccess: null, onerror: null, result: 1 };
            setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
            return req;
          }),
          clear: vi.fn().mockImplementation(() => {
            mockSearches.length = 0;
            const req = { onsuccess: null, onerror: null };
            setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
            return req;
          }),
          put: vi.fn().mockImplementation((entry) => {
            mockStoreData.set(entry.id, entry);
            const req = { onsuccess: null, onerror: null, result: entry.id };
            setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
            return req;
          }),
          get: vi.fn().mockImplementation((id) => {
            const req = { onsuccess: null, onerror: null, result: mockStoreData.get(id) };
            setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
            return req;
          }),
          getAll: vi.fn().mockImplementation(() => {
            const req = { onsuccess: null, onerror: null, result: Array.from(mockStoreData.values()) };
            setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
            return req;
          }),
          delete: vi.fn().mockImplementation((id) => {
            mockStoreData.delete(id);
            const req = { onsuccess: null, onerror: null };
            setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
            return req;
          }),
          index: vi.fn().mockReturnValue({
            openCursor: vi.fn().mockImplementation(() => {
              let idx = 0;
              const req = { onsuccess: null, onerror: null };
              const cursor = {
                get value() { return mockSearches[idx]; },
                continue: () => {
                  idx++;
                  if (idx < mockSearches.length) {
                    req.result = cursor;
                  } else {
                    req.result = null;
                  }
                  if (req.onsuccess) req.onsuccess({ target: req });
                }
              };
              setTimeout(() => {
                req.result = mockSearches.length > 0 ? cursor : null;
                if (req.onsuccess) req.onsuccess({ target: req });
              }, 0);
              return req;
            })
          })
        })
      })
    };

    const mockOpenRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockDb
    };

    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: vi.fn().mockImplementation(() => {
          setTimeout(() => {
            if (mockOpenRequest.onupgradeneeded) {
              mockOpenRequest.onupgradeneeded({
                target: {
                  result: {
                    objectStoreNames: { contains: () => false },
                    createObjectStore: () => ({ createIndex: () => {} })
                  }
                }
              });
            }
            if (mockOpenRequest.onsuccess) mockOpenRequest.onsuccess();
          }, 0);
          return mockOpenRequest;
        })
      },
      configurable: true
    });

    // Test Searches
    const addId = await saveSearchHistory('Palermo', { lat: 38.1, lng: 13.3 });
    expect(addId).toBe(1);

    const searches = await getSearchHistory(5);
    expect(searches.length).toBe(2); // Palermo + Catania (deduplicated)
    expect(searches[0].city).toBe('Palermo');

    const cleared = await clearSearchHistory();
    expect(cleared).toBe(true);

    // Test Favorites with fallback brand and empty strings
    const savedFav = await saveFavoriteStation({ id: 50706, brand: 'Q8', lat: 37.3, lng: 13.5 });
    expect(savedFav).toBe(true);

    const savedFavFallback = await saveFavoriteStation({ id: 50707, lat: 37.3, lng: 13.5 });
    expect(savedFavFallback).toBe(true);

    const isFav = await isFavoriteStation(50706);
    expect(isFav).toBe(true);

    const favList = await getFavoriteStations();
    expect(favList.length).toBe(2);

    const removedFav = await removeFavoriteStation(50706);
    expect(removedFav).toBe(true);

    const isFavAfter = await isFavoriteStation(50706);
    expect(isFavAfter).toBe(false);

    // Test getFavoriteStations fallback when result is null/falsy
    mockStoreData.clear();
    const emptyFavs = await getFavoriteStations();
    expect(emptyFavs).toEqual([]);
  });

  it('handles request onerror across all store operations', async () => {
    const createFailingDb = () => ({
      objectStoreNames: { contains: () => true },
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn().mockImplementation(() => {
            const req = { onerror: null, error: new Error('Add error') };
            setTimeout(() => req.onerror && req.onerror(), 0);
            return req;
          }),
          clear: vi.fn().mockImplementation(() => {
            const req = { onerror: null, error: new Error('Clear error') };
            setTimeout(() => req.onerror && req.onerror(), 0);
            return req;
          }),
          put: vi.fn().mockImplementation(() => {
            const req = { onerror: null, error: new Error('Put error') };
            setTimeout(() => req.onerror && req.onerror(), 0);
            return req;
          }),
          get: vi.fn().mockImplementation(() => {
            const req = { onerror: null, error: new Error('Get error') };
            setTimeout(() => req.onerror && req.onerror(), 0);
            return req;
          }),
          getAll: vi.fn().mockImplementation(() => {
            const req = { onerror: null, error: new Error('GetAll error') };
            setTimeout(() => req.onerror && req.onerror(), 0);
            return req;
          }),
          delete: vi.fn().mockImplementation(() => {
            const req = { onerror: null, error: new Error('Delete error') };
            setTimeout(() => req.onerror && req.onerror(), 0);
            return req;
          }),
          index: vi.fn().mockReturnValue({
            openCursor: vi.fn().mockImplementation(() => {
              const req = { onerror: null, error: new Error('Cursor error') };
              setTimeout(() => req.onerror && req.onerror(), 0);
              return req;
            })
          })
        })
      })
    });

    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: vi.fn().mockImplementation(() => {
          const req = {
            onsuccess: null,
            result: createFailingDb()
          };
          setTimeout(() => req.onsuccess && req.onsuccess(), 0);
          return req;
        })
      },
      configurable: true
    });

    expect(await saveSearchHistory('FailCity', null)).toBeNull();
    expect(await getSearchHistory()).toEqual([]);
    expect(await clearSearchHistory()).toBe(false);
    expect(await saveFavoriteStation({ id: 999 })).toBe(false);
    expect(await removeFavoriteStation(999)).toBe(false);
    expect(await getFavoriteStations()).toEqual([]);
    expect(await isFavoriteStation(999)).toBe(false);
  });
});
