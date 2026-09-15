/**
 * Service to fetch and process nearby stations from Backend SQL API (Shift-Left Compute)
 */

/**
 * Fetches nearby stations directly from the backend API.
 * The backend calculates distances and convenience scores on SQLite directly.
 * 
 * @param {{lat: number, lng: number}} originCoords 
 * @param {number} [radiusKm=5] 
 * @param {string} [fuelType='Benzina'] 
 * @param {string} [serviceType='1'] 
 * @returns {Promise<Array>}
 */
export async function fetchStationsNearby(originCoords, radiusKm = 5, fuelType = 'Benzina', serviceType = '1') {
  if (!originCoords || typeof originCoords.lat !== 'number' || typeof originCoords.lng !== 'number') {
    return [];
  }

  const url = `/api/stations?lat=${originCoords.lat}&lng=${originCoords.lng}&radius=${radiusKm}&fuelType=${encodeURIComponent(fuelType)}&serviceType=${serviceType}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Network error fetching stations');
  }

  const data = await res.json();
  return data.stations || [];
}
