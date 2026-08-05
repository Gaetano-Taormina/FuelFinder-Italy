import { StationRepository } from '../repositories/stationRepository.js';

export class StationService {
    constructor(db) {
        this.repository = new StationRepository(db);
    }

    getStationsNearby({ lat, lng, radius, fuelType, serviceType }) {
        const radiusInKm = radius + 2; // Margine di tolleranza
        const latMargin = radiusInKm / 111.0;
        const lngMargin = radiusInKm / 80.0;
        const minLat = lat - latMargin;
        const maxLat = lat + latMargin;
        const minLng = lng - lngMargin;
        const maxLng = lng + lngMargin;

        const rows = this.repository.findStationsInBoundingBox(minLat, maxLat, minLng, maxLng, fuelType, serviceType);

        const getDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Raggio terrestre in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + 
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                      Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const results = [];
        const seenIds = new Set();

        for (const r of rows) {
            const dist = getDistance(lat, lng, r.lat, r.lng);
            if (dist <= radius) {
                if (!seenIds.has(r.id)) {
                    seenIds.add(r.id);
                    r.dist = dist;
                    r.convenienceScore = r.currentPrice + (dist * 0.015);
                    r.prices = {
                        self: r.isSelf ? { [fuelType]: r.currentPrice } : {},
                        servito: !r.isSelf ? { [fuelType]: r.currentPrice } : {}
                    };
                    results.push(r);
                }
            }
        }

        results.sort((a, b) => a.convenienceScore - b.convenienceScore);
        const sliced = results.slice(0, 50);

        return {
            stations: sliced,
            totalCount: results.length
        };
    }
}
