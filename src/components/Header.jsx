import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import Sidebar from './Sidebar';

const Header = memo(function Header() {
    const { t, i18n } = useTranslation();
    const { city } = useParams();
    const [theme] = useState(localStorage.getItem('theme') || 'dark');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    // Prevenire lo scroll quando la sidebar è aperta
    useEffect(() => {
        if (isSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }, [isSidebarOpen]);

    const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
    const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
    const logoStyle = useMemo(() => ({ width: 44, height: 44 }), []);
    const handleLogoError = useCallback((e) => { e.target.style.display = 'none'; }, []);

    const decodedCity = city ? decodeURIComponent(city) : '';
    const cityName = decodedCity ? decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1).toLowerCase() : '';
    const langPrefix = (i18n.resolvedLanguage || 'it').split('-')[0];

    return (
        <>
            <header className="bg-white dark:bg-slate-800 transition-colors duration-300 shadow-md sm:shadow-lg p-3 sm:p-5 z-20 relative w-full border-b-4 border-slate-300 dark:border-slate-600 overflow-hidden">
                {/* Sfondo Bandiera Slantata a Destra */}
                <div className="absolute top-0 -right-2.5 h-full w-100 sm:w-175 flex skew-x-[-40deg] origin-bottom-right pointer-events-none opacity-60 dark:opacity-40 mask-[linear-gradient(to_right,transparent_0%,black_40%,black_100%)] z-0">
                    <div className="flex-1 bg-linear-to-br from-[#009246] to-[#005e2d]"></div>
                    <div className="flex-1 bg-linear-to-br from-white to-slate-200 dark:from-slate-300 dark:to-slate-500"></div>
                    <div className="flex-1 bg-linear-to-br from-[#ce2b37] to-[#911f27]"></div>
                </div>
                
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex justify-between items-start sm:items-center gap-2 mb-2 sm:mb-0">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white flex flex-wrap items-center gap-3 sm:gap-4">
                            <button 
                                onClick={openSidebar}
                                className="group flex items-center gap-2 sm:gap-3 p-1 -ml-1 mr-1 rounded-xl text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors focus:outline-none"
                                aria-label="Apri Menu Navigazione"
                                title="Apri Menu"
                            >
                                <img 
                                    src="/assets/img/icon-192.webp" 
                                    alt="Logo" 
                                    width="44"
                                    height="44"
                                    fetchPriority="high"
                                    loading="eager"
                                    className="object-contain rounded-xl shadow-sm animate-pulse group-hover:animate-none group-hover:scale-110 transition-transform" 
                                    style={logoStyle} 
                                    onError={handleLogoError} 
                                />
                            </button>
                            <span className="tracking-tight drop-shadow-sm">
                                FuelFinder
                            </span>
                            {/* Badge premium glassmorphic */}
                            <span className="inline-flex bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-200 px-4 py-1.5 sm:px-5 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold gap-3 items-center border border-slate-300/60 dark:border-slate-600/60 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] ml-2 sm:ml-4 cursor-default">
                                <span className="hidden sm:inline tracking-wide">{t('badge_dati')}</span>
                                <span className="hidden sm:inline w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                                <span className="tracking-wide">{t('badge_solo')}</span>
                            </span>
                        </h1>
                    </div>
                </div>
            </header>

            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={closeSidebar} 
                cityName={cityName} 
                langPrefix={langPrefix} 
            />
        </>
    );
});

export default Header;
