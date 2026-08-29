/* oxlint-disable no-console */
import crypto from 'crypto';

let dailyStats = {};
let dbClient = null;

export const setAnalyticsDb = async (db) => {
    dbClient = db;
    // Crea la tabella se non esiste
    await db.execute(`
        CREATE TABLE IF NOT EXISTS app_analytics (
            date TEXT PRIMARY KEY,
            visits INTEGER DEFAULT 0,
            searches INTEGER DEFAULT 0,
            uniqueIps TEXT DEFAULT '[]'
        );
    `);
    
    // Carica dal DB
    const res = await db.execute('SELECT * FROM app_analytics');
    for (const row of res.rows) {
        dailyStats[row.date] = {
            visits: row.visits,
            searches: row.searches,
            uniqueIps: JSON.parse(row.uniqueIps || '[]')
        };
    }
};

export const saveStatsAsync = async (today) => {
    if (!dbClient || !dailyStats[today]) return;
    const s = dailyStats[today];
    try {
        await dbClient.execute({
            sql: `INSERT OR REPLACE INTO app_analytics (date, visits, searches, uniqueIps) VALUES (?, ?, ?, ?)`,
            args: [today, s.visits, s.searches, JSON.stringify(s.uniqueIps)]
        });
    } catch(e) {
        console.error("Errore salvataggio stats su DB:", e);
    }
};

export const analyticsMiddleware = (req, res, next) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (!dailyStats[today]) {
        dailyStats[today] = { visits: 0, searches: 0, uniqueIps: [] };
    }
    
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const clientIp = crypto.createHash('sha256').update(ip + today).digest('hex').substring(0, 16);

    // Filtro Bot/Crawler e Test automatizzati
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = !userAgent || /bot|crawler|spider|crawling|google|bing|yandex|duckduck|slurp|baidu|headless|node-superagent|axios|fetch|curl|wget|postman|insomnia/i.test(userAgent);
    
    if (isBot) {
        if (req.path === '/api/visit') return res.json({ status: 'ignored' });
        return next();
    }

    if (req.path === '/api/visit') {
        dailyStats[today].visits++;
        if (clientIp && !dailyStats[today].uniqueIps.includes(clientIp)) {
            dailyStats[today].uniqueIps.push(clientIp);
        }
        saveStatsAsync(today);
        return res.json({ status: 'ok' });
    }
    else if (req.path === '/api/stations') {
        dailyStats[today].searches++;
        saveStatsAsync(today);
    }
    
    next();
};

export const getDailyStats = () => dailyStats;

export const trackStaticVisit = (req) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const anonHash = crypto.createHash('sha256').update(ip + today).digest('hex').substring(0, 16);
    
    // Filtro Bot/Crawler e Test automatizzati
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = !userAgent || /bot|crawler|spider|crawling|google|bing|yandex|duckduck|slurp|baidu|headless|node-superagent|axios|fetch|curl|wget|postman|insomnia/i.test(userAgent);
    
    if (isBot) return;

    if (!dailyStats[today]) {
        dailyStats[today] = { visits: 0, searches: 0, uniqueIps: [] };
    }
    
    if (!dailyStats[today].uniqueIps.includes(anonHash)) {
        dailyStats[today].uniqueIps.push(anonHash);
        dailyStats[today].visits++;
        saveStatsAsync(today);
    }
};
