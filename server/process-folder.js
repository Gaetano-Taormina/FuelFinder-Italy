import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { processHistoricalFile, initDb, loadAnagrafica, DB_PATH, stationRegions } from './import-history.js';

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("Uso: node server/process-folder.js <percorso_cartella_csv>");
    process.exit(1);
}

const dirPath = args[0];

if (!fs.existsSync(dirPath)) {
    console.error(`Errore: Cartella non trovata - ${dirPath}`);
    process.exit(1);
}

const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));
console.log(`Trovati ${files.length} file CSV in ${dirPath}. Inizio elaborazione...`);

const db = new Database(DB_PATH);
initDb(db);

// Carica anagrafica solo UNA volta per l'intera cartella (molto più veloce)
if (stationRegions.size === 0) loadAnagrafica();

async function runAll() {
    for (const file of files) {
        const csvPath = path.join(dirPath, file);
        
        const dateMatch = file.match(/(\d{4})(\d{2})(\d{2})/);
        let dateStr = "";
        
        if (dateMatch) {
            dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        } else {
            console.log(`Salto ${file} - Nessuna data valida trovata nel nome.`);
            continue;
        }
        
        try {
            console.log(`\n========================================`);
            console.log(`Avvio importazione per la data: ${dateStr}`);
            await processHistoricalFile(csvPath, db, dateStr);
        } catch (e) {
            console.error(`❌ Errore durante l'elaborazione di ${file}:`, e);
        }
    }

    console.log(`\n🎉 ELABORAZIONE CARTELLA COMPLETATA!`);
    db.close();
}

runAll();
