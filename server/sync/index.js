/* oxlint-disable no-console */
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import "dotenv/config";

import { URL_ANAGRAFICA, URL_PREZZI, checkUpdates, downloadFile } from "./network.js";
import { initSchema, getLastModified, loadExistingData, applyChanges, setLastModified } from "./database.js";
import { processStationsDiff, processPricesDiff, processDeletions } from "./processor.js";

export async function sync(dbClient, retries = 3, options = {}) {
  if (typeof retries === 'object' && retries !== null) {
    options = retries;
    retries = options.retries ?? 3;
  }
  const retryDelayMs = options.retryDelayMs ?? (process.env.CI ? 15000 : 30000);

  if (process.env.MAINTENANCE_MODE === 'true') {
    console.warn("[Sync] Operazione bloccata: Sito in Maintenance Mode.");
    return;
  }

  if (!dbClient) {
    const localDbPath = path.join(process.env.DATA_DIR || path.join(process.cwd(), "server"), "database.sqlite");
    dbClient = createClient({ url: `file:${localDbPath}` });
  }

  try {
    await doSync(dbClient, options);
  } catch (error) {
    console.error(`[Sync] Error:`, error.message);
    if (retries > 0) {
      const waitSec = Math.round(retryDelayMs / 1000);
      console.warn(`[Sync] Retrying in ${waitSec}s... (Attempts remaining: ${retries})`);
      await new Promise((res) => setTimeout(res, retryDelayMs));
      return sync(dbClient, retries - 1, { ...options, retryDelayMs });
    }
    throw error;
  }
}

async function doSync(db, options = {}) {
  console.group('🔄 [Sync] MIMIT Database Synchronization');
  console.time('⏱️ Sync Completed In');

  try {
    const localDbPath = path.join(process.env.DATA_DIR || path.join(process.cwd(), "server"), "database.sqlite");
    let localDb = db;
    if (fs.existsSync(localDbPath)) {
      try {
        localDb = createClient({ url: `file:${localDbPath}` });
      } catch {}
    }

    const lastModifiedHeader = await getLastModified(db, localDb);
    const updateCheck = await checkUpdates(lastModifiedHeader);

    if (!updateCheck.shouldUpdate) {
        console.info("✅ Zero database writes needed: MIMIT data is identical (HTTP 304).");
        return;
    }

    console.info("⚡ MIMIT updates detected. Loading existing data to compute diff...");
    const { existingStations, existingPrices } = await loadExistingData(db, localDb);

    const syncOps = {
        upsertStations: [],
        upsertPrices: [],
        deleteStations: [],
        deletePrices: []
    };
    const seenStationIds = new Set();
    const seenPriceIds = new Set();

    let anagraficaFile = null;
    let prezziFile = null;

    try {
        console.info(`📥 Downloading stations registry (${URL_ANAGRAFICA})...`);
        anagraficaFile = await downloadFile(URL_ANAGRAFICA);
        await processStationsDiff(anagraficaFile, existingStations, syncOps, seenStationIds, options);

        console.info(`📥 Downloading prices registry (${URL_PREZZI})...`);
        prezziFile = await downloadFile(URL_PREZZI);
        await processPricesDiff(prezziFile, existingPrices, syncOps, seenPriceIds, options);

        processDeletions(existingStations, existingPrices, seenStationIds, seenPriceIds, syncOps);
        
        const totalChanges = syncOps.upsertStations.length + syncOps.upsertPrices.length + syncOps.deleteStations.length + syncOps.deletePrices.length;

        console.group('📊 Sync Differential Summary');
        console.table({
            'Stations': { 'Upserts': syncOps.upsertStations.length, 'Deletions': syncOps.deleteStations.length },
            'Prices': { 'Upserts': syncOps.upsertPrices.length, 'Deletions': syncOps.deletePrices.length },
            'Total': { 'Upserts': totalChanges, 'Deletions': syncOps.deleteStations.length + syncOps.deletePrices.length }
        });
        console.groupEnd();

        if (options.dryRun) {
            console.info(`\n[DRY RUN] Sincronizzazione simulata completata (Nessun dato scritto).`);
            return;
        }
        
        if (totalChanges === 0) {
            console.info("No data modifications found. Updating last modified timestamp only.");
            await setLastModified(db, updateCheck.newLastModified, localDb);
            return;
        }

        await initSchema(db);
        await applyChanges(db, syncOps);
        await setLastModified(db, updateCheck.newLastModified, localDb);
        
        console.info(`✅ DB sync completed successfully (${totalChanges} changes applied).`);

    } finally {
        if (anagraficaFile && fs.existsSync(anagraficaFile)) fs.unlinkSync(anagraficaFile);
        if (prezziFile && fs.existsSync(prezziFile)) fs.unlinkSync(prezziFile);
    }
  } finally {
    console.timeEnd('⏱️ Sync Completed In');
    console.groupEnd();
  }
}
