/* eslint-disable no-console */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// Ricreiamo il middleware esattamente come in server.js per poterlo testare isolato
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
            if (req.path === '/') return res.status(200).send('OK - Inizializzazione in corso');
            return res.status(503).send('Servizio in fase di avvio, riprova tra qualche secondo...');
        }
        
        next();
    });

    app.get('/api/data', (req, res) => res.status(200).json({ success: true }));

    return app;
};

describe('Health Checks Middleware (Render / Load Balancers)', () => {
    it('deve rispondere 200 OK agli endpoint classici (es. /health) ignorando lo stato di isReady', async () => {
        const app = createTestApp(false); // isReady = false
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
    });

    it('deve rispondere 200 OK quando viene rilevato l\'User-Agent di Render (render/1.0)', async () => {
        const app = createTestApp(false);
        const response = await request(app)
            .get('/random-path-that-doesnt-exist')
            .set('User-Agent', 'Render/1.0');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
    });

    it('deve bloccare le chiamate normali con 503 se il server (Turso DB) non è ancora pronto', async () => {
        const app = createTestApp(false);
        const response = await request(app).get('/api/data');
        expect(response.status).toBe(503);
        expect(response.text).toContain('Servizio in fase di avvio');
    });

    it('deve permettere le chiamate normali se il server è pronto', async () => {
        const app = createTestApp(true);
        const response = await request(app).get('/api/data');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true });
    });
});
