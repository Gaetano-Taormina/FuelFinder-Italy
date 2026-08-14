import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cities } from '../utils/cityData';
import Header from '../components/Header';

const slugify = (text) => {
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/['\s_]+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

export default function ExplorePage() {
    const { t, i18n } = useTranslation();
    const { lang } = useParams();
    const currentLang = lang || (i18n.resolvedLanguage || 'it').split('-')[0];

    const [viewMode, setViewMode] = useState('alphabetical'); // 'alphabetical' or 'region'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

    // Raggruppa e ordina le città
    const { groupedCities, sortedKeys } = useMemo(() => {
        let groups = {};

        if (viewMode === 'alphabetical') {
            for (const cityObj of cities) {
                const baseCityName = cityObj.name.includes(',') ? cityObj.name.split(',')[0] : cityObj.name;
                const translatedName = currentLang === 'en' ? t(`cities.${baseCityName.toLowerCase()}`, { defaultValue: baseCityName }) : baseCityName;
                const firstLetter = translatedName.charAt(0).toUpperCase();
                if (!groups[firstLetter]) groups[firstLetter] = [];
                groups[firstLetter].push({ ...cityObj, displayName: translatedName, urlCityName: translatedName });
            }
        } else if (viewMode === 'region') {
            for (const cityObj of cities) {
                const baseCityName = cityObj.name.includes(',') ? cityObj.name.split(',')[0] : cityObj.name;
                const translatedName = currentLang === 'en' ? t(`cities.${baseCityName.toLowerCase()}`, { defaultValue: baseCityName }) : baseCityName;
                const region = cityObj.region;
                if (!groups[region]) groups[region] = [];
                groups[region].push({ ...cityObj, displayName: translatedName, urlCityName: translatedName });
            }
        }

        // Ordina le chiavi (A-Z o Z-A)
        let keys = Object.keys(groups);
        keys.sort((a, b) => sortOrder === 'asc' ? a.localeCompare(b, 'it') : b.localeCompare(a, 'it'));

        // Ordina le città all'interno di ciascun gruppo
        for (const key of keys) {
            groups[key].sort((a, b) => {
                // Se vista per regione, mettiamo i capoluoghi prima
                if (viewMode === 'region') {
                    if (a.isRegionalCapital && !b.isRegionalCapital) return -1;
                    if (!a.isRegionalCapital && b.isRegionalCapital) return 1;
                    if (a.isProvincialCapital && !b.isProvincialCapital) return -1;
                    if (!a.isProvincialCapital && b.isProvincialCapital) return 1;
                }
                return sortOrder === 'asc' 
                    ? a.displayName.localeCompare(b.displayName, 'it') 
                    : b.displayName.localeCompare(a.displayName, 'it');
            });
        }

        return { groupedCities: groups, sortedKeys: keys };
    }, [viewMode, sortOrder, currentLang]);

    const getCityStyle = (city) => {
        if (city.isRegionalCapital) {
            return "bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-xl shadow-md border-4 border-amber-400 dark:border-amber-500 font-extrabold text-amber-900 dark:text-amber-100 hover:scale-105 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all text-center flex flex-col justify-center items-center";
        }
        if (city.isProvincialCapital) {
            return "bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg shadow-sm border-2 border-blue-400 dark:border-blue-600 font-bold text-blue-800 dark:text-blue-200 hover:scale-105 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all text-center";
        }
        return "bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all truncate text-center";
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 transition-colors duration-300 min-h-screen font-sans flex flex-col">
            <Header />
            
            <main className="max-w-7xl mx-auto w-full px-4 py-8 grow">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white mb-3">Esplora le Città</h2>
                    <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-6">
                        Cerca i distributori di carburante e confronta i prezzi in tutti i comuni italiani.
                    </p>

                    {/* Filtri */}
                    <div className="inline-flex flex-wrap justify-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                            <button 
                                onClick={() => setViewMode('alphabetical')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'alphabetical' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                            >
                                A-Z (Alfabetico)
                            </button>
                            <button 
                                onClick={() => setViewMode('region')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'region' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                            >
                                Per Regione
                            </button>
                        </div>
                        <div className="w-px bg-slate-300 dark:bg-slate-700 mx-2 hidden sm:block"></div>
                        <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                            <button 
                                onClick={() => setSortOrder('asc')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${sortOrder === 'asc' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                            >
                                ⬇️ A-Z
                            </button>
                            <button 
                                onClick={() => setSortOrder('desc')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${sortOrder === 'desc' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                            >
                                ⬆️ Z-A
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Indice Rapido (solo per alfabetico) */}
                {viewMode === 'alphabetical' && (
                    <div className="flex flex-wrap justify-center gap-2 mb-10">
                        {sortedKeys.map(letter => (
                            <a 
                                key={`index-${letter}`} 
                                href={`#group-${letter}`}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:scale-110 transition-transform"
                            >
                                {letter}
                            </a>
                        ))}
                    </div>
                )}

                {/* Griglia Città */}
                <div className="flex flex-col gap-10">
                    {sortedKeys.map((key) => (
                        <div key={key} id={`group-${key}`} className="scroll-mt-24">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 border-b-2 border-blue-500/30 pb-2 mb-4 pl-2">
                                {key}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch">
                                {groupedCities[key].map(city => (
                                        <Link 
                                            key={`${city.name}-${city.province}`} 
                                            to={`/${currentLang}/${currentLang === 'it' ? 'citta' : 'city'}/${slugify(city.urlCityName)}`}
                                            className={getCityStyle(city)}
                                            title={`${city.displayName} (${city.province})`}
                                        >
                                            <span className="truncate w-full">{city.displayName}</span>
                                            {city.isProvincialCapital && viewMode === 'alphabetical' && (
                                                <span className="text-[10px] uppercase opacity-70 mt-1 block truncate w-full">{city.province}</span>
                                            )}
                                        </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
