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
    it('dovrebbe ritornare 400 se mancano i parametri obbligatori (lat, lng, fuel)', async () => {
        const res = await request(app).get('/api/stations');
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('dovrebbe ritornare i distributori vicini correttamente (geolocalizzazione)', async () => {
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
    
    it('dovrebbe ritornare array vuoto se non ci sono distributori nel raggio', async () => {
        const res = await request(app).get('/api/stations?lat=40.8&lng=14.2&radius=10&fuel=Benzina');
        expect(res.status).toBe(200);
        expect(res.body.stations).toEqual([]);
        expect(res.body.totalCount).toBe(0);
    });

    it('dovrebbe testare validazioni di fallback per fuel e serviceType', async () => {
        const res = await request(app).get('/api/stations?lat=41.9&lng=12.5&radius=10&serviceType=entrambi');
        expect(res.status).toBe(200);
    });

    it('dovrebbe testare validazioni fallite per lat/lng e raggio errati', async () => {
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

    it('dovrebbe testare filtro serviceType = 0 (servito)', async () => {
        const res = await request(app).get('/api/stations?lat=41.9&lng=12.5&radius=10&fuelType=Diesel&serviceType=0');
        expect(res.status).toBe(200);
        expect(res.body.stations.length).toBeGreaterThan(0);
    });
});
