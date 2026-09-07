import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { validateSqliteHeader, downloadDatabase, getHttpStream, getDecompressor } from '../../server/services/dbDownloadService.js';

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
            } else if (req.url === '/database.sqlite.zst') {
                const zstdCompressed = typeof zlib.zstdCompressSync === 'function' 
                    ? zlib.zstdCompressSync(SQLITE_SAMPLE)
                    : zlib.gzipSync(SQLITE_SAMPLE);
                res.writeHead(200, { 'Content-Type': 'application/zstd' });
                res.end(zstdCompressed);
            } else if (req.url === '/database.sqlite.br') {
                const brotliCompressed = zlib.brotliCompressSync(SQLITE_SAMPLE);
                res.writeHead(200, { 'Content-Type': 'application/x-brotli' });
                res.end(brotliCompressed);
            } else if (req.url === '/gzip-header-custom-url') {
                const gzipped = zlib.gzipSync(SQLITE_SAMPLE);
                res.writeHead(200, { 'Content-Type': 'application/x-gzip' });
                res.end(gzipped);
            } else if (req.url === '/redirect') {
                res.writeHead(302, { 'Location': '/database.sqlite.gz' });
                res.end();
            } else if (req.url === '/loop1') {
                res.writeHead(302, { 'Location': '/loop2' });
                res.end();
            } else if (req.url === '/loop2') {
                res.writeHead(302, { 'Location': '/loop1' });
                res.end();
            } else if (req.url === '/slow') {
                setTimeout(() => {
                    res.writeHead(200);
                    res.end(SQLITE_SAMPLE);
                }, 1000);
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

        it('handles exceptions gracefully returning false', () => {
            const validFile = path.join(tempDir, 'valid2.sqlite');
            fs.writeFileSync(validFile, SQLITE_SAMPLE);

            const spy = vi.spyOn(fs, 'readSync').mockImplementationOnce(() => {
                throw new Error('Disk read error');
            });
            expect(validateSqliteHeader(validFile)).toBe(false);
            spy.mockRestore();
        });
    });

    describe('getDecompressor', () => {
        it('identifies zstd, brotli, and gzip streams accurately', () => {
            expect(getDecompressor('https://example.com/db.zst')).not.toBeNull();
            expect(getDecompressor('https://example.com/db.br')).not.toBeNull();
            expect(getDecompressor('https://example.com/db.gz')).not.toBeNull();
            expect(getDecompressor('relative-db.gz')).not.toBeNull();
            expect(getDecompressor('https://example.com/db.sqlite')).toBeNull();
        });

        it('throws helpful error if zstd is requested but not supported in runtime', () => {
            const spy = vi.spyOn(zlib, 'createZstdDecompress').mockImplementation(() => undefined);
            // Also test branch where createZstdDecompress returns undefined
            expect(() => getDecompressor('https://example.com/db.zst')).toThrow('Node.js >= 22');
            spy.mockRestore();
        });
    });

    describe('getHttpStream', () => {
        it('rejects on exceeding max redirects', async () => {
            await expect(getHttpStream(`${serverUrl}/loop1`)).rejects.toThrow('Too many redirects');
        });

        it('rejects on timeout', async () => {
            await expect(getHttpStream(`${serverUrl}/slow`, 50)).rejects.toThrow('timeout');
        });

        it('handles connection error on invalid port', async () => {
            await expect(getHttpStream('http://127.0.0.1:1')).rejects.toThrow();
        });

        it('uses https module for https URLs', async () => {
            const spy = vi.spyOn(https, 'get').mockImplementationOnce((_url, _opts, callback) => {
                const mockRes = {
                    statusCode: 200,
                    headers: {},
                    on: vi.fn(),
                    pipe: vi.fn()
                };
                callback(mockRes);
                return { on: vi.fn() };
            });

            const stream = await getHttpStream('https://example.com/database.sqlite');
            expect(stream.statusCode).toBe(200);
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    describe('downloadDatabase', () => {
        it('returns error if no URL is provided', async () => {
            const result = await downloadDatabase({ url: '', targetPath: path.join(tempDir, 'db.sqlite') });
            expect(result.success).toBe(false);
            expect(result.error).toContain('No URL');
        });

        it('creates destination directory if not exists', async () => {
            const nestedPath = path.join(tempDir, 'subfolder', 'deep', 'db.sqlite');
            const result = await downloadDatabase({
                url: `${serverUrl}/database.sqlite`,
                targetPath: nestedPath
            });
            expect(result.success).toBe(true);
            expect(fs.existsSync(nestedPath)).toBe(true);
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

        it('downloads and decompresses gzipped SQLite file with redirect', async () => {
            const targetPath = path.join(tempDir, 'downloaded_redirect.sqlite');
            const result = await downloadDatabase({
                url: `${serverUrl}/redirect`,
                targetPath
            });

            expect(result.success).toBe(true);
            expect(result.downloaded).toBe(true);
            expect(fs.existsSync(targetPath)).toBe(true);
            expect(validateSqliteHeader(targetPath)).toBe(true);
            expect(fs.statSync(targetPath).size).toBe(SQLITE_SAMPLE.length);
        });

        it('downloads and decompresses zstd SQLite file', async () => {
            const targetPath = path.join(tempDir, 'downloaded_zstd.sqlite');
            const result = await downloadDatabase({
                url: `${serverUrl}/database.sqlite.zst`,
                targetPath
            });

            if (typeof zlib.createZstdDecompress === 'function') {
                expect(result.success).toBe(true);
                expect(result.downloaded).toBe(true);
                expect(fs.existsSync(targetPath)).toBe(true);
                expect(validateSqliteHeader(targetPath)).toBe(true);
            } else {
                expect(result.success).toBe(false);
                expect(result.error).toContain('Node.js >= 22');
            }
        });

        it('downloads and decompresses brotli SQLite file', async () => {
            const targetPath = path.join(tempDir, 'downloaded_brotli.sqlite');
            const result = await downloadDatabase({
                url: `${serverUrl}/database.sqlite.br`,
                targetPath
            });

            expect(result.success).toBe(true);
            expect(result.downloaded).toBe(true);
            expect(fs.existsSync(targetPath)).toBe(true);
            expect(validateSqliteHeader(targetPath)).toBe(true);
        });

        it('downloads gzip with Content-Type gzip even without .gz extension', async () => {
            const targetPath = path.join(tempDir, 'downloaded_custom_header.sqlite');
            const result = await downloadDatabase({
                url: `${serverUrl}/gzip-header-custom-url`,
                targetPath
            });

            expect(result.success).toBe(true);
            expect(result.downloaded).toBe(true);
            expect(validateSqliteHeader(targetPath)).toBe(true);
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
