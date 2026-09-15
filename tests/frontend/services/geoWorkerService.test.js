import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchStationsNearby } from '../../../src/services/geoWorkerService.js';

describe('GeoWorkerService (Shift-Left Backend API)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array when originCoords is missing or invalid', async () => {
    expect(await fetchStationsNearby(null)).toEqual([]);
    expect(await fetchStationsNearby({ lat: 'invalid', lng: 12 })).toEqual([]);
    expect(await fetchStationsNearby({ lat: 41, lng: 'invalid' })).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches nearby stations with default parameters successfully', async () => {
    const mockStations = [
      { id: 1, name: 'Station 1', dist: 1.5, convenienceScore: 1.82 },
      { id: 2, name: 'Station 2', dist: 3.2, convenienceScore: 1.85 }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stations: mockStations })
    });

    const result = await fetchStationsNearby({ lat: 41.9028, lng: 12.4964 });
    expect(result).toEqual(mockStations);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/stations?lat=41.9028&lng=12.4964&radius=5&fuelType=Benzina&serviceType=1'
    );
  });

  it('fetches nearby stations with custom parameters and handles empty station payload', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    const result = await fetchStationsNearby({ lat: 45.4642, lng: 9.19 }, 15, 'Gasolio', '0');
    expect(result).toEqual([]);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/stations?lat=45.4642&lng=9.19&radius=15&fuelType=Gasolio&serviceType=0'
    );
  });

  it('throws an error when backend response is not ok', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    await expect(fetchStationsNearby({ lat: 41.9028, lng: 12.4964 })).rejects.toThrow(
      'Network error fetching stations'
    );
  });
});
