import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStations } from '../../context/StationsContext';
import { useNominatim } from '../../hooks/useNominatim';
import LocationAutocomplete from './LocationAutocomplete';
import GPSButton from './GPSButton';

export default function LocationInput() {
    const { t } = useTranslation();
    const { locationStr, setLocationStr, setUserPos } = useStations();
    
    const [showSuggestions, setShowSuggestions] = useState(false);
    const { suggestions, fetchSuggestions, clearSuggestions, searchCoords } = useNominatim();

    const handleInputChange = (e) => {
        const val = e.target.value;
        setLocationStr(val);

        if (val.trim().length > 2 && val !== t('dyn_current_pos') && val !== t('dyn_map_point')) {
            fetchSuggestions(val).then((data) => {
                setShowSuggestions(true);
            });
        } else {
            clearSuggestions();
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
        
        const coords = await searchCoords(locationStr);
        if (coords) {
            setUserPos({ ...coords, type: 'manual' });
        } else {
            alert(t('dyn_not_found'));
        }
    };

    const handleLocationFound = (coords) => {
        setUserPos({ ...coords, type: 'gps' });
        setLocationStr(t('dyn_current_pos'));
    };

    return (
        <div className="w-full md:col-span-3 flex gap-2 items-end">
            <LocationAutocomplete 
                value={locationStr}
                onChange={handleInputChange}
                onSearch={handleSearch}
                suggestions={suggestions}
                showSuggestions={showSuggestions}
                setShowSuggestions={setShowSuggestions}
                onSuggestionClick={handleSuggestionClick}
            />
            
            <button onClick={handleSearch} className="btn-primary hidden sm:block">
                {t('btn_search')}
            </button>
            <button onClick={handleSearch} aria-label={t('btn_search')} className="btn-primary sm:hidden flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                </svg>
            </button>
            
            <GPSButton onLocationFound={handleLocationFound} />
        </div>
    );
}
