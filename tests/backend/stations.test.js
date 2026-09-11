/* oxlint-disable no-console */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createClient } from '@libsql/client';
import { setupApiRoutes } from '../../server/routes/api.js';
import { globalErrorHandler } from '../../server/middlewares/errorHandler.js';

let app;
let db;
let consoleSpy;

beforeAll(async () => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
        sql: `INSERT INTO stations (id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [1, "Eni", "Eni", "Stradale", "Eni Roma Centro", "Via Roma 1", "Roma", "RM", 41.9028, 12.4964]
    });
    
    await db.execute({
        sql: `INSERT INTO prices (id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione)
              VALUES (?, ?, ?, ?, ?)`,
        args: [1, "Benzina", 1.850, 1, "2023-10-01 10:00:00"]
    });

    await db.execute({
        sql: `INSERT INTO prices (id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione)
              VALUES (?, ?, ?, ?, ?)`,
        args: [1, "Diesel", 1.750, 0, "2023-10-01 10:00:00"]
    });

    await db.execute({
        sql: `INSERT INTO stations (id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [3, "Q8", "Q8", "Stradale", "Q8 Roma", "Via Roma 2", "Roma", "RM", 41.9029, 12.4965]
    });
    
    await db.execute({
        sql: `INSERT INTO prices (id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione)
              VALUES (?, ?, ?, ?, ?)`,
        args: [3, "Benzina", 1.840, 1, "2023-10-01 10:00:00"]
    });

    await db.execute({
        sql: `INSERT INTO stations (id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [2, "IP", "IP", "Stradale", "IP Milano", "Via Milano 1", "Milano", "MI", 45.4642, 9.1900]
    });
    
    await db.execute({
        sql: `INSERT INTO prices (id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione)
              VALUES (?, ?, ?, ?, ?)`,
        args: [2, "Benzina", 1.800, 1, "2023-10-01 10:00:00"]
    });

    app = express();
    app.use(express.json());
    setupApiRoutes(app, db);
    app.use(globalErrorHandler);
});

afterAll(() => {
    if (consoleSpy) consoleSpy.mockRestore();
    if (db) db.close();
});

describe('Backend Server API - GET /api/stations', () => {
    it('returns 400 when required parameters are missing (lat, lng, fuel)', async () => {
        const res = await request(app).get('/api/stations');
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('returns nearby stations correctly based on geolocation', async () => {
        const res = await request(app).get('/api/stations?lat=41.9&lng=12.5&radius=10&fuel=Benzina');
        expect(res.status).toBe(200);
        expect(res.body.stations).toBeDefined();
        expect(Array.isArray(res.body.stations)).toBe(true);
        
        const station = res.body.stations.find(s => s.id === 1);
        expect(station).toBeDefined();
        expect(station.name).toBe('Eni Roma Centro');
        expect(station.currentPrice).toBe(1.850);
        
        const milanStation = res.body.stations.find(s => s.id === 2);
        expect(milanStation).toBeUndefined();
    });
    
    it('returns empty array when no stations are found within radius', async () => {
        const res = await request(app).get('/api/stations?lat=40.8&lng=14.2&radius=10&fuel=Benzina');
        expect(res.status).toBe(200);
        expect(res.body.stations).toEqual([]);
        expect(res.body.totalCount).toBe(0);
    });

    it('tests fallback validation for fuel and serviceType', async () => {
        const res = await request(app).get('/api/stations?lat=41.9&lng=12.5&radius=10&serviceType=entrambi');
        expect(res.status).toBe(200);
    });

    it('tests validation errors for invalid lat, lng, radius, and serviceType', async () => {
        let res = await request(app).get('/api/stations?lat=100&lng=12.5'); // lat > 90
        expect(res.status).toBe(400);

        res = await request(app).get('/api/stations?lat=41&lng=200'); // lng > 180
        expect(res.status).toBe(400);

        res = await request(app).get('/api/stations?lat=41&lng=12&radius=200'); // radius > 100
        expect(res.status).toBe(400);
        
        res = await request(app).get('/api/stations?lat=41&lng=12&radius=10&fuelType=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'); // fuel > 50
        expect(res.status).toBe(400);
        
        res = await request(app).get('/api/stations?lat=41&lng=12&radius=10&fuelType=Benzina&serviceType=xyz'); // invalid serviceType
        expect(res.status).toBe(400);
    });

    it('tests serviceType filter = 0 (attended / servito)', async () => {
        const res = await request(app).get('/api/stations?lat=41.9&lng=12.5&radius=10&fuelType=Diesel&serviceType=0');
        expect(res.status).toBe(200);
        expect(res.body.stations.length).toBeGreaterThan(0);
    });

    it('tests StationRepository.findCityPricesForSeo', async () => {
        const { StationRepository } = await import('../../server/repositories/stationRepository.js');
        const repo = new StationRepository(db);

        const rows = await repo.findCityPricesForSeo('Roma', 'Benzina');
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0].nome_impianto).toBeDefined();

        const emptyRows = await repo.findCityPricesForSeo('NonExistentCity', 'Benzina');
        expect(emptyRows).toEqual([]);

        const nullDbRepo = new StationRepository(null);
        const nullRows = await nullDbRepo.findCityPricesForSeo('Roma', 'Benzina');
        expect(nullRows).toEqual([]);

        const throwingDbRepo = new StationRepository({
            execute: vi.fn().mockRejectedValue(new Error('DB Query Error'))
        });
        const thrownRows = await throwingDbRepo.findCityPricesForSeo('Roma', 'Benzina');
        expect(thrownRows).toEqual([]);
    });

    it('GET /api/stations/:id returns station details with prices and supports ETag 304', async () => {
        const res = await request(app).get('/api/stations/1');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.station).toBeDefined();
        expect(res.body.station.id).toBe(1);
        expect(res.body.station.name).toBe('Eni Roma Centro');
        expect(res.body.station.prices.self['Benzina']).toBe(1.850);
        expect(res.body.station.prices.servito['Diesel']).toBe(1.750);
        expect(res.headers.etag).toBeDefined();

        // 304 Not Modified
        const res304 = await request(app)
            .get('/api/stations/1')
            .set('If-None-Match', res.headers.etag);
        expect(res304.status).toBe(304);
    });

    it('GET /api/stations/:id passes unexpected error to next()', async () => {
        const { ApiController } = await import('../../server/controllers/apiController.js');
        const brokenService = {
            getStationById: vi.fn().mockRejectedValue(new Error('Unexpected Station Error'))
        };
        const controller = new ApiController(db);
        controller.stationService = brokenService;

        const next = vi.fn();
        await controller.getStationById({ params: { id: '1' }, headers: {} }, { setHeader: vi.fn() }, next);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('GET /api/stations/:id returns 404 for non-existent station', async () => {
        const res = await request(app).get('/api/stations/999999');
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Stazione non trovata');
    });

    it('GET /api/stations/:id returns 400 for invalid ID', async () => {
        const res = await request(app).get('/api/stations/invalid-id');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('ID stazione non valido');
    });

    it('StationRepository.findStationById returns null on db failure or null db', async () => {
        const { StationRepository } = await import('../../server/repositories/stationRepository.js');
        const nullRepo = new StationRepository(null);
        expect(await nullRepo.findStationById(1)).toBeNull();

        const failingRepo = new StationRepository({
            execute: vi.fn().mockRejectedValue(new Error('DB error'))
        });
        expect(await failingRepo.findStationById(1)).toBeNull();
    });

    it('StationService.getStationById returns null on falsy ID', async () => {
        const { StationService } = await import('../../server/services/stationService.js');
        const service = new StationService(db);
        expect(await service.getStationById(null)).toBeNull();
        expect(await service.getStationById(0)).toBeNull();
    });
});

