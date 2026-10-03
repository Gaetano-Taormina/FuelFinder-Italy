/* oxlint-disable no-console */
import express from 'express';

const app = express();
app.set('trust proxy', 1);

// Healthcheck for Render probing
app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

// Robots.txt pointing Googlebot directly to the new domain sitemap index
app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nAllow: /\nSitemap: https://fuelfinder-italia.onrender.com/sitemap.xml\n');
});

// CodeQL-safe instant 301 Permanent Redirect to new production domain
app.use((req, res, next) => {
    /* v8 ignore next 3 */
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
        return next();
    }
    const host = (typeof req.get === 'function' ? req.get('host') : (req.headers && req.headers.host)) || '';
    /* v8 ignore next 3 */
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
        return next();
    }
    if (req.path === '/healthz' || req.path === '/robots.txt') {
        return next();
    }

    const rawPath = typeof req.path === 'string' ? req.path : '/';
    let cleanPath = rawPath.replace(/^\/+/, '/');

    // Strategic Single-Hop normalization for legacy un-prefixed routes
    const legacyCityMatch = cleanPath.match(/^\/citta\/([a-zA-Z0-9_-]+)\/?$/);
    if (legacyCityMatch) {
        cleanPath = `/it/citta/${encodeURIComponent(legacyCityMatch[1])}`;
    } else if (cleanPath === '/esplora' || cleanPath === '/esplora/') {
        cleanPath = '/it/esplora';
    }

    const safeTarget = new URL(cleanPath, 'https://fuelfinder-italia.onrender.com');

    if (req.query && typeof req.query === 'object') {
        for (const [paramKey, paramVal] of Object.entries(req.query)) {
            if (typeof paramKey === 'string' && typeof paramVal === 'string') {
                safeTarget.searchParams.set(paramKey, paramVal);
            }
        }
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.redirect(301, safeTarget.href);
});

const PORT = Number(process.env.PORT || process.env.SERVER_PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

/* v8 ignore next 4 */
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
    app.listen(PORT, HOST, () => {
        console.info(`🚀 FuelFinder Legacy Redirector running on port ${PORT}`);
        console.info(`✨ Forwarding all traffic to https://fuelfinder-italia.onrender.com`);
    });
}

export { app };
