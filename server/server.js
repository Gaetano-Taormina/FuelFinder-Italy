/* oxlint-disable no-console */
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';
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
app.use(cors());
app.use(express.json());
app.use(timeoutMiddleware(10000));
app.use(securityHeaders);
app.use(rateLimiter);
app.use(analyticsMiddleware);

// 5. Database Initialization
const localDbPath = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'server'), 'database.sqlite');
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
    console.group('🚀 FuelFinder Italy Server');
    console.info(`Status: Starting up (Port: ${PORT})`);
    console.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.groupEnd();
});

async function setupDatabase(forceDownload = false) {
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

// 6. Asynchronous Server Init & Route Binding
async function initServer() {
    try {
        await setupDatabase();
        await setAnalyticsDb(db);

        // --- REST API ROUTES ---
        setupApiRoutes(app, db);

        // --- SITEMAPS (XML) ---
        setupSitemapRoutes(app);

        // --- FRONTEND STATIC ASSETS ---
        const distPath = path.join(process.cwd(), 'dist');
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

        // --- SEO REDIRECTS ---
        app.use(seoRedirectMiddleware);

        // --- SSR DYNAMIC HTML & SPA FALLBACK ---
        setupSsrRoutes(app, () => db);

        // --- GLOBAL ERROR HANDLER ---
        app.use(globalErrorHandler);

        isReady = true;
        console.info("✨ [Ready] All subsystems initialized. Server accepting requests.");

        scheduleDailySync();
    } catch (e) {
        console.error("❌ [FATAL] Critical error during initialization:", e);
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
    console.info(`⏰ [Cron] Next automatic daily price sync scheduled for: ${nextSync.toLocaleString()}`);

    setTimeout(async () => {
        console.group('⏰ [Cron] Executing Scheduled Price Update');
        try {
            if (process.env.MAINTENANCE_MODE === 'true') {
                console.warn("Maintenance mode active: skipping scheduled sync.");
            } else {
                await sync(db);
                console.info("Scheduled update completed successfully.");
            }
        } catch (e) {
            console.error("Scheduled update error:", e);
        } finally {
            console.groupEnd();
            scheduleDailySync();
        }
    }, delay);
}
