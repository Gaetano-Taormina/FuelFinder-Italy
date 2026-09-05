import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import zlib from 'node:zlib';
import { modernCompression } from '../../server/middlewares/modernCompression.js';

describe('ModernCompression Middleware - 100% Coverage', () => {
    function createTestApp(options) {
        const app = express();
        app.use(modernCompression(options));
        app.get('/json', (_req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.json({ message: 'Hello World '.repeat(100) });
        });
        app.get('/small', (_req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.json({ ok: true });
        });
        app.get('/stream', (_req, res) => {
            const cb = vi.fn();
            res.setHeader('Content-Type', 'text/plain');
            res.write(''); // empty chunk branch
            res.write(Buffer.from('Chunk 1 '.repeat(20)), 'utf8', cb); // Buffer branch with callback
            res.write('Chunk 2 '.repeat(20), 'utf8'); // string branch with encoding (no cb)
            res.write('Chunk 3 '.repeat(20)); // string branch without encoding
            res.end();
            res.write('after end'); // isEnded branch
            res.end(); // duplicate end branch
        });
        app.get('/end-buffer', (_req, res) => {
            res.setHeader('Content-Type', 'text/plain');
            res.end(Buffer.from('Buffer End Payload '.repeat(20)));
        });
        app.get('/end-string-encoding', (_req, res) => {
            res.setHeader('Content-Type', 'text/plain');
            res.end('String End Payload '.repeat(20), 'utf8');
        });
        return app;
    }

    it('should compress with gzip when requested', async () => {
        const app = createTestApp({ threshold: 50 });
        const res = await supertest(app)
            .get('/json')
            .set('Accept-Encoding', 'gzip')
            .expect(200);

        expect(res.headers['content-encoding']).toBe('gzip');
    });

    it('should support default options without parameters', async () => {
        const app = createTestApp(); // uses default options = {} and default threshold = 1024
        const res = await supertest(app)
            .get('/json')
            .set('Accept-Encoding', 'gzip')
            .expect(200);

        expect(res.headers['content-encoding']).toBe('gzip');
    });

    it('should compress with brotli (br) when supported', async () => {
        const app = createTestApp({ threshold: 50 });
        const res = await supertest(app)
            .get('/json')
            .set('Accept-Encoding', 'br')
            .expect(200);

        expect(res.headers['content-encoding']).toBe('br');
    });

    it('should compress with zstd when supported by runtime', async () => {
        if (typeof zlib.zstdCompressSync !== 'function') return;

        const app = createTestApp({ threshold: 50 });
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

    it('should compress with deflate when requested', async () => {
        const app = createTestApp({ threshold: 50 });
        const res = await supertest(app)
            .get('/json')
            .set('Accept-Encoding', 'deflate')
            .expect(200);

        expect(res.headers['content-encoding']).toBe('deflate');
    });

    it('should handle streaming via res.write and res.end', async () => {
        const app = createTestApp({ threshold: 50 });
        const res = await supertest(app)
            .get('/stream')
            .set('Accept-Encoding', 'gzip')
            .expect(200);

        expect(res.headers['content-encoding']).toBe('gzip');
    });

    it('should handle res.end with Buffer and res.end with string and encoding', async () => {
        const app = createTestApp({ threshold: 50 });
        const resBuf = await supertest(app)
            .get('/end-buffer')
            .set('Accept-Encoding', 'gzip')
            .expect(200);
        expect(resBuf.headers['content-encoding']).toBe('gzip');

        const resStr = await supertest(app)
            .get('/end-string-encoding')
            .set('Accept-Encoding', 'gzip')
            .expect(200);
        expect(resStr.headers['content-encoding']).toBe('gzip');
    });

    it('should not compress below the threshold size', async () => {
        const app = createTestApp({ threshold: 50 });
        const res = await supertest(app)
            .get('/small')
            .set('Accept-Encoding', 'gzip')
            .expect(200);

        expect(res.headers['content-encoding']).toBeUndefined();
    });

    it('ignores HEAD requests, requests without Accept-Encoding or with unsupported encoding', async () => {
        const app = createTestApp({ threshold: 50 });
        const headRes = await supertest(app)
            .head('/json')
            .set('Accept-Encoding', 'gzip')
            .expect(200);
        expect(headRes.headers['content-encoding']).toBeUndefined();

        const noEncRes = await supertest(app)
            .get('/json')
            .set('Accept-Encoding', '')
            .expect(200);
        expect(noEncRes.headers['content-encoding']).toBeUndefined();

        const unsuppRes = await supertest(app)
            .get('/json')
            .set('Accept-Encoding', 'compress, identity')
            .expect(200);
        expect(unsuppRes.headers['content-encoding']).toBeUndefined();
    });
});
