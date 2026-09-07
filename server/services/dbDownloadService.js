/* oxlint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';

const SQLITE_HEADER = 'SQLite format 3\0';

/**
 * Validates whether the given file path begins with the valid SQLite 3 magic header.
 * @param {string} filePath 
 * @returns {boolean}
 */
export function validateSqliteHeader(filePath) {
    try {
        if (!fs.existsSync(filePath)) return false;
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(16);
        fs.readSync(fd, buffer, 0, 16, 0);
        fs.closeSync(fd);
        return buffer.toString('utf8', 0, 16) === SQLITE_HEADER;
    } catch (err) {
        console.error('[DB Download] Error validating SQLite header:', err.message);
        return false;
    }
}

/**
 * Streams an HTTP(S) resource with automatic redirect following and timeout handling.
 * @param {string} url 
 * @param {number} timeoutMs 
 * @param {number} [redirectCount=0] 
 * @returns {Promise<import('node:http').IncomingMessage>}
 */
export function getHttpStream(url, timeoutMs = 60000, redirectCount = 0) {
    if (redirectCount > 5) {
        return Promise.reject(new Error('Too many redirects while downloading database'));
    }

    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const req = client.get(parsedUrl, {
            headers: {
                'User-Agent': 'FuelFinder-Downloader/1.0',
                'Accept': 'application/octet-stream, application/gzip, */*'
            },
            timeout: timeoutMs
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const nextUrl = new URL(res.headers.location, url).toString();
                res.resume(); // Discard stream to avoid memory leak
                return resolve(getHttpStream(nextUrl, timeoutMs, redirectCount + 1));
            }

            if (res.statusCode < 200 || res.statusCode >= 300) {
                res.resume();
                return reject(new Error(`HTTP error ${res.statusCode}: ${res.statusMessage || 'Request failed'}`));
            }

            resolve(res);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Download timeout of ${timeoutMs}ms exceeded`));
        });

        req.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Downloads a database file (optionally gzipped) from a remote URL to targetPath atomically.
 * 
 * @param {Object} options
 * @param {string} options.url - Remote URL to download database from (supports .gz or raw .sqlite)
 * @param {string} options.targetPath - Destination path for database.sqlite
 * @param {number} [options.timeoutMs=60000] - Download timeout in milliseconds
 * @param {boolean} [options.force=false] - Force download even if target file already exists
 * @returns {Promise<{success: boolean, downloaded: boolean, error?: string, sizeBytes?: number}>}
 */
export async function downloadDatabase({ url, targetPath, timeoutMs = 60000, force = false }) {
    if (!url) {
        return { success: false, downloaded: false, error: 'No URL provided' };
    }

    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // If destination already exists with a valid SQLite header and force is false, skip download
    if (!force && fs.existsSync(targetPath) && validateSqliteHeader(targetPath)) {
        const stats = fs.statSync(targetPath);
        console.log(`[DB Download] Valid local database already present at ${targetPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB). Skipping download.`);
        return { success: true, downloaded: false, sizeBytes: stats.size };
    }

    const tempPath = `${targetPath}.tmp-${Date.now()}`;
    console.log(`[DB Download] Downloading SQLite database from: ${url} ...`);
    const startTime = Date.now();

    try {
        const responseStream = await getHttpStream(url, timeoutMs);

        const contentType = (responseStream.headers['content-type'] || '').toLowerCase();
        const contentEncoding = (responseStream.headers['content-encoding'] || '').toLowerCase();
        const isGzipped = url.endsWith('.gz') || contentType.includes('gzip') || contentEncoding.includes('gzip');

        const fileStream = fs.createWriteStream(tempPath);

        if (isGzipped) {
            const gunzip = zlib.createGunzip();
            await pipeline(responseStream, gunzip, fileStream);
        } else {
            await pipeline(responseStream, fileStream);
        }

        // Validate integrity of extracted SQLite file
        if (!validateSqliteHeader(tempPath)) {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            throw new Error('Downloaded file does not contain a valid SQLite 3 header');
        }

        // Atomic replace
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }
        fs.renameSync(tempPath, targetPath);

        const durationMs = Date.now() - startTime;
        const stats = fs.statSync(targetPath);
        console.log(`[DB Download] ✅ Database successfully downloaded and extracted (${(stats.size / 1024 / 1024).toFixed(2)} MB in ${(durationMs / 1000).toFixed(2)}s).`);

        return {
            success: true,
            downloaded: true,
            sizeBytes: stats.size
        };
    } catch (err) {
        /* v8 ignore start */
        if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch {}
        }
        /* v8 ignore stop */
        console.error(`[DB Download] ❌ Failed to download database: ${err.message}`);
        return {
            success: false,
            downloaded: false,
            error: err.message
        };
    }
}
