import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const STATS_PATH = path.join(process.cwd(), 'server', 'stats.json');
let dailyStats = {};

if (fs.existsSync(STATS_PATH)) {
    try {
        dailyStats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
    } catch(e) { console.error("Errore lettura stats.json", e); }
}

export function saveStats() {
    try {
        fs.writeFileSync(STATS_PATH, JSON.stringify(dailyStats, null, 2));
    } catch(e) { console.error("Errore scrittura stats.json", e); }
}

export const analyticsMiddleware = (req, res, next) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (!dailyStats[today]) {
        dailyStats[today] = { visits: 0, searches: 0, uniqueIps: [] };
    }
    
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const clientIp = crypto.createHash('sha256').update(ip + today).digest('hex').substring(0, 16);

    if (req.path === '/api/visit') {
        dailyStats[today].visits++;
        if (clientIp && !dailyStats[today].uniqueIps.includes(clientIp)) {
            dailyStats[today].uniqueIps.push(clientIp);
        }
        saveStats();
        return res.json({ status: 'ok' });
    }
    else if (req.path === '/api/stations') {
        dailyStats[today].searches++;
        saveStats();
    }
    
    next();
};

export const getDailyStats = () => dailyStats;

export const trackStaticVisit = (req) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const anonHash = crypto.createHash('sha256').update(ip + today).digest('hex').substring(0, 16);
    
    if (!dailyStats[today]) {
        dailyStats[today] = { visits: 0, searches: 0, uniqueIps: [] };
    }
    
    if (!dailyStats[today].uniqueIps.includes(anonHash)) {
        dailyStats[today].uniqueIps.push(anonHash);
        dailyStats[today].visits++;
        saveStats();
    }
};
