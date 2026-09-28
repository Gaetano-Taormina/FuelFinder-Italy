import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useStations } from '../context/StationsContext';

export default function Loader() {
    const { t } = useTranslation();
    const { error, loading, refreshStations, stations } = useStations();
    const [isDismissed, setIsDismissed] = useState(false);
    const [isColdStarting, setIsColdStarting] = useState(false);
    const [progress, setProgress] = useState(15);
    const [statusStage, setStatusStage] = useState('init');

    // Gestione avanzamento fluido e proporzionato della barra
    useEffect(() => {
        if (loading || error) {
            setProgress(prev => (prev < 20 ? 25 : prev));
            setStatusStage('connecting');

            const startTime = Date.now();
            const interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                
                if (elapsed > 2500) {
                    setIsColdStarting(true);
                    setStatusStage('waking');
                }

                setProgress(prev => {
                    if (prev >= 92) return 92; // Attende la risposta effettiva del backend
                    const increment = elapsed > 2500 ? 0.8 : 3.5;
                    return Math.min(prev + increment, 92);
                });
            }, 300);

            return () => clearInterval(interval);
        } else {
            // Quando il caricamento termina con successo
            setProgress(100);
            setStatusStage('ready');
            const timer = setTimeout(() => {
                // oxlint-disable-next-line react/set-state-in-effect
                setIsColdStarting(false);
                // oxlint-disable-next-line react/set-state-in-effect
                setIsDismissed(false);
                // oxlint-disable-next-line react/set-state-in-effect
                setProgress(15);
            }, 350);

            return () => clearTimeout(timer);
        }
    }, [loading, error]);

    const handleDismiss = useCallback(() => {
        setIsDismissed(true);
    }, []);

    const handleRetry = useCallback(() => {
        setIsDismissed(false);
        setProgress(20);
        if (refreshStations) {
            refreshStations();
        }
    }, [refreshStations]);

    // Mostra il loader a tutto schermo SOLO durante cold-start (>2.5s) o errore non scartato
    if ((!isColdStarting && !error) || isDismissed) return null;

    const stationCount = stations?.length || 0;

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md px-4 transition-opacity duration-500 animate-in fade-in">
            <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-slate-800/95 border border-slate-700/70 shadow-2xl flex flex-col items-center text-center">
                
                {/* Icona con animazione morbida e rilassante (Zero sfarfallio) */}
                <div className="relative mb-6 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-blue-600/90 to-indigo-700/90 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/25 transition-transform duration-700 hover:scale-105">
                        <img 
                            src="/assets/img/icon-192.webp" 
                            alt="FuelFinder Logo" 
                            width="46" 
                            height="46" 
                            className="object-contain drop-shadow-sm opacity-95"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </div>
                </div>

                {/* Titolo Principale */}
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {t('dyn_searching_stations')}
                </h3>

                {/* Testo di Stato Contestuale */}
                <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-sm leading-relaxed min-h-10 flex items-center justify-center">
                    {statusStage === 'waking'
                        ? t('dyn_server_waking')
                        : statusStage === 'ready' && stationCount > 0
                            ? `Trovati ${stationCount} distributori!`
                            : t('dyn_comparing_prices')}
                </p>

                {/* Barra di Avanzamento Dinamica proporzionata */}
                <div className="w-full mt-4">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mb-1.5 px-0.5">
                        <span className="text-blue-400">
                            {statusStage === 'waking' ? 'Sveglia server...' : 'Scansione prezzi...'}
                        </span>
                        <span>{Math.round(progress)}%</span>
                    </div>

                    <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-600/40">
                        <div 
                            className="bg-linear-to-r from-blue-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Pulsanti discreti */}
                <div className="flex items-center justify-center gap-3 mt-6 w-full">
                    {error && (
                        <button
                            type="button"
                            onClick={handleRetry}
                            className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-md"
                        >
                            {t('btn_retry')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/40 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        {t('btn_close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
