import { useState, useCallback, useRef } from 'react';

const MAX_CACHE_SIZE = 100;
const suggestionsCache = new Map();
const coordsCache = new Map();

/**
 * Helper to manage LRU Map cache
 */
function setCache(map, key, value) {
    if (map.size >= MAX_CACHE_SIZE) {
        const firstKey = map.keys().next().value;
        map.delete(firstKey);
    }
    map.set(key, value);
}

/**
 * Clears in-memory Nominatim caches (useful for testing)
 */
export function clearNominatimCache() {
    suggestionsCache.clear();
    coordsCache.clear();
}

export function useNominatim() {
    const [suggestions, setSuggestions] = useState([]);
    const timeoutRef = useRef(null);
    const abortControllerRef = useRef(null);

    const fetchSuggestions = useCallback((val) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        const normalizedVal = (val || '').trim().toLowerCase();
        if (!normalizedVal) {
            setSuggestions([]);
            return Promise.resolve([]);
        }

        return new Promise((resolve) => {
            timeoutRef.current = setTimeout(async () => {
                if (suggestionsCache.has(normalizedVal)) {
                    const cached = suggestionsCache.get(normalizedVal);
                    setSuggestions(cached);
                    resolve(cached);
                    return;
                }

                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }
                const controller = new AbortController();
                abortControllerRef.current = controller;

                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=it&limit=5&email=contact@fuelfinder.it`,
                        { signal: controller.signal }
                    );
                    if (res && res.ok === false) {
                        setSuggestions([]);
                        resolve([]);
                        return;
                    }
                    const data = await res.json();
                    const safeData = Array.isArray(data) ? data : [];
                    setCache(suggestionsCache, normalizedVal, safeData);
                    setSuggestions(safeData);
                    resolve(safeData);
                } catch (err) {
                    if (err.name === 'AbortError') {
                        resolve([]);
                        return;
                    }
                    setSuggestions([]);
                    resolve([]);
                }
            }, 500);
        });
    }, []);

    const clearSuggestions = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setSuggestions([]);
    }, []);

    const searchCoords = useCallback(async (locationStr) => {
        const normalizedLoc = (locationStr || '').trim().toLowerCase();
        if (!normalizedLoc) return null;

        if (coordsCache.has(normalizedLoc)) {
            return coordsCache.get(normalizedLoc);
        }

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationStr)}&countrycodes=it&email=contact@fuelfinder.it`);
            if (res && res.ok === false) return null;
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const coords = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                setCache(coordsCache, normalizedLoc, coords);
                return coords;
            }
        } catch {
            // Ignored error
        }
        return null;
    }, []);

    return { 
        suggestions, 
        fetchSuggestions, 
        clearSuggestions,
        searchCoords 
    };
}

