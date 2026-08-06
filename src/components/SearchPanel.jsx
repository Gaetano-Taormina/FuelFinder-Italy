
import { useTranslation } from 'react-i18next';
import { useStations } from '../context/StationsContext';
import LocationInput from './search/LocationInput';
import Filters from './search/Filters';

export default function SearchPanel() {
    const { t } = useTranslation();
    const { stations, totalStations } = useStations();

    return (
        <div className="card-panel">
            <div className="max-w-7xl mx-auto flex flex-col md:grid md:grid-cols-6 gap-3 sm:gap-4 items-end">
                <LocationInput />
                <Filters />
            </div>
            
            <div className="max-w-7xl mx-auto mt-2 sm:mt-4 text-[10px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 text-center sm:text-left">
                {stations && stations.length > 0 ? (
                    <span>{t('dyn_found')} <strong className="text-blue-500 dark:text-blue-400 text-base">{stations.length}</strong>{totalStations > stations.length ? <span className="text-sm font-normal text-slate-500 dark:text-slate-400"> (su {totalStations})</span> : ''} {t('dyn_stations')}</span>
                ) : (
                    <span dangerouslySetInnerHTML={{ __html: t('status_ready') }} />
                )}
            </div>
        </div>
    );
}
