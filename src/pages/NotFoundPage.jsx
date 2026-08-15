import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const [theme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            const lang = (i18n.resolvedLanguage || 'it').split('-')[0];
            const pathSegment = lang === 'it' ? 'citta' : 'city';
            navigate(`/${lang}/${pathSegment}/${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 transition-colors duration-300 min-h-screen font-sans flex flex-col relative overflow-hidden">
            
            {/* Sfondo Bandiera a tutto schermo, sfumato */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-20 dark:opacity-15" style={{ maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)' }}>
                <div className="absolute inset-0 flex skew-x-[-30deg] scale-[1.5] origin-center">
                    <div className="flex-1 bg-[#009246]"></div>
                    <div className="flex-1 bg-white"></div>
                    <div className="flex-1 bg-[#ce2b37]"></div>
                </div>
            </div>
            
            <main className="flex-1 flex flex-col items-center justify-center p-4 text-center relative z-10 -mt-10">
                <div className="text-8xl sm:text-9xl mb-4 drop-shadow-lg">⛽</div>
                <h1 className="text-6xl sm:text-8xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">404</h1>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-600 dark:text-blue-500 mb-6 drop-shadow-sm">Fuel Not Found!</h2>
                
                <p className="text-lg text-slate-700 dark:text-slate-300 max-w-md mx-auto mb-8 font-medium">
                    Oops! Sembra che tu abbia finito la benzina in un vicolo cieco. La pagina che cerchi non esiste.
                </p>

                <form onSubmit={handleSearch} className="w-full max-w-sm relative flex items-center shadow-lg rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors">
                    <input 
                        type="text"
                        id="search-city"
                        name="search_term_string"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cerca una città (es. Roma)..."
                        className="w-full py-4 pl-5 pr-14 outline-none text-slate-800 dark:text-white bg-transparent font-semibold"
                    />
                    <button type="submit" className="absolute right-0 top-0 bottom-0 px-4 bg-blue-500 hover:bg-blue-600 text-white transition-colors flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </button>
                </form>

                <button 
                    onClick={() => navigate('/it')}
                    className="mt-8 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
                >
                    Torna alla Home
                </button>
            </main>
        </div>
    );
}
