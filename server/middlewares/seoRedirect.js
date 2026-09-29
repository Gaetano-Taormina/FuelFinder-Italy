import { 
    REGEX_EXPLORE, 
    REGEX_CITY, 
    ALLOWED_FUELS, 
    slugify 
} from '../utils/seoHelpers.js';

export function seoRedirectMiddleware(req, res, next) {
    // 0. Domain Migration: Instant 301 Redirect for legacy hosts (fuelfinder-msn8)
    const host = (typeof req.get === 'function' ? req.get('host') : (req.headers && req.headers.host)) || '';
    if (host.includes('fuelfinder-msn8')) {
        const rawPath = typeof req.path === 'string' ? req.path : '/';
        const cleanPath = rawPath.replace(/^\/+/, '/');
        const safeTarget = new URL(cleanPath, 'https://fuelfinder-italia.onrender.com');
        if (req.query && typeof req.query === 'object') {
            for (const [paramKey, paramVal] of Object.entries(req.query)) {
                if (typeof paramKey === 'string' && typeof paramVal === 'string') {
                    safeTarget.searchParams.set(paramKey, paramVal);
                }
            }
        }
        return res.redirect(301, safeTarget.href);
    }

    // Redirect queries with carburante/fuel to path segment
    if (req.query.carburante || req.query.fuel) {
        const isEn = req.path.startsWith('/en');
        const lang = isEn ? 'en' : 'it';
        
        const rawParam = req.query.fuel || req.query.carburante;
        const fuelRaw = String(rawParam).trim().toLowerCase();
        const enToFuelLocal = { 'petrol': 'benzina', 'diesel': 'gasolio', 'lpg': 'gpl', 'cng': 'metano', 'methane': 'metano', 'lng': 'gnl' };
        const itToEnLocal = { 'benzina': 'petrol', 'gasolio': 'diesel', 'gpl': 'lpg', 'metano': 'cng', 'gnl': 'lng' };
        
        let urlFuel = isEn ? (itToEnLocal[fuelRaw] || fuelRaw) : (enToFuelLocal[fuelRaw] || fuelRaw);
        
        if (!ALLOWED_FUELS.has(urlFuel)) {
            urlFuel = isEn ? 'petrol' : 'benzina';
        }
        
        const cityMatch = req.path.match(REGEX_CITY);
        const exploreMatch = req.path.match(REGEX_EXPLORE);
        
        let targetPath = `/${lang}`;
        if (cityMatch) {
            const citySlug = encodeURIComponent(slugify(cityMatch[3]));
            targetPath = `/${lang}/${lang === 'it' ? 'citta' : 'city'}/${citySlug}`;
        } else if (exploreMatch) {
            targetPath = `/${lang}/${lang === 'it' ? 'esplora' : 'explore'}`;
        }
        
        return res.redirect(301, `${targetPath}/${encodeURIComponent(urlFuel)}`);
    }

    // Redirect /citta/slug -> /it/citta/slug
    const oldCityMatch = req.path.match(/^\/citta\/([a-zA-Z0-9_-]+)\/?$/);
    if (oldCityMatch) {
        const safeSlug = encodeURIComponent(oldCityMatch[1]);
        return res.redirect(301, `/it/citta/${safeSlug}`);
    }
    
    // Redirect /esplora -> /it/esplora
    if (req.path === '/esplora' || req.path === '/esplora/') {
        return res.redirect(301, '/it/esplora');
    }

    // Strip trailing slash for consistency (e.g. /it/citta/roma/ -> /it/citta/roma)
    if (req.path.length > 1 && req.path.endsWith('/')) {
        const cleanPath = req.path.slice(0, -1);
        // Guard against Open Redirect: strictly allow relative alphanumeric path segments
        if (/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(cleanPath)) {
            const queryParams = req.query && Object.keys(req.query).length > 0
                ? new URLSearchParams(req.query).toString()
                : '';
            const safeRedirect = queryParams ? `${cleanPath}?${queryParams}` : cleanPath;
            return res.redirect(301, safeRedirect);
        }
    }
    
    next();
}
