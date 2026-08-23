import { useState, useCallback, useRef } from 'react';

export function useNominatim() {
    const [suggestions, setSuggestions] = useState([]);
    const timeoutRef = useRef(null);

    const fetchSuggestions = useCallback((val) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        return new Promise((resolve) => {
            timeoutRef.current = setTimeout(async () => {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=it&limit=5`);
                    const data = await res.json();
                    setSuggestions(data);
                    resolve(data);
                } catch (err) {
                    console.error("Autocomplete error:", err);
                    setSuggestions([]);
                    resolve([]);
                }
            }, 500);
        });
    }, []);

    const clearSuggestions = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setSuggestions([]);
    }, []);

    const searchCoords = useCallback(async (locationStr) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationStr)}&countrycodes=it`);
            const data = await res.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (e) {
            console.error(e);
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
