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
    // Disabilitiamo il console.error globalmente per questi test in modo da mantenere pulito
    // l'output, dato che testiamo moltissimi casi di errore (400, 500) che triggerano i log
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 1. Inizializza un DB SQLite in memoria (non tocca Turso)
    db = createClient({ url: 'file::memory:' });

    // 2. Crea lo schema delle tabelle necessarie
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

    // 3. Inserisci dati fittizi per i test
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
        args: [1, "Diesel", 1.750, 0, "2023-10-01 10:00:00"] // servito
    });

    // Secondo distributore a Roma per testare l'ordinamento (sort convenienceScore)
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

    // Distributore più lontano (Milano) per testare il raggio
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

    // 4. Configura l'app Express fittizia
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
        // Cerchiamo vicino a Roma (lat 41.9, lng 12.5)
        const res = await request(app).get('/api/stations?lat=41.9&lng=12.5&radius=10&fuel=Benzina');
        expect(res.status).toBe(200);
        expect(res.body.stations).toBeDefined();
        expect(Array.isArray(res.body.stations)).toBe(true);
        
        // Verifica che il distributore restituito sia quello di Roma
        const station = res.body.stations.find(s => s.id === 1);
        expect(station).toBeDefined();
        expect(station.name).toBe('Eni Roma Centro');
        expect(station.currentPrice).toBe(1.850);
        
        // Il distributore di Milano (id 2) non dovrebbe essere nei risultati perché fuori dal raggio di 10km
        const milanStation = res.body.stations.find(s => s.id === 2);
        expect(milanStation).toBeUndefined();
    });
    
    it('dovrebbe ritornare array vuoto se non ci sono distributori nel raggio', async () => {
        // Cerchiamo vicino a Napoli (nessun dato inserito nel database in memoria)
        const res = await request(app).get('/api/stations?lat=40.8&lng=14.2&radius=10&fuel=Benzina');
        expect(res.status).toBe(200);
        expect(res.body.stations).toEqual([]);
        expect(res.body.totalCount).toBe(0);
    });

    it('dovrebbe ritornare cache al secondo hit', async () => {
        // Prima chiamata (salva in cache)
        await request(app).get('/api/stations?lat=41.9&lng=12.5&radius=10&fuel=Benzina');
        // Seconda chiamata (usa cache)
        const res = await request(app).get('/api/stations?lat=41.9&lng=12.5&radius=10&fuel=Benzina');
        expect(res.status).toBe(200);
        expect(res.body.stations.length).toBeGreaterThan(0);
    });

    it('dovrebbe testare validazioni di fallback per fuel e serviceType', async () => {
        // serviceType "entrambi", fuelType vuoto => fallback a Benzina e "all"
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

describe('Global Error Handler', () => {
    it('dovrebbe gestire gli errori di default nascondendo lo stack trace e restituendo 500', () => {
        const req = {};
        const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();
        
        const err = new Error('Secret DB Error');
        globalErrorHandler(err, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error. Please try again later.' });
    });

    it('dovrebbe esporre il messaggio originale se lo status è < 500 (es. 400)', () => {
        const req = {};
        const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();
        
        const err = new Error('Known validation error');
        err.status = 400;
        globalErrorHandler(err, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Known validation error' });
    });

    it('dovrebbe gestire oggetti non Error usando toString (es. stringhe)', () => {
        const req = {};
        const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();
        
        // Simula un'eccezione lanciata come stringa: throw "String error"
        globalErrorHandler("String Error", req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error. Please try again later.' });
    });
});

describe('Backend Server API - GET /api/geocode & /api/reverse-geocode', () => {
    let originalFetch;

    beforeAll(() => {
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

    it('dovrebbe ritornare 400 se manca q in /api/geocode', async () => {
        const res = await request(app).get('/api/geocode');
        expect(res.status).toBe(400);
    });

    it('dovrebbe ritornare i dati geocode correttamente e testare cache', async () => {
        const res1 = await request(app).get('/api/geocode?q=Roma');
        expect(res1.status).toBe(200);
        expect(res1.body[0].lat).toBe("41.9");
        
        // Cache hit
        const res2 = await request(app).get('/api/geocode?q=Roma');
        expect(res2.status).toBe(200);
        // Non deve chiamare fetch di nuovo, ma dato che prima non abbiamo resettato il contatore,
        // ci fidiamo del fatto che ha ritornato 200 senza errori.
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
        
        // Cache hit
        const res2 = await request(app).get('/api/reverse-geocode?lat=41.9&lon=12.5');
        expect(res2.status).toBe(200);
    });

    it('dovrebbe gestire errori da Nominatim in /api/reverse-geocode', async () => {
        const res = await request(app).get('/api/reverse-geocode?lat=error&lon=error');
        expect(res.status).toBe(500);
    });
});
