/* oxlint-disable no-console */
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

export const URL_ANAGRAFICA = "https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv";
export const URL_PREZZI = "https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv";

export async function checkUpdates(lastModifiedHeader) {
  console.log("Controllo aggiornamenti sul server ministeriale...");
  const headers = {};
  if (lastModifiedHeader) {
    headers["If-Modified-Since"] = lastModifiedHeader;
  }

  const headResponse = await fetch(URL_PREZZI, { method: "HEAD", headers });
  if (headResponse.status === 304) {
    console.log(`HTTP 304 (Not Modified): I dati del Ministero non sono cambiati dall'ultimo sync (${lastModifiedHeader}). Aggiornamento saltato.`);
    return { shouldUpdate: false };
  }
  if (!headResponse.ok) {
    throw new Error(`Errore Server MIMIT - HTTP ${headResponse.status} ${headResponse.statusText}`);
  }

  const newLastModified = headResponse.headers.get("last-modified");
  return { shouldUpdate: true, newLastModified };
}

export async function downloadFile(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Errore Server MIMIT - HTTP ${response.status}`);

  const tmpFile = path.join(process.cwd(), "server", `temp_${Date.now()}.csv`);
  const webStream = Readable.fromWeb(response.body);
  await pipeline(webStream, fs.createWriteStream(tmpFile));
  
  return tmpFile;
}
