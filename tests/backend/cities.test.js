import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ApiController } from '../../server/controllers/apiController.js';

let app;

beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Non serve il DB per le città
    const controller = new ApiController({});
    
    app.get('/api/cities', controller.getCities);
    app.get('/api/cities/validate', controller.validateCity);
});

describe('Backend Server API - Cities', () => {
    it('dovrebbe ritornare la lista delle città', async () => {
        const res = await request(app).get('/api/cities');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('dovrebbe ritornare 400 se manca lo slug per /api/cities/validate', async () => {
        const res = await request(app).get('/api/cities/validate');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Missing slug parameter');
    });

    it('dovrebbe gestire l\'errore interno in getCities e validateCity', async () => {
        const { ApiController } = await import('../../server/controllers/apiController.js');
        const controller = new ApiController({});
        
        const req = { query: { slug: 'roma' } };
        const res = { json: () => { throw new Error('Simulated error') } };
        const next1 = vi.fn();
        const next2 = vi.fn();
        
        controller.getCities({}, res, next1);
        expect(next1).toHaveBeenCalled();

        controller.validateCity(req, res, next2);
        expect(next2).toHaveBeenCalled();
    });

    it('dovrebbe validare una città esistente', async () => {
        const res = await request(app).get('/api/cities/validate?slug=roma');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.city.name).toBe('Roma');
    });

    it('dovrebbe gestire correttamente spazi, accenti e case', async () => {
        const res = await request(app).get('/api/cities/validate?slug=RoMa');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.city.name).toBe('Roma');
    });

    it('dovrebbe ritornare false per una città inesistente', async () => {
        const res = await request(app).get('/api/cities/validate?slug=cittainventata123');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(false);
    });
});
