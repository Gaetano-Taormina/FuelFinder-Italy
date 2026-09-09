/* oxlint-disable no-console */
import { rateLimit } from 'express-rate-limit';

// --- SICUREZZA: Intestazioni HTTP Protettive & CSP Hardened ---
export const securityHeaders = (req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.removeHeader('X-Powered-By');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.tile.openstreetmap.org https://flagcdn.com; connect-src 'self' https://*.tile.openstreetmap.org https://nominatim.openstreetmap.org https://router.project-osrm.org; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
    next();
};

// --- SICUREZZA: Rate Limiting Anti-Scraping / Anti-DDoS ---
export const rateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    limit: 600, // Massimo 600 richieste al minuto per IP
    standardHeaders: true, // Ritorna le intestazioni standard RateLimit-*
    legacyHeaders: false, // Disabilita X-RateLimit-* deprecate
    skip: (req) => {
        const userAgent = (req.headers['user-agent'] || '').toLowerCase();
        return userAgent.includes('googlebot') || userAgent.includes('bingbot') || userAgent.includes('yandexbot');
    },
    validate: { xForwardedForHeader: false },
    message: { error: 'Troppe richieste. Per favore attendi un minuto.' }
});
