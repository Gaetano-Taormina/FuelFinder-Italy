import { describe, it, expect } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import zlib from 'node:zlib';
import { modernCompression } from '../../server/middlewares/modernCompression.js';

describe('ModernCompression Middleware', () => {
    function createTestApp() {
        const app = express();
        app.use(modernCompression({ threshold: 200 }));
        app.get('/json', (_req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.json({ message: 'Hello World '.repeat(50) });
        });
        app.get('/small', (_req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.json({ ok: true });
        });
        return app;
    }

    it('dovrebbe comprimere con gzip quando richiesto', async () => {
        const app = createTestApp();
        const res = await supertest(app)
            .get('/json')
            .set('Accept-Encoding', 'gzip')
            .expect(200);

        expect(res.headers['content-encoding']).toBe('gzip');
    });

    it('dovrebbe comprimere con brotli (br) quando supportato', async () => {
        const app = createTestApp();
        const res = await supertest(app)
            .get('/json')
            .set('Accept-Encoding', 'br')
            .expect(200);

        expect(res.headers['content-encoding']).toBe('br');
    });

    it('dovrebbe comprimere con zstd quando supportato dal runtime', async () => {
        if (typeof zlib.createZstdCompress !== 'function') return;

        const app = createTestApp();
        const res = await supertest(app)
            .get('/json')
            .set('Accept-Encoding', 'zstd')
            .parse((res, callback) => {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => callback(null, Buffer.concat(chunks)));
            })
            .expect(200);

        expect(res.headers['content-encoding']).toBe('zstd');
    });

    it('non dovrebbe comprimere sotto la soglia minima di byte', async () => {
        const app = createTestApp();
        const res = await supertest(app)
            .get('/small')
            .set('Accept-Encoding', 'gzip')
            .expect(200);

        expect(res.headers['content-encoding']).toBeUndefined();
    });
});
