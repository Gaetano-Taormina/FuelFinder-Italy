import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import zlib from 'node:zlib';
import { validateSqliteHeader, downloadDatabase } from '../../server/services/dbDownloadService.js';

describe('dbDownloadService', () => {
    let tempDir;
    let server;
    let serverUrl;
    const SQLITE_SAMPLE = Buffer.concat([
        Buffer.from('SQLite format 3\0'),
        Buffer.alloc(100, 0xAA)
    ]);

    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fuelfinder-dbtest-'));
        
        server = http.createServer((req, res) => {
            if (req.url === '/database.sqlite') {
                res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                res.end(SQLITE_SAMPLE);
            } else if (req.url === '/database.sqlite.gz') {
                const gzipped = zlib.gzipSync(SQLITE_SAMPLE);
                res.writeHead(200, { 'Content-Type': 'application/gzip' });
                res.end(gzipped);
            } else if (req.url === '/invalid.sqlite') {
                res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                res.end(Buffer.from('NOT A SQLITE FILE DATA'));
            } else if (req.url === '/not-found') {
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const address = server.address();
        serverUrl = `http://127.0.0.1:${address.port}`;
    });

    afterEach(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('validateSqliteHeader', () => {
        it('returns true for a valid SQLite file header', () => {
            const validFile = path.join(tempDir, 'valid.sqlite');
            fs.writeFileSync(validFile, SQLITE_SAMPLE);
            expect(validateSqliteHeader(validFile)).toBe(true);
        });

        it('returns false for non-existent file or corrupted header', () => {
            expect(validateSqliteHeader(path.join(tempDir, 'nonexistent.sqlite'))).toBe(false);

            const invalidFile = path.join(tempDir, 'invalid.sqlite');
            fs.writeFileSync(invalidFile, Buffer.from('HTML 404 NOT FOUND'));
            expect(validateSqliteHeader(invalidFile)).toBe(false);
        });
    });

    describe('downloadDatabase', () => {
        it('returns error if no URL is provided', async () => {
            const result = await downloadDatabase({ url: '', targetPath: path.join(tempDir, 'db.sqlite') });
            expect(result.success).toBe(false);
            expect(result.error).toContain('No URL');
        });

        it('downloads raw SQLite file and verifies header', async () => {
            const targetPath = path.join(tempDir, 'downloaded.sqlite');
            const result = await downloadDatabase({
                url: `${serverUrl}/database.sqlite`,
                targetPath
            });

            expect(result.success).toBe(true);
            expect(result.downloaded).toBe(true);
            expect(fs.existsSync(targetPath)).toBe(true);
            expect(validateSqliteHeader(targetPath)).toBe(true);
        });

        it('downloads and decompresses gzipped SQLite file', async () => {
            const targetPath = path.join(tempDir, 'downloaded_gz.sqlite');
            const result = await downloadDatabase({
                url: `${serverUrl}/database.sqlite.gz`,
                targetPath
            });

            expect(result.success).toBe(true);
            expect(result.downloaded).toBe(true);
            expect(fs.existsSync(targetPath)).toBe(true);
            expect(validateSqliteHeader(targetPath)).toBe(true);
            expect(fs.statSync(targetPath).size).toBe(SQLITE_SAMPLE.length);
        });

        it('skips download if valid database already exists and force is false', async () => {
            const targetPath = path.join(tempDir, 'existing.sqlite');
            fs.writeFileSync(targetPath, SQLITE_SAMPLE);

            const result = await downloadDatabase({
                url: `${serverUrl}/database.sqlite`,
                targetPath,
                force: false
            });

            expect(result.success).toBe(true);
            expect(result.downloaded).toBe(false);
        });

        it('forces download when force: true even if database exists', async () => {
            const targetPath = path.join(tempDir, 'existing.sqlite');
            fs.writeFileSync(targetPath, SQLITE_SAMPLE);

            const result = await downloadDatabase({
                url: `${serverUrl}/database.sqlite`,
                targetPath,
                force: true
            });

            expect(result.success).toBe(true);
            expect(result.downloaded).toBe(true);
        });

        it('fails and removes temp file if downloaded file has invalid SQLite header', async () => {
            const targetPath = path.join(tempDir, 'bad.sqlite');
            const result = await downloadDatabase({
                url: `${serverUrl}/invalid.sqlite`,
                targetPath
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('valid SQLite 3 header');
            expect(fs.existsSync(targetPath)).toBe(false);
        });

        it('fails gracefully on HTTP 404', async () => {
            const targetPath = path.join(tempDir, 'notfound.sqlite');
            const result = await downloadDatabase({
                url: `${serverUrl}/not-found`,
                targetPath
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('404');
        });
    });
});
