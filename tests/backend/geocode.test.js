/* oxlint-disable no-console */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ApiController } from '../../server/controllers/apiController.js';

let app;
let originalFetch;

beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Non serve il DB, mockiamo stationService
    const mockDb = {};
    const controller = new ApiController(mockDb);
    
    app.get('/api/geocode', controller.getGeocode);
    app.get('/api/reverse-geocode', controller.getReverseGeocode);

    originalFetch = global.fetch;
    global.fetch = vi.fn((url, options) => {
        if (url.includes('/search')) {
            if (url.includes('error')) return Promise.resolve({ ok: false, status: 500 });
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([{ lat: "41.9", lon: "12.5", display_name: "Roma, Italia" }])
            });
        }
        if (url.includes('/reverse')) {
            if (url.includes('error')) return Promise.resolve({ ok: false, status: 500 });
            if (url.includes('lat=429')) return Promise.resolve({ ok: false, status: 429 });
            if (url.includes('lat=403')) return Promise.resolve({ ok: false, status: 403 });
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ address: { city: "Roma" } })
            });
        }
        return originalFetch(url, options);
    });
});

afterAll(() => {
    global.fetch = originalFetch;
});

describe('Backend Server API - Geocode', () => {
    it('dovrebbe ritornare 400 se manca q in /api/geocode', async () => {
        const res = await request(app).get('/api/geocode');
        expect(res.status).toBe(400);
    });

    it('dovrebbe ritornare i dati geocode correttamente e testare cache', async () => {
        const res1 = await request(app).get('/api/geocode?q=Roma');
        expect(res1.status).toBe(200);
        expect(res1.body[0].lat).toBe("41.9");
        
        const res2 = await request(app).get('/api/geocode?q=Roma');
        expect(res2.status).toBe(200);
    });

    it('dovrebbe gestire errori da Nominatim in /api/geocode', async () => {
        const res = await request(app).get('/api/geocode?q=error');
        expect(res.status).toBe(500);
    });

    it('dovrebbe ritornare 400 se manca lat o lon in /api/reverse-geocode', async () => {
        let res = await request(app).get('/api/reverse-geocode?lat=41');
        expect(res.status).toBe(400);
        res = await request(app).get('/api/reverse-geocode?lon=12');
        expect(res.status).toBe(400);
    });

    it('dovrebbe ritornare i dati reverse-geocode correttamente e testare cache', async () => {
        const res1 = await request(app).get('/api/reverse-geocode?lat=41.9&lon=12.5');
        expect(res1.status).toBe(200);
        expect(res1.body.address.city).toBe("Roma");
        
        const res2 = await request(app).get('/api/reverse-geocode?lat=41.9&lon=12.5');
        expect(res2.status).toBe(200);
    });

    it('dovrebbe gestire errori da Nominatim in /api/reverse-geocode', async () => {
        const res = await request(app).get('/api/reverse-geocode?lat=error&lon=error');
        expect(res.status).toBe(502);
    });

    it('dovrebbe gestire Too Many Requests (429) da Nominatim in /api/reverse-geocode', async () => {
        const res = await request(app).get('/api/reverse-geocode?lat=429&lon=429');
        expect(res.status).toBe(429);
    });

    it('dovrebbe gestire Forbidden (403) da Nominatim in /api/reverse-geocode', async () => {
        const res = await request(app).get('/api/reverse-geocode?lat=403&lon=403');
        expect(res.status).toBe(403);
    });
});
