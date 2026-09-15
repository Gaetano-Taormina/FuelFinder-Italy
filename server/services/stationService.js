/* oxlint-disable no-console */
import { StationRepository } from '../repositories/stationRepository.js';

export class StationService {
    constructor(db) {
        this.repository = new StationRepository(db);
    }

    async getStationsNearby({ lat, lng, radius, fuelType, serviceType }) {
        const radiusInKm = radius + 2; // Margine di tolleranza
        const latMargin = radiusInKm / 111.0;
        const lngMargin = radiusInKm / 80.0;
        const minLat = lat - latMargin;
        const maxLat = lat + latMargin;
        const minLng = lng - lngMargin;
        const maxLng = lng + lngMargin;

        const rows = await this.repository.findStationsNearby({
            lat,
            lng,
            radius,
            minLat,
            maxLat,
            minLng,
            maxLng,
            fuelType,
            serviceType,
            limit: 50
        });

        const seenIds = new Set();
        const stations = [];

        for (const r of rows) {
            if (!seenIds.has(r.id)) {
                seenIds.add(r.id);
                r.prices = {
                    self: r.isSelf ? { [fuelType]: r.currentPrice } : {},
                    servito: !r.isSelf ? { [fuelType]: r.currentPrice } : {}
                };
                stations.push(r);
            }
        }

        return {
            stations,
            totalCount: stations.length
        };
    }

    async getStationById(id) {
        if (!id) return null;
        return this.repository.findStationById(id);
    }
}
