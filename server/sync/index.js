/* eslint-disable no-console */
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import "dotenv/config";

import { URL_ANAGRAFICA, URL_PREZZI, checkUpdates, downloadFile } from "./network.js";
import { initSchema, getLastModified, loadExistingData, applyChanges, setLastModified } from "./database.js";
import { processStationsDiff, processPricesDiff, processDeletions } from "./processor.js";

export async function sync(dbClient, retries = 8) {
  if (!dbClient) {
    const DB_URL = process.env.TURSO_DATABASE_URL || "file:" + path.join(process.env.DATA_DIR || path.join(process.cwd(), "server"), "database.sqlite");
    const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;
    dbClient = createClient({ url: DB_URL, authToken: DB_TOKEN });
  }

  try {
    await doSync(dbClient);
  } catch (error) {
    const errMsg = (error.message || '').toLowerCase();
    
    // Rilevamento Quota Turso esaurita anche durante il sync in background
    if (errMsg.includes('quota') || errMsg.includes('billing') || errMsg.includes('exceeded') || errMsg.includes('payment required') || errMsg.includes('resource_exhausted')) {
        console.warn("[WARN] Rilevato esaurimento crediti Turso durante il Sync! Attivazione automatica Maintenance Mode.");
        process.env.MAINTENANCE_MODE = 'true';
    }

    console.error(`[Sync] Errore durante la sincronizzazione:`, error.message);
    if (retries > 0) {
      console.log(`[Sync] Ritento tra 5 minuti... (Tentativi rimasti: ${retries})`);
      await new Promise((res) => setTimeout(res, 5 * 60 * 1000));
      return sync(dbClient, retries - 1);
    }
    throw error;
  }
}

async function doSync(db) {
  console.log("Avvio sincronizzazione dati dal MIMIT su Turso (Modulare con Diff in memoria)...");

  await initSchema(db);
  const lastModifiedHeader = await getLastModified(db);
  const updateCheck = await checkUpdates(lastModifiedHeader);

  if (!updateCheck.shouldUpdate) {
      return;
  }

  const { existingStations, existingPrices } = await loadExistingData(db);

  const syncOperations = [];
  const seenStationIds = new Set();
  const seenPriceIds = new Set();

  let anagraficaFile = null;
  let prezziFile = null;

  try {
      console.log(`Download ${URL_ANAGRAFICA}...`);
      anagraficaFile = await downloadFile(URL_ANAGRAFICA);
      await processStationsDiff(anagraficaFile, existingStations, syncOperations, seenStationIds);

      console.log(`Download ${URL_PREZZI}...`);
      prezziFile = await downloadFile(URL_PREZZI);
      await processPricesDiff(prezziFile, existingPrices, syncOperations, seenPriceIds);

      processDeletions(existingStations, existingPrices, seenStationIds, seenPriceIds, syncOperations);
      
      await applyChanges(db, syncOperations);
      
      await setLastModified(db, updateCheck.newLastModified);
      
      console.log("Sincronizzazione DB completata con successo (Zero quote sprecate)!");

  } finally {
      if (anagraficaFile && fs.existsSync(anagraficaFile)) fs.unlinkSync(anagraficaFile);
      if (prezziFile && fs.existsSync(prezziFile)) fs.unlinkSync(prezziFile);
  }
}
