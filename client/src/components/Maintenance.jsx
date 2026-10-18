import { useState, useEffect, useCallback } from 'react';

export default function Maintenance() {
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage.getItem('theme') || 'dark';
        }
        return 'dark';
    });

    useEffect(() => {
        if (typeof document !== 'undefined') {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('theme', theme);
            }
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between items-center p-6 select-none transition-colors duration-300">
            {/* Header minimalista con switch tema */}
            <header className="w-full max-w-4xl flex justify-between items-center py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold shadow-lg shadow-blue-500/10">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="font-extrabold text-xl tracking-tight bg-linear-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                        FuelFinder Italia
                    </span>
                </div>

                <button
                    onClick={toggleTheme}
                    type="button"
                    aria-label="Cambia tema"
                    className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-md"
                >
                    {theme === 'light' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>
            </header>

            {/* Main Content */}
            <main className="w-full max-w-xl text-center flex flex-col items-center my-auto py-12">
                <div className="relative mb-8">
                    <div className="w-24 h-24 rounded-3xl bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center text-blue-400 shadow-2xl shadow-blue-500/20 backdrop-blur-xs">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                    </span>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wide uppercase mb-4">
                    <span>Manutenzione Programmata</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
                    Sito Temporaneamente in Manutenzione
                </h1>

                <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-6 max-w-lg">
                    FuelFinder Italia è temporaneamente offline per aggiornamenti infrastrutturali e ottimizzazione delle risorse.
                </p>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-sm text-slate-400 max-w-md w-full mb-8">
                    <p className="font-medium text-slate-300 mb-1">Cosa stiamo facendo?</p>
                    <p>
                        Stiamo allineando le quote server e i sistemi di aggiornamento prezzi. Il servizio riprenderà regolarmente a breve. Grazie per la collaborazione!
                    </p>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    <span>Frontend statico protetto (0 quote used)</span>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full max-w-4xl text-center py-4 border-t border-slate-800/60 text-xs text-slate-500">
                <p>&copy; {new Date().getFullYear()} FuelFinder Italia - Tutti i diritti riservati.</p>
            </footer>
        </div>
    );
}
