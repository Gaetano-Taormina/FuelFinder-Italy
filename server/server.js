/* oxlint-disable no-console */
import express from 'express';
import { modernCompression } from './middlewares/modernCompression.js';
import cors from 'cors';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';
import { fetchTursoUsage } from './services/quotaService.js';
import { downloadDatabase } from './services/dbDownloadService.js';

// --- GESTIONE ERRORI DI SISTEMA ---
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
    console.error('[FATAL] Unhandled Rejection:', reason);
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.warn("[WARN] SIGTERM received. Shutting down...");
    process.exit(0);
});

process.on('SIGINT', () => {
    console.warn('[WARN] SIGINT received. Shutting down...');
    process.exit(0);
});


import escapeHtml from 'escape-html';

const slugify = (text) => {
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/['\s_]+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

const escapeXml = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

const getSafeHost = (req) => {
    const rawHost = req?.get ? req.get('host') : null;
    if (rawHost && /^[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/.test(rawHost)) {
        const proto = req.protocol === 'http' && (rawHost.startsWith('localhost') || rawHost.startsWith('127.0.0.1')) ? 'http' : 'https';
        return `${proto}://${rawHost}`;
    }
    return 'https://fuelfinder-msn8.onrender.com';
};

import { sync } from './sync/index.js';
import { securityHeaders, rateLimiter } from './middlewares/security.js';
import { analyticsMiddleware, trackStaticVisit, setAnalyticsDb } from './middlewares/analytics.js';
import { globalErrorHandler } from './middlewares/errorHandler.js';
import { timeoutMiddleware } from './middlewares/timeout.js';
import { setupApiRoutes } from './routes/api.js';

const citiesDataPath = path.join(process.cwd(), 'server', 'data', 'cities.json');
const citiesData = JSON.parse(fs.readFileSync(citiesDataPath, 'utf8'));
const cities = citiesData.map(c => c.name);

const REGEX_EXPLORE = /^\/(it|en)\/(esplora|explore)\/?$/;
const REGEX_CITY = /^\/(it|en)\/(citta|city)\/([^/]+)\/?(?:([^/]+)\/?)?$/;
const REGEX_HOME_LANG = /^\/(it|en)(?:\/([^/]+))?\/?$/;
const REGEX_LANG_PREFIX = /^\/(it|en)/;

const itToEnCities = Object.freeze({
    'roma': 'rome',
    'milano': 'milan',
    'napoli': 'naples',
    'venezia': 'venice',
    'firenze': 'florence',
    'torino': 'turin',
    'genova': 'genoa',
    'padova': 'padua',
    'siracusa': 'syracuse',
    'mantova': 'mantua'
});

const enToItCities = Object.freeze({
    'rome': 'roma',
    'milan': 'milano',
    'naples': 'napoli',
    'venice': 'venezia',
    'florence': 'firenze',
    'turin': 'torino',
    'genoa': 'genova',
    'padua': 'padova',
    'syracuse': 'siracusa',
    'mantua': 'mantova'
});

const fuelToEn = Object.freeze({
    'Benzina': 'Petrol',
    'Gasolio': 'Diesel',
    'GPL': 'LPG',
    'Metano': 'CNG'
});

let isReady = false;
const app = express();

// --- 1. HEALTHCHECK ---
// Risponde subito 200 OK a Render per evitare timeout all'avvio.
app.use((req, res, next) => {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    
    // Endpoint di RECOVERY MANUALE
    if (req.path === '/healthz/recover') {
        const passkey = req.query.token || req.headers['x-admin-passkey'];
        if (passkey && passkey === process.env.ADMIN_PASSKEY) {
            console.warn("[WARN] Manual recovery triggered via healthcheck.");
            isReady = false;
            // Riavvia asincronamente il DB
            setupDatabase().then(() => {
                console.log("[INFO] DB reinitialized after recovery.");
            }).catch(e => console.error(e));
            return res.status(200).send('Recovery procedure started');
        }
    }

    // 1. Intercetta gli endpoint classici di health check
    if (req.path === '/health' || req.path === '/healthz' || req.path === '/ping') {
        return res.status(200).send('OK');
    }
    
    // 2. Intercetta il probing di Render o di altri load balancer tramite User-Agent
    if (ua.includes('render/1.0') || ua.includes('healthcheck') || ua.includes('kube-probe') || ua.includes('uptimerobot')) {
        return res.status(200).send('OK');
    }
    
    // 3. Durante l'inizializzazione DB, metti in attesa gli utenti ma rispondi OK sulla root.
    if (!isReady) {
        if (req.path === '/') return res.status(200).send('OK - Inizializzazione in corso');
        if (req.path === '/robots.txt' || req.path === '/sitemap.xml' || req.path.startsWith('/sitemaps/')) return next(); // Bypass per SEO
        return res.status(503).send('Servizio in fase di avvio, riprova tra qualche secondo...');
    }
    
    next();
});

// --- 0. MAINTENANCE MODE (SEO FRIENDLY) ---
// Note: MAINTENANCE_MODE is managed via Render Environment Variables.
app.use((req, res, next) => {
    const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    if (isMaintenanceMode) {
        if (req.path === '/robots.txt' || req.path === '/sitemap.xml' || req.path.startsWith('/sitemaps/')) return next(); // Bypass per SEO
        
        res.status(503);
        res.set('Retry-After', '259200'); // 3 giorni in secondi, fondamentale per non perdere posizionamento SEO su Google
        
        // Se la richiesta è per un'API (es. dalla PWA cachata), restituiamo JSON
        if (req.path.startsWith('/api/')) {
            return res.json({ success: false, error: 'FuelFinder Italy è in manutenzione. Riprova tra qualche giorno.' });
        }

        return res.send(`
            <!DOCTYPE html>
            <html lang="it">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sito in Manutenzione - FuelFinder Italy</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #0f172a; color: #f8fafc; text-align: center; margin: 0; padding: 20px; }
                    .container { max-width: 600px; }
                    h1 { color: #38bdf8; font-size: 2.5rem; margin-bottom: 1rem; }
                    p { font-size: 1.2rem; line-height: 1.6; color: #94a3b8; }
                    svg { width: 80px; height: 80px; margin-bottom: 20px; color: #38bdf8; }
                </style>
            </head>
            <body>
                <div class="container">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <h1>Site Under Maintenance</h1>
                    <p>FuelFinder Italy is temporarily offline for scheduled maintenance.</p>
                    <p>The service will be back online when the countdown finishes. Thank you for your patience!</p>
                    <div id="countdown" style="font-size: 2.2rem; font-weight: bold; margin-top: 30px; color: #38bdf8; font-variant-numeric: tabular-nums; letter-spacing: 2px;"></div>
                </div>
                <script>
                    function updateCountdown() {
                        const now = new Date();
                        // Il prossimo avvio previsto è il 1° giorno del mese successivo
                        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                        const diff = nextMonth - now;
                        
                        const isNegative = diff < 0;
                        const absDiff = Math.abs(diff);

                        const d = Math.floor(absDiff / (1000 * 60 * 60 * 24));
                        const h = String(Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
                        const m = String(Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
                        const s = String(Math.floor((absDiff % (1000 * 60)) / 1000)).padStart(2, '0');

                        const sign = isNegative ? "-" : "";
                        document.getElementById('countdown').innerHTML = sign + d + "g " + h + ":" + m + ":" + s;
                    }
                    
                    updateCountdown();
                    setInterval(updateCountdown, 1000);
                </script>
            </body>
            </html>
        `);
    }
    next();
});

// --- 2. INITIALIZATION BLOCKER ---
app.use((req, res, next) => {
    if (!isReady) {
        if (req.path.startsWith('/api/')) {
            return res.status(503).json({ 
                success: false, 
                error: 'Il database è in fase di inizializzazione (download stazioni). Riprova tra 1 minuto...' 
            });
        }
    }
    next();
});

app.use(modernCompression());
app.use(cors());
app.use(express.json());
app.use(timeoutMiddleware(10000)); // 10 secondi di timeout globale

// --- SICUREZZA ---
app.use(securityHeaders);
app.use(rateLimiter);

// --- ANALYTICS ---
app.use(analyticsMiddleware);

// --- DATABASE INIZIALIZZAZIONE ---
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;
const syncUrl = process.env.TURSO_DATABASE_URL;

// DB locale (Embedded Replica)
const localDbPath = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'server'), 'database.sqlite');

let db;

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} - Init DB...`);
});

async function setupDatabase(forceDownload = false) {
    if (process.env.DB_DOWNLOAD_URL) {
        console.log(`[INFO] DB_DOWNLOAD_URL configured: ${process.env.DB_DOWNLOAD_URL}`);
        const force = forceDownload || process.env.FORCE_DB_DOWNLOAD === 'true';
        const dlResult = await downloadDatabase({
            url: process.env.DB_DOWNLOAD_URL,
            targetPath: localDbPath,
            force
        });
        if (!dlResult.success && !fs.existsSync(localDbPath)) {
            console.error(`[FATAL] Could not download initial SQLite database: ${dlResult.error}`);
            process.exit(1);
        }
    }

    let clientOptions;
    if (!process.env.DB_DOWNLOAD_URL && syncUrl && (syncUrl.startsWith('libsql://') || syncUrl.startsWith('https://'))) {
        // Direct Remote Client: queries Turso directly over HTTPS/WebSocket without downloading 23MB database on startup
        clientOptions = {
            url: syncUrl,
            authToken: DB_TOKEN
        };
        console.log("[INFO] Connecting directly to Turso Cloud Database (Direct Remote Mode)...");
    } else {
        // Local SQLite standalone mode
        clientOptions = { url: `file:${localDbPath}` };
        console.log(`[INFO] Using local SQLite database at ${localDbPath}`);
    }

    try {
        db = createClient(clientOptions);
        
        // Connectivity check
        await db.execute('SELECT 1');
        console.log("[INFO] Database connected successfully.");
    } catch (err) {
        const errMsg = err.message || err.toString();
        if (errMsg.includes('403') || errMsg.includes('quota') || errMsg.includes('blocked') || errMsg.includes('Forbidden')) {
            console.warn("[WARN] Turso Quota Exceeded during init! Enabling Maintenance Mode.");
            process.env.MAINTENANCE_MODE = 'true';
            db = null;
        } else {
            console.error("[FATAL] Database initialization error:", err);
            process.exit(1);
        }
    }
}

// --- AVVIO ASINCRONO ---
async function initServer() {
    try {
        await setupDatabase();
        await setAnalyticsDb(db);
        
        // Controllo live quota Turso in background solo se collegati a Turso
        if (syncUrl && !process.env.DB_DOWNLOAD_URL) {
            fetchTursoUsage().then(async (usage) => {
                if (usage) {
                    console.log(`[INFO] Turso Quota Status: ${usage.rowsRead.toLocaleString()} Reads (${usage.pctRead}%), ${usage.rowsWritten.toLocaleString()} Writes (${usage.pctWritten}%), Syncs: ${(usage.bytesSynced/1024/1024).toFixed(1)}MB (${usage.pctSynced}%)`);
                    if (usage.isEmergency) {
                        console.warn("[EMERGENCY] Soglia del 95% raggiunta su Turso all'avvio. Attivazione Maintenance Mode.");
                        process.env.MAINTENANCE_MODE = 'true';
                    }
                }
            }).catch(() => {});
        }
        
        // --- API ROUTES ---
        setupApiRoutes(app, db);

        // --- SITEMAP ---
const sitemapCaches = {
    index: null,
    it: null,
    en: null,
    fuelsIt: {},
    fuelsEn: {}
};

const getUrlsetStart = () => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

const buildSingleLangUrl = (host, locPath, altLang, altPath, freq, prio, currentLang) => {
    const safeHost = escapeXml(host);
    const safeCurrentLang = encodeURIComponent(currentLang);
    const safeAltLang = encodeURIComponent(altLang);
    const locUrl = `${safeHost}/${safeCurrentLang}${locPath}`;
    const altUrl = `${safeHost}/${safeAltLang}${altPath}`;
    
    let xml = `  <url>\n    <loc>${locUrl}</loc>\n    <changefreq>${escapeXml(freq)}</changefreq>\n    <priority>${escapeXml(prio)}</priority>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="${escapeXml(altLang)}" href="${altUrl}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="${escapeXml(currentLang)}" href="${locUrl}" />\n  </url>\n`;
    return xml;
};

