import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { createClient } from '@libsql/client';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'server');
const DB_URL = process.env.TURSO_DATABASE_URL || 'file:' + path.join(DATA_DIR, 'storico.sqlite');
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;
const ANAGRAFICA_PATH = path.join(DATA_DIR, 'anagrafica_impianti_attivi.csv');

// Mappa Province -> Regioni
const provinceToRegion = {
  'AG': 'Sicilia', 'AL': 'Piemonte', 'AN': 'Marche', 'AO': 'Valle d\'Aosta', 'AR': 'Toscana',
  'AP': 'Marche', 'AT': 'Piemonte', 'AV': 'Campania', 'BA': 'Puglia', 'BT': 'Puglia',
  'BL': 'Veneto', 'BN': 'Campania', 'BG': 'Lombardia', 'BI': 'Piemonte', 'BO': 'Emilia-Romagna',
  'BZ': 'Trentino-Alto Adige', 'BS': 'Lombardia', 'BR': 'Puglia', 'CA': 'Sardegna', 'CL': 'Sicilia',
  'CB': 'Molise', 'CI': 'Sardegna', 'CE': 'Campania', 'CT': 'Sicilia', 'CZ': 'Calabria',
  'CH': 'Abruzzo', 'CO': 'Lombardia', 'CS': 'Calabria', 'CR': 'Lombardia', 'KR': 'Calabria',
  'CN': 'Piemonte', 'EN': 'Sicilia', 'FM': 'Marche', 'FE': 'Emilia-Romagna', 'FI': 'Toscana',
  'FG': 'Puglia', 'FC': 'Emilia-Romagna', 'FR': 'Lazio', 'GE': 'Liguria', 'GO': 'Friuli-Venezia Giulia',
  'GR': 'Toscana', 'IM': 'Liguria', 'IS': 'Molise', 'AQ': 'Abruzzo', 'SP': 'Liguria',
  'LT': 'Lazio', 'LE': 'Puglia', 'LC': 'Lombardia', 'LI': 'Toscana', 'LO': 'Lombardia',
  'LU': 'Toscana', 'MC': 'Marche', 'MN': 'Lombardia', 'MS': 'Toscana', 'MT': 'Basilicata',
  'ME': 'Sicilia', 'MI': 'Lombardia', 'MO': 'Emilia-Romagna', 'MB': 'Lombardia',
  'NA': 'Campania', 'NO': 'Piemonte', 'NU': 'Sardegna', 'OG': 'Sardegna', 'OT': 'Sardegna',
  'OR': 'Sardegna', 'PD': 'Veneto', 'PA': 'Sicilia', 'PR': 'Emilia-Romagna', 'PV': 'Lombardia',
  'PG': 'Umbria', 'PU': 'Marche', 'PE': 'Abruzzo', 'PC': 'Emilia-Romagna', 'PI': 'Toscana',
  'PT': 'Toscana', 'PN': 'Friuli-Venezia Giulia', 'PZ': 'Basilicata', 'PO': 'Toscana', 'RG': 'Sicilia',
  'RA': 'Emilia-Romagna', 'RC': 'Calabria', 'RE': 'Emilia-Romagna', 'RI': 'Lazio', 'RN': 'Emilia-Romagna',
  'RM': 'Lazio', 'RO': 'Veneto', 'SA': 'Campania', 'SS': 'Sardegna', 'SV': 'Liguria',
  'SI': 'Toscana', 'SR': 'Sicilia', 'SO': 'Lombardia', 'TA': 'Puglia', 'TE': 'Abruzzo',
  'TR': 'Umbria', 'TO': 'Piemonte', 'TP': 'Sicilia', 'TN': 'Trentino-Alto Adige', 'TV': 'Veneto',
  'TS': 'Friuli-Venezia Giulia', 'UD': 'Friuli-Venezia Giulia', 'VA': 'Lombardia', 'VE': 'Veneto',
  'VB': 'Piemonte', 'VC': 'Piemonte', 'VR': 'Veneto', 'VV': 'Calabria', 'VI': 'Veneto',
  'VT': 'Lazio', 'SU': 'Sardegna'
};

const stationRegions = new Map();

// Configurazioni base del parser CSV
const getParseOptions = (delimiter) => ({
    columns: false,
    skip_empty_lines: true,
    delimiter: delimiter,
    relax_quotes: true,
    quote: false,
    relax_column_count: true,
    from_line: 3
});

