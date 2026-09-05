import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import { createClient } from '@libsql/client';
import { modernCompression } from '../../server/middlewares/modernCompression.js';
import { ApiController } from '../../server/controllers/apiController.js';

describe('Integration Pipeline: Express Server API + Controller + SQLite + Compression', () => {
    let app;
    let db;

    beforeEach(async () => {
        db = createClient({ url: 'file::memory:' });

        // Inizializza schema tabelle in memoria
        await db.batch([
            `CREATE TABLE stations (
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
            );`,
            `CREATE TABLE prices (
                id_impianto INTEGER,
                desc_carburante TEXT,
                prezzo REAL,
                is_self INTEGER,
                dt_comunicazione TEXT,
                UNIQUE(id_impianto, desc_carburante, is_self)
            );`
        ], 'write');

        // Popola con stazioni test
        await db.execute({
            sql: `INSERT INTO stations VALUES (1, 'Eni', 'ENI', 'Strada', 'Stazione 1', 'Via Roma 1', 'Roma', 'RM', 41.9028, 12.4964)`,
            args: []
        });
        await db.execute({
            sql: `INSERT INTO prices VALUES (1, 'Benzina', 1.749, 1, '2026-03-01 10:00:00')`,
            args: []
        });

        const apiController = new ApiController(db);

        app = express();
        app.use(modernCompression({ threshold: 50 }));
        app.use(express.json());

        app.get('/api/stations', apiController.getStations);
        app.get('/api/cities', apiController.getCities);
        app.get('/api/validate-city', apiController.validateCity);
    });

    it('restituisce stazioni filtrate con header Cache-Control ed ETag', async () => {
        const res = await supertest(app)
            .get('/api/stations?lat=41.9028&lng=12.4964&radius=10&fuel=Benzina')
            .expect(200);

        expect(res.headers['cache-control']).toBeDefined();
        expect(res.headers['etag']).toBeDefined();
        expect(res.body.stations).toBeDefined();
        expect(Array.isArray(res.body.stations)).toBe(true);
        expect(res.body.stations.length).toBe(1);
        expect(res.body.stations[0].id).toBe(1);
    });

    it('restituisce 304 Not Modified quando il client invia un ETag valido', async () => {
        const firstRes = await supertest(app)
            .get('/api/stations?lat=41.9028&lng=12.4964&radius=10&fuel=Benzina')
            .expect(200);

        const etag = firstRes.headers['etag'];
        expect(etag).toBeDefined();

        await supertest(app)
            .get('/api/stations?lat=41.9028&lng=12.4964&radius=10&fuel=Benzina')
            .set('If-None-Match', etag)
            .expect(304);
    });

    it('valida correttamente lo slug di una città italiana', async () => {
        const res = await supertest(app)
            .get('/api/validate-city?slug=roma')
            .expect(200);

        expect(res.body.valid).toBe(true);
        expect(res.body.city.name.toLowerCase()).toBe('roma');
    });
});