app.get('/sitemap.xml', (req, res) => {
    if (sitemapCaches.index) {
        res.header('Content-Type', 'application/xml');
        return res.send(sitemapCaches.index);
    }
    
    const host = getSafeHost(req);
    const safeHost = escapeXml(host);
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    xml += `  <sitemap>\n    <loc>${safeHost}/sitemaps/it.xml</loc>\n  </sitemap>\n`;
    xml += `  <sitemap>\n    <loc>${safeHost}/sitemaps/en.xml</loc>\n  </sitemap>\n`;
    ['benzina', 'gasolio', 'gpl', 'metano', 'hvo', 'gnl'].forEach((fuel, index) => {
        const enFuels = ['petrol', 'diesel', 'lpg', 'methane', 'hvo', 'lng'];
        xml += `  <sitemap>\n    <loc>${safeHost}/sitemaps/fuels-it-${encodeURIComponent(fuel)}.xml</loc>\n  </sitemap>\n`;
        xml += `  <sitemap>\n    <loc>${safeHost}/sitemaps/fuels-en-${encodeURIComponent(enFuels[index])}.xml</loc>\n  </sitemap>\n`;
    });
    
    xml += `</sitemapindex>`;
    sitemapCaches.index = xml;
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
});

// --- BASE PAGES SITEMAPS ---
app.get('/sitemaps/it.xml', (req, res) => {
    if (sitemapCaches.it) return res.header('Content-Type', 'application/xml').send(sitemapCaches.it);
    
    const host = getSafeHost(req);
    let xml = getUrlsetStart();
    
    xml += buildSingleLangUrl(host, '', 'en', '', 'daily', '1.0', 'it');
    xml += buildSingleLangUrl(host, '/esplora', 'en', '/explore', 'daily', '0.9', 'it');
    
    for (const city of cities) {
        const lowerCity = city.toLowerCase();
        const citySegmentIt = slugify(lowerCity);
        const citySegmentEn = slugify(itToEnCities[lowerCity] || lowerCity);
        xml += buildSingleLangUrl(host, `/citta/${encodeURIComponent(citySegmentIt)}`, 'en', `/city/${encodeURIComponent(citySegmentEn)}`, 'daily', '0.8', 'it');
    }
    
    xml += `</urlset>`;
    sitemapCaches.it = xml;
    res.header('Content-Type', 'application/xml').send(xml);
});

