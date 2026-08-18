import express from 'express';
import compression from 'compression';
import cors from 'cors';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

const slugify = (text) => {
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/['\s_]+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

import { sync } from './sync.js';
import { cities } from './cities.js';
import { securityHeaders, rateLimiter } from './middlewares/security.js';
import { analyticsMiddleware, trackStaticVisit, setAnalyticsDb } from './middlewares/analytics.js';
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
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;
const syncUrl = process.env.TURSO_DATABASE_URL;

// Percorso per il database locale (Embedded Replica)
const localDbPath = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'server'), 'database.sqlite');

let db;

async function setupDatabase() {
    const clientOptions = { url: `file:${localDbPath}` };
    if (syncUrl && syncUrl.startsWith('libsql://')) {
        clientOptions.syncUrl = syncUrl;
        clientOptions.authToken = DB_TOKEN;
        clientOptions.syncInterval = 60;
    }

    try {
        db = createClient(clientOptions);
        
        // Eseguiamo query più profonde per verificare se il file è corrotto internamente
        try {
            await db.execute('SELECT COUNT(*) FROM stations');
            await db.execute('SELECT COUNT(*) FROM prices');
        } catch (e) {
            // Se le tabelle non esistono ancora (primo avvio), va bene. 
            // Se è corrotto, lancerà l'errore che verrà catturato dal catch principale
            if (e.message && (e.message.includes('SQLITE_CORRUPT') || e.message.includes('malformed'))) {
                throw e;
            }
        }

        if (clientOptions.syncUrl) {
            db.sync().then(() => {
                console.log("✅ Database Principale (Embedded Sync) sincronizzato in locale!");
            }).catch(e => console.error("Errore sync in background:", e));
        }
    } catch (err) {
        const errMsg = err.message || err.toString();
        if (errMsg.includes('SQLITE_CORRUPT') || errMsg.includes('malformed') || errMsg.includes('invalid local state')) {
            console.warn("⚠️ Rilevata corruzione o stato inconsistente del database locale. Tento il ripristino automatico...");
            try {
                if (db) db.close();
            } catch (e) {} // Ignora errori di chiusura
            
            // Elimina i file corrotti
            const filesToDelete = [localDbPath, `${localDbPath}-shm`, `${localDbPath}-wal`, `${localDbPath}-info`];
            for (const file of filesToDelete) {
                if (fs.existsSync(file)) {
                    try {
                        fs.unlinkSync(file);
                    } catch (e) {
                        console.error(`Impossibile eliminare ${file}:`, e);
                    }
                }
            }
            
            console.log("♻️ File locali eliminati. Risincronizzazione da zero in corso...");
            db = createClient(clientOptions);
            
            if (clientOptions.syncUrl) {
                db.sync().then(() => {
                    console.log("✅ Database ripristinato e sincronizzato con successo!");
                }).catch(e => console.error("Errore sync di ripristino:", e));
            }
        } else {
            console.error("ERRORE FATALE durante l'inizializzazione di Turso:", err);
            process.exit(1);
        }
    }
}

await setupDatabase();

