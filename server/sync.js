import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

const URL_ANAGRAFICA = 'https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv';
const URL_PREZZI = 'https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv';
const BATCH_SIZE = 500; // Limite sicuro per Turso e la RAM di Render

export async function sync(dbClient, retries = 8) {
    if (!dbClient) {
        const DB_URL = process.env.TURSO_DATABASE_URL || 'file:' + path.join(process.env.DATA_DIR || path.join(process.cwd(), 'server'), 'database.sqlite');
        const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;
        dbClient = createClient({ url: DB_URL, authToken: DB_TOKEN });
    }
    
    try {
        await doSync(dbClient);
    } catch (error) {
        console.error(`[Sync] Errore durante la sincronizzazione:`, error.message);
        if (retries > 0) {
            console.log(`[Sync] Ritento tra 5 minuti... (Tentativi rimasti: ${retries})`);
            await new Promise(res => setTimeout(res, 5 * 60 * 1000));
            return sync(dbClient, retries - 1);
        }
        throw error;
    }
}

async function doSync(db) {
    console.log('Avvio sincronizzazione dati dal MIMIT su Turso...');

    // 1. Controllo Header If-Modified-Since
    console.log('Controllo aggiornamenti sul server ministeriale...');
    await db.execute(`CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT);`);
    const lastSync = await db.execute(`SELECT value FROM sync_meta WHERE key = 'URL_PREZZI'`);
    const lastModifiedHeader = lastSync.rows.length > 0 ? lastSync.rows[0].value : null;

    const headers = {};
    if (lastModifiedHeader) {
        headers['If-Modified-Since'] = lastModifiedHeader;
    }

    const headResponse = await fetch(URL_PREZZI, { method: 'HEAD', headers });
    if (headResponse.status === 304) {
        console.log(`HTTP 304 (Not Modified): I dati del Ministero non sono cambiati dall'ultimo sync (${lastModifiedHeader}). Aggiornamento saltato con successo (Risorse risparmiate).`);
        return;
    }
    if (!headResponse.ok) {
        throw new Error(`Errore Server MIMIT - HTTP ${headResponse.status} ${headResponse.statusText}. Riprovo più tardi.`);
    }

    const newLastModified = headResponse.headers.get('last-modified');

    // 2. Creazione Tabelle
    console.log('Creazione tabelle temporanee...');
    await db.batch([
        `DROP TABLE IF EXISTS stations_temp;`,
        `DROP TABLE IF EXISTS prices_temp;`,
        `CREATE TABLE stations_temp (
            id INTEGER PRIMARY KEY,
            gestore TEXT,
            bandiera TEXT,
            tipo_impianto TEXT,
            nome_impianto TEXT,
            indirizzo TEXT,
            comune TEXT,
            provincia TEXT,
            latitudine REAL,
            longitudine REAL
        );`,
        `CREATE TABLE prices_temp (
            id_impianto INTEGER,
            desc_carburante TEXT,
            prezzo REAL,
            is_self INTEGER,
            dt_comunicazione TEXT
        );`
    ], "write");

    const parseOptions = {
        columns: false,
        skip_empty_lines: true,
        delimiter: '|',
        relax_quotes: true,
        quote: false,
        relax_column_count: true,
        from_line: 3
    };

    const processStream = (url, sqlTemplate, rowMapper) => {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Errore Server MIMIT - HTTP ${response.status} ${response.statusText} durante il download di ${url}`);
                }
                
                console.log(`Scaricamento completato in memoria per ${url}. Avvio parsing...`);
                const textData = await response.text();
                
                const parser = parse(parseOptions);
                const stream = Readable.from([textData]);
                
                let count = 0;
                let batchQueue = [];
                
                parser.on('readable', async () => {
                    let record;
                    try {
                        while ((record = parser.read()) !== null) {
                            const args = rowMapper(record);
                            if (args) {
                                batchQueue.push({ sql: sqlTemplate, args });
                                count++;
                            }
                            
                            if (batchQueue.length >= BATCH_SIZE) {
                                parser.pause();
                                const currentBatch = [...batchQueue];
                                batchQueue = [];
                                await db.batch(currentBatch, "write");
                                parser.resume();
                            }
                        }
                    } catch (e) {
                        reject(e);
                    }
                });

                parser.on('error', reject);
                stream.on('error', reject);
                parser.on('end', async () => {
                    if (batchQueue.length > 0) {
                        await db.batch(batchQueue, "write");
                    }
                    console.log(`Inserite ${count} righe da ${url}`);
                    resolve();
                });

                stream.pipe(parser);
            } catch (err) {
                reject(err);
            }
        });
    };

    console.log(`Download e inserimento anagrafica da ${URL_ANAGRAFICA}...`);
    await processStream(
        URL_ANAGRAFICA,
        `INSERT INTO stations_temp (id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        (r) => {
            if(r.length < 10) return null;
            return [
                parseInt(r[0]) || 0, r[1], r[2], r[3], r[4], r[5], r[6], r[7],
                parseFloat(r[r.length-2]) || 0, parseFloat(r[r.length-1]) || 0
            ];
        }
    );

    console.log(`Download e inserimento prezzi da ${URL_PREZZI}...`);
    await processStream(
        URL_PREZZI,
        `INSERT INTO prices_temp (id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione) VALUES (?, ?, ?, ?, ?)`,
        (r) => {
            if(r.length < 5) return null;
            return [
                parseInt(r[0]) || 0, r[1], parseFloat(r[2]) || 0, parseInt(r[3]) || 0, r[4]
            ];
        }
    );

    console.log('Sostituzione tabelle (Swap) e creazione indici...');
    await db.batch([
        `DROP TABLE IF EXISTS stations;`,
        `DROP TABLE IF EXISTS prices;`,
        `ALTER TABLE stations_temp RENAME TO stations;`,
        `ALTER TABLE prices_temp RENAME TO prices;`,
        `CREATE INDEX IF NOT EXISTS idx_stations_lat_lng ON stations(latitudine, longitudine);`,
        `CREATE INDEX IF NOT EXISTS idx_prices_impianto ON prices(id_impianto);`,
        `CREATE INDEX IF NOT EXISTS idx_prices_carburante ON prices(desc_carburante);`
    ], "write");

    if (newLastModified) {
        await db.execute({
            sql: `INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)`,
            args: ['URL_PREZZI', newLastModified]
        });
    }

    console.log('Sincronizzazione DB completata con successo!');
}
