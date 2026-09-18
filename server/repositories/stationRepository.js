/* oxlint-disable no-console */
export class StationRepository {
    constructor(db) {
        this.db = db;
    }

    async findStationsNearby({ lat, lng, radius, minLat, maxLat, minLng, maxLng, fuelType, serviceType, limit = 50 }) {
        if (!this.db) return [];
        let serviceCondition = '';
        if (serviceType === '1') serviceCondition = 'AND p.is_self = 1';
        else if (serviceType === '0') serviceCondition = 'AND p.is_self = 0';

        const sql = `
            WITH geo_stations AS (
                SELECT s.id, s.gestore as brand, s.bandiera, s.nome_impianto as name, s.indirizzo as address, 
                       s.comune, s.provincia, s.latitudine as lat, s.longitudine as lng,
                       p.prezzo as currentPrice, p.is_self as isSelf,
                       (6371 * acos(min(1.0, max(-1.0, 
                           cos(? * 0.017453292519943295) * cos(s.latitudine * 0.017453292519943295) * 
                           cos((s.longitudine - ?) * 0.017453292519943295) + 
                           sin(? * 0.017453292519943295) * sin(s.latitudine * 0.017453292519943295)
                       )))) AS dist
                FROM stations s
                INNER JOIN prices p ON s.id = p.id_impianto
                WHERE s.latitudine BETWEEN ? AND ? 
                  AND s.longitudine BETWEEN ? AND ?
                  AND p.desc_carburante = ?
                  ${serviceCondition}
            )
            SELECT id, brand, bandiera, name, address, comune, provincia, lat, lng, 
                   currentPrice, isSelf, dist,
                   (currentPrice + (dist * 0.015)) AS convenienceScore
            FROM geo_stations
            WHERE dist <= ?
            ORDER BY convenienceScore ASC
            LIMIT ?
        `;

        try {
            const result = await this.db.execute({
                sql,
                args: [lat, lng, lat, minLat, maxLat, minLng, maxLng, fuelType, radius, limit]
            });
            return result.rows;
        } catch (e) {
            console.error("Errore query findStationsNearby:", e);
            return [];
        }
    }

    async findStationsInBoundingBox(minLat, maxLat, minLng, maxLng, fuelType, serviceType) {
        return this.findStationsNearby({
            lat: (minLat + maxLat) / 2,
            lng: (minLng + maxLng) / 2,
            radius: 1000,
            minLat,
            maxLat,
            minLng,
            maxLng,
            fuelType,
            serviceType,
            limit: 300
        });
    }

    async findCityPricesForSeo(city, fuelType) {
        if (!this.db) return [];
        try {
            const result = await this.db.execute({
                sql: `SELECT s.nome_impianto, s.indirizzo, s.latitudine, s.longitudine, p.prezzo
                      FROM stations s
                      INNER JOIN prices p ON s.id = p.id_impianto
                      WHERE s.comune = ? COLLATE NOCASE AND p.desc_carburante = ? COLLATE NOCASE
                      ORDER BY p.prezzo ASC`,
                args: [city, fuelType]
            });
            return result.rows;
        } catch (e) {
            console.error("Errore query findCityPricesForSeo:", e);
            return [];
        }
    }

    async findStationById(id) {
        if (!this.db) return null;
        try {
            const stationRes = await this.db.execute({
                sql: `SELECT s.id, s.gestore as brand, s.bandiera, s.nome_impianto as name, s.indirizzo as address, 
                             s.comune, s.provincia, s.latitudine as lat, s.longitudine as lng
                      FROM stations s
                      WHERE s.id = ? LIMIT 1`,
                args: [id]
            });
            if (!stationRes.rows || stationRes.rows.length === 0) return null;
            const station = stationRes.rows[0];

            const pricesRes = await this.db.execute({
                sql: `SELECT desc_carburante as fuelType, prezzo as price, is_self as isSelf, dt_comunicazione as date
                      FROM prices
                      WHERE id_impianto = ?
                      ORDER BY desc_carburante ASC, is_self DESC`,
                args: [id]
            });

            const prices = { self: {}, servito: {} };
            for (const p of pricesRes.rows) {
                if (p.isSelf) {
                    prices.self[p.fuelType] = p.price;
                } else {
                    prices.servito[p.fuelType] = p.price;
                }
            }

            return {
                ...station,
                prices,
                priceList: pricesRes.rows
            };
        } catch (e) {
            console.error("Errore query findStationById:", e);
            return null;
        }
    }

    async getActiveCityFuelCombinations() {
        if (!this.db) return [];
        try {
            const result = await this.db.execute(`
                SELECT DISTINCT s.comune as comune, p.desc_carburante as fuel
                FROM stations s
                INNER JOIN prices p ON s.id = p.id_impianto
            `);
            return result.rows;
        } catch (e) {
            console.error("Errore query getActiveCityFuelCombinations:", e);
            return [];
        }
    }
}

