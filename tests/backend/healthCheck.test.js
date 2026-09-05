/* oxlint-disable no-console */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

const createTestApp = (isReady) => {
    const app = express();
    
    app.use((req, res, next) => {
        const ua = (req.headers['user-agent'] || '').toLowerCase();
        
        if (req.path === '/health' || req.path === '/healthz' || req.path === '/ping') {
            return res.status(200).send('OK');
        }
        
        if (ua.includes('render/1.0') || ua.includes('healthcheck') || ua.includes('kube-probe') || ua.includes('uptimerobot')) {
            return res.status(200).send('OK');
        }

        if (!isReady) {
            if (req.path === '/') return res.status(200).send('OK - Initializing');
            return res.status(503).send('Service starting up, please retry shortly...');
        }
        
        next();
    });

    app.get('/api/data', (req, res) => res.status(200).json({ success: true }));

    return app;
};

describe('Health Checks Middleware (Render / Load Balancers)', () => {
    it('returns 200 OK for standard health endpoints regardless of isReady state', async () => {
        const app = createTestApp(false);
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
    });

    it('returns 200 OK when Render User-Agent is detected', async () => {
        const app = createTestApp(false);
        const response = await request(app)
            .get('/random-path-that-doesnt-exist')
            .set('User-Agent', 'Render/1.0');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
    });

    it('blocks normal requests with 503 while server is not ready', async () => {
        const app = createTestApp(false);
        const response = await request(app).get('/api/data');
        expect(response.status).toBe(503);
        expect(response.text).toContain('Service starting up');
    });

    it('allows normal requests through when server is ready', async () => {
        const app = createTestApp(true);
        const response = await request(app).get('/api/data');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true });
    });
});
