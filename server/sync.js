import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import Database from 'better-sqlite3';

const TEMP_DB_PATH = path.join(process.cwd(), 'server', 'database_temp.sqlite');
const URL_ANAGRAFICA = 'https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv';
const URL_PREZZI = 'https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv';

export async function sync(retries = 3) {
    try {
        await doSync();
    } catch (error) {
        console.error(`[Sync] Errore durante la sincronizzazione:`, error.message);
        if (retries > 0) {
            console.log(`[Sync] Ritento tra 5 minuti... (Tentativi rimasti: ${retries})`);
            await new Promise(res => setTimeout(res, 5 * 60 * 1000));
            return sync(retries - 1);
        }
        throw error;
    }
}

async function doSync() {
    console.log('Avvio sincronizzazione dati dal MIMIT...');

    // Elimina eventuale file temporaneo precedente rimasto appeso
    if (fs.existsSync(TEMP_DB_PATH)) {
        fs.unlinkSync(TEMP_DB_PATH);
    }

    const db = new Database(TEMP_DB_PATH);
    db.pragma('journal_mode = WAL');

    console.log('Creazione tabelle nel database temporaneo...');
    db.exec(`
        CREATE TABLE stations (
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
        );

        CREATE TABLE prices (
            id_impianto INTEGER,
            desc_carburante TEXT,
            prezzo REAL,
            is_self INTEGER,
            dt_comunicazione TEXT
        );
    `);

    const parseOptions = {
        columns: false,
        skip_empty_lines: true,
        delimiter: '|',
        relax_quotes: true,
        quote: false,
        relax_column_count: true,
        from_line: 3
    };

    // Helper function to process stream
    const processStream = (url, insertStmt, rowProcessor) => {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const parser = parse(parseOptions);
                const stream = Readable.fromWeb(response.body);
                
                let count = 0;
                parser.on('readable', () => {
                    let record;
                    db.exec('BEGIN TRANSACTION');
                    try {
                        while ((record = parser.read()) !== null) {
                            rowProcessor(insertStmt, record);
                            count++;
                        }
                        db.exec('COMMIT');
                    } catch (e) {
                        db.exec('ROLLBACK');
                        reject(e);
                    }
                });

                parser.on('error', reject);
                parser.on('end', () => {
                    console.log(`Inserite ${count} righe da ${url}`);
                    resolve();
                });

                stream.pipe(parser);
            } catch (err) {
                reject(err);
            }
        });
    };

    const insertStation = db.prepare(`
        INSERT INTO stations (id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPrice = db.prepare(`
        INSERT INTO prices (id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione)
        VALUES (?, ?, ?, ?, ?)
    `);

    console.log(`Download e inserimento anagrafica da ${URL_ANAGRAFICA}...`);
    await processStream(URL_ANAGRAFICA, insertStation, (stmt, r) => {
        if(r.length < 10) return;
        try {
            stmt.run(
                parseInt(r[0]), r[1], r[2], r[3], r[4], r[5], r[6], r[7],
                parseFloat(r[r.length-2]), parseFloat(r[r.length-1])
            );
        } catch(e) {}
    });

    console.log(`Download e inserimento prezzi da ${URL_PREZZI}...`);
    await processStream(URL_PREZZI, insertPrice, (stmt, r) => {
        if(r.length < 5) return;
        try {
            stmt.run(
                parseInt(r[0]), r[1], parseFloat(r[2]), parseInt(r[3]), r[4]
            );
        } catch(e) {}
    });

    console.log('Creazione indici...');
    db.exec(`
        BEGIN TRANSACTION;
        CREATE INDEX idx_stations_lat_lng ON stations(latitudine, longitudine);
        CREATE INDEX idx_prices_impianto ON prices(id_impianto);
        CREATE INDEX idx_prices_carburante ON prices(desc_carburante);
        COMMIT;
    `);

    db.close();
    console.log('Sincronizzazione DB temporaneo completata con successo!');
}
