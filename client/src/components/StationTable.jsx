
import { useTranslation } from 'react-i18next';
import { useStations } from '../context/StationsContext';
import { useDistanceLogic } from '../hooks/useDistance';
import { formatStationName } from '../utils/formatters';

import { memo, useCallback, useMemo } from 'react';

const StationRow = memo(function StationRow({ station, index, setSelectedStation, handleNavigation, t }) {
    const handleClick = useCallback(() => setSelectedStation(station), [setSelectedStation, station]);
    const handleNav = useCallback((e) => {
        e.stopPropagation();
        handleNavigation(station);
    }, [handleNavigation, station]);

    return (
        <tr 
            onClick={handleClick}
            className="hover:bg-slate-100 dark:hover:bg-slate-700/80 even:bg-slate-50/50 dark:even:bg-slate-700/30 cursor-pointer transition-colors"
        >
            <td className="p-2 sm:p-4 text-center font-bold">
                <span className="font-bold text-sm text-slate-500 dark:text-slate-400">#{index + 1}</span>
            </td>
            <td className="p-2 sm:p-4 font-medium">
                <button 
                    onClick={handleNav}
                    className="text-left font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 cursor-pointer w-auto"
                    title={t('get_directions')}
                >
                    {formatStationName(station.brand || station.name)}
                </button>
            </td>
            <td className="p-2 sm:p-4 hidden md:table-cell text-sm text-slate-700 dark:text-slate-300">
                {station.address}
            </td>
            <td className="p-2 sm:p-4 text-center hidden sm:table-cell font-mono text-sm">
                {station.dist.toFixed(2)} km
            </td>
            <td className="p-2 sm:p-4 text-right font-extrabold text-blue-600 dark:text-blue-400">
                {station.currentPrice} €
            </td>
        </tr>
    );
});

export default function StationTable() {
    const { t } = useTranslation();
    const tableTitleProps = useMemo(() => ({ __html: t('table_title') }), [t]);
    const { setSelectedStation, handleNavigation, loading, isFetchingBackground } = useStations();
    const filteredStations = useDistanceLogic();

    if (loading) {
        return (
            <section className="px-4 pb-8 max-w-7xl mx-auto w-full">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 animate-pulse">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-700 flex justify-between items-center h-17">
                        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                        <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    </div>
                    <div className="p-0">
                        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700/50 p-4 gap-4 h-13.25 items-center">
                            <div className="h-4 w-10 bg-slate-300 dark:bg-slate-600 rounded"></div>
                            <div className="h-4 w-32 bg-slate-300 dark:bg-slate-600 rounded"></div>
                            <div className="h-4 w-48 bg-slate-300 dark:bg-slate-600 rounded hidden md:block"></div>
                            <div className="h-4 w-16 bg-slate-300 dark:bg-slate-600 rounded hidden sm:block ml-auto"></div>
                            <div className="h-4 w-20 bg-slate-300 dark:bg-slate-600 rounded ml-auto"></div>
                        </div>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center p-4 border-b border-slate-100 dark:border-slate-700/30 gap-4 h-16.25 relative overflow-hidden">
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/40 dark:via-slate-500/20 to-transparent"></div>
                                <div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded mx-auto sm:mx-2"></div>
                                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                <div className="h-4 w-56 bg-slate-200 dark:bg-slate-700 rounded hidden md:block"></div>
                                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded hidden sm:block ml-auto"></div>
                                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (filteredStations.length === 0) return null;

    return (
        <section className={`px-4 pb-8 max-w-7xl mx-auto w-full transition-all duration-300 ${isFetchingBackground ? 'grayscale pointer-events-none' : ''}`}>
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg overflow-hidden border-2 border-slate-300 dark:border-slate-600 transition-colors">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-300 dark:border-slate-600 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2" dangerouslySetInnerHTML={tableTitleProps}>
                    </h2>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">
                        {filteredStations.length} {t('dyn_results')}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                                <th className="p-2 sm:p-4 font-semibold text-center w-10 sm:w-16">{t('th_pos')}</th>
                                <th className="p-2 sm:p-4 font-semibold">{t('th_brand')}</th>
                                <th className="p-2 sm:p-4 font-semibold hidden md:table-cell">{t('th_address')}</th>
                                <th className="p-2 sm:p-4 font-semibold text-center hidden sm:table-cell">{t('th_dist')}</th>
                                <th className="p-2 sm:p-4 font-semibold text-right">{t('th_price')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 dark:divide-slate-600 text-slate-800 dark:text-slate-200">
                            {filteredStations.map((st, i) => (
                                <StationRow
                                    key={st.id}
                                    station={st}
                                    index={i}
                                    setSelectedStation={setSelectedStation}
                                    handleNavigation={handleNavigation}
                                    t={t}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
