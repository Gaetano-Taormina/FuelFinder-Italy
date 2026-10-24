/* oxlint-disable no-console */
import fs from "fs";
import path from "path";
import os from "node:os";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { URL } from "node:url";

export const URL_ANAGRAFICA = "https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv";
export const URL_PREZZI = "https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv";

export const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/csv,text/plain,*/*',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Connection': 'keep-alive'
};

/**
 * Checks for updates on MIMIT servers using a HEAD request with standard browser headers.
 * If the server rejects or hangs on HEAD (common on government WAFs), gracefully falls back
 * to direct download rather than aborting the scheduled sync workflow.
 */
export async function checkUpdates(lastModifiedHeader, timeoutMs = 45000) {
  console.log("Checking MIMIT updates...");
  const headers = { ...BROWSER_HEADERS };
  if (lastModifiedHeader) {
    headers["If-Modified-Since"] = lastModifiedHeader;
  }

  try {
    const headResponse = await fetch(URL_PREZZI, {
      method: "HEAD",
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (headResponse.status === 304) {
      console.log(`HTTP 304: No changes since ${lastModifiedHeader}. Sync skipped.`);
      return { shouldUpdate: false };
    }

    if (headResponse.status === 301 || headResponse.status === 302) {
      console.warn(`[Sync] MIMIT HEAD returned redirect. Falling back to direct download.`);
      return { shouldUpdate: true, newLastModified: null };
    }

    if (headResponse.ok) {
      const newLastModified = headResponse.headers.get("last-modified");
      return { shouldUpdate: true, newLastModified };
    }

    console.warn(`[Sync] MIMIT HEAD returned HTTP ${headResponse.status}. Falling back to direct download.`);
  } catch (err) {
    console.warn(`[Sync] MIMIT HEAD check failed or timed out (${err.message}). Falling back to direct download.`);
  }

  return { shouldUpdate: true, newLastModified: null };
}

/**
 * Streams and downloads a CSV export from MIMIT using browser headers and configurable timeout.
 * Validates URL hostname and manually follows a single redirect to prevent SSRF and DoS.
 * @param {string} url - The URL to download
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} redirectCount - Internal redirect counter
 * @param {boolean} skipUrlValidation - Skip URL validation (for testing only)
 */
export async function downloadFile(url, timeoutMs = 300000, redirectCount = 0, skipUrlValidation = false) {
  if (!skipUrlValidation) {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== 'www.mimit.gov.it') {
      throw new Error(`URL non autorizzato: ${url}`);
    }
  }

  if (redirectCount > 1) {
    throw new Error(`Troppi redirect (max 1 permesso): ${url}`);
  }

  const response = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (response.status === 301 || response.status === 302) {
    const location = response.headers.get('location');
    if (!location) throw new Error('Redirect senza Location header');
    
    if (!skipUrlValidation) {
      const redirectUrl = new URL(location, url);
      if (redirectUrl.hostname !== 'www.mimit.gov.it') {
        throw new Error(`Redirect verso dominio non autorizzato: ${location}`);
      }
    }
    
    return downloadFile(location, timeoutMs - 5000, redirectCount + 1, skipUrlValidation);
  }

  if (!response.ok) throw new Error(`Errore Server MIMIT - HTTP ${response.status}`);

  const tmpFile = path.join(os.tmpdir(), `fuelfinder_temp_${Date.now()}.csv`);
  const webStream = Readable.fromWeb(response.body);
  await pipeline(webStream, fs.createWriteStream(tmpFile));
  
  return tmpFile;
}
