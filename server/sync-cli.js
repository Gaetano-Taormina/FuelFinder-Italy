/* oxlint-disable no-console */
import 'dotenv/config';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { sync } from './sync/index.js';

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');

const localDbPath = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'server'), 'database.sqlite');

console.group('⚙️ [CLI] Database Sync Runner');
console.info(`Mode: LOCAL SQLite`);
console.info(`Target DB: ${localDbPath}`);
console.info(`Execution: ${isDryRun ? 'DRY-RUN (Simulated)' : 'PRODUCTION (Write)'}`);
console.groupEnd();

const db = createClient({
    url: `file:${localDbPath}`
});

console.time('⏱️ Total CLI Execution Time');
sync(db, 2, { dryRun: isDryRun, showProgress: true, retryDelayMs: 15000 }).then(() => {
    console.timeEnd('⏱️ Total CLI Execution Time');
    process.exit(0);
}).catch(err => {
    const errorMsg = err.message || err.toString();
    
    console.group('❌ [CRITICAL ERROR] Database Sync Failed');
    if (errorMsg.includes('SQLITE_CORRUPT') || errorMsg.includes('malformed')) {
        console.error("Cause: Possibile corruzione del database locale (SQLite).");
        console.info("Solution: Cancella il file locale 'database.sqlite' e riavvia il server.");
    } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('timeout')) {
        console.error("Cause: Errore di rete o timeout durante la comunicazione con i server MIMIT.");
        console.info("Solution: Verifica la connessione internet e lo stato del portale Open Data MIMIT.");
    } else {
        console.error("Cause: Errore imprevisto durante l'esecuzione del sync.");
        console.error(`Technical Details: ${errorMsg}`);
    }
    console.groupEnd();
    
    process.exit(1);
});
