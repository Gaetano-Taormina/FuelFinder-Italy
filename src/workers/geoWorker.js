/**
 * Computes Haversine distance between two points in kilometers
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number}
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Processes, computes distances and ranks stations off-thread
 * @param {Array} stations 
 * @param {object} originCoords {lat, lng}
 * @param {number} radiusKm 
 * @returns {Array}
 */
export function processStations(stations, originCoords, radiusKm) {
  if (!Array.isArray(stations)) return [];
  if (!originCoords || typeof originCoords.lat !== 'number' || typeof originCoords.lng !== 'number') {
    return stations;
  }

  const radius = Number(radiusKm) || 100;

  return stations
    .map((station) => {
      const dist = calculateDistance(
        originCoords.lat,
        originCoords.lng,
        station.lat,
        station.lng
      );

      const price = Number(station.currentPrice) || 0;
      // Convenience Score: combination of price weight and distance penalty
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

// Worker message listener for browser environment
if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', (event) => {
    const { id, type, stations, originCoords, radiusKm } = event.data || {};
    if (type === 'PROCESS_STATIONS') {
      const results = processStations(stations, originCoords, radiusKm);
      self.postMessage({ id, type: 'PROCESS_STATIONS_SUCCESS', results });
    }
  });
}
