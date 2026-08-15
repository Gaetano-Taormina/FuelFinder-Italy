import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';

export default function Header() {
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
                                onClick={() => setIsSidebarOpen(true)}
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
                                    style={{width: 44, height: 44}} 
                                    onError={(e)=>{e.target.style.display='none'}} 
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

            {/* Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar Drawer */}
            <div 
                className={`fixed top-0 left-0 h-full w-72 max-w-[80vw] bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-200 ease-in-out border-r border-slate-200 dark:border-slate-700 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Sidebar Header */}
                <div className="relative overflow-hidden p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    {/* Sfondo Bandiera Slantata a Destra - Sidebar */}
                    <div className="absolute top-0 -right-2.5 h-full w-48 flex skew-x-[-40deg] origin-bottom-right pointer-events-none opacity-40 dark:opacity-20 mask-[linear-gradient(to_right,transparent_0%,black_40%,black_100%)] z-0">
                        <div className="flex-1 bg-linear-to-br from-[#009246] to-[#005e2d]"></div>
                        <div className="flex-1 bg-linear-to-br from-white to-slate-200 dark:from-slate-300 dark:to-slate-500"></div>
                        <div className="flex-1 bg-linear-to-br from-[#ce2b37] to-[#911f27]"></div>
                    </div>

                    <div className="flex items-center gap-3 relative z-10">
                        <img src="/assets/img/icon-192.webp" alt="Logo" width="32" height="32" className="rounded-lg shadow-sm" />
                        <span className="font-extrabold text-lg text-slate-800 dark:text-white">FuelFinder</span>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="relative z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/50 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-600 shadow-sm transition-colors focus:outline-none"
                        aria-label="Chiudi menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Luogo Selezionato */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">{t('sidebar_location')}</p>
                    <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 font-semibold bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span className="truncate">{cityName || 'Italia'}</span>
                    </div>
                </div>

                {/* Link di Navigazione */}
                <nav className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto">
                    <p className="px-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-2 mb-1">{t('sidebar_nav')}</p>
                    
                    <Link 
                        to={`/${langPrefix}`}
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-200 font-semibold hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400 transition-colors"
                    >
                        <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                        {t('sidebar_home')}
                    </Link>

                    <div 
                        className="flex items-center justify-between px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 font-semibold cursor-not-allowed opacity-70"
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                            {t('sidebar_stats')}
                        </div>
                        <span title="Work in Progress" className="text-[10px] uppercase font-bold bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-300 dark:border-slate-600/50">
                            WIP
                        </span>
                    </div>
                    
                    <Link 
                        to={`/${langPrefix}/${langPrefix === 'it' ? 'esplora' : 'explore'}`}
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-200 font-semibold hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400 transition-colors"
                    >
                        <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        {t('sidebar_explore')}
                    </Link>
                </nav>
            </div>
        </>
    );
}
