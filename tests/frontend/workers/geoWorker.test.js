import { describe, it, expect, vi } from 'vitest';
import { calculateDistance, processStations, handleWorkerMessage } from '../../../src/workers/geoWorker.js';

describe('Geo Worker - Off-thread Calculations', () => {
  it('computes accurate Haversine distance between two coordinates', () => {
    // Rome (41.9028, 12.4964) to Milan (45.4642, 9.1900) ~ 477 km
    const dist = calculateDistance(41.9028, 12.4964, 45.4642, 9.1900);
    expect(dist).toBeGreaterThan(470);
    expect(dist).toBeLessThan(490);
  });

  it('handles null or missing coordinates in calculateDistance', () => {
    expect(calculateDistance(null, 12, 45, 9)).toBe(0);
    expect(calculateDistance(41, null, 45, 9)).toBe(0);
    expect(calculateDistance(41, 12, null, 9)).toBe(0);
    expect(calculateDistance(41, 12, 45, null)).toBe(0);
  });

  it('processes, filters by radius and ranks stations by convenience score', () => {
    const origin = { lat: 37.31, lng: 13.58 };
    const stations = [
      { id: 1, name: 'Close & Cheap', lat: 37.311, lng: 13.581, currentPrice: 1.70 },
      { id: 2, name: 'Close & Expensive', lat: 37.312, lng: 13.582, prezzo: '2.10' },
      { id: 3, name: 'Far Away Station', lat: 45.0, lng: 9.0, currentPrice: 1.50 },
      { id: 4, name: 'No Price Station', lat: 37.313, lng: 13.583, currentPrice: 0 }
    ];

    const results = processStations(stations, origin, 10);
    expect(results.length).toBe(3);
    expect(results[0].id).toBe(1);
    expect(results[0].dist).toBeDefined();
    expect(results[0].convenienceScore).toBeDefined();
    expect(results[0].convenienceScore).toBeLessThan(results[1].convenienceScore);
    expect(results[2].convenienceScore).toBe(999);

    // Default radius test
    const defaultRadiusResults = processStations(stations, origin);
    expect(defaultRadiusResults.length).toBe(3);
  });

  it('returns raw stations if originCoords is invalid or stations is not an array', () => {
    expect(processStations(null, { lat: 0, lng: 0 })).toEqual([]);
    const list = [{ id: 1 }];
    expect(processStations(list, null)).toBe(list);
    expect(processStations(list, { lat: 'invalid', lng: 0 })).toBe(list);
    expect(processStations(list, { lat: 0, lng: 'invalid' })).toBe(list);
  });

  it('dispatches PROCESS_STATIONS event via handleWorkerMessage', () => {
    const mockTarget = { postMessage: vi.fn() };
    const event = {
      data: {
        id: 'job-1',
        type: 'PROCESS_STATIONS',
        stations: [{ id: 10, lat: 37.31, lng: 13.58, currentPrice: 1.75 }],
        originCoords: { lat: 37.31, lng: 13.58 },
        radiusKm: 25
      }
    };

    handleWorkerMessage(event, mockTarget);
    expect(mockTarget.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'job-1',
        type: 'PROCESS_STATIONS_SUCCESS'
      })
    );

    // Branch: invalid type or missing target
    handleWorkerMessage({ data: { type: 'UNKNOWN' } }, mockTarget);
    handleWorkerMessage(null, null);
  });
});
