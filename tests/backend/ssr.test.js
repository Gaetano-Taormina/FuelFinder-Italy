/* oxlint-disable no-console */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import { setupSsrRoutes } from '../../server/routes/ssr.js';
import { seoRedirectMiddleware } from '../../server/middlewares/seoRedirect.js';
import { SsrController } from '../../server/controllers/ssrController.js';

describe('SSR Routes & Controller & SEO Redirects', () => {
    let app;
    let db;
    let distDir;
    let indexPath;

    beforeAll(async () => {
        distDir = path.join(process.cwd(), 'dist');
        indexPath = path.join(distDir, 'index.html');
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }
        if (!fs.existsSync(indexPath)) {
            fs.writeFileSync(indexPath, `<!DOCTYPE html><html><head><title>FuelFinder</title><link rel="canonical" href="old"><meta name="description" content="old"></head><body><div id="root"></div></body></html>`, 'utf-8');
        }

        db = createClient({ url: 'file::memory:' });
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
        await db.execute(`
            CREATE TABLE IF NOT EXISTS prices (
                id_impianto INTEGER,
                desc_carburante TEXT,
                prezzo REAL,
                is_self INTEGER,
                dt_comunicazione TEXT,
                UNIQUE(id_impianto, desc_carburante, is_self)
            );
        `);
        await db.execute({
            sql: `INSERT INTO stations VALUES (1, 'Eni', 'Eni', 'Stradale', 'Eni Roma', 'Via Roma 1', 'Roma', 'RM', 41.9, 12.5)`,
            args: []
        });
        await db.execute({
            sql: `INSERT INTO prices VALUES (1, 'Benzina', 1.799, 1, '2026-03-01 10:00:00')`,
            args: []
        });

        app = express();
        app.use(seoRedirectMiddleware);
        setupSsrRoutes(app, () => db);
    });

    it('redirects old query parameters and legacy URLs', async () => {
        const resQuery = await request(app).get('/?fuel=diesel');
        expect(resQuery.status).toBe(301);
        expect(resQuery.headers.location).toContain('/it/gasolio');

        const resCity = await request(app).get('/citta/roma');
        expect(resCity.status).toBe(301);
        expect(resCity.headers.location).toBe('/it/citta/roma');

        const resExplore = await request(app).get('/esplora');
        expect(resExplore.status).toBe(301);
        expect(resExplore.headers.location).toBe('/it/esplora');
    });

    it('renders home page with injected SEO metadata and caches response', async () => {
        const res1 = await request(app).get('/');
        expect(res1.status).toBe(200);
        expect(res1.text).toContain('<title>FuelFinder Italy - Prezzi Benzina in Tempo Reale</title>');
        expect(res1.text).toContain('<div id="root">');

        // Test cached response
        const resCached = await request(app).get('/');
        expect(resCached.status).toBe(200);
        expect(resCached.text).toBe(res1.text);
    });

    it('renders explore page with alphabetized city links', async () => {
        const res = await request(app).get('/it/esplora');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Esplora Prezzi Benzina per Città');
    });

    it('renders city page with DB prices and JSON-LD schema', async () => {
        const res = await request(app).get('/it/citta/roma');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Prezzi Benzina a Roma');
        expect(res.text).toContain('application/ld+json');
    });

    it('renders English city page and translates fuel/city correctly', async () => {
        const res = await request(app).get('/en/city/rome/petrol');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Prices for Petrol in Roma');
    });

    it('returns 404 for invalid cities', async () => {
        const res = await request(app).get('/it/citta/citta-totalmente-inventata-xyz');
        expect(res.status).toBe(404);
    });

    it('redirects misformatted city slugs to canonical slug', async () => {
        const res = await request(app).get('/en/city/roma');
        expect(res.status).toBe(301);
        expect(res.headers.location).toBe('/en/city/rome');

        const resIt = await request(app).get('/it/citta/ROMA');
        expect(resIt.status).toBe(301);
        expect(resIt.headers.location).toBe('/it/citta/roma');
    });

    it('renders English explore page correctly', async () => {
        const res = await request(app).get('/en/explore');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Explore Gas Prices by City');
    });

    it('returns 404 for unhandled arbitrary routes', async () => {
        const res = await request(app).get('/unhandled/random/path');
        expect(res.status).toBe(404);
    });

    it('renders station detail page with noindex robots tag and rich schema', async () => {
        const res = await request(app).get('/it/citta/roma/stazione/1/benzina');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Prezzi Benzina - Eni Roma (Roma)');
        expect(res.text).toContain('name="robots" content="noindex, follow"');
        expect(res.text).toContain('"@type":"GasStation"');
        expect(res.text).toContain('Eni Roma');
    });

    it('renders English station detail page correctly', async () => {
        const res = await request(app).get('/en/city/rome/station/1/petrol');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Prices for Petrol - Eni Roma (Roma)');
        expect(res.text).toContain('name="robots" content="noindex, follow"');
        expect(res.text).toContain('"@type":"GasStation"');
    });

    it('returns 404 for non-existent station ID in SSR', async () => {
        const res = await request(app).get('/it/citta/roma/stazione/999999/benzina');
        expect(res.status).toBe(404);
    });

    it('redirects queries with fuel parameter correctly across languages and routes', async () => {
        // EN with Italian fuel
        const resEn = await request(app).get('/en?fuel=benzina');
        expect(resEn.status).toBe(301);
        expect(resEn.headers.location).toBe('/en/petrol');

        // IT with English fuel
        const resIt = await request(app).get('/it?fuel=diesel');
        expect(resIt.status).toBe(301);
        expect(resIt.headers.location).toBe('/it/gasolio');

        // Root without lang prefix
        const resRoot = await request(app).get('/?carburante=benzina');
        expect(resRoot.status).toBe(301);
        expect(resRoot.headers.location).toBe('/it/benzina');

        // Unknown fuel fallback
        const resUnknownEn = await request(app).get('/en?fuel=unknown_fuel');
        expect(resUnknownEn.status).toBe(301);
        expect(resUnknownEn.headers.location).toBe('/en/petrol');

        const resUnknownIt = await request(app).get('/it?fuel=unknown_fuel');
        expect(resUnknownIt.status).toBe(301);
        expect(resUnknownIt.headers.location).toBe('/it/benzina');

        // City with fuel query (IT and EN)
        const resCity = await request(app).get('/it/citta/roma?fuel=diesel');
        expect(resCity.status).toBe(301);
        expect(resCity.headers.location).toBe('/it/citta/roma/gasolio');

        const resCityEn = await request(app).get('/en/city/rome?fuel=methane');
        expect(resCityEn.status).toBe(301);
        expect(resCityEn.headers.location).toBe('/en/city/rome/methane');

        // Explore with fuel query (IT and EN)
        const resExplore = await request(app).get('/en/explore?fuel=petrol');
        expect(resExplore.status).toBe(301);
        expect(resExplore.headers.location).toBe('/en/explore/petrol');

        const resExploreIt = await request(app).get('/it/esplora?carburante=gpl');
        expect(resExploreIt.status).toBe(301);
        expect(resExploreIt.headers.location).toBe('/it/esplora/gpl');

        // Old legacy routes
        const resOldCity = await request(app).get('/citta/milano');
        expect(resOldCity.status).toBe(301);
        expect(resOldCity.headers.location).toBe('/it/citta/milano');

        const resOldExplore = await request(app).get('/esplora');
        expect(resOldExplore.status).toBe(301);
        expect(resOldExplore.headers.location).toBe('/it/esplora');

        const resOldExploreSlash = await request(app).get('/esplora/');
        expect(resOldExploreSlash.status).toBe(301);
        expect(resOldExploreSlash.headers.location).toBe('/it/esplora');
    });

    it('renders home page with specific fuel in path segment', async () => {
        const res = await request(app).get('/it/metano');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Prezzi Metano');

        const resEn = await request(app).get('/en/petrol');
        expect(resEn.status).toBe(200);
        expect(resEn.text).toContain('Prices');
    });

    it('renders station detail without fuel suffix', async () => {
        const res = await request(app).get('/it/citta/roma/stazione/1');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Eni Roma');
    });

    it('handles unexpected SSR generation errors and falls back to 404', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const controller = new SsrController(() => db);
        controller.indexPath = '/non/existent/path/index.html';
        
        const req = { path: '/', query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
        const res = {
            status: vi.fn().mockReturnThis(),
            sendFile: vi.fn()
        };

        await controller.handleSsrRequest(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        consoleSpy.mockRestore();
    });

    it('handles station SSR when database connection is unavailable', async () => {
        const noDbApp = express();
        setupSsrRoutes(noDbApp, () => null);

        const res = await request(noDbApp).get('/it/citta/roma/stazione/1');
        expect(res.status).toBe(404);
    });

    it('renders English station detail without fuel suffix', async () => {
        const res = await request(app).get('/en/city/rome/station/1');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Eni Roma');
    });
});


