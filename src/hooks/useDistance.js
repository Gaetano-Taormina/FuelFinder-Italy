import { useStations } from '../context/StationsContext';

/**
 * Hook per accedere alle stazioni con distanze geospaziali pre-calcolate
 * dal backend via SQLite Haversine (Shift-Left Compute).
 */
export function useDistanceLogic() {
  const { stations } = useStations();
  return stations;
}

/**
 * Utility di calcolo Haversine client-side (utilizzata come fallback offline)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export const getDistance = calculateDistance;

