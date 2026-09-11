/* oxlint-disable no-console */
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNominatim, clearNominatimCache } from '../../../src/hooks/useNominatim';

describe('useNominatim Hook', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        global.fetch = vi.fn();
        clearNominatimCache();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('fetches suggestions with debounce and manages internal state', async () => {
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
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('q=Mil'), expect.anything());
    });

    it('handles multiple rapid invocations through debounce', async () => {
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

    it('clears timeout during clearSuggestions', () => {
        const { result } = renderHook(() => useNominatim());
        act(() => {
            result.current.fetchSuggestions('Ro');
            result.current.clearSuggestions();
        });
        expect(result.current.suggestions).toEqual([]);
    });

    it('handles network error in fetchSuggestions gracefully', async () => {
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

    it('clears timers and suggestions on clearSuggestions', () => {
        const { result } = renderHook(() => useNominatim());
        
        act(() => {
            result.current.fetchSuggestions('Mil');
            result.current.clearSuggestions();
        });

        expect(result.current.suggestions).toEqual([]);
    });

    it('searches exact coordinates for query in searchCoords', async () => {
        const mockData = [{ lat: '45.46', lon: '9.19' }];
        global.fetch.mockResolvedValueOnce({
            json: async () => mockData
        });

        const { result } = renderHook(() => useNominatim());
        
        const coords = await result.current.searchCoords('Milano, Italia');
        
        expect(coords).toEqual({ lat: 45.46, lng: 9.19 });
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns null if searchCoords fails or finds no results', async () => {
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

    it('allows calling clearSuggestions without active timer', () => {
        const { result } = renderHook(() => useNominatim());
        act(() => {
            result.current.clearSuggestions();
        });
        expect(result.current.suggestions).toEqual([]);
    });

    it('returns empty array immediately for empty or whitespace query or null input', async () => {
        const { result } = renderHook(() => useNominatim());
        let res1;
        await act(async () => {
            res1 = await result.current.fetchSuggestions('   ');
        });
        expect(res1).toEqual([]);

        let res2;
        await act(async () => {
            res2 = await result.current.fetchSuggestions(null);
        });
        expect(res2).toEqual([]);

        const nullCoords = await result.current.searchCoords(null);
        expect(nullCoords).toBeNull();

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('serves suggestions from cache on repeated queries', async () => {
        const mockData = [{ place_id: '1', display_name: 'Torino' }];
        global.fetch.mockResolvedValueOnce({
            json: async () => mockData
        });

        const { result } = renderHook(() => useNominatim());
        
        let promise1;
        act(() => {
            promise1 = result.current.fetchSuggestions('Torino');
        });
        await act(async () => {
            vi.advanceTimersByTime(500);
            await promise1;
        });
        expect(global.fetch).toHaveBeenCalledTimes(1);

        let promise2;
        act(() => {
            promise2 = result.current.fetchSuggestions('torino');
        });
        await act(async () => {
            vi.advanceTimersByTime(500);
            await promise2;
        });
        const cachedResult = await promise2;
        expect(cachedResult).toEqual(mockData);
        expect(global.fetch).toHaveBeenCalledTimes(1); // Non ripete la fetch
    });

    it('caches coords for identical searches', async () => {
        const mockData = [{ lat: '45.07', lon: '7.68' }];
        global.fetch.mockResolvedValueOnce({
            json: async () => mockData
        });

        const { result } = renderHook(() => useNominatim());
        const coords1 = await result.current.searchCoords('Torino');
        expect(coords1).toEqual({ lat: 45.07, lng: 7.68 });
        expect(global.fetch).toHaveBeenCalledTimes(1);

        const coords2 = await result.current.searchCoords('torino');
        expect(coords2).toEqual({ lat: 45.07, lng: 7.68 });
        expect(global.fetch).toHaveBeenCalledTimes(1);

        const emptyCoords = await result.current.searchCoords('   ');
        expect(emptyCoords).toBeNull();
    });

    it('evicts oldest entries when cache exceeds MAX_CACHE_SIZE', async () => {
        global.fetch.mockResolvedValue({
            json: async () => [{ lat: '10', lon: '20' }]
        });

        const { result } = renderHook(() => useNominatim());
        // Insert 105 distinct locations to trigger eviction of first 5
        for (let i = 0; i < 105; i++) {
            // oxlint-disable-next-line no-await-in-loop
            await result.current.searchCoords(`City_${i}`);
        }
        expect(global.fetch).toHaveBeenCalledTimes(105);
    });

    it('handles AbortError gracefully during fetchSuggestions without resetting suggestions', async () => {
        const abortErr = new Error('The user aborted a request.');
        abortErr.name = 'AbortError';
        global.fetch.mockRejectedValueOnce(abortErr);

        const { result } = renderHook(() => useNominatim());
        let promise;
        act(() => {
            promise = result.current.fetchSuggestions('Firenze');
        });
        await act(async () => {
            vi.advanceTimersByTime(500);
            await promise;
        });
        // Abort error should return cleanly
        expect(result.current.suggestions).toEqual([]);
    });

    it('aborts previous inflight request when new search starts', async () => {
        let resolveFirst;
        global.fetch.mockImplementationOnce(() => new Promise((res) => { resolveFirst = res; }));
        global.fetch.mockResolvedValueOnce({
            json: async () => [{ place_id: '2', display_name: 'Roma2' }]
        });

        const { result } = renderHook(() => useNominatim());
        act(() => {
            result.current.fetchSuggestions('Roma1');
        });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        let promise2;
        act(() => {
            promise2 = result.current.fetchSuggestions('Roma2');
        });
        await act(async () => {
            vi.advanceTimersByTime(500);
            await promise2;
        });

        const data = await promise2;
        expect(data).toHaveLength(1);
        if (resolveFirst) {
            resolveFirst({ json: async () => [] });
        }
    });

    it('aborts active controller when clearSuggestions is called while fetch is inflight', async () => {
        let resolveInflight;
        global.fetch.mockImplementationOnce(() => new Promise((res) => { resolveInflight = res; }));

        const { result } = renderHook(() => useNominatim());
        act(() => {
            result.current.fetchSuggestions('PalermoInflight');
        });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        act(() => {
            result.current.clearSuggestions();
        });
        expect(result.current.suggestions).toEqual([]);

        if (resolveInflight) {
            resolveInflight({ json: async () => [] });
        }
    });
});
