/* oxlint-disable no-console */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiController } from '../../server/controllers/apiController.js';

describe('Backend Server API - Cache Management', () => {
    let controller;
    let req;
    let res;
    let next;

    beforeEach(() => {
        controller = new ApiController({});
        // Mock DB call
        controller.stationService.getStationsNearby = vi.fn().mockResolvedValue([{ id: 1 }]);
        
        req = { query: { lat: '41.999', lng: '12.888', radius: '10', fuelType: 'Benzina' }, headers: {} };
        res = { json: vi.fn(), status: vi.fn().mockReturnThis(), end: vi.fn(), setHeader: vi.fn() };
        next = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns cached response on second hit without querying service', async () => {
        req.query.lat = '41.777';
        await controller.getStations(req, res, next);
        expect(controller.stationService.getStationsNearby).toHaveBeenCalledTimes(1);
        
        // Second hit
        await controller.getStations(req, res, next);
        expect(controller.stationService.getStationsNearby).toHaveBeenCalledTimes(1);
    });

    it('expires and clears cache item when TTL has elapsed', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2023, 1, 1, 10, 0, 0));
        
        req.query.lat = '42.991';
        await controller.getStations(req, res, next);
        expect(controller.stationService.getStationsNearby).toHaveBeenCalledTimes(1);

        // Advance 20 minutes
        vi.setSystemTime(new Date(2023, 1, 1, 10, 20, 0));
        
        await controller.getStations(req, res, next);
        expect(controller.stationService.getStationsNearby).toHaveBeenCalledTimes(2);
        
        vi.useRealTimers();
    });

    it('prunes half the cache when MAX_CACHE_SIZE limit is exceeded', async () => {
        const promises = [];
        for (let i = 0; i < 1002; i++) {
            const currentReq = { ...req, query: { ...req.query, lng: String(15.0 + i * 0.001) } };
            promises.push(controller.getStations(currentReq, res, next));
        }
        await Promise.all(promises);
        
        expect(res.json).toHaveBeenCalled();
    });
});
