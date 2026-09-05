/* oxlint-disable no-console */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ApiController } from '../../server/controllers/apiController.js';

let app;

beforeAll(() => {
    app = express();
    app.use(express.json());
    
    const controller = new ApiController({});
    
    app.get('/api/cities', controller.getCities);
    app.get('/api/cities/validate', controller.validateCity);
});

describe('Backend Server API - Cities', () => {
    it('returns list of cities and supports ETag 304 caching', async () => {
        const res = await request(app).get('/api/cities');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        
        const etag = res.headers['etag'];
        expect(etag).toBeDefined();

        const res304 = await request(app).get('/api/cities').set('If-None-Match', etag);
        expect(res304.status).toBe(304);
    });

    it('returns 400 if slug parameter is missing on /api/cities/validate', async () => {
        const res = await request(app).get('/api/cities/validate');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Missing slug parameter');
    });

    it('handles internal errors in getCities and validateCity via next()', async () => {
        const { ApiController } = await import('../../server/controllers/apiController.js');
        const controller = new ApiController({});
        
        const req = { query: { slug: 'roma' } };
        const res = { json: () => { throw new Error('Simulated error'); } };
        const next1 = vi.fn();
        const next2 = vi.fn();
        
        controller.getCities({}, res, next1);
        expect(next1).toHaveBeenCalled();

        controller.validateCity(req, res, next2);
        expect(next2).toHaveBeenCalled();
    });

    it('validates an existing city successfully', async () => {
        const res = await request(app).get('/api/cities/validate?slug=roma');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.city.name).toBe('Roma');
    });

    it('correctly handles case variations for city slugs', async () => {
        const res = await request(app).get('/api/cities/validate?slug=RoMa');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.city.name).toBe('Roma');
    });

    it('returns valid=false for non-existent city slug', async () => {
        const res = await request(app).get('/api/cities/validate?slug=cittainventata123');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(false);
    });
});
