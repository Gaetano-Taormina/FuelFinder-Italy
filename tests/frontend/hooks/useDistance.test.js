import { describe, it, expect, vi } from 'vitest';
import { calculateDistance, getDistance, useDistanceLogic } from '../../../src/hooks/useDistance';
import { renderHook } from '@testing-library/react';

vi.mock('../../../src/context/StationsContext', () => ({
  useStations: () => ({
    stations: [{ id: 1, name: 'Station 1' }, { id: 2, name: 'Station 2' }]
  })
}));

describe('useDistance Hook & Calculations', () => {
  it('calculates 0 distance when missing parameters', () => {
    expect(calculateDistance(null, null, 41.9, 12.5)).toBe(0);
    expect(calculateDistance(41.9, 12.5, null, null)).toBe(0);
    expect(calculateDistance()).toBe(0);
  });

  it('calculates correct Haversine distance between two coordinates', () => {
    // Distance Rome (41.9028, 12.4964) to Milan (45.4642, 9.1900) ~ 477 km
    const dist = calculateDistance(41.9028, 12.4964, 45.4642, 9.1900);
    expect(Math.round(dist)).toBe(477);
    expect(getDistance(41.9028, 12.4964, 45.4642, 9.1900)).toBe(dist);
  });

  it('useDistanceLogic returns stations from StationsContext', () => {
    const { result } = renderHook(() => useDistanceLogic());
    expect(result.current).toHaveLength(2);
    expect(result.current[0].name).toBe('Station 1');
  });
});
