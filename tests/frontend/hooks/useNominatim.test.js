/* eslint-disable no-console */
import { act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNominatim } from '../../../src/hooks/useNominatim';

describe('useNominatim Hook', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('dovrebbe fare fetch dei suggerimenti con debounce e gestire lo stato', async () => {
        const mockData = [{ place_id: '1', display_name: 'Milano' }];
        global.fetch.mockResolvedValueOnce({
            json: async () => mockData
        });

        const { result } = renderHook(() => useNominatim());
        
        let promise;
        act(() => {
            promise = result.current.fetchSuggestions('Mil');
        });

        await act(async () => {
            vi.advanceTimersByTime(500);
            await promise;
        });
        
        const data = await promise;
        expect(data).toEqual(mockData);
        expect(result.current.suggestions).toEqual(mockData);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('q=Mil'));
    });

    it('dovrebbe gestire chiamate multiple (debounce)', async () => {
        global.fetch.mockResolvedValueOnce({
            json: async () => [{ place_id: 1, display_name: 'Roma', lat: '41.9', lon: '12.5' }]
        });
        
        const { result } = renderHook(() => useNominatim());
        
        let promise2;
        act(() => {
            result.current.fetchSuggestions('Ro');
            promise2 = result.current.fetchSuggestions('Roma');
        });
        
        await act(async () => {
            vi.advanceTimersByTime(500);
            await promise2;
        });
        
        const data = await promise2;
        expect(data).toHaveLength(1);
    });

    it('dovrebbe fare clearTimeout in clearSuggestions', () => {
        const { result } = renderHook(() => useNominatim());
        act(() => {
            result.current.fetchSuggestions('Ro');
            result.current.clearSuggestions();
        });
        expect(result.current.suggestions).toEqual([]);
    });

    it('dovrebbe gestire errore in fetchSuggestions', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { result } = renderHook(() => useNominatim());
        
        let promise;
        act(() => {
            promise = result.current.fetchSuggestions('Roma');
        });

        await act(async () => {
            vi.advanceTimersByTime(500);
            await promise;
        });
        
        const data = await promise;
        expect(data).toEqual([]);
        expect(result.current.suggestions).toEqual([]);
        
        consoleSpy.mockRestore();
    });

    it('dovrebbe cancellare i timer e le suggestions in clearSuggestions', () => {
        const { result } = renderHook(() => useNominatim());
        
        act(() => {
            result.current.fetchSuggestions('Mil');
            result.current.clearSuggestions();
        });

        expect(result.current.suggestions).toEqual([]);
    });

    it('dovrebbe cercare le coordinate per una query esatta in searchCoords', async () => {
        const mockData = [{ lat: '45.46', lon: '9.19' }];
        global.fetch.mockResolvedValueOnce({
            json: async () => mockData
        });

        const { result } = renderHook(() => useNominatim());
        
        const coords = await result.current.searchCoords('Milano, Italia');
        
        expect(coords).toEqual({ lat: 45.46, lng: 9.19 });
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('dovrebbe ritornare null se searchCoords fallisce o non trova risultati', async () => {
        global.fetch.mockResolvedValueOnce({
            json: async () => []
        });

        const { result } = renderHook(() => useNominatim());
        const coords = await result.current.searchCoords('LuogoInesistente123');
        expect(coords).toBeNull();
        
        global.fetch.mockResolvedValueOnce({
            json: async () => null
        });
        const coordsNull = await result.current.searchCoords('NullData');
        expect(coordsNull).toBeNull();
        
        global.fetch.mockRejectedValueOnce(new Error('Network error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const coordsError = await result.current.searchCoords('ErrorPlace');
        expect(coordsError).toBeNull();
        consoleSpy.mockRestore();
    });

    it('dovrebbe chiamare clearSuggestions anche senza timeout attivo', () => {
        const { result } = renderHook(() => useNominatim());
        act(() => {
            result.current.clearSuggestions();
        });
        expect(result.current.suggestions).toEqual([]);
    });
});
