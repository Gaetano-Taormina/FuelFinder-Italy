/**
 * Web Worker for heavy geospatial math & distance calculations
 * Keeps the main UI thread at a silky 60+ FPS
 */

/**
 * Calculates Haversine distance in kilometers between two coordinates
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Processes and calculates distance and convenience score for an array of stations
 * @param {Array} stations 
 * @param {{lat: number, lng: number}} originCoords 
 * @param {number} radius 
 * @returns {Array} Processed and sorted stations
 */
export function processStations(stations, originCoords, radius = 50) {
  if (!Array.isArray(stations)) return [];
  if (!originCoords || typeof originCoords.lat !== 'number' || typeof originCoords.lng !== 'number') {
    return stations;
  }

  return stations
    .map((station) => {
      const dist = calculateDistance(
        originCoords.lat,
        originCoords.lng,
        station.lat,
        station.lng
      );

      const price = Number(station.currentPrice) || Number(station.prezzo) || 0;
      // Convenience formula: Price + (Distance * 0.015)
      const convenienceScore = price > 0 ? price + (dist * 0.015) : 999;

      return {
        ...station,
        dist: Math.round(dist * 100) / 100,
        convenienceScore: Math.round(convenienceScore * 1000) / 1000
      };
    })
    .filter((station) => station.dist <= radius)
    .sort((a, b) => (a.convenienceScore || 0) - (b.convenienceScore || 0));
}

/**
 * Worker message event dispatcher
 * @param {MessageEvent} event 
 * @param {object} [target]
 */
export function handleWorkerMessage(event, target = typeof self !== 'undefined' ? self : null) {
  const { id, type, stations, originCoords, radiusKm } = (event && event.data) || {};
  if (type === 'PROCESS_STATIONS' && target && typeof target.postMessage === 'function') {
    const results = processStations(stations, originCoords, radiusKm);
    target.postMessage({ id, type: 'PROCESS_STATIONS_SUCCESS', results });
  }
}

// Worker message listener for browser environment
if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', handleWorkerMessage);
}
