/* oxlint-disable no-console */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createHealthcheckMiddleware } from '../../server/middlewares/healthcheck.js';

const createTestApp = (isReady, onRecover) => {
    const app = express();
    app.use(createHealthcheckMiddleware({
        isReadyGetter: () => isReady,
        onRecover
    }));
    app.get('/api/data', (req, res) => res.status(200).json({ success: true }));
    return app;
};

describe('Health Checks Middleware (Render / Load Balancers)', () => {
    it('returns 200 OK for standard health endpoints regardless of isReady state', async () => {
        const app = createTestApp(false);
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');

        const resPing = await request(app).get('/ping');
        expect(resPing.status).toBe(200);

        const resHealthz = await request(app).get('/healthz');
        expect(resHealthz.status).toBe(200);
    });

    it('returns 200 OK when Render or monitoring User-Agent is detected', async () => {
        const app = createTestApp(false);
        const response = await request(app)
            .get('/random-path-that-doesnt-exist')
            .set('User-Agent', 'Render/1.0');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
    });

    it('triggers manual recovery with valid token', async () => {
        process.env.ADMIN_PASSKEY = 'test_secret_passkey';
        const onRecoverMock = vi.fn();
        const app = createTestApp(false, onRecoverMock);

        const res = await request(app)
            .get('/healthz/recover?token=test_secret_passkey');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Recovery procedure started');
        expect(onRecoverMock).toHaveBeenCalled();
    });

    it('blocks normal requests with 503 while server is not ready', async () => {
        const app = createTestApp(false);
        const response = await request(app).get('/api/data');
        expect(response.status).toBe(503);
        expect(response.text).toContain('Servizio in fase di avvio');
    });

    it('allows root request with 200 initializing message when not ready', async () => {
        const app = createTestApp(false);
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toContain('OK - Inizializzazione in corso');
    });

    it('triggers manual recovery with valid header passkey', async () => {
        process.env.ADMIN_PASSKEY = 'test_secret_passkey';
        const onRecoverMock = vi.fn();
        const app = createTestApp(false, onRecoverMock);

        const res = await request(app)
            .get('/healthz/recover')
            .set('x-admin-passkey', 'test_secret_passkey');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Recovery procedure started');
        expect(onRecoverMock).toHaveBeenCalled();
    });

    it('ignores manual recovery with invalid passkey', async () => {
        process.env.ADMIN_PASSKEY = 'test_secret_passkey';
        const onRecoverMock = vi.fn();
        const app = createTestApp(false, onRecoverMock);

        const res = await request(app)
            .get('/healthz/recover?token=wrong_key');
        expect(res.status).toBe(503);
        expect(onRecoverMock).not.toHaveBeenCalled();
    });

    it('bypasses SEO and sitemap requests during initialization', async () => {
        const app = express();
        app.use(createHealthcheckMiddleware({ isReadyGetter: () => false }));
        app.get('/robots.txt', (req, res) => res.status(200).send('User-agent: *'));
        app.get('/sitemap.xml', (req, res) => res.status(200).send('<xml></xml>'));
        app.get('/sitemaps/it.xml', (req, res) => res.status(200).send('<xml></xml>'));

        const resRobots = await request(app).get('/robots.txt');
        expect(resRobots.status).toBe(200);

        const resSitemap = await request(app).get('/sitemap.xml');
        expect(resSitemap.status).toBe(200);

        const resSubSitemap = await request(app).get('/sitemaps/it.xml');
        expect(resSubSitemap.status).toBe(200);
    });

    it('handles various monitoring User-Agents and missing user-agent', async () => {
        const app = createTestApp(false);
        const results = await Promise.all(
            ['healthcheck', 'kube-probe', 'uptimerobot'].map(ua => 
                request(app).get('/any-path').set('User-Agent', ua)
            )
        );
        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.text).toBe('OK');
        }

        // Missing UA
        const resNoUa = await request(app).get('/api/data').unset('User-Agent');
        expect(resNoUa.status).toBe(503);
    });

    it('handles boolean isReadyGetter and null onRecover during recovery', async () => {
        process.env.ADMIN_PASSKEY = 'test_secret_passkey';
        const app = express();
        app.use(createHealthcheckMiddleware({
            isReadyGetter: false,
            onRecover: null
        }));

        const res = await request(app).get('/healthz/recover?token=test_secret_passkey');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Recovery procedure started');
    });

    it('handles boolean isReadyGetter: true', async () => {
        const app = express();
        app.use(createHealthcheckMiddleware({
            isReadyGetter: true
        }));
        app.get('/api/data', (req, res) => res.status(200).json({ success: true }));

        const res = await request(app).get('/api/data');
        expect(res.status).toBe(200);
    });
});