async function initDb(db) {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS daily_stats (
            date TEXT,
            fuel_type TEXT,
            region TEXT,
            avg_price REAL,
            min_price REAL,
            max_price REAL,
            min_station_id INTEGER,
            max_station_id INTEGER,
            sample_count INTEGER,
            PRIMARY KEY (date, fuel_type, region)
        );
    `);
}

function loadAnagrafica() {
    console.log(`Caricamento anagrafica da ${ANAGRAFICA_PATH}...`);
    if (!fs.existsSync(ANAGRAFICA_PATH)) {
        console.warn(`ATTENZIONE: ${ANAGRAFICA_PATH} non trovato. Tutte le pompe saranno segnate come Sconosciuta.`);
        return;
    }
    
    const content = fs.readFileSync(ANAGRAFICA_PATH, 'utf-8');
    const lines = content.split('\n');
    let loaded = 0;
    
    for (let i = 2; i < lines.length; i++) { // Salta prima riga e header
        if (!lines[i].trim()) continue;
        const cols = lines[i].split('|');
        if (cols.length >= 8) {
            const idImpianto = parseInt(cols[0]);
            const prov = cols[7].trim().toUpperCase();
            const region = provinceToRegion[prov] || 'Sconosciuta';
            stationRegions.set(idImpianto, region);
            loaded++;
        }
    }
    console.log(`Caricate ${loaded} stazioni con le relative regioni.`);
}

async function processHistoricalFile(filePath, db, dateStr) {
    return new Promise((resolve, reject) => {
        console.log(`\n⏳ Elaborazione del file: ${filePath}`);
        
        // Rilevamento automatico del delimitatore (; oppure |)
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(1024);
        fs.readSync(fd, buffer, 0, 1024, 0);
        fs.closeSync(fd);
        const text = buffer.toString('utf-8');
        const lines = text.split('\n');
        const headerLine = lines[1] || '';
        const detectedDelimiter = headerLine.includes('|') ? '|' : ';';
        
        const parseOptions = getParseOptions(detectedDelimiter);
        const parser = parse(parseOptions);
        const stream = fs.createReadStream(filePath);
        
        // Struttura: stats[region][fuel] = { sum, count, min, max, min_id, max_id }
        const stats = {};
        
        // Aggiungiamo anche la regione 'Italia' di default
        stats['Italia'] = {};

        parser.on('readable', function() {
            let record;
            while ((record = parser.read()) !== null) {
                if (record.length < 4) continue;
                
                const id = parseInt(record[0]);
                const fuel = record[1];
                const price = parseFloat(record[2]);
                
                if (isNaN(price) || price < 0.3 || price > 5) continue; 
                
                const region = stationRegions.get(id) || 'Sconosciuta';
                const regionsToUpdate = [region, 'Italia'];
                
                for (const r of regionsToUpdate) {
                    if (!stats[r]) stats[r] = {};
                    if (!stats[r][fuel]) {
                        stats[r][fuel] = { sum: 0, count: 0, min: 999, max: 0, min_id: 0, max_id: 0 };
                    }
                    
                    const obj = stats[r][fuel];
                    obj.sum += price;
                    obj.count++;
                    
                    if (price < obj.min) {
                        obj.min = price;
                        obj.min_id = id;
                    }
                    if (price > obj.max) {
                        obj.max = price;
                        obj.max_id = id;
                    }
                }
            }
        });

        parser.on('error', function(err) {
            console.error('Errore parsing:', err.message);
            reject(err);
        });

        parser.on('end', async function() {
            console.log(`✅ Lette righe valide per diverse regioni.`);
            
            const sqlTemplate = `
                INSERT OR REPLACE INTO daily_stats 
                (date, fuel_type, region, avg_price, min_price, max_price, min_station_id, max_station_id, sample_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const batchQueue = [];
            
            for (const [region, fuels] of Object.entries(stats)) {
                for (const [fuel, data] of Object.entries(fuels)) {
                    batchQueue.push({
                        sql: sqlTemplate,
                        args: [
                            dateStr, 
                            fuel, 
                            region,
                            Number((data.sum / data.count).toFixed(3)),
                            data.min, 
                            data.max, 
                            data.min_id, 
                            data.max_id, 
                            data.count
                        ]
                    });
                }
            }

            try {
                // Esegui in batch su Turso (chunk di 500)
                for (let i = 0; i < batchQueue.length; i += 500) {
                    const chunk = batchQueue.slice(i, i + 500);
                    await db.batch(chunk, "write");
                }
                console.log(`💾 Salvate le medie nel database per ${batchQueue.length} record (Regioni + Italia).`);
                resolve();
            } catch(e) {
                reject(e);
            }
        });

        stream.pipe(parser);
    });
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Uso: node server/import-history.js <percorso_csv> <data_YYYY-MM-DD>");
        process.exit(1);
    }
    
    const db = createClient({
        url: DB_URL,
        authToken: DB_TOKEN
    });
    
    await initDb(db);
    
    if (stationRegions.size === 0) loadAnagrafica();
    
    processHistoricalFile(args[0], db, args[1])
        .then(() => {
            console.log('\n🎉 Operazione completata! Database aggiornato.');
            process.exit(0);
        })
        .catch(err => {
            console.error('\n❌ Errore critico:', err);
            process.exit(1);
        });
}

export { processHistoricalFile, initDb, loadAnagrafica, stationRegions };
