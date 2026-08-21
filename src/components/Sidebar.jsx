import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const Sidebar = memo(function Sidebar({ isOpen, onClose, cityName, langPrefix }) {
    const { t } = useTranslation();

    return (
        <>
            {/* Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Drawer */}
            <div 
                className={`fixed top-0 left-0 h-full w-72 max-w-[80vw] bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-200 ease-in-out border-r border-slate-200 dark:border-slate-700 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
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
                        onClick={onClose}
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
                        onClick={onClose}
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
                        onClick={onClose}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-200 font-semibold hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400 transition-colors"
                    >
                        <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        {t('sidebar_explore')}
                    </Link>
                </nav>
            </div>
        </>
    );
});

export default Sidebar;
