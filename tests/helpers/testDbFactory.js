import { createClient } from '@libsql/client';

/**
 * Creates and initializes an in-memory SQLite database instance with full schema and optional mock seeds.
 * @param {Object} [options]
 * @param {boolean} [options.seedDefault=true]
 * @param {boolean} [options.includeSyncMeta=false]
 * @returns {Promise<import('@libsql/client').Client>}
 */
export async function createTestDb(options = {}) {
    const db = createClient({ url: 'file::memory:' });

    await db.execute(`
        CREATE TABLE IF NOT EXISTS stations (
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
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS prices (
            id_impianto INTEGER,
            desc_carburante TEXT,
            prezzo REAL,
            is_self INTEGER,
            dt_comunicazione TEXT,
            UNIQUE(id_impianto, desc_carburante, is_self)
        );
    `);

    if (options.includeSyncMeta) {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS sync_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);
    }

    if (options.seedDefault !== false) {
        await db.execute({
            sql: `INSERT INTO stations (id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [1, 'Eni', 'Eni', 'Stradale', 'Eni Roma Centro', 'Via Roma 1', 'Roma', 'RM', 41.9028, 12.4964]
        });

        await db.execute({
            sql: `INSERT INTO prices (id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [1, 'Benzina', 1.850, 1, '2026-03-01 10:00:00']
        });
    }

    return db;
}
