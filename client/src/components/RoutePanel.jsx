
import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStations } from '../context/StationsContext';
import { formatStationName } from '../utils/formatters';
import { getStationPath } from '../config/routes.js';

export default function RoutePanel() {
    const { t, i18n } = useTranslation();
    const { selectedStation, setSelectedStation, routeData, handleNavigation, stations, fuelType } = useStations();
    const [copied, setCopied] = useState(false);

    const navigateToStation = useCallback(() => handleNavigation(selectedStation), [handleNavigation, selectedStation]);
    const closePanel = useCallback(() => setSelectedStation(null), [setSelectedStation]);

    const handleShare = useCallback(() => {
        /* v8 ignore next */
        if (!selectedStation) return;
        const currLang = (i18n?.resolvedLanguage || 'it').split('-')[0];
        const city = selectedStation.comune || 'italia';
        const path = getStationPath(currLang, city, selectedStation.id, fuelType);
        const fullUrl = `${window.location.origin}${path}`;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {});
        }
    }, [selectedStation, i18n?.resolvedLanguage, fuelType]);

    const rankIndex = useMemo(() => {
        if (!selectedStation || !stations || stations.length === 0) return -1;
        return stations.findIndex(s => {
            if (selectedStation.id != null && s.id != null) {
                return s.id === selectedStation.id;
            }
            if (selectedStation.lat != null && s.lat != null && selectedStation.lng != null && s.lng != null) {
                return s.lat === selectedStation.lat && s.lng === selectedStation.lng;
            }
            if (selectedStation.name && s.name) {
                return s.name === selectedStation.name;
            }
            return false;
        });
    }, [selectedStation, stations]);

    const isBest = rankIndex === 0 || (rankIndex === -1 && Boolean(selectedStation?.isBest));

    const { travelTime, distText } = useMemo(() => {
        if (!selectedStation) return { travelTime: '--', distText: '--' };
        if (routeData) {
            return {
                travelTime: Math.round(routeData.duration / 60),
                distText: (routeData.distance / 1000).toFixed(1)
            };
        }
        return {
            travelTime: selectedStation.dist ? Math.round((selectedStation.dist / 40) * 60) : '--',
            distText: selectedStation.dist ? selectedStation.dist.toFixed(2) : '--'
        };
    }, [selectedStation, routeData]);

    if (!selectedStation) return null;

    return (
        <aside className="absolute bottom-4 left-4 right-4 sm:right-auto sm:bottom-8 sm:left-8 z-9999 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 sm:min-w-80 sm:max-w-md transition-all duration-300">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    {isBest ? (
                        <span className="shrink-0 inline-flex items-center justify-center px-2.5 h-8 rounded-xl text-xs font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700/60 shadow-xs">
                            {t('rp_best_badge')}
                        </span>
                    ) : (
                        <span className="shrink-0 inline-flex items-center justify-center px-2.5 h-8 rounded-xl text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700/60 shadow-xs">
                            {rankIndex >= 0 ? `#${rankIndex + 1}` : t('rp_station_badge')}
                        </span>
                    )}
                    <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white leading-tight whitespace-nowrap">
                        {isBest ? t('rp_title') : t('rp_selected_title')}
                    </h3>
                </div>

                {selectedStation.id && (
                    <button
                        onClick={handleShare}
                        type="button"
                        aria-label={t('btn_share')}
                        title={copied ? t('share_copied') : t('btn_share')}
                        className={`shrink-0 w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs ${
                            copied
                                ? 'bg-emerald-600 text-white border-emerald-600 scale-105'
                                : 'bg-slate-100 dark:bg-slate-700/80 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-600'
                        }`}
                    >
                        {copied ? (
                            <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        )}
                        {copied && <span className="sr-only">{t('share_copied')}</span>}
                    </button>
                )}
            </div>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
                    <div className="flex flex-col">
                        <button 
                            onClick={navigateToStation}
                            className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-500/30 hover:decoration-blue-500 transition-colors cursor-pointer inline-flex items-center gap-1 text-left"
                            title={t('get_directions')}
                        >
                            {formatStationName(selectedStation.brand || selectedStation.name)}
                            <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </button>
                        <span className="text-xs text-slate-700 dark:text-slate-300">{selectedStation.address}</span>
                    </div>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1 bg-amber-50 dark:bg-amber-900/30 -mx-2 px-2 rounded-lg">
                    <span className="font-medium text-amber-800 dark:text-amber-400">{t('rp_price')}</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-500 text-base">{selectedStation.currentPrice} €</span>
                </div>
                <div className="flex justify-between pt-2">
                    <span className="font-medium flex items-center gap-1 text-blue-600 dark:text-blue-400">{t('rp_dist')}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{distText} km</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium flex items-center gap-1 text-blue-600 dark:text-blue-400">{t('rp_time')}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{travelTime} min</span>
                </div>
            </div>
            <button 
                type="button"
                onClick={closePanel} 
                className="mt-3 sm:mt-4 w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
            >
                {t('btn_close')}
            </button>
        </aside>
    );
}