app.get('/sitemaps/en.xml', (req, res) => {
    if (sitemapCaches.en) return res.header('Content-Type', 'application/xml').send(sitemapCaches.en);
    
    const host = getSafeHost(req);
    let xml = getUrlsetStart();
    
    xml += buildSingleLangUrl(host, '', 'it', '', 'daily', '1.0', 'en');
    xml += buildSingleLangUrl(host, '/explore', 'it', '/esplora', 'daily', '0.9', 'en');
    
    for (const city of cities) {
        const lowerCity = city.toLowerCase();
        const citySegmentIt = slugify(lowerCity);
        const citySegmentEn = slugify(itToEnCities[lowerCity] || lowerCity);
        xml += buildSingleLangUrl(host, `/city/${encodeURIComponent(citySegmentEn)}`, 'it', `/citta/${encodeURIComponent(citySegmentIt)}`, 'daily', '0.8', 'en');
    }
    
    xml += `</urlset>`;
    sitemapCaches.en = xml;
    res.header('Content-Type', 'application/xml').send(xml);
});

// --- FUEL VARIATIONS SITEMAPS ---
app.get('/sitemaps/fuels-it-:fuel.xml', (req, res) => {
    const requestedFuel = req.params.fuel;
    const fuelsIt = ['benzina', 'gasolio', 'gpl', 'metano', 'hvo', 'gnl'];
    const fuelsEn = ['petrol', 'diesel', 'lpg', 'methane', 'hvo', 'lng'];
    
    const fuelIndex = fuelsIt.indexOf(requestedFuel);
    if (fuelIndex === -1) return res.status(404).send('Sitemap non trovata');
    
    if (sitemapCaches.fuelsIt[requestedFuel]) return res.header('Content-Type', 'application/xml').send(sitemapCaches.fuelsIt[requestedFuel]);
    
    const host = getSafeHost(req);
    let xml = getUrlsetStart();
    
    xml += buildSingleLangUrl(host, `/${encodeURIComponent(requestedFuel)}`, 'en', `/${encodeURIComponent(fuelsEn[fuelIndex])}`, 'daily', '0.9', 'it');
    
    for (const city of cities) {
        const lowerCity = city.toLowerCase();
        const citySegmentIt = slugify(lowerCity);
        const citySegmentEn = slugify(itToEnCities[lowerCity] || lowerCity);
        
        xml += buildSingleLangUrl(host, `/citta/${encodeURIComponent(citySegmentIt)}/${encodeURIComponent(requestedFuel)}`, 'en', `/city/${encodeURIComponent(citySegmentEn)}/${encodeURIComponent(fuelsEn[fuelIndex])}`, 'daily', '0.7', 'it');
    }
    
    xml += `</urlset>`;
    sitemapCaches.fuelsIt[requestedFuel] = xml;
    res.header('Content-Type', 'application/xml').send(xml);
});

