/* oxlint-disable no-console */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

import { createClient } from '@libsql/client';
import { initSchema, applyChanges, setLastModified } from './sync/database.js';
import { processStationsDiff, processPricesDiff, processDeletions } from './sync/processor.js';

const defaultServerDir = path.join(__dirname);

const anagraficaPath = process.argv[2] || path.join(defaultServerDir, 'anagrafica_impianti_attivi.csv');
const prezziPath = process.argv[3] || path.join(defaultServerDir, 'prezzo_alle_8.csv');

async function main() {
  console.group('📥 [CSV Import] Direct CSV Import from Local Files');
  console.time('⏱️ CSV Import Completed In');

  try {
    const localDbPath = path.join(process.env.DATA_DIR || defaultServerDir, 'database.sqlite');
    const db = createClient({ url: `file:${localDbPath}` });

    console.info(`📂 Anagrafica file: ${anagraficaPath}`);
    console.info(`📂 Prezzi file: ${prezziPath}`);
    console.info(`💾 Database: ${localDbPath}`);

    // Initialize schema
    await initSchema(db);

    const syncOps = {
      upsertStations: [],
      upsertPrices: [],
      deleteStations: [],
      deletePrices: []
    };
    const seenStationIds = new Set();
    const seenPriceIds = new Set();

    // Process stations
    console.info('📥 Processing stations CSV...');
    await processStationsDiff(anagraficaPath, new Map(), syncOps, seenStationIds, {});

    // Process prices
    console.info('📥 Processing prices CSV...');
    await processPricesDiff(prezziPath, new Map(), syncOps, seenPriceIds, {});

    // Process deletions (none for fresh import)
    processDeletions(new Map(), new Map(), seenStationIds, seenPriceIds, syncOps);

    const totalChanges = syncOps.upsertStations.length + syncOps.upsertPrices.length +
      syncOps.deleteStations.length + syncOps.deletePrices.length;

    console.group('📊 Import Summary');
    console.table({
      'Stations': { 'Upserts': syncOps.upsertStations.length, 'Deletions': syncOps.deleteStations.length },
      'Prices': { 'Upserts': syncOps.upsertPrices.length, 'Deletions': syncOps.deletePrices.length },
      'Total': { 'Changes': totalChanges }
    });
    console.groupEnd();

    if (totalChanges > 0) {
      await applyChanges(db, syncOps);
      await setLastModified(db, new Date().toUTCString(), db);
      console.info(`✅ CSV import completed successfully (${totalChanges} changes applied).`);
    } else {
      console.info('⚠️ No data to import - files may be empty.');
    }

    db.close();
  } catch (error) {
    console.error('❌ CSV import failed:', error.message);
    process.exit(1);
  } finally {
    console.timeEnd('⏱️ CSV Import Completed In');
    console.groupEnd();
  }
}

main();
