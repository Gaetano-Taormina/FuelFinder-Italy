export class StationRepository {
    constructor(db) {
        this.db = db;
    }

    async findStationsInBoundingBox(minLat, maxLat, minLng, maxLng, fuelType, serviceType) {
        let serviceCondition = '';
        if (serviceType === '1') serviceCondition = 'AND p.is_self = 1';
        else if (serviceType === '0') serviceCondition = 'AND p.is_self = 0';

        const sql = `
            SELECT s.id, s.gestore as brand, s.bandiera, s.nome_impianto as name, s.indirizzo as address, 
                   s.comune, s.provincia, s.latitudine as lat, s.longitudine as lng,
                   p.prezzo as currentPrice, p.is_self as isSelf
            FROM stations s
            INNER JOIN prices p ON s.id = p.id_impianto
            WHERE s.latitudine BETWEEN ? AND ? 
              AND s.longitudine BETWEEN ? AND ?
              AND p.desc_carburante = ?
              ${serviceCondition}
            ORDER BY p.prezzo ASC
            LIMIT 300
        `;

        const result = await this.db.execute({
            sql,
            args: [minLat, maxLat, minLng, maxLng, fuelType]
        });
        
        return result.rows;
    }
}
