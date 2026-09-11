import { processStations } from '../workers/geoWorker.js';

let workerInstance = null;
let msgId = 0;
const pendingRequests = new Map();

function getWorker() {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('../workers/geoWorker.js', import.meta.url), {
        type: 'module'
      });
      workerInstance.onmessage = (e) => {
        const { id, type, results } = e.data || {};
        if (type === 'PROCESS_STATIONS_SUCCESS' && pendingRequests.has(id)) {
          const { resolve } = pendingRequests.get(id);
          pendingRequests.delete(id);
          resolve(results);
        }
      };
      workerInstance.onerror = () => {
        // In case of worker error, reject all pending and terminate
        for (const { reject } of pendingRequests.values()) {
          reject(new Error('GeoWorker processing error'));
        }
        pendingRequests.clear();
        terminateGeoWorker();
      };
    } catch {
      workerInstance = null;
    }
  }
  return workerInstance;
}

export function terminateGeoWorker() {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
}

/**
 * Dispatches station sorting and filtering to background Web Worker
 * or falls back to synchronous execution on main thread.
 * 
 * @param {Array} stations 
 * @param {{lat: number, lng: number}} originCoords 
 * @param {number} radiusKm 
 * @returns {Promise<Array>}
 */
export function processStationsOffThread(stations, originCoords, radiusKm = 50) {
  const worker = getWorker();
  if (!worker) {
    return Promise.resolve(processStations(stations, originCoords, radiusKm));
  }

  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({
      id,
      type: 'PROCESS_STATIONS',
      stations,
      originCoords,
      radiusKm
    });
  });
}
