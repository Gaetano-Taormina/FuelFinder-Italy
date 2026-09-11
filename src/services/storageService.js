const DB_NAME = 'fuelfinder_storage';
const DB_VERSION = 1;

const STORES = {
  SEARCHES: 'recent_searches',
  FAVORITES: 'favorite_stations'
};

/**
 * Opens or initializes the IndexedDB database instance
 * @returns {Promise<IDBDatabase>}
 */
export function openStorageDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(STORES.SEARCHES)) {
        const searchStore = db.createObjectStore(STORES.SEARCHES, { keyPath: 'id', autoIncrement: true });
        searchStore.createIndex('city', 'city', { unique: false });
        searchStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
        const favStore = db.createObjectStore(STORES.FAVORITES, { keyPath: 'id' });
        favStore.createIndex('name', 'name', { unique: false });
        favStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a city search to the recent history
 * @param {string} city 
 * @param {{lat: number, lng: number}} [coords] 
 * @returns {Promise<number|null>}
 */
export async function saveSearchHistory(city, coords) {
  if (!city) return null;
  try {
    const db = await openStorageDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SEARCHES, 'readwrite');
      const store = tx.objectStore(STORES.SEARCHES);

      const entry = {
        city: String(city).trim(),
        coords: coords || null,
        timestamp: Date.now()
      };

      const request = store.add(entry);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/**
 * Retrieves the most recent search history
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export async function getSearchHistory(limit = 5) {
  try {
    const db = await openStorageDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SEARCHES, 'readonly');
      const store = tx.objectStore(STORES.SEARCHES);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      
      const results = [];
      const seenCities = new Set();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          const val = cursor.value;
          const normalizedCity = val.city.toLowerCase();
          if (!seenCities.has(normalizedCity)) {
            seenCities.add(normalizedCity);
            results.push(val);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Clears search history
 * @returns {Promise<boolean>}
 */
export async function clearSearchHistory() {
  try {
    const db = await openStorageDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SEARCHES, 'readwrite');
      const store = tx.objectStore(STORES.SEARCHES);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return false;
  }
}

/**
 * Saves or updates a favorite station
 * @param {object} station 
 * @returns {Promise<boolean>}
 */
export async function saveFavoriteStation(station) {
  if (!station || !station.id) return false;
  try {
    const db = await openStorageDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FAVORITES, 'readwrite');
      const store = tx.objectStore(STORES.FAVORITES);

      const entry = {
        id: station.id,
        name: station.name || station.brand || 'Distributore',
        address: station.address || '',
        comune: station.comune || '',
        lat: station.lat,
        lng: station.lng,
        timestamp: Date.now()
      };

      const request = store.put(entry);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return false;
  }
}

/**
 * Removes a favorite station by ID
 * @param {number|string} stationId 
 * @returns {Promise<boolean>}
 */
export async function removeFavoriteStation(stationId) {
  if (!stationId) return false;
  try {
    const db = await openStorageDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FAVORITES, 'readwrite');
      const store = tx.objectStore(STORES.FAVORITES);
      const request = store.delete(stationId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return false;
  }
}

/**
 * Retrieves all favorite stations
 * @returns {Promise<Array>}
 */
export async function getFavoriteStations() {
  try {
    const db = await openStorageDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FAVORITES, 'readonly');
      const store = tx.objectStore(STORES.FAVORITES);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Checks whether a station is saved as favorite
 * @param {number|string} stationId 
 * @returns {Promise<boolean>}
 */
export async function isFavoriteStation(stationId) {
  if (!stationId) return false;
  try {
    const db = await openStorageDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.FAVORITES, 'readonly');
      const store = tx.objectStore(STORES.FAVORITES);
      const request = store.get(stationId);
      request.onsuccess = () => resolve(Boolean(request.result));
      request.onerror = () => reject(request.error);
    });
  } catch {
    return false;
  }
}