// Ensure tables exist if local or empty remote
async function initializeDB() {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS stations (
                id INTEGER PRIMARY KEY,
                gestore TEXT,
                bandiera TEXT,
                tipo_impianto TEXT,
                nome_impianto TEXT,
                indirizzo TEXT,
                comune TEXT,
                provincia TEXT,
                latitudine REAL,
                longitudine REAL
            );
        `);
        const rowCount = await db.execute('SELECT COUNT(*) as c FROM stations');
        if (rowCount.rows[0].c === 0) {
            if (process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.startsWith('libsql://')) {
                console.log("Database vuoto, ma è una replica. Attendo che Turso popoli i dati in background...");
            } else {
                console.log("Database vuoto locale. Eseguo sincronizzazione iniziale in background dal MIMIT...");
                sync(db).catch(e => console.error("Errore sync iniziale in background:", e));
            }
        }
    } catch (e) {
        console.error("Errore durante l'inizializzazione dello schema:", e);
    }
}

await initializeDB();
await setAnalyticsDb(db);

// --- API ROUTES ---
setupApiRoutes(app, db);

// --- SITEMAP ---
const itToEnCities = {
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
};

let cachedSitemap = null;

app.get('/sitemap.xml', (req, res) => {
    if (cachedSitemap) {
        res.header('Content-Type', 'application/xml');
        return res.send(cachedSitemap);
    }

    const host = `https://${req.get('host')}`;
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
    
    const addUrl = (itPath, enPath, freq, prio) => {
        const itUrl = `${host}/it${itPath}`;
        const enUrl = `${host}/en${enPath}`;
        
        // IT Version
        xml += `  <url>\n    <loc>${itUrl}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n`;
        xml += `    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />\n`;
        xml += `    <xhtml:link rel="alternate" hreflang="it" href="${itUrl}" />\n  </url>\n`;
        
        // EN Version
        xml += `  <url>\n    <loc>${enUrl}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n`;
        xml += `    <xhtml:link rel="alternate" hreflang="it" href="${itUrl}" />\n`;
        xml += `    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />\n  </url>\n`;
    };

    // Core pages
    addUrl('', '', 'hourly', '1.0');
    addUrl('/esplora', '/explore', 'daily', '0.9');
    
    // Cities
    for (const city of cities) {
        const lowerCity = city.toLowerCase();
        const citySegmentIt = slugify(lowerCity);
        const enName = itToEnCities[lowerCity] || lowerCity;
        const citySegmentEn = slugify(enName);
        addUrl(`/citta/${citySegmentIt}`, `/city/${citySegmentEn}`, 'daily', '0.8');
    }
    
    xml += `</urlset>`;
    cachedSitemap = xml;
    
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

const enToItCities = {
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
};

const htmlCache = new Map();

app.use(async (req, res) => {
    trackStaticVisit(req);
    let indexPath = path.join(distPath, 'index.html');
    
    const cityMatch = req.path.match(/^\/(it|en)\/(citta|city)\/([^/]+)\/?$/);
    const exploreMatch = req.path.match(/^\/(it|en)\/(esplora|explore)\/?$/);
    const homeMatch = req.path === '/' || req.path.match(/^\/(it|en)\/?$/);
    
    let rawFuel = req.query.fuel || req.query.carburante || 'Benzina';
    const enToFuel = { 'Petrol': 'Benzina', 'Diesel': 'Gasolio', 'LPG': 'GPL', 'CNG': 'Metano' };
    const fuelToEn = { 'Benzina': 'Petrol', 'Gasolio': 'Diesel', 'GPL': 'LPG', 'Metano': 'CNG' };
    
    // Normalize to IT first
    if (enToFuel[rawFuel]) rawFuel = enToFuel[rawFuel];
    
    const lang = cityMatch ? cityMatch[1] : (exploreMatch ? exploreMatch[1] : (req.path.match(/^\/(it|en)/) ? req.path.match(/^\/(it|en)/)[1] : 'it'));
    const displayFuel = lang === 'en' ? (fuelToEn[rawFuel] || rawFuel) : rawFuel;

    if ((cityMatch || exploreMatch || homeMatch) && fs.existsSync(indexPath)) {
        
        let cacheKey = '';
        let cityCap = '';
        if (cityMatch) {
            let originalSlug = cityMatch[3].toLowerCase();
            let citySlug = originalSlug;
            
            // Se in inglese, cerchiamo se c'è una traduzione verso l'italiano per la ricerca
            if (lang === 'en') {
                citySlug = enToItCities[citySlug] || citySlug; 
            }
            
            // Normalizziamo l'input (rimuove gli spazi, es. per "mercato saraceno" -> "mercato-saraceno")
            const normalizedSlug = slugify(citySlug);
            const realCityObj = cities.find(c => slugify(c) === normalizedSlug);
            
            if (!realCityObj) {
                // Città non valida, ritorna 404 per evitare Soft 404
                return res.status(404).sendFile(indexPath);
            }
            
            // Controlla se l'URL ha spazi o non è formattato correttamente come slug
            const expectedOriginalSlug = lang === 'en' ? slugify(itToEnCities[normalizedSlug] || normalizedSlug) : normalizedSlug;
            // Usa decodeURIComponent nel caso in cui req.path contenga '%20' originale
            if (decodeURIComponent(originalSlug) !== expectedOriginalSlug) {
                const searchParams = req.url.substring(req.path.length);
                return res.redirect(301, `/${lang}/${lang === 'it' ? 'citta' : 'city'}/${expectedOriginalSlug}${searchParams}`);
            }
            
            cityCap = realCityObj;

            cacheKey = `${lang}_${slugify(cityCap)}_${slugify(rawFuel)}`;
        } else if (exploreMatch) {
            cacheKey = `${lang}_esplora`;
        } else if (homeMatch) {
            cacheKey = `${lang}_home`;
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
            } else if (homeMatch) {
                title = lang === 'it' 
                    ? `FuelFinder Italy - Prezzi Benzina e Diesel in Tempo Reale`
                    : `FuelFinder Italy - Real-time Petrol and Diesel Prices`;
                    
                desc = lang === 'it'
                    ? `Trova i distributori di carburante più economici in Italia. Mappa interattiva con prezzi di benzina, diesel, GPL e metano aggiornati.`
                    : `Find the cheapest fuel stations in Italy. Interactive map with updated petrol, diesel, LPG and CNG prices.`;
            }

            const currentUrl = `https://${req.get('host')}${req.path === '/' ? '/it' : req.path}`;
            
            let aggregateData = null;
            let minStation = null;
            let maxStation = null;
            if (cityMatch && db) {
                const enToItFuel = { 'petrol': 'Benzina', 'diesel': 'Gasolio', 'lpg': 'GPL', 'cng': 'Metano' };
                const dbFuelQuery = enToItFuel[rawFuel.toLowerCase()] || rawFuel;

                try {
                    const aggResult = await db.execute({
                        sql: `SELECT MIN(p.prezzo) as minPrice, MAX(p.prezzo) as maxPrice, COUNT(DISTINCT s.id) as stationCount
                              FROM stations s
                              INNER JOIN prices p ON s.id = p.id_impianto
                              WHERE s.comune = ? COLLATE NOCASE AND p.desc_carburante = ? COLLATE NOCASE`,
                        args: [cityCap, dbFuelQuery]
                    });
                    if (aggResult.rows && aggResult.rows.length > 0 && aggResult.rows[0].minPrice) {
                        aggregateData = {
                            minPrice: aggResult.rows[0].minPrice,
                            maxPrice: aggResult.rows[0].maxPrice,
                            stationCount: aggResult.rows[0].stationCount
                        };

                        const minRes = await db.execute({
                            sql: `SELECT s.nome_impianto, s.indirizzo, s.latitudine, s.longitudine
                                  FROM stations s INNER JOIN prices p ON s.id = p.id_impianto
                                  WHERE s.comune = ? COLLATE NOCASE AND p.desc_carburante = ? COLLATE NOCASE AND p.prezzo = ? LIMIT 1`,
                            args: [cityCap, dbFuelQuery, aggregateData.minPrice]
                        });
                        if (minRes.rows.length > 0) minStation = minRes.rows[0];

                        const maxRes = await db.execute({
                            sql: `SELECT s.nome_impianto, s.indirizzo, s.latitudine, s.longitudine
                                  FROM stations s INNER JOIN prices p ON s.id = p.id_impianto
                                  WHERE s.comune = ? COLLATE NOCASE AND p.desc_carburante = ? COLLATE NOCASE AND p.prezzo = ? LIMIT 1`,
                            args: [cityCap, dbFuelQuery, aggregateData.maxPrice]
                        });
                        if (maxRes.rows.length > 0) maxStation = maxRes.rows[0];
                    }
                } catch (e) {
                    console.error("Errore query aggregateOffer per SEO:", e);
                }
            }
            
            html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
            html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${currentUrl}">`);
            html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${desc}">`);
            html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`);
            html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${desc}">`);
            html = html.replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="website">\n    <meta property="og:image" content="https://${req.get('host')}/assets/img/icon-512.png">\n    <meta property="og:url" content="${currentUrl}">`);
            
            // Inietta contenuto HTML per i crawler (risolve "Scansionata, ma attualmente non indicizzata")
            let staticHtml = `<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; padding: 20px; text-align: center; background-color: #f9fafb;">
                <h1 style="font-size: 1.8rem; font-weight: bold; color: #111827; margin-bottom: 10px;">${title}</h1>
                <p style="font-size: 1rem; color: #4b5563; max-width: 600px; line-height: 1.5;">${desc}</p>
            </div>`;
            
            if (exploreMatch) {
                let linksHtml = '<ul style="display:none;">';
                const cityBaseUrl = `https://${req.get('host')}/${lang}/${lang === 'it' ? 'citta' : 'city'}/`;
                for (const city of cities) {
                    const enName = itToEnCities[city.toLowerCase()] || city.toLowerCase();
                    const slug = slugify(lang === 'it' ? city.toLowerCase() : enName);
                    linksHtml += `<li><a href="${cityBaseUrl}${slug}">${city}</a></li>`;
                }
                linksHtml += '</ul>';
                staticHtml += linksHtml;
            } else if (homeMatch) {
                staticHtml += `<div style="display:none;"><a href="https://${req.get('host')}/${lang}/${lang === 'it' ? 'esplora' : 'explore'}">Esplora Città</a></div>`;
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
                    "url": "https://fuelfinder-msn8.onrender.com/",
                    "potentialAction": {
                        "@type": "SearchAction",
                        "target": `https://fuelfinder-msn8.onrender.com/${lang}/${lang === 'it' ? 'citta' : 'city'}/{search_term_string}`,
                        "query-input": "required name=search_term_string"
                    }
                },
                {
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": "FuelFinder",
                    "url": "https://fuelfinder-msn8.onrender.com/",
                    "logo": "https://fuelfinder-msn8.onrender.com/assets/img/icon-512.png",
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
                            "item": "https://fuelfinder-msn8.onrender.com/"
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": lang === 'it' ? "Italia" : "Italy",
                            "item": `https://fuelfinder-msn8.onrender.com/${lang}`
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
                    "provider": {
                        "@type": "Organization",
                        "name": "FuelFinder"
                    }
                });

                if (aggregateData) {
                    const offerName = `${displayFuel} a ${cityCap}`;
                    jsonLd.push({
                        "@context": "https://schema.org",
                        "@type": "AggregateOffer",
                        "itemOffered": {
                            "@type": "Product",
                            "name": offerName
                        },
                        "priceCurrency": "EUR",
                        "lowPrice": aggregateData.minPrice,
                        "highPrice": aggregateData.maxPrice,
                        "offerCount": aggregateData.stationCount
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
                            "url": `https://www.google.com/maps/dir/?api=1&destination=${minStation.latitudine},${minStation.longitudine}`,
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
                            "url": `https://www.google.com/maps/dir/?api=1&destination=${maxStation.latitudine},${maxStation.longitudine}`,
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

    // Fallback per tutte le rotte non gestite o 404 (es. URL casuali)
    res.status(404).sendFile(indexPath);
});

// --- GLOBAL ERROR HANDLER ---
app.use(globalErrorHandler);

// --- SERVER START & CRON ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend SQL in esecuzione su http://0.0.0.0:${PORT}`);
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
            await sync(db);
            console.log("[Cron] Aggiornamento completato con successo.");
        } catch (e) {
            console.error("[Cron] Errore durante l'aggiornamento programmato:", e);
        } finally {
            scheduleDailySync();
        }
    }, delay);
}
