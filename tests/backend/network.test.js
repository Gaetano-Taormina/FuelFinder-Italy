/* oxlint-disable no-console */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { checkUpdates, downloadFile, BROWSER_HEADERS } from '../../server/sync/network.js';

describe('Sync Network Module', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('exports standard browser headers', () => {
        expect(BROWSER_HEADERS['User-Agent']).toContain('Mozilla/5.0');
        expect(BROWSER_HEADERS.Accept).toContain('text/csv');
    });

    it('skips update when HEAD returns 304 Not Modified', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            status: 304,
            ok: false,
            headers: new Headers()
        });

        const result = await checkUpdates('Wed, 28 Sep 2026 12:00:00 GMT');
        expect(result.shouldUpdate).toBe(false);
    });

    it('detects update and extracts new last-modified when HEAD returns 200', async () => {
        const mockHeaders = new Headers();
        mockHeaders.set('last-modified', 'Thu, 29 Sep 2026 08:00:00 GMT');

        global.fetch = vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
            headers: mockHeaders
        });

        const result = await checkUpdates('Wed, 28 Sep 2026 12:00:00 GMT');
        expect(result.shouldUpdate).toBe(true);
        expect(result.newLastModified).toBe('Thu, 29 Sep 2026 08:00:00 GMT');
    });

    it('falls back to direct download when HEAD returns non-ok HTTP status', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        global.fetch = vi.fn().mockResolvedValue({
            status: 403,
            ok: false,
            headers: new Headers()
        });

        const result = await checkUpdates('Wed, 28 Sep 2026 12:00:00 GMT');
        expect(result.shouldUpdate).toBe(true);
        expect(result.newLastModified).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MIMIT HEAD returned HTTP 403'));
        warnSpy.mockRestore();
    });

    it('falls back to direct download when HEAD request throws timeout/network error', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        global.fetch = vi.fn().mockRejectedValue(new Error('The operation was aborted due to timeout'));

        const result = await checkUpdates('Wed, 28 Sep 2026 12:00:00 GMT');
        expect(result.shouldUpdate).toBe(true);
        expect(result.newLastModified).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MIMIT HEAD check failed or timed out'));
        warnSpy.mockRestore();
    });

    it('downloads CSV file and streams it to temporary location', async () => {
        const mockContent = 'col1;col2\nval1;val2';
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(mockContent));
                controller.close();
            }
        });

        global.fetch = vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
            body: stream
        });

        const tmpFilePath = await downloadFile('https://example.com/test.csv', 300000, 0, true);
        expect(fs.existsSync(tmpFilePath)).toBe(true);
        expect(fs.readFileSync(tmpFilePath, 'utf8')).toBe(mockContent);

        // Cleanup
        fs.unlinkSync(tmpFilePath);
    });

    it('throws descriptive error if downloadFile receives non-200 response', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            status: 502,
            ok: false
        });

        await expect(downloadFile('https://example.com/test.csv', 300000, 0, true)).rejects.toThrow('Errore Server MIMIT - HTTP 502');
    });
});
