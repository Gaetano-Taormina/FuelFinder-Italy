import { parse } from "csv-parse";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import "dotenv/config";

const URL_ANAGRAFICA =
  "https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv";
const URL_PREZZI =
  "https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv";
const BATCH_SIZE = 2500; // Aumentato per velocizzare il sync riducendo i roundtrip verso Turso

export async function sync(dbClient, retries = 8) {
  if (!dbClient) {
    const DB_URL =
      process.env.TURSO_DATABASE_URL ||
      "file:" +
        path.join(
          process.env.DATA_DIR || path.join(process.cwd(), "server"),
          "database.sqlite",
        );
    const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;
    dbClient = createClient({ url: DB_URL, authToken: DB_TOKEN });
  }

  try {
    await doSync(dbClient);
  } catch (error) {
    console.error(`[Sync] Errore durante la sincronizzazione:`, error.message);
    if (retries > 0) {
      console.log(
        `[Sync] Ritento tra 5 minuti... (Tentativi rimasti: ${retries})`,
      );
      await new Promise((res) => setTimeout(res, 5 * 60 * 1000));
      return sync(dbClient, retries - 1);
    }
    throw error;
  }
}

async function doSync(db) {
  console.log("Avvio sincronizzazione dati dal MIMIT su Turso...");

  // 1. Controllo Header If-Modified-Since
  console.log("Controllo aggiornamenti sul server ministeriale...");
  await db.execute(
    `CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT);`,
  );
  const lastSync = await db.execute(
    `SELECT value FROM sync_meta WHERE key = 'URL_PREZZI'`,
  );
  const lastModifiedHeader =
    lastSync.rows.length > 0 ? lastSync.rows[0].value : null;

  const headers = {};
  if (lastModifiedHeader) {
    headers["If-Modified-Since"] = lastModifiedHeader;
  }

  const headResponse = await fetch(URL_PREZZI, { method: "HEAD", headers });
  if (headResponse.status === 304) {
    console.log(
      `HTTP 304 (Not Modified): I dati del Ministero non sono cambiati dall'ultimo sync (${lastModifiedHeader}). Aggiornamento saltato con successo (Risorse risparmiate).`,
    );
    return;
  }
  if (!headResponse.ok) {
    throw new Error(
      `Errore Server MIMIT - HTTP ${headResponse.status} ${headResponse.statusText}. Riprovo più tardi.`,
    );
  }

  const newLastModified = headResponse.headers.get("last-modified");

  // 2. Creazione Tabelle
  console.log("Creazione tabelle temporanee...");
  await db.batch(
    [
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
        );`,
    ],
    "write",
  );

  const parseOptions = {
    columns: false,
    skip_empty_lines: true,
    delimiter: "|",
    relax_quotes: true,
    quote: false,
    relax_column_count: true,
    from_line: 3,
  };

  const processStream = (url, sqlTemplate, rowMapper) => {
    return new Promise(async (resolve, reject) => {
      let tmpFile;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Errore Server MIMIT - HTTP ${response.status} ${response.statusText} durante il download di ${url}`,
          );
        }

        tmpFile = path.join(process.cwd(), "server", `temp_${Date.now()}.csv`);
        console.log(`Scaricamento veloce in locale (${url}) in ${tmpFile}...`);
        const webStream = Readable.fromWeb(response.body);
        await pipeline(webStream, fs.createWriteStream(tmpFile));

        console.log(`Download completato, avvio parsing e caricamento a blocchi...`);
        
        const fileStream = fs.createReadStream(tmpFile);
        const parser = fileStream.pipe(parse(parseOptions));

        let count = 0;
        let batchQueue = [];

        fileStream.on("error", reject);
        parser.on("error", reject);

        try {
          for await (const record of parser) {
            const args = rowMapper(record);
            if (args) {
              batchQueue.push({ sql: sqlTemplate, args });
              count++;
            }

            if (batchQueue.length >= BATCH_SIZE) {
              const currentBatch = [...batchQueue];
              batchQueue = [];
              await db.batch(currentBatch, "write");
            }
          }
          
          if (batchQueue.length > 0) {
            await db.batch(batchQueue, "write");
          }
          console.log(`Inserite ${count} righe da ${url}`);
          resolve();
        } catch (err) {
          reject(err);
        }
      } catch (err) {
        reject(err);
      } finally {
        if (tmpFile && fs.existsSync(tmpFile)) {
          fs.unlinkSync(tmpFile);
        }
      }
    });
  };

  console.log(`Download e inserimento anagrafica da ${URL_ANAGRAFICA}...`);
  await processStream(
    URL_ANAGRAFICA,
    `INSERT INTO stations_temp (id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    (r) => {
      if (r.length < 10) return null;
      return [
        parseInt(r[0]) || 0,
        r[1],
        r[2],
        r[3],
        r[4],
        r[5],
        r[6],
        r[7],
        parseFloat(r[r.length - 2]) || 0,
        parseFloat(r[r.length - 1]) || 0,
      ];
    },
  );

  console.log(`Download e inserimento prezzi da ${URL_PREZZI}...`);
  await processStream(
    URL_PREZZI,
    `INSERT INTO prices_temp (id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione) VALUES (?, ?, ?, ?, ?)`,
    (r) => {
      if (r.length < 5) return null;
      return [
        parseInt(r[0]) || 0,
        r[1],
        parseFloat(r[2]) || 0,
        parseInt(r[3]) || 0,
        r[4],
      ];
    },
  );

  console.log("Sostituzione tabelle (Swap) e creazione indici...");
  await new Promise((r) => setTimeout(r, 50)); // Yield prima della transazione pesante
  await db.batch(
    [
      // 1. Assicurati che le tabelle principali esistano con vincoli appropriati
      `CREATE TABLE IF NOT EXISTS stations (
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
      `CREATE TABLE IF NOT EXISTS prices (
            id_impianto INTEGER,
            desc_carburante TEXT,
            prezzo REAL,
            is_self INTEGER,
            dt_comunicazione TEXT,
            UNIQUE(id_impianto, desc_carburante, is_self)
        );`,

      // 2. Indici principali e Fix per UPSERT (Rimuove duplicati e crea indice univoco se mancante)
      `DELETE FROM prices WHERE rowid NOT IN (SELECT MIN(rowid) FROM prices GROUP BY id_impianto, desc_carburante, is_self);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_prices_unique ON prices(id_impianto, desc_carburante, is_self);`,
      `CREATE INDEX IF NOT EXISTS idx_stations_lat_lng ON stations(latitudine, longitudine);`,
      `CREATE INDEX IF NOT EXISTS idx_prices_impianto ON prices(id_impianto);`,
      `CREATE INDEX IF NOT EXISTS idx_prices_carburante ON prices(desc_carburante);`,

      // 3. Upsert Stations: inserisci o aggiorna solo se modificato
      `INSERT INTO stations (id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine)
         SELECT id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine FROM stations_temp
         WHERE true 
         ON CONFLICT(id) DO UPDATE SET
            gestore = excluded.gestore,
            bandiera = excluded.bandiera,
            tipo_impianto = excluded.tipo_impianto,
            nome_impianto = excluded.nome_impianto,
            indirizzo = excluded.indirizzo,
            comune = excluded.comune,
            provincia = excluded.provincia,
            latitudine = excluded.latitudine,
            longitudine = excluded.longitudine
         WHERE stations.gestore != excluded.gestore 
            OR stations.bandiera != excluded.bandiera 
            OR stations.tipo_impianto != excluded.tipo_impianto 
            OR stations.nome_impianto != excluded.nome_impianto 
            OR stations.indirizzo != excluded.indirizzo 
            OR stations.comune != excluded.comune 
            OR stations.provincia != excluded.provincia 
            OR stations.latitudine != excluded.latitudine 
            OR stations.longitudine != excluded.longitudine;`,

      // 4. Upsert Prices: inserisci o aggiorna solo se modificato
      `INSERT INTO prices (id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione)
         SELECT id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione FROM prices_temp
         WHERE true
         ON CONFLICT(id_impianto, desc_carburante, is_self) DO UPDATE SET
            prezzo = excluded.prezzo,
            dt_comunicazione = excluded.dt_comunicazione
         WHERE prices.prezzo != excluded.prezzo 
            OR prices.dt_comunicazione != excluded.dt_comunicazione;`,

      // 5. Rimuovi stazioni e prezzi non più presenti (opzionale, ma mantiene DB pulito)
      `DELETE FROM prices WHERE id_impianto NOT IN (SELECT id FROM stations_temp);`,
      `DELETE FROM stations WHERE id NOT IN (SELECT id FROM stations_temp);`,

      // 6. Elimina tabelle temporanee
      `DROP TABLE IF EXISTS stations_temp;`,
      `DROP TABLE IF EXISTS prices_temp;`,
    ],
    "write",
  );

  if (newLastModified) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)`,
      args: ["URL_PREZZI", newLastModified],
    });
  }

  console.log("Sincronizzazione DB completata con successo!");
}
