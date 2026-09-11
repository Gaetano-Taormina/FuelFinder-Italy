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

  it('performs mock IndexedDB operations successfully', async () => {
    const mockStoreData = new Map();
    const mockSearches = [];

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
              mockOpenRequest.onupgradeneeded({ target: { result: { objectStoreNames: { contains: () => false }, createObjectStore: () => ({ createIndex: () => {} }) } } });
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
    expect(searches.length).toBe(1);
    expect(searches[0].city).toBe('Palermo');

    const cleared = await clearSearchHistory();
    expect(cleared).toBe(true);

    // Test Favorites
    const savedFav = await saveFavoriteStation({ id: 50706, name: 'Eni Fav', comune: 'Agrigento' });
    expect(savedFav).toBe(true);

    const isFav = await isFavoriteStation(50706);
    expect(isFav).toBe(true);

    const favList = await getFavoriteStations();
    expect(favList.length).toBe(1);
    expect(favList[0].name).toBe('Eni Fav');

    const removedFav = await removeFavoriteStation(50706);
    expect(removedFav).toBe(true);

    const isFavAfter = await isFavoriteStation(50706);
    expect(isFavAfter).toBe(false);
  });
});
