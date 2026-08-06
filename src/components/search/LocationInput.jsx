import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStations } from '../../context/StationsContext';

export default function LocationInput() {
    const { t } = useTranslation();
    const { locationStr, setLocationStr, setUserPos } = useStations();

    const [isLocating, setIsLocating] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const timeoutRef = useRef(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setLocationStr(val);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (val.trim().length > 2 && val !== t('dyn_current_pos') && val !== t('dyn_map_point')) {
            timeoutRef.current = setTimeout(async () => {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=it&limit=5`);
                    const data = await res.json();
                    if (data) {
                        setSuggestions(data);
                        setShowSuggestions(true);
                    }
                } catch (err) {
                    console.error("Autocomplete error:", err);
                }
            }, 500);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setLocationStr(suggestion.display_name);
        setShowSuggestions(false);
        setUserPos({
            lat: parseFloat(suggestion.lat),
            lng: parseFloat(suggestion.lon),
            type: 'manual'
        });
    };

    const handleSearch = async () => {
        if (!locationStr.trim()) return;
        if (locationStr === t('dyn_current_pos') || locationStr === t('dyn_map_point')) return;
        
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationStr)}&countrycodes=it`);
            const data = await res.json();
            if (data && data.length > 0) {
                setUserPos({
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    type: 'manual'
                });
            } else {
                alert(t('dyn_not_found'));
            }
        } catch (e) {
            console.error(e);
            alert(t('dyn_not_found'));
        }
    };

    const handleGPS = () => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setIsLocating(false);
                setUserPos({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    type: 'gps'
                });
                setLocationStr(t('dyn_current_pos'));
            },
            () => {
                setIsLocating(false);
                alert(t('dyn_gps_error'));
            }
        );
    };

    return (
        <div className="w-full md:col-span-3 flex gap-2 items-end">
            <div className="grow relative" ref={wrapperRef}>
                <label htmlFor="location-input" className="block text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('lbl_location')}</label>
                <input 
                    id="location-input"
                    name="location"
                    type="text" 
                    value={locationStr} 
                    onChange={handleInputChange} 
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={t('ph_location')} 
                    className="input-field"
                />
                {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.map((s, idx) => (
                            <li 
                                key={idx}
                                onClick={() => handleSuggestionClick(s)}
                                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer text-sm sm:text-base text-slate-800 dark:text-slate-200 border-b last:border-b-0 border-slate-200 dark:border-slate-600 truncate"
                            >
                                {s.display_name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <button onClick={handleSearch} className="btn-primary hidden sm:block">
                {t('btn_search')}
            </button>
            <button onClick={handleSearch} aria-label={t('btn_search')} className="btn-primary sm:hidden flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                </svg>
            </button>
            <button onClick={handleGPS} aria-label={t('title_gps')} disabled={isLocating} title={t('title_gps')} className="btn-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
                </svg>
            </button>
        </div>
    );
}
