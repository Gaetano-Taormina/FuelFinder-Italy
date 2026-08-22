import * as readline from 'node:readline/promises';
import crypto from 'crypto';
import 'dotenv/config';
import { createClient } from '@libsql/client';
import path from 'path';

const ADMIN_PASSKEY = process.env.ADMIN_PASSKEY;

if (!ADMIN_PASSKEY) {
    console.error("ERRORE: Passkey non trovata. Controlla che ADMIN_PASSKEY sia definita nel file .env");
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
        console.error("\n[Error] Accesso Negato: Lunghezza della Passkey non valida.\n");
        process.exit(1);
    }
    
    try {
        if (!crypto.timingSafeEqual(Buffer.from(cleanKey), Buffer.from(ADMIN_PASSKEY))) {
            console.error("\n[Error] Accesso Negato: Passkey errata.\n");
            process.exit(1);
        }
    } catch (e) {
        console.error("\n[Error] Accesso Negato: Errore di validazione.\n");
        process.exit(1);
    }

    const daysInput = await rl.question('Quanti giorni indietro vuoi analizzare? (es. 7, premi Invio per tutti): ');
    const daysLimit = parseInt(daysInput.trim(), 10) || Infinity;
    
    rl.close();

    console.log('\n=============================================');
    console.log('   DASHBOARD STATISTICHE - CARBURANTE');
    console.log('=============================================\n');

    const DB_URL = process.env.TURSO_DATABASE_URL || 'file:' + path.join(process.cwd(), 'server', 'database.sqlite');
    const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;
    
    try {
        const db = createClient({ url: DB_URL, authToken: DB_TOKEN });
        const res = await db.execute('SELECT * FROM app_analytics ORDER BY date DESC');

        if (res.rows.length === 0) {
            console.log('Il database delle statistiche è vuoto.');
            process.exit(0);
        }

        const rowsToShow = res.rows.slice(0, daysLimit);
        
        let totalVisits = 0;
        let totalUnique = 0;
        let totalSearches = 0;

        rowsToShow.forEach(row => {
            const uniqueUsers = row.uniqueIps ? JSON.parse(row.uniqueIps).length : 0;
            totalVisits += (row.visits || 0);
            totalUnique += uniqueUsers;
            totalSearches += (row.searches || 0);
            
            console.log(`  Data: ${row.date}`);
            console.log(`    Visite Totali:    ${row.visits || 0}`);
            console.log(`    Visitatori Unici: ${uniqueUsers}`);
            console.log(`    Ricerche Fatte:   ${row.searches || 0}`);
            console.log('---------------------------------------------');
        });
        
        console.log(`\nSOMMARIO TOTALI (Ultimi ${rowsToShow.length} giorni registrati)`);
        console.log(`=============================================`);
        console.log(`    Visite Totali:    ${totalVisits}`);
        console.log(`    Visitatori Unici: ${totalUnique} (stimati)`);
        console.log(`    Ricerche Totali:  ${totalSearches}`);
        console.log(`=============================================\n`);

    } catch (e) {
        console.error('Errore durante la lettura del DB (forse tabella inesistente?):', e.message);
    }
    
    process.exit(0);
})();
