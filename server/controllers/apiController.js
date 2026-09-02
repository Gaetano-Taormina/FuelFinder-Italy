/* oxlint-disable no-console */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDailyStats } from '../middlewares/analytics.js';
import { validateStationsInput } from '../validators/apiValidator.js';
import { StationService } from '../services/stationService.js';

let cityDataCache = null;
const getCityData = () => {
    if (!cityDataCache) {
        const citiesPath = path.join(process.cwd(), 'server', 'data', 'cities.json');
        cityDataCache = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
    }
    return cityDataCache;
};

const slugify = (text) => {
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/['\s_]+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

const CACHE_TTL = 15 * 60 * 1000; // 15 minuti
const MAX_CACHE_SIZE = 1000;
const apiCache = new Map();

export class ApiController {
    constructor(db) {
        this.stationService = new StationService(db);
    }

    /* v8 ignore start */
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
    /* v8 ignore stop */

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


    getCities = (_req, res, next) => {
        try {
            res.json(getCityData());
        } catch (error) {
            next(error);
        }
    }

    validateCity = (req, res, next) => {
        try {
            const { slug } = req.query;
            if (!slug) return res.status(400).json({ error: 'Missing slug parameter' });

            const cities = getCityData();
            const normalizedSlug = slugify(slug);
            const realCityObj = cities.find(c => slugify(c.name) === normalizedSlug);

            if (realCityObj) {
                res.json({ valid: true, city: realCityObj });
            } else {
                res.json({ valid: false });
            }
        } catch (error) {
            next(error);
        }
    }
}
