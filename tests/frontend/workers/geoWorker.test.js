import { describe, it, expect } from 'vitest';
import { calculateDistance, processStations } from '../../../src/workers/geoWorker.js';

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
  });

  it('processes, filters by radius and ranks stations by convenience score', () => {
    const origin = { lat: 37.31, lng: 13.58 };
    const stations = [
      { id: 1, name: 'Close & Cheap', lat: 37.311, lng: 13.581, currentPrice: 1.70 },
      { id: 2, name: 'Close & Expensive', lat: 37.312, lng: 13.582, currentPrice: 2.10 },
      { id: 3, name: 'Far Away Station', lat: 45.0, lng: 9.0, currentPrice: 1.50 }
    ];

    const results = processStations(stations, origin, 10);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe(1);
    expect(results[0].dist).toBeDefined();
    expect(results[0].convenienceScore).toBeDefined();
    expect(results[0].convenienceScore).toBeLessThan(results[1].convenienceScore);
  });

  it('returns raw stations if originCoords is invalid or stations is not an array', () => {
    expect(processStations(null, { lat: 0, lng: 0 })).toEqual([]);
    const list = [{ id: 1 }];
    expect(processStations(list, null)).toBe(list);
    expect(processStations(list, { lat: 'invalid' })).toBe(list);
  });
});
