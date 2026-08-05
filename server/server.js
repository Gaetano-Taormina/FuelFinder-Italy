import express from 'express';
import compression from 'compression';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

import { sync } from './sync.js';
import { cities } from './cities.js';
import { securityHeaders, rateLimiter } from './middlewares/security.js';
import { analyticsMiddleware, trackStaticVisit } from './middlewares/analytics.js';
import { globalErrorHandler } from './middlewares/errorHandler.js';
import { timeoutMiddleware } from './middlewares/timeout.js';
import { setupApiRoutes } from './routes/api.js';

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(timeoutMiddleware(10000)); // 10 secondi di timeout globale

// --- SICUREZZA ---
app.use(securityHeaders);
app.use(rateLimiter);

// --- ANALYTICS ---
app.use(analyticsMiddleware);

// --- DATABASE INIZIALIZZAZIONE ---
const DB_PATH = path.join(process.cwd(), 'server', 'database.sqlite');
const TEMP_DB_PATH = path.join(process.cwd(), 'server', 'database_temp.sqlite');
let db;

async function performSyncAndSwap() {
    await sync();
    
    // Inizia la sostituzione bloccante (Blue-Green DB Swap)
    if (db) db.close();
    
    if (fs.existsSync(DB_PATH)) {
        try {
            fs.unlinkSync(DB_PATH);
        } catch (e) {
            console.warn("Attenzione: impossibile eliminare il vecchio DB prima del rename.", e.message);
        }
    }
    
    fs.renameSync(TEMP_DB_PATH, DB_PATH);
    
    db = new Database(DB_PATH, { readonly: true });
    db.pragma('cache_size = -32000'); 
    db.pragma('mmap_size = 536870912');
}

if (!fs.existsSync(DB_PATH)) {
    console.log("Database non trovato. Eseguo sincronizzazione iniziale...");
    try {
        await performSyncAndSwap(); 
    } catch (e) {
        console.error("Errore durante sync iniziale:", e);
    }
} else {
    try {
        db = new Database(DB_PATH, { readonly: true });
        db.pragma('cache_size = -32000'); 
        db.pragma('mmap_size = 536870912'); 
    } catch (err) {
        console.error("ERRORE FATALE durante l'apertura del database:", err);
        process.exit(1);
    }
}

// --- API ROUTES ---
setupApiRoutes(app, db);

// --- SITEMAP ---
app.get('/sitemap.xml', (req, res) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <url>\n    <loc>https://${req.get('host')}/it</loc>\n    <changefreq>hourly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    
    for (const city of cities) {
        xml += `  <url>\n    <loc>https://${req.get('host')}/it/citta/${encodeURIComponent(city.toLowerCase())}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }
    xml += `</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(xml);
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

const htmlCache = new Map();

app.use(async (req, res) => {
    trackStaticVisit(req);
    let indexPath = path.join(distPath, 'index.html');
    
    const cityMatch = req.path.match(/^\/(it|en)\/citta\/([^\/]+)\/?$/);
    
    if (cityMatch && fs.existsSync(indexPath)) {
        const lang = cityMatch[1];
        const cityRaw = decodeURIComponent(cityMatch[2]);
        const cityCap = cityRaw.charAt(0).toUpperCase() + cityRaw.slice(1).toLowerCase();
        const cacheKey = `${lang}_${cityCap}`;
        
        if (htmlCache.has(cacheKey)) {
            return res.send(htmlCache.get(cacheKey));
        }
        
        try {
            let html = await fs.promises.readFile(indexPath, 'utf-8');
            
            const title = lang === 'it' 
                ? `Prezzi Benzina e Diesel a ${cityCap} - FuelFinder`
                : `Petrol and Diesel Prices in ${cityCap} - FuelFinder`;
                
            const desc = lang === 'it'
                ? `Trova i distributori di benzina, diesel, GPL e metano più economici a ${cityCap}. Mappa interattiva con prezzi sempre aggiornati.`
                : `Find the cheapest petrol, diesel, LPG and CNG stations in ${cityCap}. Interactive map with real-time fuel prices.`;

            html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
            html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${desc}">`);
            html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`);
            html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${desc}">`);
            html = html.replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="website">\n    <meta property="og:image" content="https://${req.get('host')}/assets/img/icon-512.png">`);
            
            const jsonLd = {
                "@context": "https://schema.org",
                "@type": "Service",
                "name": title,
                "description": desc,
                "url": `https://${req.get('host')}${req.originalUrl}`,
                "areaServed": {
                    "@type": "City",
                    "name": cityCap
                }
            };
            const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
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

    res.sendFile(indexPath);
});

// --- GLOBAL ERROR HANDLER ---
app.use(globalErrorHandler);

// --- SERVER START & CRON ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend SQL in esecuzione su http://localhost:${PORT}`);
    scheduleDailySync();
});

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
            await performSyncAndSwap();
            console.log("[Cron] Aggiornamento completato con successo.");
        } catch (e) {
            console.error("[Cron] Errore durante l'aggiornamento programmato:", e);
        } finally {
            scheduleDailySync();
        }
    }, delay);
}
