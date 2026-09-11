/* oxlint-disable no-console */
import 'dotenv/config';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { sync } from './sync/index.js';

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');
const isLocalExplicit = args.has('--local');

const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;
const syncUrl = process.env.TURSO_DATABASE_URL;

let db;

if (isLocalExplicit || !syncUrl) {
    const localDbPath = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'server'), 'database.sqlite');
    console.log(`[Sync] Operating in LOCAL SQLite mode (${localDbPath})`);
    db = createClient({
        url: `file:${localDbPath}`
    });
} else {
    if (!DB_TOKEN) {
        console.error("Missing TURSO_AUTH_TOKEN in environment variables for remote sync.");
        process.exit(1);
    }
    console.log(`[Sync] Operating in REMOTE Turso mode (${syncUrl})`);
    db = createClient({
        url: syncUrl,
        authToken: DB_TOKEN
    });
}

console.log("Starting manual sync" + (isDryRun ? " (DRY-RUN MODE)" : "") + "...");
sync(db, 2, { dryRun: isDryRun, showProgress: true, retryDelayMs: 15000 }).then(() => {
    console.log("Manual sync finished.");
    process.exit(0);
}).catch(err => {
    const errorMsg = err.message || err.toString();
    
    console.error("\n❌ [ERRORE CRITICO] Fallimento Sincronizzazione Database:");
    
    if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota')) {
        console.error(" ➔ Causa: Quota Turso esaurita (limite letture/scritture superato).");
        console.error(" ➔ Soluzione: Attendi il reset mensile o effettua l'upgrade del piano.");
    } else if (errorMsg.includes('SQLITE_CORRUPT') || errorMsg.includes('malformed')) {
        console.error(" ➔ Causa: Possibile corruzione del database locale (SQLite).");
        console.error(" ➔ Soluzione: Cancella il file locale 'database.sqlite' e riavvia il server.");
    } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('ECONNREFUSED')) {
        console.error(" ➔ Causa: Errore di rete durante la comunicazione con Turso o MIMIT.");
        console.error(" ➔ Soluzione: Verifica la connessione internet e lo stato dei server remoti.");
    } else if (errorMsg.includes('auth') || errorMsg.includes('token') || errorMsg.includes('unauthorized')) {
        console.error(" ➔ Causa: Token di autenticazione Turso non valido o scaduto.");
        console.error(" ➔ Soluzione: Controlla la variabile TURSO_AUTH_TOKEN nel file .env o su Render.");
    } else {
        console.error(" ➔ Causa: Errore generico non previsto durante l'esecuzione delle query.");
        console.error(` ➔ Dettagli Tecnici: ${errorMsg}`);
    }
    
    process.exit(1);
});
