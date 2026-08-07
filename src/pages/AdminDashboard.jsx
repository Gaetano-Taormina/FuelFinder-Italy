import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function AdminDashboard() {
    const [passkey, setPasskey] = useState('');
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { t } = useTranslation();

    const fetchStats = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('/api/stats', {
                headers: { 'x-admin-passkey': passkey }
            });
            if (!res.ok) throw new Error(t('admin_error'));
            const data = await res.json();
            setStats(data);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
            <h1 className="text-3xl font-bold mb-8">{t('admin_title')}</h1>
            
            {!stats ? (
                <form onSubmit={fetchStats} className="bg-slate-800 p-6 rounded-xl shadow-lg w-full max-w-md border border-slate-700">
                    <label className="block mb-4">
                        <span className="text-slate-300 font-semibold">{t('admin_passkey')}</span>
                        <input 
                            type="password" 
                            value={passkey}
                            onChange={e => setPasskey(e.target.value)}
                            className="mt-2 block w-full rounded-md bg-slate-700 border-slate-600 text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required 
                            placeholder="*****************"
                        />
                    </label>
                    {error && <p className="text-red-400 mb-4 text-sm font-semibold">{error}</p>}
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                        {t('admin_btn_access')}
                    </button>
                    <button type="button" onClick={() => navigate('/')} className="w-full mt-4 text-slate-400 hover:text-white transition-colors text-sm">
                        {t('admin_btn_back')}
                    </button>
                </form>
            ) : (
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg w-full max-w-4xl border border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-semibold">{t('admin_stats_title')}</h2>
                        <button onClick={() => setStats(null)} className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">{t('admin_btn_exit')}</button>
                    </div>
                    {Object.keys(stats).length === 0 ? (
                        <p className="text-slate-400 text-center py-8">{t('admin_no_stats')}</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-700">
                            <table className="w-full text-left border-collapse bg-slate-800">
                                <thead className="bg-slate-700/50">
                                    <tr className="border-b border-slate-600">
                                        <th className="p-4 font-semibold">{t('admin_th_date')}</th>
                                        <th className="p-4 font-semibold">{t('admin_th_visits')}</th>
                                        <th className="p-4 font-semibold">{t('admin_th_unique')}</th>
                                        <th className="p-4 font-semibold">{t('admin_th_searches')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(stats).sort((a, b) => b[0].localeCompare(a[0])).map(([date, data]) => (
                                        <tr key={date} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                            <td className="p-4 font-mono text-sm text-slate-300">{date}</td>
                                            <td className="p-4 font-bold">{data.visits || 0}</td>
                                            <td className="p-4 text-blue-400 font-bold">{data.uniqueUsers || 0}</td>
                                            <td className="p-4 text-green-400 font-bold">{data.searches || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
