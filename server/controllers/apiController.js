import crypto from 'crypto';
import { getDailyStats } from '../middlewares/analytics.js';
import { validateStationsInput } from '../validators/apiValidator.js';
import { StationService } from '../services/stationService.js';

const CACHE_TTL = 15 * 60 * 1000; // 15 minuti
const MAX_CACHE_SIZE = 1000;
const apiCache = new Map();

export class ApiController {
    constructor(db) {
        this.stationService = new StationService(db);
    }

    getStats = (req, res, next) => {
        try {
            const clientPasskey = req.headers['x-admin-passkey'];
            const adminPasskey = process.env.ADMIN_PASSKEY;
            
            if (!clientPasskey || !adminPasskey || clientPasskey.length !== adminPasskey.length) {
                const err = new Error('Accesso Negato: Passkey mancante o di lunghezza non valida.');
                err.status = 403;
                err.expose = true;
                throw err;
            }
            
            if (!crypto.timingSafeEqual(Buffer.from(clientPasskey), Buffer.from(adminPasskey))) {
                const err = new Error('Accesso Negato: Passkey non valida.');
                err.status = 403;
                err.expose = true;
                throw err;
            }
            
            const dailyStats = getDailyStats();
            const report = {};
            for (const [date, data] of Object.entries(dailyStats)) {
                report[date] = {
                    visits: data.visits,
                    searches: data.searches,
                    uniqueUsers: data.uniqueIps ? data.uniqueIps.length : 0
                };
            }
            
            res.json(report);
        } catch (error) {
            next(error);
        }
    }

    getStations = async (req, res, next) => {
        try {
            const validatedInput = validateStationsInput(req.query);
            const cacheKey = JSON.stringify(validatedInput);
            
            if (apiCache.has(cacheKey)) {
                const cached = apiCache.get(cacheKey);
                if (Date.now() - cached.timestamp < CACHE_TTL) {
                    return res.json(cached.data);
                } else {
                    apiCache.delete(cacheKey);
                }
            }

            const results = await this.stationService.getStationsNearby(validatedInput);
            
            if (apiCache.size >= MAX_CACHE_SIZE) {
                // Svuota mezza cache se è troppo grande
                const keys = Array.from(apiCache.keys());
                for (let i = 0; i < keys.length / 2; i++) {
                    apiCache.delete(keys[i]);
                }
            }
            
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            res.json(results);
        } catch (error) {
            next(error);
        }
    }
}
