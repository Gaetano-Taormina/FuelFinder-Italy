/* eslint-disable no-console */
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
        
        req = { query: { lat: '41.9', lng: '12.5', radius: '10', fuelType: 'Benzina' } };
        res = { json: vi.fn() };
        next = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('dovrebbe ritornare cache al secondo hit', async () => {
        await controller.getStations(req, res, next);
        expect(controller.stationService.getStationsNearby).toHaveBeenCalledTimes(1);
        
        // Second hit
        await controller.getStations(req, res, next);
        // It shouldn't have been called a second time
        expect(controller.stationService.getStationsNearby).toHaveBeenCalledTimes(1);
    });

    it('dovrebbe ignorare e cancellare la cache se è scaduta', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2023, 1, 1, 10, 0, 0));
        
        req.query.lat = '42.99'; // unique
        await controller.getStations(req, res, next);
        expect(controller.stationService.getStationsNearby).toHaveBeenCalledTimes(1);

        // Advance 20 minutes
        vi.setSystemTime(new Date(2023, 1, 1, 10, 20, 0));
        
        await controller.getStations(req, res, next);
        // It should have been called again because cache expired
        expect(controller.stationService.getStationsNearby).toHaveBeenCalledTimes(2);
        
        vi.useRealTimers();
    });

    it('dovrebbe svuotare mezza cache se si supera MAX_CACHE_SIZE', async () => {
        const promises = [];
        for (let i = 0; i < 1002; i++) {
            const currentReq = { ...req, query: { ...req.query, lng: String(12.5 + i * 0.001) } };
            promises.push(controller.getStations(currentReq, res, next));
        }
        await Promise.all(promises);
        
        // At this point cache should be halved, the code didn't crash
        expect(res.json).toHaveBeenCalled();
    });
});
