/* oxlint-disable no-console */
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

import { createClient } from '@libsql/client';

import { modernCompression } from './middlewares/modernCompression.js';
import { securityHeaders, rateLimiter } from './middlewares/security.js';
import { analyticsMiddleware, setAnalyticsDb } from './middlewares/analytics.js';
import { globalErrorHandler } from './middlewares/errorHandler.js';
import { timeoutMiddleware } from './middlewares/timeout.js';
import { createHealthcheckMiddleware } from './middlewares/healthcheck.js';
import { maintenanceMiddleware } from './middlewares/maintenance.js';
import { createInitBlockerMiddleware } from './middlewares/initBlocker.js';
import { seoRedirectMiddleware } from './middlewares/seoRedirect.js';

import { setupApiRoutes } from './routes/api.js';
import { setupSitemapRoutes } from './routes/sitemaps.js';
import { setupSsrRoutes } from './routes/ssr.js';
import { sitemapService } from './services/sitemapService.js';
import { StationRepository } from './repositories/stationRepository.js';
import { slugify } from './utils/seoHelpers.js';

import { downloadDatabase } from './services/dbDownloadService.js';
import { sync } from './sync/index.js';

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
    console.warn("[WARN] SIGTERM received. Shutting down gracefully...");
    process.exit(0);
});

process.on('SIGINT', () => {
    console.warn('[WARN] SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

let isReady = false;
let db = null;

const app = express();
app.set('trust proxy', 1);

// 0. Domain Migration: Immediate 301 Redirect for legacy domain (fuelfinder-msn8)
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
    if (process.env.MIGRATION_REDIRECTOR === 'true' || host.includes('fuelfinder-msn8')) {
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
    next();
});

// 1. Healthcheck & Recovery (Render, LB probing)
app.use(createHealthcheckMiddleware({
    isReadyGetter: () => isReady,
    onRecover: () => {
        isReady = false;
        setupDatabase().then(() => {
            console.info("♻️ [Healthcheck] DB reinitialized after manual recovery request.");
        }).catch(e => console.error("❌ [Healthcheck Recovery Error]", e));
    }
}));

// 2. Maintenance Mode (503 SEO-friendly)
app.use(maintenanceMiddleware);

// 3. Init blocker for API requests
app.use(createInitBlockerMiddleware(() => isReady));

// 4. Global Middlewares
app.use(modernCompression());

const ALLOWED_ORIGINS = [
    'https://fuelfinder-italia.onrender.com',
    'https://fuelfinder-msn8.onrender.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3001'
];

if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*') {
    process.env.CORS_ORIGIN.split(',').forEach((o) => {
        const trimmed = o.trim();
        if (trimmed && !ALLOWED_ORIGINS.includes(trimmed)) {
            ALLOWED_ORIGINS.push(trimmed);
        }
    });
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy: Origin not allowed.'));
    },
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match']
}));
app.use(express.json());
app.use(timeoutMiddleware());
app.use(securityHeaders);
app.use(rateLimiter);
app.use(analyticsMiddleware);

// 5. Database Initialization
const localDbPath = path.join(process.env.DATA_DIR || __dirname, 'database.sqlite');
const PORT = Number(process.env.PORT || process.env.SERVER_PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.group('🚀 FuelFinder Italy Server');
    console.info(`Status: Starting up (Host: ${HOST}, Port: ${PORT})`);
    console.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.groupEnd();
});

async function setupDatabase(forceDownload = false) {
    if (process.env.MIGRATION_REDIRECTOR === 'true') {
        console.info('⏩ [Migration Redirector] Skipping SQLite database download and initialization.');
        return;
    }
    if (process.env.DB_DOWNLOAD_URL) {
        console.group('📥 Remote Database Download');
        console.info(`Source: ${process.env.DB_DOWNLOAD_URL}`);
        const force = forceDownload || process.env.FORCE_DB_DOWNLOAD === 'true';
        const dlResult = await downloadDatabase({
            url: process.env.DB_DOWNLOAD_URL,
            targetPath: localDbPath,
            force
        });
        if (!dlResult.success && !fs.existsSync(localDbPath)) {
            console.error(`❌ Could not download initial SQLite database: ${dlResult.error}`);
            console.groupEnd();
            process.exit(1);
        }
        console.groupEnd();
    }

    try {
        db = createClient({ url: `file:${localDbPath}` });
        await db.execute('SELECT 1');
        console.info(`🗄️ Database: Local SQLite snapshot ready at ${localDbPath}`);
    } catch (err) {
        console.error("❌ [FATAL] Database initialization error:", err);
        process.exit(1);
    }
}

