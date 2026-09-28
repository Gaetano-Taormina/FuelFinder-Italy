/* oxlint-disable no-console */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/testDbFactory.js';
import { sync } from '../../server/sync/index.js';
import * as network from '../../server/sync/network.js';

describe('MIMIT Sync Service Integration', () => {
    let db;

    beforeEach(async () => {
        db = await createTestDb({ includeSyncMeta: true, seedDefault: false });
    });

    it('gracefully skips sync when MAINTENANCE_MODE is active', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        process.env.MAINTENANCE_MODE = 'true';

        await sync(db);

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Maintenance Mode'));
        delete process.env.MAINTENANCE_MODE;
        warnSpy.mockRestore();
    });

    it('skips sync when MIMIT headers show data is already up to date', async () => {
        vi.spyOn(network, 'checkUpdates').mockResolvedValue({
            stationsUpdated: false,
            pricesUpdated: false,
            anagraficaLastModified: 'Wed, 28 Sep 2026 12:00:00 GMT',
            prezziLastModified: 'Wed, 28 Sep 2026 12:00:00 GMT'
        });

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await sync(db, 0, { showProgress: false, retryDelayMs: 10 });

        expect(network.checkUpdates).toHaveBeenCalled();
        logSpy.mockRestore();
        vi.restoreAllMocks();
    });

    it('retries on failure up to configured attempts and throws when exhausted', async () => {
        vi.spyOn(network, 'checkUpdates').mockRejectedValue(new Error('MIMIT Server 503 Service Unavailable'));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(sync(db, 1, { retryDelayMs: 10 })).rejects.toThrow('MIMIT Server 503 Service Unavailable');

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Retrying in'));
        warnSpy.mockRestore();
        errSpy.mockRestore();
        vi.restoreAllMocks();
    });
});
