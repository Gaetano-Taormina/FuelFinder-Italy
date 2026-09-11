import { useStations } from '../context/StationsContext';
import { calculateDistance } from '../workers/geoWorker.js';

export const getDistance = calculateDistance;

export function useDistanceLogic() {
    const { stations } = useStations();
    return stations;
}