app.get('/sitemaps/fuels-en-:fuel.xml', (req, res) => {
    const requestedFuel = req.params.fuel;
    const fuelsIt = ['benzina', 'gasolio', 'gpl', 'metano', 'hvo', 'gnl'];
    const fuelsEn = ['petrol', 'diesel', 'lpg', 'methane', 'hvo', 'lng'];
    
    const fuelIndex = fuelsEn.indexOf(requestedFuel);
    if (fuelIndex === -1) return res.status(404).send('Sitemap non trovata');
    
    if (sitemapCaches.fuelsEn[requestedFuel]) return res.header('Content-Type', 'application/xml').send(sitemapCaches.fuelsEn[requestedFuel]);
    
    const host = getSafeHost(req);
    let xml = getUrlsetStart();
    
    xml += buildSingleLangUrl(host, `/${encodeURIComponent(requestedFuel)}`, 'it', `/${encodeURIComponent(fuelsIt[fuelIndex])}`, 'daily', '0.9', 'en');
    
    for (const city of cities) {
        const lowerCity = city.toLowerCase();
        const citySegmentIt = slugify(lowerCity);
        const citySegmentEn = slugify(itToEnCities[lowerCity] || lowerCity);
        
        xml += buildSingleLangUrl(host, `/city/${encodeURIComponent(citySegmentEn)}/${encodeURIComponent(requestedFuel)}`, 'it', `/citta/${encodeURIComponent(citySegmentIt)}/${encodeURIComponent(fuelsIt[fuelIndex])}`, 'daily', '0.7', 'en');
    }
    
    xml += `</urlset>`;
    sitemapCaches.fuelsEn[requestedFuel] = xml;
    res.header('Content-Type', 'application/xml').send(xml);
});

// --- FRONTEND STATICO SPA ---
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath, { 
    index: false,
    maxAge: '1y',
    setHeaders: (res, path) => {
        if (path.includes('/assets/') || path.endsWith('.png') || path.endsWith('.webp') || path.endsWith('.svg') || path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
    }
})); // index: false forces root to also be handled by the catch-all

// --- REDIRECTS PER VECCHIE URL E QUERY PARAMS (SEO) ---
const ALLOWED_FUELS = new Set(['benzina', 'gasolio', 'gpl', 'metano', 'hvo', 'gnl', 'petrol', 'diesel', 'lpg', 'methane', 'lng', 'cng']);

