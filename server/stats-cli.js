/* oxlint-disable no-console */
import * as readline from 'node:readline/promises';
import crypto from 'crypto';
import 'dotenv/config';
import { createClient } from '@libsql/client';
import path from 'path';

const ADMIN_PASSKEY = process.env.ADMIN_PASSKEY;

if (!ADMIN_PASSKEY) {
    console.error("[Error] Missing ADMIN_PASSKEY in .env");
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    const inputKey = await rl.question('Inserisci la Passkey Admin: ');
    const cleanKey = inputKey.trim();

    if (cleanKey.length !== ADMIN_PASSKEY.length) {
        console.error("\n[Error] Access Denied: Invalid passkey length.\n");
        process.exit(1);
    }
    
    try {
        if (!crypto.timingSafeEqual(Buffer.from(cleanKey), Buffer.from(ADMIN_PASSKEY))) {
            console.error("\n[Error] Access Denied: Wrong passkey.\n");
            process.exit(1);
        }
    } catch {
        console.error("\n[Error] Access Denied: Validation error.\n");
        process.exit(1);
    }

    const daysInput = await rl.question('Quanti giorni indietro vuoi analizzare? (es. 7, premi Invio per tutti): ');
    const daysLimit = parseInt(daysInput.trim(), 10) || Infinity;
    
    rl.close();

    const dbPath = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'server'), 'database.sqlite');
    
    try {
        const db = createClient({ url: `file:${dbPath}` });
        const res = await db.execute('SELECT * FROM app_analytics ORDER BY date DESC');

        if (res.rows.length === 0) {
            console.info('ℹ️ Analytics database is currently empty.');
        } else {
            const rowsToShow = res.rows.slice(0, daysLimit);
            
            let totalVisits = 0;
            let totalUnique = 0;
            let totalSearches = 0;

            const tableRows = rowsToShow.map(row => {
                const uniqueUsers = row.uniqueIps ? JSON.parse(row.uniqueIps).length : 0;
                totalVisits += (row.visits || 0);
                totalUnique += uniqueUsers;
                totalSearches += (row.searches || 0);

                return {
                    'Date': row.date,
                    'Visits': row.visits || 0,
                    'Unique Visitors': uniqueUsers,
                    'Searches': row.searches || 0
                };
            });

            console.group('📊 FuelFinder Analytics Dashboard');
            console.table(tableRows);
            console.groupEnd();

            console.group('📈 Summary Totals');
            console.table({
                'Metrics': {
                    'Days Tracked': rowsToShow.length,
                    'Total Visits': totalVisits,
                    'Total Unique Visitors (est.)': totalUnique,
                    'Total Searches': totalSearches,
                    'Avg Visits/Day': (totalVisits / rowsToShow.length).toFixed(1)
                }
            });
            console.groupEnd();
        }
    } catch (e) {
        console.error('❌ DB Read Error:', e.message);
    }
    
    process.exit(0);
})();
