/* oxlint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDailyStats } from '../middlewares/analytics.js';
import { validateStationsInput } from '../validators/apiValidator.js';
import { StationService } from '../services/stationService.js';

let cityDataCache = null;
let cityDataEtag = null;
const getCityData = () => {
    if (!cityDataCache) {
        const citiesPath = path.join(process.cwd(), 'server', 'data', 'cities.json');
        cityDataCache = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
        cityDataEtag = `"${crypto.createHash('md5').update(JSON.stringify(cityDataCache)).digest('hex')}"`;
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

// Helper per generare ETag deterministico e leggero
function generateETag(data) {
    const raw = typeof data === 'string' ? data : JSON.stringify(data);
    return `"${crypto.createHash('sha1').update(raw).digest('base64url').slice(0, 16)}"`;
}

export class ApiController {
    constructor(db) {
        this.stationService = new StationService(db);
    }

    /* v8 ignore start */
    getStats = (req, res, next) => {
        try {
            const clientPasskey = req.headers ? req.headers['x-admin-passkey'] : undefined;
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

            if (typeof res.setHeader === 'function') {
                res.setHeader('Cache-Control', 'no-store');
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

            if (typeof res.setHeader === 'function') {
                res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
            }

            if (apiCache.has(cacheKey)) {
                const cached = apiCache.get(cacheKey);
                if (Date.now() - cached.timestamp < CACHE_TTL) {
                    // Sposta in fondo per comportamento LRU
                    apiCache.delete(cacheKey);
                    apiCache.set(cacheKey, cached);

                    if (typeof res.setHeader === 'function') {
                        res.setHeader('ETag', cached.etag);
                    }
                    if (req.headers && req.headers['if-none-match'] === cached.etag) {
                        return res.status ? res.status(304).end() : res.json(cached.data);
                    }
                    return res.json(cached.data);
                } else {
                    apiCache.delete(cacheKey);
                }
            }

            const results = await this.stationService.getStationsNearby(validatedInput);
            const etag = generateETag(results);

            if (apiCache.size >= MAX_CACHE_SIZE) {
                // Svuota metà della cache più vecchia quando si supera la soglia
                const keys = Array.from(apiCache.keys());
                for (let i = 0; i < Math.floor(keys.length / 2); i++) {
                    apiCache.delete(keys[i]);
                }
            }

            apiCache.set(cacheKey, { data: results, etag, timestamp: Date.now() });

            if (typeof res.setHeader === 'function') {
                res.setHeader('ETag', etag);
            }
            if (req.headers && req.headers['if-none-match'] === etag) {
                return res.status ? res.status(304).end() : res.json(results);
            }

            res.json(results);
        } catch (error) {
            next(error);
        }
    }

    getCities = (req, res, next) => {
        try {
            getCityData();
            if (typeof res.setHeader === 'function') {
                res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
                if (cityDataEtag) {
                    res.setHeader('ETag', cityDataEtag);
                }
            }
            if (req.headers && cityDataEtag && req.headers['if-none-match'] === cityDataEtag) {
                return res.status ? res.status(304).end() : res.json(cityDataCache);
            }
            res.json(cityDataCache);
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

            if (typeof res.setHeader === 'function') {
                res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
            }
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