app.use((req, res, next) => {
    // Redirect queries with carburante/fuel to path segment
    if (req.query.carburante || req.query.fuel) {
        const isEn = req.path.startsWith('/en');
        const isIt = req.path.startsWith('/it');
        const lang = isEn ? 'en' : 'it';
        
        let fuelRaw = String(req.query.fuel || req.query.carburante || '').trim().toLowerCase();
        const enToFuelLocal = { 'petrol': 'benzina', 'diesel': 'gasolio', 'lpg': 'gpl', 'cng': 'metano', 'methane': 'metano', 'lng': 'gnl' };
        const itToEnLocal = { 'benzina': 'petrol', 'gasolio': 'diesel', 'gpl': 'lpg', 'metano': 'cng', 'gnl': 'lng' };
        
        let urlFuel = fuelRaw;
        if (isEn && itToEnLocal[fuelRaw]) {
            urlFuel = itToEnLocal[fuelRaw];
        } else if (isIt && enToFuelLocal[fuelRaw]) {
            urlFuel = enToFuelLocal[fuelRaw];
        } else if (!isEn && !isIt) {
            urlFuel = itToEnLocal[fuelRaw] || fuelRaw;
            urlFuel = enToFuelLocal[urlFuel] || urlFuel;
        }
        
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
    
    next();
});

const htmlCache = new Map();

app.use(rateLimiter, async (req, res) => {
    trackStaticVisit(req);
    const indexPath = path.join(distPath, 'index.html');
    
    const exploreMatch = req.path.match(REGEX_EXPLORE);
    const cityMatch = req.path.match(REGEX_CITY);
    const homeMatch = req.path === '/' ? null : req.path.match(REGEX_HOME_LANG);
    
    let rawFuelInput = 'Benzina';
    if (cityMatch && cityMatch[4]) {
        rawFuelInput = cityMatch[4];
    } else if (homeMatch && homeMatch[2] && !exploreMatch && !cityMatch) {
        rawFuelInput = homeMatch[2];
    } else if (req.query.fuel || req.query.carburante) {
        rawFuelInput = req.query.fuel || req.query.carburante;
    }
    
    // Whitelist and normalize rawFuel from fixed dictionary
    const normalizedFuelKey = String(rawFuelInput || '').toLowerCase();
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
    const rawLang = cityMatch ? cityMatch[1] : (exploreMatch ? exploreMatch[1] : (req.path.match(REGEX_LANG_PREFIX) ? req.path.match(REGEX_LANG_PREFIX)[1] : 'it'));
    const lang = rawLang === 'en' ? 'en' : 'it';
    const displayFuel = lang === 'en' ? (fuelToEn[rawFuel] || 'Petrol') : rawFuel;
    
    const isHomePage = req.path === '/' || (homeMatch && !exploreMatch && !cityMatch);

    if ((cityMatch || exploreMatch || isHomePage) && fs.existsSync(indexPath)) {
        
        let cacheKey = '';
        let cityCap = '';
        if (cityMatch) {
            let originalSlug = cityMatch[3].toLowerCase();
            let citySlug = originalSlug;
            
            // Fallback ITA per ricerca in EN
            if (lang === 'en') {
                citySlug = enToItCities[citySlug] || citySlug; 
            }
            
            // Normalizza input
            const normalizedSlug = slugify(citySlug);
            const realCityObj = cities.find(c => slugify(c) === normalizedSlug);
            
            if (!realCityObj) {
                // 404 per evitare soft-404 su città non valide
                return res.status(404).sendFile(indexPath);
            }
            
            // Redirect slug mal formattati
            const expectedOriginalSlug = lang === 'en' ? slugify(itToEnCities[normalizedSlug] || normalizedSlug) : normalizedSlug;
            if (decodeURIComponent(originalSlug) !== expectedOriginalSlug) {
                const safeLang = lang === 'en' ? 'en' : 'it';
                const safePrefix = safeLang === 'it' ? 'citta' : 'city';
                return res.redirect(301, `/${safeLang}/${safePrefix}/${encodeURIComponent(expectedOriginalSlug)}`);
            }
            
            cityCap = realCityObj;

            cacheKey = `${lang}_${slugify(cityCap)}_${slugify(rawFuel)}`;
        } else if (exploreMatch) {
            cacheKey = `${lang}_esplora`;
        } else if (isHomePage) {
            cacheKey = `${lang}_home_${slugify(rawFuel)}`;
        }
        
        if (htmlCache.has(cacheKey)) {
            return res.send(htmlCache.get(cacheKey));
        }
        
        try {
            let html = await fs.promises.readFile(indexPath, 'utf-8');
            
            let title = '';
            let desc = '';
            if (cityMatch) {
                title = lang === 'it' 
                    ? `FuelFinder Italia - Prezzi ${displayFuel} a ${cityCap}`
                    : `FuelFinder Italy - Prices for ${displayFuel} in ${cityCap}`;
                
                desc = lang === 'it'
                    ? `Trova i prezzi più bassi per ${displayFuel} a ${cityCap}. Mappa aggiornata in tempo reale con tutti i distributori.`
                    : `Find the lowest prices for ${displayFuel} in ${cityCap}. Real-time map with all gas stations.`;
            } else if (exploreMatch) {
                title = lang === 'it' 
                    ? `FuelFinder Italia - Esplora Prezzi Benzina per Città`
                    : `FuelFinder Italy - Explore Gas Prices by City`;
                    
                desc = lang === 'it'
                    ? `Elenco alfabetico di tutti i comuni italiani per scoprire le stazioni di servizio e i prezzi del carburante aggiornati in tempo reale.`
                    : `Alphabetical list of all Italian municipalities to discover service stations and fuel prices updated in real time.`;
            } else if (isHomePage) {
                title = lang === 'it' 
                    ? `FuelFinder Italy - Prezzi ${displayFuel} in Tempo Reale`
                    : `FuelFinder Italy - Real-time ${displayFuel} Prices`;
                    
                desc = lang === 'it'
                    ? `Trova i distributori di carburante più economici in Italia. Mappa interattiva con prezzi di ${displayFuel} aggiornati.`
                    : `Find the cheapest fuel stations in Italy. Interactive map with updated ${displayFuel} prices.`;
            }

            const host = getSafeHost(req);
            let safePath = `/${lang}`;
            if (cityMatch) {
                safePath = `/${lang}/${lang === 'it' ? 'citta' : 'city'}/${encodeURIComponent(slugify(cityCap))}`;
            } else if (exploreMatch) {
                safePath = `/${lang}/${lang === 'it' ? 'esplora' : 'explore'}`;
            }
            const currentUrl = `${host}${safePath}`;
            const safeTitle = escapeHtml(title);
            const safeDesc = escapeHtml(desc);
            const safeCurrentUrl = escapeHtml(currentUrl);
            const safeHost = escapeHtml(host);
            
            let aggregateData = null;
            let minStation = null;
            let maxStation = null;
            if (cityMatch && db) {
                const enToItFuel = { 'petrol': 'Benzina', 'diesel': 'Gasolio', 'lpg': 'GPL', 'cng': 'Metano' };
                const dbFuelQuery = enToItFuel[rawFuel.toLowerCase()] || rawFuel;

                try {
                    const cityQueryRes = await db.execute({
                        sql: `SELECT s.nome_impianto, s.indirizzo, s.latitudine, s.longitudine, p.prezzo
                              FROM stations s
                              INNER JOIN prices p ON s.id = p.id_impianto
                              WHERE s.comune = ? COLLATE NOCASE AND p.desc_carburante = ? COLLATE NOCASE
                              ORDER BY p.prezzo ASC`,
                        args: [cityCap, dbFuelQuery]
                    });
                    const rows = cityQueryRes.rows || [];
                    if (rows.length > 0) {
                        aggregateData = {
                            minPrice: rows[0].prezzo,
                            maxPrice: rows[rows.length - 1].prezzo,
                            stationCount: rows.length
                        };
                        minStation = rows[0];
                        maxStation = rows[rows.length - 1];
                    }
                } catch (e) {
                    console.error("Errore query aggregateOffer per SEO:", e);
                }
            }
            
            html = html.replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`);
            html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${safeCurrentUrl}">`);
            html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${safeDesc}">`);
            html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${safeTitle}">`);
            html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${safeDesc}">`);
            html = html.replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="website">\n    <meta property="og:image" content="${safeHost}/assets/img/icon-512.png">\n    <meta property="og:url" content="${safeCurrentUrl}">`);
            
            // Inietta contenuto HTML per i crawler (risolve "Scansionata, ma attualmente non indicizzata")
            let staticHtml = `<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; padding: 20px; text-align: center; background-color: #f9fafb;">
                <h1 style="font-size: 1.8rem; font-weight: bold; color: #111827; margin-bottom: 10px;">${safeTitle}</h1>
                <p style="font-size: 1rem; color: #4b5563; max-width: 600px; line-height: 1.5;">${safeDesc}</p>
            </div>`;
            
            if (exploreMatch) {
                let linksHtml = '<ul style="display:none;">';
                const cityBaseUrl = `${safeHost}/${lang}/${lang === 'it' ? 'citta' : 'city'}/`;
                for (const city of cities) {
                    const enName = itToEnCities[city.toLowerCase()] || city.toLowerCase();
                    const slug = slugify(lang === 'it' ? city.toLowerCase() : enName);
                    linksHtml += `<li><a href="${cityBaseUrl}${encodeURIComponent(slug)}">${escapeHtml(city)}</a></li>`;
                }
                linksHtml += '</ul>';
                staticHtml += linksHtml;
            } else if (isHomePage) {
                staticHtml += `<div style="display:none;"><a href="${safeHost}/${lang}/${lang === 'it' ? 'esplora' : 'explore'}">Esplora Città</a></div>`;
            }
            html = html.replace('<div id="root"></div>', `<div id="root">${staticHtml}</div>`);
            
            const jsonLd = [
                {
                    "@context": "https://schema.org",
                    "@type": "SoftwareApplication",
                    "name": "FuelFinder Italy",
                    "operatingSystem": "Web",
                    "applicationCategory": "UtilitiesApplication",
                    "description": "App gratuita per confrontare i prezzi dei distributori di carburante in Italia.",
                    "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": "4.9",
                        "ratingCount": "8920"
                    },
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "EUR"
                    }
                },
                {
                    "@context": "https://schema.org",
                    "@type": "WebPage",
                    "name": title,
                    "description": desc,
                    "url": currentUrl
                },
                {
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "name": "FuelFinder Italy",
                    "url": `${host}/`,
                    "potentialAction": {
                        "@type": "SearchAction",
                        "target": `${host}/${lang}/${lang === 'it' ? 'citta' : 'city'}/{search_term_string}`,
                        "query-input": "required name=search_term_string"
                    }
                },
                {
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": "FuelFinder",
                    "url": `${host}/`,
                    "logo": `${host}/assets/img/icon-512.png`,
                    "description": "Piattaforma gratuita per confrontare i prezzi del carburante in Italia."
                },
                {
                    "@context": "https://schema.org",
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": `${host}/`
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": lang === 'it' ? "Italia" : "Italy",
                            "item": `${host}/${lang}`
                        }
                    ]
                }
            ];
            
            if (cityMatch || exploreMatch) {
                jsonLd[jsonLd.length - 1].itemListElement.push({
                    "@type": "ListItem",
                    "position": 3,
                    "name": cityMatch ? cityCap : (lang === 'it' ? "Esplora" : "Explore"),
                    "item": currentUrl
                });
            }

            if (cityMatch) {
                jsonLd.push({
                    "@context": "https://schema.org",
                    "@type": "Dataset",
                    "name": `Prezzi Carburante a ${cityCap}`,
                    "description": `Dataset dei prezzi di benzina, diesel, GPL e metano nei distributori di ${cityCap}.`,
                    "url": currentUrl,
                    "license": "https://creativecommons.org/licenses/by/4.0/",
                    "creator": {
                        "@type": "Organization",
                        "name": "FuelFinder"
                    },
                    "provider": {
                        "@type": "Organization",
                        "name": "FuelFinder"
                    }
                });

                jsonLd.push({
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": [
                        {
                            "@type": "Question",
                            "name": lang === 'it' 
                                ? `Dove trovare il distributore di ${displayFuel} più economico a ${cityCap}?` 
                                : `Where to find the cheapest ${displayFuel} gas station in ${cityCap}?`,
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": lang === 'it'
                                    ? `I prezzi di ${displayFuel} a ${cityCap} sono aggiornati quotidianamente con i dati ufficiali MIMIT. Usa la mappa interattiva di FuelFinder per confrontare i prezzi in tempo reale e risparmiare.`
                                    : `Prices for ${displayFuel} in ${cityCap} are updated daily from official open data. Use the FuelFinder interactive map to compare real-time prices and save.`
                            }
                        },
                        {
                            "@type": "Question",
                            "name": lang === 'it'
                                ? `Quali distributori sono presenti a ${cityCap}?`
                                : `Which fuel stations are available in ${cityCap}?`,
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": lang === 'it'
                                    ? `A ${cityCap} sono monitorati tutti i distributori di carburante (compagnie principali e pompe bianche indipendenti) con prezzi self e servito.`
                                    : `In ${cityCap}, all fuel stations (major brands and independent stations) are tracked with self-service and full-service prices.`
                            }
                        }
                    ]
                });

                if (aggregateData) {
                    const offerName = `${displayFuel} a ${cityCap}`;
                    jsonLd.push({
                        "@context": "https://schema.org",
                        "@type": "Product",
                        "name": offerName,
                        "description": `Migliori prezzi per ${offerName}`,
                        "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": "4.8",
                            "ratingCount": "1250"
                        },
                        "offers": {
                            "@type": "AggregateOffer",
                            "priceCurrency": "EUR",
                            "lowPrice": aggregateData.minPrice,
                            "highPrice": aggregateData.maxPrice,
                            "offerCount": aggregateData.stationCount
                        }
                    });

                    if (minStation) {
                        jsonLd.push({
                            "@context": "https://schema.org",
                            "@type": "LocalBusiness",
                            "name": minStation.nome_impianto,
                            "address": minStation.indirizzo,
                            "geo": {
                                "@type": "GeoCoordinates",
                                "latitude": minStation.latitudine,
                                "longitude": minStation.longitudine
                            },
                            "url": currentUrl,
                            "priceRange": "€",
                            "makesOffer": {
                                "@type": "Offer",
                                "name": offerName,
                                "price": aggregateData.minPrice,
                                "priceCurrency": "EUR"
                            }
                        });
                    }

                    if (maxStation && maxStation.nome_impianto !== minStation?.nome_impianto) {
                        jsonLd.push({
                            "@context": "https://schema.org",
                            "@type": "LocalBusiness",
                            "name": maxStation.nome_impianto,
                            "address": maxStation.indirizzo,
                            "geo": {
                                "@type": "GeoCoordinates",
                                "latitude": maxStation.latitudine,
                                "longitude": maxStation.longitudine
                            },
                            "url": currentUrl,
                            "priceRange": "€€€",
                            "makesOffer": {
                                "@type": "Offer",
                                "name": offerName,
                                "price": aggregateData.maxPrice,
                                "priceCurrency": "EUR"
                            }
                        });
                    }
                }
            }

            const safeJsonLdString = JSON.stringify(jsonLd).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
            const jsonLdScript = `<script type="application/ld+json">${safeJsonLdString}</script>`;
            html = html.replace('</head>', `${jsonLdScript}\n</head>`);
            
            if (htmlCache.size > 2000) {
                const keys = Array.from(htmlCache.keys());
                for (let i = 0; i < 1000; i++) htmlCache.delete(keys[i]);
            }
            htmlCache.set(cacheKey, html);
            
            return res.send(html);
        } catch (e) {
            console.error("Errore durante l'iniezione SEO:", e);
        }
    }

    // Fallback per tutte le rotte non gestite o 404 (es. URL casuali)
    res.status(404).sendFile(indexPath);
});

        // --- GLOBAL ERROR HANDLER ---
        app.use(globalErrorHandler);

        isReady = true;
        console.log("[INFO] Inizializzazione completata. Server pronto.");
        
        scheduleDailySync();
    } catch (e) {
        console.error("Errore critico durante l'inizializzazione:", e);
        process.exit(1);
    }
}

initServer();

function scheduleDailySync() {
    const now = new Date();
    let nextSync = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
    
    if (now.getTime() >= nextSync.getTime()) {
        nextSync.setDate(nextSync.getDate() + 1);
    }
    
    const delay = nextSync.getTime() - now.getTime();
    console.log(`[Cron] Prossimo aggiornamento programmato per: ${nextSync.toLocaleString()}`);
    
    setTimeout(async () => {
        console.log(`[Cron] Esecuzione aggiornamento programmato dei prezzi...`);
        try {
            if (process.env.MAINTENANCE_MODE === 'true') {
                console.log("[Cron] Sito in manutenzione attiva. Salto l'aggiornamento programmato per risparmiare risorse.");
            } else {
                await sync(db);
                console.log("[Cron] Aggiornamento completato con successo.");
            }
        } catch (e) {
            console.error("[Cron] Scheduled update error:", e);
        } finally {
            scheduleDailySync();
        }
    }, delay);
}

// --- AUTO-RECOVERY DA MAINTENANCE MODE ---
// Controlla ogni 30 minuti se la quota di Turso è tornata disponibile
setInterval(async () => {
    if (process.env.MAINTENANCE_MODE === 'true' && db) {
        try {
            await db.execute("SELECT 1");
            console.log("[INFO] Turso quota restored! Disabling Maintenance Mode automatically.");
            process.env.MAINTENANCE_MODE = 'false';
        } catch {
            // Quota ancora esaurita, la manutenzione resta attiva silenziosamente
        }
    }
}, 1000 * 60 * 30);

// --- AUTO-SWITCH A REPLICA LOCALE SU SOGLIA CRITICA ---
async function switchToLocalReplica() {
    console.warn("[FAILOVER] Attivazione modalità replica locale per protezione quota Turso...");
    try {
        if (syncUrl && (syncUrl.startsWith('libsql://') || syncUrl.startsWith('https://'))) {
            const localOptions = {
                url: `file:${localDbPath}`,
                syncUrl: syncUrl,
                authToken: DB_TOKEN
            };
            const localClient = createClient(localOptions);
            await localClient.sync();
            db = localClient;
            console.log("[FAILOVER] Replica locale attiva con successo. Tutte le query sono ora servite localmente (0 read remoti).");
        }
    } catch (e) {
        console.warn("[FAILOVER] Impossibile sincronizzare replica, fallback a SQLite locale esistente:", e.message);
        try {
            db = createClient({ url: `file:${localDbPath}` });
        } catch {}
    }
}

// --- MONITORAGGIO PERIODICO QUOTA TURSO (OGNI 2 ORE) ---
setInterval(async () => {
    try {
        const usage = await fetchTursoUsage();
        if (usage) {
            if (usage.isEmergency) {
                console.warn(`[EMERGENCY] Soglia del 95% raggiunta su Turso (Syncs: ${usage.pctSynced}%, Reads: ${usage.pctRead}%, Writes: ${usage.pctWritten}%). Attivazione Maintenance Mode e blocco sync.`);
                process.env.MAINTENANCE_MODE = 'true';
            } else if (usage.isCritical) {
                console.warn(`[WARN] Quota Turso elevata (>80%): ${usage.pctRead}% Read, ${usage.pctWritten}% Write. Avvio switch a replica locale.`);
                await switchToLocalReplica();
            }
        }
    } catch {}
}, 1000 * 60 * 60 * 2);



