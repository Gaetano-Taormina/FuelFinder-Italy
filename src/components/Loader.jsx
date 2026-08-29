import { useTranslation } from 'react-i18next';
import { useStations } from '../context/StationsContext';

import { useMemo } from 'react';

export default function Loader() {
    const { t } = useTranslation();
    const { error } = useStations();
    const errorHtml = useMemo(() => ({ __html: t('dyn_error_load') }), [t]);

    if (!error) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm pointer-events-none">
            <div className="text-center p-6 max-w-md pointer-events-auto">
                <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-200 dark:border-red-800 shadow-xl" dangerouslySetInnerHTML={errorHtml} />
            </div>
        </div>
    );
}
