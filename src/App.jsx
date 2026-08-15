import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StationsProvider, useStations } from './context/StationsContext';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import Loader from './components/Loader';
import Tooltip from './components/Tooltip';
import { Suspense, lazy } from 'react';

import RoutePanel from './components/RoutePanel';
import StationTable from './components/StationTable';
const MapArea = lazy(() => import('./components/MapArea'));
import { cities as cityData } from './utils/cityData';
const cities = cityData.map(c => c.name);

const slugify = (text) => {
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/['\s_]+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

const enToItCities = {
    'rome': 'roma', 'milan': 'milano', 'naples': 'napoli', 'venice': 'venezia',
    'florence': 'firenze', 'turin': 'torino', 'genoa': 'genova', 'padua': 'padova',
    'syracuse': 'siracusa', 'mantua': 'mantova'
};

const getRealCityName = (slug, lang) => {
    let searchSlug = slug.toLowerCase();
    if (lang === 'en' && enToItCities[searchSlug]) {
        searchSlug = enToItCities[searchSlug];
    }
    const real = cities.find(c => slugify(c) === searchSlug);
    return real || (slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase());
};



function LayoutContent() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { stations, fuelType, setLocationStr, setUserPos, userPos } = useStations();
    const [viewMode, setViewMode] = useState('map');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [mapInteractive, setMapInteractive] = useState(false);

    const { city } = useParams();
    const currLang = (i18n.resolvedLanguage || 'it').split('-')[0];

    useEffect(() => {
        const handleInteraction = () => setMapInteractive(true);
        window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
        window.addEventListener('mousemove', handleInteraction, { once: true, passive: true });
        window.addEventListener('touchstart', handleInteraction, { once: true, passive: true });
        window.addEventListener('click', handleInteraction, { once: true, passive: true });
        window.addEventListener('keydown', handleInteraction, { once: true, passive: true });
        
        return () => {
            window.removeEventListener('scroll', handleInteraction);
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        };
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const fuelToEn = { 'Benzina': 'Petrol', 'Gasolio': 'Diesel', 'GPL': 'LPG', 'Metano': 'CNG' };
        const enToFuel = { 'Petrol': 'Benzina', 'Diesel': 'Gasolio', 'LPG': 'GPL', 'CNG': 'Metano' };
        
        let itFuel = fuelType || 'Benzina';
        if (enToFuel[itFuel]) itFuel = enToFuel[itFuel]; // normalize to IT just in case
        
        const displayItFuel = itFuel;
        const displayEnFuel = fuelToEn[itFuel] || itFuel;

        if (city) {
            const cityName = getRealCityName(city, currLang);
            document.title = currLang === 'it' 
                ? `FuelFinder Italia - Prezzi ${displayItFuel} a ${cityName}` 
                : `FuelFinder Italy - Prices for ${displayEnFuel} in ${cityName}`;
        } else {
            document.title = currLang === 'it'
                ? `FuelFinder Italia - Prezzi ${displayItFuel}`
                : `FuelFinder Italy - Prices for ${displayEnFuel}`;
        }
    }, [city, currLang, fuelType]);

    // Traccia la visita al caricamento dell'app
    useEffect(() => {
        fetch('/api/visit').catch(e => console.error('Errore tracciamento visita:', e));
    }, []);

    // Auto-search for city from URL
    useEffect(() => {
        if (city) {
            const cityName = getRealCityName(city, currLang);
            setLocationStr(cityName);
            
            // Geocode the city
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName + ', Italia')}`;
            fetch(geocodeUrl)
                .then(res => res.json())
                .then(data => {
                    if (data && data.length > 0) {
                        const { lat, lon } = data[0];
                        setUserPos({ lat: parseFloat(lat), lng: parseFloat(lon) });
                    }
                })
                .catch(err => console.error("Geocoding error for city route:", err));
        }
    }, [city, setLocationStr, setUserPos]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
    
    const toggleLanguage = () => {
        const nextLang = currLang === 'it' ? 'en' : 'it';
        let newPath = `/${nextLang}`;
        
        if (city) {
            let searchSlug = city.toLowerCase();
            if (currLang === 'en' && enToItCities[searchSlug]) {
                searchSlug = enToItCities[searchSlug];
            }
            let targetCitySlug = searchSlug;
            if (nextLang === 'en') {
                const enEntry = Object.entries(enToItCities).find(([en, it]) => it === targetCitySlug);
                if (enEntry) targetCitySlug = enEntry[0];
            }
            
            const pathSegment = nextLang === 'it' ? 'citta' : 'city';
            newPath = `/${nextLang}/${pathSegment}/${targetCitySlug}`;
        } else if (location.pathname.includes('/esplora') || location.pathname.includes('/explore')) {
            newPath = `/${nextLang}/${nextLang === 'it' ? 'esplora' : 'explore'}`;
        }

        const searchParams = new URLSearchParams(location.search);
        if (fuelType) {
            const fuelToEn = { 'Benzina': 'Petrol', 'Gasolio': 'Diesel', 'GPL': 'LPG', 'Metano': 'CNG' };
            let newFuelUrl = nextLang === 'en' ? (fuelToEn[fuelType] || fuelType) : fuelType;
            
            searchParams.delete('fuel');
            searchParams.delete('carburante');
            
            const key = nextLang === 'en' ? 'fuel' : 'carburante';
            searchParams.set(key, newFuelUrl);
        }
        
        navigate(`${newPath}?${searchParams.toString()}`);
    };

    const showViewToggles = (stations && stations.length > 0) || userPos != null;

    return (
        <div className="bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col min-h-screen font-sans">
            <Loader />
            <Header />
            <SearchPanel />
            
            <div className="max-w-7xl mx-auto w-full grid grid-cols-3 items-center px-2 sm:px-4 mt-4 mb-2 z-10 relative">
                {/* Left: Theme (justify-self-start) */}
                <div className="justify-self-start">
                    <Tooltip content={t('title_theme')}>
                        <button onClick={toggleTheme} aria-label="Cambia Tema" className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-slate-800 shadow-md border-2 border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 hover:scale-105 hover:shadow-lg transition-transform flex items-center justify-center">
                            <span className="text-xl sm:text-2xl leading-none" aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
                        </button>
                    </Tooltip>
                </div>

                {/* Center: View Toggles (justify-self-center) */}
                <div className={`justify-self-center bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border-2 border-slate-300 dark:border-slate-600 inline-flex scale-90 sm:scale-100 transition-all duration-500 ${showViewToggles ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-1'}`}>
                    <Tooltip content={t('view_map')}>
                        <button 
                            onClick={() => setViewMode('map')}
                            aria-label={t('view_map')}
                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-transform duration-200 flex items-center gap-2 ${viewMode === 'map' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                            <span className="sm:hidden">{t('view_map')}</span>
                        </button>
                    </Tooltip>
                    <Tooltip content={t('view_list')}>
                        <button 
                            onClick={() => setViewMode('list')}
                            aria-label={t('view_list')}
                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-transform duration-200 flex items-center gap-2 ${viewMode === 'list' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                            <span className="sm:hidden">{t('view_list')}</span>
                        </button>
                    </Tooltip>
                    <Tooltip content={t('view_both')}>
                        <button 
                            onClick={() => setViewMode('both')}
                            aria-label={t('view_both')}
                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-transform duration-200 flex items-center gap-2 ${viewMode === 'both' ? 'bg-blue-700 text-white shadow-md' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                            <span className="sm:hidden">{t('view_both')}</span>
                        </button>
                    </Tooltip>
                </div>

                {/* Right: Language (justify-self-end) */}
                <div className="justify-self-end">
                    <Tooltip content="Cambia Lingua / Change Language">
                        <button onClick={toggleLanguage} aria-label="Cambia Lingua" className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-slate-800 shadow-md border-2 border-slate-300 dark:border-slate-500 text-blue-700 dark:text-blue-400 hover:scale-105 hover:shadow-lg transition-transform flex items-center justify-center font-extrabold text-xs sm:text-sm">
                            <span aria-hidden="true">{currLang === 'it' ? 'ITA' : 'ENG'}</span>
                        </button>
                    </Tooltip>
                </div>
            </div>
            
            {(viewMode === 'map' || viewMode === 'both') && (
                <main className="p-0 sm:p-4 relative flex flex-col max-w-7xl mx-auto w-full grow">
                    <Suspense fallback={<div className="w-full h-[55vh] md:h-150 rounded-[30px] border-4 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800 animate-pulse mb-8 md:mb-0"></div>}>
                        {mapInteractive ? <MapArea /> : <div className="w-full h-[55vh] md:h-150 rounded-[30px] border-4 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800 mb-8 md:mb-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-400 border-t-blue-500 rounded-full animate-spin"></div></div>}
                        <RoutePanel />
                    </Suspense>
                </main>
            )}
            
            {(viewMode === 'list' || viewMode === 'both') && (
                <div className="max-w-7xl mx-auto w-full grow p-0 sm:p-4 mt-4">
                        <StationTable />
                </div>
            )}

            <footer className="mt-8 mb-4 text-center text-sm text-slate-700 dark:text-slate-300">
                <p dangerouslySetInnerHTML={{ __html: t('footer_text') }} />
            </footer>
        </div>
    );
}

function MainApp() {
    const { i18n } = useTranslation();
    const { lang, city } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Sync URL language with i18n
    useEffect(() => {
        const pathLang = location.pathname.startsWith('/en') ? 'en' : (location.pathname.startsWith('/it') ? 'it' : null);
        const currentRouteLang = lang || pathLang;
        
        const resolvedLang = (i18n.resolvedLanguage || 'it').split('-')[0]; // force 'it' instead of 'it-IT'
        const validLang = currentRouteLang && ['it', 'en'].includes(currentRouteLang) ? currentRouteLang : resolvedLang;

        if (validLang !== (i18n.resolvedLanguage || '').split('-')[0]) {
            i18n.changeLanguage(validLang);
        }

        if (currentRouteLang !== validLang) {
            if (city) {
                const pathSegment = validLang === 'it' ? 'citta' : 'city';
                navigate(`/${validLang}/${pathSegment}/${city}${location.search}`, { replace: true });
            } else {
                navigate(`/${validLang}${location.search}`, { replace: true });
            }
        }
    }, [lang, city, i18n.resolvedLanguage, navigate, i18n, location.pathname, location.search]);
    
    return (
        <StationsProvider>
            <LayoutContent />
        </StationsProvider>
    );
}

export default MainApp;
