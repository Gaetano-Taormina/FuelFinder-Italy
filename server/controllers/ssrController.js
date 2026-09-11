/* oxlint-disable no-console */
import path from 'path';
import fs from 'fs';
import { trackStaticVisit } from '../middlewares/analytics.js';
import { StationRepository } from '../repositories/stationRepository.js';
import { seoService } from '../services/seoService.js';
import { 
    cities, 
    itToEnCities, 
    enToItCities, 
    fuelToEn, 
    slugify, 
    getSafeHost,
    REGEX_EXPLORE,
    REGEX_CITY,
    REGEX_STATION,
    REGEX_HOME_LANG
} from '../utils/seoHelpers.js';

export class SsrController {
    constructor(dbProvider) {
        this.dbProvider = dbProvider;
        this.htmlCache = new Map();
        this.indexPath = path.join(process.cwd(), 'dist', 'index.html');
    }

    getDb() {
        return typeof this.dbProvider === 'function' ? this.dbProvider() : this.dbProvider;
    }

    async handleSsrRequest(req, res) {
        trackStaticVisit(req);

        const stationMatch = req.path.match(REGEX_STATION);
        const exploreMatch = !stationMatch && req.path.match(REGEX_EXPLORE);
        const cityMatch = !stationMatch && req.path.match(REGEX_CITY);
        const homeMatch = req.path === '/' ? null : (!stationMatch && req.path.match(REGEX_HOME_LANG));
        
        let rawFuelInput = 'Benzina';
        if (stationMatch && stationMatch[6]) {
            rawFuelInput = stationMatch[6];
        } else if (cityMatch && cityMatch[4]) {
            rawFuelInput = cityMatch[4];
        } else if (homeMatch && homeMatch[2] && !exploreMatch && !cityMatch) {
            rawFuelInput = homeMatch[2];
        /* v8 ignore start */
        } else if (req.query.fuel || req.query.carburante) {
            rawFuelInput = req.query.fuel || req.query.carburante;
        }
        /* v8 ignore stop */

        
        // Whitelist and normalize rawFuel
        const normalizedFuelKey = String(rawFuelInput).toLowerCase();
        const fuelMap = {
            'benzina': 'Benzina',
            'gasolio': 'Gasolio',
            'gpl': 'GPL',
            'metano': 'Metano',
            'hvo': 'HVO',
            'gnl': 'GNL',
            'petrol': 'Benzina',
            'diesel': 'Gasolio',
            'lpg': 'GPL',
            'cng': 'Metano',
            'methane': 'Metano',
            'lng': 'GNL'
        };
        const rawFuel = fuelMap[normalizedFuelKey] || 'Benzina';
        const matchObj = stationMatch || cityMatch || exploreMatch;
        const lang = matchObj ? matchObj[1] : (req.path.startsWith('/en') ? 'en' : 'it');
        const displayFuel = lang === 'en' ? fuelToEn[rawFuel] : rawFuel;
        
        const isHomePage = req.path === '/' || Boolean(homeMatch && !exploreMatch && !cityMatch && !stationMatch);

        if ((stationMatch || cityMatch || exploreMatch || isHomePage) && fs.existsSync(this.indexPath)) {
            let cacheKey = '';
            let cityCap = '';
            let station = null;

            if (stationMatch) {
                const stationId = parseInt(stationMatch[5], 10);
                const db = this.getDb();
                if (db) {
                    const stationRepo = new StationRepository(db);
                    station = await stationRepo.findStationById(stationId);
                }
                if (!station) {
                    return res.status(404).sendFile(this.indexPath);
                }
                cacheKey = `${lang}_station_${station.id}_${stationMatch[6] ? slugify(rawFuel) : 'all'}`;
            } else if (cityMatch) {
                const rawOriginalSlug = cityMatch[3];
                let originalSlug = rawOriginalSlug.toLowerCase();
                let citySlug = originalSlug;
                
                // Fallback ITA per ricerca in EN
                if (lang === 'en') {
                    citySlug = enToItCities[citySlug] || citySlug; 
                }
                
                // Normalizza input
                const normalizedSlug = slugify(citySlug);
                const realCityObj = cities.find(c => slugify(c) === normalizedSlug);
                
                if (!realCityObj) {
                    return res.status(404).sendFile(this.indexPath);
                }
                
                // Redirect slug mal formattati
                const expectedOriginalSlug = lang === 'en' ? slugify(itToEnCities[normalizedSlug] || normalizedSlug) : normalizedSlug;
                if (decodeURIComponent(rawOriginalSlug) !== expectedOriginalSlug) {
                    const safeLang = lang === 'en' ? 'en' : 'it';
                    const safePrefix = safeLang === 'it' ? 'citta' : 'city';
                    return res.redirect(301, `/${safeLang}/${safePrefix}/${encodeURIComponent(expectedOriginalSlug)}`);
                }
                
                cityCap = realCityObj;
                cacheKey = `${lang}_${slugify(cityCap)}_${slugify(rawFuel)}`;
            } else if (exploreMatch) {
                cacheKey = `${lang}_esplora`;
            } else {
                cacheKey = `${lang}_home_${slugify(rawFuel)}`;
            }
            
            if (this.htmlCache.has(cacheKey)) {
                return res.send(this.htmlCache.get(cacheKey));
            }
            
            try {
                const templateHtml = await fs.promises.readFile(this.indexPath, 'utf-8');
                const host = getSafeHost(req);

                let renderedHtml = '';

                if (station) {
                    const metadata = seoService.generateStationMetadata({
                        station,
                        lang,
                        displayFuel: stationMatch[6] ? displayFuel : null,
                        host,
                        pathSegment: req.path
                    });

                    const crawlerHtml = seoService.generateStationCrawlerHtml({
                        station,
                        safeTitle: metadata.safeTitle,
                        safeDesc: metadata.safeDesc
                    });

                    const jsonLd = seoService.generateStationJsonLd({
                        station,
                        currentUrl: metadata.currentUrl,
                        host,
                        title: metadata.title,
                        desc: metadata.desc
                    });

                    renderedHtml = seoService.injectSeoIntoHtml(templateHtml, {
                        metadata,
                        crawlerHtml,
                        jsonLd
                    });
                } else {
                    let safePath = `/${lang}`;
                    if (cityMatch) {
                        safePath = `/${lang}/${lang === 'it' ? 'citta' : 'city'}/${encodeURIComponent(slugify(cityCap))}`;
                    } else if (exploreMatch) {
                        safePath = `/${lang}/${lang === 'it' ? 'esplora' : 'explore'}`;
                    }

                    const metadata = seoService.generateMetadata({
                        isCityPage: Boolean(cityMatch),
                        isExplorePage: Boolean(exploreMatch),
                        isHomePage,
                        lang,
                        displayFuel,
                        cityCap,
                        host,
                        pathSegment: safePath
                    });

                    const crawlerHtml = seoService.generateCrawlerHtml({
                        isExplorePage: Boolean(exploreMatch),
                        isHomePage,
                        safeTitle: metadata.safeTitle,
                        safeDesc: metadata.safeDesc,
                        safeHost: metadata.safeHost,
                        lang
                    });

                    let cityPrices = [];
                    const db = this.getDb();
                    if (cityMatch && db) {
                        const enToItFuel = { 'petrol': 'Benzina', 'diesel': 'Gasolio', 'lpg': 'GPL', 'cng': 'Metano' };
                        const dbFuelQuery = enToItFuel[rawFuel.toLowerCase()] || rawFuel;
                        const stationRepo = new StationRepository(db);
                        cityPrices = await stationRepo.findCityPricesForSeo(cityCap, dbFuelQuery);
                    }

                    const jsonLd = seoService.generateJsonLd({
                        isCityPage: Boolean(cityMatch),
                        isExplorePage: Boolean(exploreMatch),
                        lang,
                        displayFuel,
                        cityCap,
                        currentUrl: metadata.currentUrl,
                        host,
                        title: metadata.title,
                        desc: metadata.desc,
                        cityPrices
                    });

                    renderedHtml = seoService.injectSeoIntoHtml(templateHtml, {
                        metadata,
                        crawlerHtml,
                        jsonLd
                    });
                }

                /* v8 ignore next 4 */
                if (this.htmlCache.size > 2000) {
                    const keys = Array.from(this.htmlCache.keys());
                    for (let i = 0; i < 1000; i++) this.htmlCache.delete(keys[i]);
                }
                this.htmlCache.set(cacheKey, renderedHtml);

                return res.send(renderedHtml);
            /* v8 ignore start */
            } catch (e) {
                console.error("Errore durante l'iniezione SEO:", e);
            }
            /* v8 ignore stop */
        }

        // Fallback per tutte le rotte non gestite o 404
        res.status(404).sendFile(this.indexPath);
    }
}
