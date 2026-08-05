import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import crypto from 'crypto';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATS_PATH = path.join(__dirname, 'stats.json');
const ADMIN_PASSKEY = process.env.ADMIN_PASSKEY;

if (!ADMIN_PASSKEY) {
    console.error("ERRORE: Passkey non trovata. Controlla che ADMIN_PASSKEY sia definita nel file .env");
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Inserisci la Passkey Admin: ', (inputKey) => {
    rl.close();
    const cleanKey = inputKey.trim();

    if (cleanKey.length !== ADMIN_PASSKEY.length) {
        console.error("\n❌ Accesso Negato: Lunghezza della Passkey non valida.\n");
        process.exit(1);
    }
    
    try {
        if (!crypto.timingSafeEqual(Buffer.from(cleanKey), Buffer.from(ADMIN_PASSKEY))) {
            console.error("\n❌ Accesso Negato: Passkey errata.\n");
            process.exit(1);
        }
    } catch (e) {
        console.error("\n❌ Accesso Negato: Errore di validazione.\n");
        process.exit(1);
    }

    // Se arriviamo qui, la passkey è corretta!
    console.log('\n=============================================');
    console.log('   📊 DASHBOARD STATISTICHE - CARBURANTE 📊');
    console.log('=============================================\n');

    if (!fs.existsSync(STATS_PATH)) {
        console.log('Nessuna statistica registrata finora. Il file stats.json non esiste.');
        process.exit(0);
    }

    try {
        const rawData = fs.readFileSync(STATS_PATH, 'utf8');
        const stats = JSON.parse(rawData);
        const dates = Object.keys(stats).sort((a, b) => b.localeCompare(a)); // Più recenti prima

        if (dates.length === 0) {
            console.log('Il file delle statistiche è vuoto.');
            process.exit(0);
        }

        dates.forEach(date => {
            const data = stats[date];
            const uniqueUsers = data.uniqueIps ? data.uniqueIps.length : 0;
            
            console.log(`📅 Data: ${date}`);
            console.log(`   👁️  Visite Totali:    ${data.visits || 0}`);
            console.log(`   👥  Visitatori Unici: ${uniqueUsers}`);
            console.log(`   🔍  Ricerche Fatte:   ${data.searches || 0}`);
            console.log('---------------------------------------------');
        });

    } catch (e) {
        console.error('Errore durante la lettura del file stats.json:', e.message);
    }
});
