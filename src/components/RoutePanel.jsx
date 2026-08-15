
import { useTranslation } from 'react-i18next';
import { useStations } from '../context/StationsContext';
import { formatStationName } from '../utils/formatters';

export default function RoutePanel() {
    const { t } = useTranslation();
    const { selectedStation, setSelectedStation, routeData } = useStations();

    if (!selectedStation) return null;

    let travelTime = '--';
    let distText = '--';

    if (routeData) {
        travelTime = Math.round(routeData.duration / 60);
        distText = (routeData.distance / 1000).toFixed(1);
    } else {
        // Fallback or while loading
        travelTime = selectedStation.dist ? Math.round((selectedStation.dist / 40) * 60) : '--';
        distText = selectedStation.dist ? selectedStation.dist.toFixed(2) : '--';
    }

    return (
        <aside className="absolute bottom-4 left-4 right-4 sm:right-auto sm:bottom-8 sm:left-8 z-9999 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 sm:min-w-70 sm:max-w-sm transition-all duration-300">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span className="text-xl sm:text-2xl">👑</span>
                <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-white leading-tight">{t('rp_title')}</h3>
            </div>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
                    <div className="flex flex-col">
                        <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStation.lat},${selectedStation.lng}`}
                            target="_blank" 
                            rel="noreferrer"
                            className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-500/30 hover:decoration-blue-500 transition-colors cursor-pointer inline-flex items-center gap-1"
                            title={t('get_directions')}
                        >
                            {formatStationName(selectedStation.brand || selectedStation.name)}
                            <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{selectedStation.address}</span>
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
            <button onClick={() => setSelectedStation(null)} className="mt-3 sm:mt-4 w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-bold py-2 rounded-xl transition-colors">
                {t('btn_close')}
            </button>
        </aside>
    );
}
