/* oxlint-disable no-console */
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGeolocation } from '../../../src/hooks/useGeolocation';

describe('useGeolocation Hook', () => {
    let originalGeolocation;

    beforeEach(() => {
        originalGeolocation = global.navigator.geolocation;
    });

    afterEach(() => {
        Object.defineProperty(global.navigator, 'geolocation', {
            value: originalGeolocation,
            configurable: true
        });
    });

    it('handles unsupported geolocation gracefully', async () => {
        Object.defineProperty(global.navigator, 'geolocation', {
            value: undefined,
            configurable: true
        });
        const { result } = renderHook(() => useGeolocation());
        
        await expect(result.current.locate()).rejects.toThrow('Geolocation not supported');
    });

    it('successfully retrieves coordinates and toggles isLocating', async () => {
        const mockPosition = { coords: { latitude: 45, longitude: 9 } };
        let successCallback;
        Object.defineProperty(global.navigator, 'geolocation', {
            value: {
                getCurrentPosition: vi.fn((success) => {
                    successCallback = success;
                })
            },
            configurable: true
        });

        const { result } = renderHook(() => useGeolocation());
        expect(result.current.isLocating).toBe(false);

        let promise;
        act(() => {
            promise = result.current.locate();
        });
        
        expect(result.current.isLocating).toBe(true);
        
        await act(async () => {
            successCallback(mockPosition);
            await promise;
        });
        
        const pos = await promise;
        expect(pos).toEqual({ lat: 45, lng: 9 });
        expect(result.current.isLocating).toBe(false);
    });

    it('handles geolocation errors properly', async () => {
        Object.defineProperty(global.navigator, 'geolocation', {
            value: {
                getCurrentPosition: vi.fn((success, error) => error(new Error('Permission denied')))
            },
            configurable: true
        });

        const { result } = renderHook(() => useGeolocation());

        let promise;
        act(() => {
            promise = result.current.locate();
        });

        await expect(promise).rejects.toThrow('Permission denied');
        expect(result.current.isLocating).toBe(false);
    });
});
