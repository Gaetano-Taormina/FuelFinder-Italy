/* oxlint-disable no-console */
export const BATCH_SIZE = 2500;

export async function initSchema(db) {
  console.log("Verifica tabelle principali...");
  await db.batch([
      `CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT);`,
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
      `CREATE INDEX IF NOT EXISTS idx_stations_lat_lng ON stations(latitudine, longitudine);`,
      `CREATE INDEX IF NOT EXISTS idx_prices_impianto ON prices(id_impianto);`,
      `CREATE INDEX IF NOT EXISTS idx_prices_carburante ON prices(desc_carburante);`,
  ], "write");
}

export async function getLastModified(db) {
    try {
        const lastSync = await db.execute(`SELECT value FROM sync_meta WHERE key = 'URL_PREZZI'`);
        return lastSync.rows.length > 0 ? lastSync.rows[0].value : null;
    } catch {
        // Table might not exist yet
        return null;
    }
}

export async function setLastModified(db, newLastModified) {
  if (newLastModified) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)`,
      args: ["URL_PREZZI", newLastModified],
    });
  }
}

export async function loadExistingData(db) {
  console.log("Caricamento dati attuali in memoria...");
  const existingStations = new Map();
  try {
      const stRes = await db.execute("SELECT id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine FROM stations");
      for (const r of stRes.rows) existingStations.set(r.id, r);
  } catch {}
  
  const existingPrices = new Map();
  try {
      const prRes = await db.execute("SELECT id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione FROM prices");
      for (const r of prRes.rows) existingPrices.set(`${r.id_impianto}_${r.desc_carburante}_${r.is_self}`, r);
  } catch {}

  console.log(`Dati caricati: ${existingStations.size} stazioni, ${existingPrices.size} prezzi.`);
  return { existingStations, existingPrices };
}

export async function applyChanges(db, syncOperations) {
  console.log(`Totale query SQL da inviare a Turso: ${syncOperations.length}`);
  if (syncOperations.length > 0) {
      for (let i = 0; i < syncOperations.length; i += BATCH_SIZE) {
          const chunk = syncOperations.slice(i, i + BATCH_SIZE);
          // oxlint-disable-next-line no-await-in-loop
          await db.batch(chunk, "write");
      }
      console.log(`Salvataggio completato in blocchi da ${BATCH_SIZE}.`);
  }
}