let ssrController = null;

// 6. Asynchronous Server Init & Route Binding
async function initServer() {
    try {
        if (process.env.MIGRATION_REDIRECTOR === 'true') {
            isReady = true;
            console.info("✨ [Migration Redirector] Ready. Redirecting all incoming traffic to https://fuelfinder-italia.onrender.com");
            return;
        }
        await setupDatabase();
        await setAnalyticsDb(db);

        // --- REST API ROUTES ---
        setupApiRoutes(app, db);

        // --- SITEMAPS (XML) ---
        setupSitemapRoutes(app);

        // --- FRONTEND STATIC ASSETS (Se presenti in locale o container condiviso) ---
        const clientDistPath = path.join(process.cwd(), 'client', 'dist');
        const rootDistPath = path.join(process.cwd(), 'dist');
        const distPath = fs.existsSync(clientDistPath) ? clientDistPath : rootDistPath;

        if (fs.existsSync(distPath)) {
            app.use(express.static(distPath, {
                index: false,
                maxAge: '1y',
                setHeaders: (res, filePath) => {
                    if (filePath.includes('/assets/') || filePath.endsWith('.png') || filePath.endsWith('.webp') || filePath.endsWith('.svg') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
                        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                    } else {
                        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
                    }
                }
            }));
        }

        // --- SEO REDIRECTS ---
        app.use(seoRedirectMiddleware);

        // --- SSR DYNAMIC HTML & SPA FALLBACK ---
        ssrController = setupSsrRoutes(app, () => db);

        // --- GLOBAL ERROR HANDLER ---
        app.use(globalErrorHandler);

        // --- SITEMAP PRE-FILTERING (CRAWL BUDGET OPTIMIZATION) ---
        if (db) {
            try {
                const repo = new StationRepository(db);
                const activeCombos = await repo.getActiveCityFuelCombinations();
                const activeCityFuels = new Set();
                const activeCities = new Set();
                for (const row of activeCombos) {
                    if (row.comune) {
                        const citySlug = slugify(row.comune);
                        activeCities.add(citySlug);
                        if (row.fuel) {
                            activeCityFuels.add(`${citySlug}_${slugify(row.fuel)}`);
                        }
                    }
                }
                sitemapService.setActiveCities(activeCities);
                sitemapService.setActiveCityFuels(activeCityFuels);
                console.info(`🗺️ Sitemaps: Pre-filtered ${activeCities.size} cities and ${activeCityFuels.size} active fuel routes`);
            } catch (err) {
                console.warn('⚠️ Could not pre-filter sitemaps:', err.message);
            }
        }

        isReady = true;
        console.info("✨ [Ready] All subsystems initialized. Server accepting requests.");

        scheduleDailySync();
        scheduleKeepAliveHeartbeat(PORT);
    } catch (e) {
        console.error("❌ [FATAL] Critical error during initialization:", e);
        process.exit(1);
    }
}

initServer();

function scheduleKeepAliveHeartbeat(port) {
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_HEARTBEAT !== 'true') {
        return;
    }
    const intervalMs = 10 * 60 * 1000; // 10 minuti
    setInterval(() => {
        const pingUrl = process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:${port}`;
        fetch(`${pingUrl}/healthz`).catch(() => {});
    }, intervalMs).unref();
}

function scheduleDailySync() {
    const now = new Date();
    let nextSync = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);

    if (now.getTime() >= nextSync.getTime()) {
        nextSync.setDate(nextSync.getDate() + 1);
    }

    const delay = nextSync.getTime() - now.getTime();
    console.info(`⏰ [Cron] Next automatic daily price sync scheduled for: ${nextSync.toLocaleString()}`);

    setTimeout(async () => {
        console.group('⏰ [Cron] Executing Scheduled Price Update');
        try {
            if (process.env.MAINTENANCE_MODE === 'true') {
                console.warn("Maintenance mode active: skipping scheduled sync.");
            } else {
                await sync(db);
                sitemapService.clearCache();
                if (ssrController) ssrController.clearCache();
                console.info("Scheduled update completed successfully (Sitemap and SSR caches invalidated).");
            }
        } catch (e) {
            console.error("Scheduled update error:", e);
        } finally {
            console.groupEnd();
            scheduleDailySync();
        }
    }, delay);
}
