/* oxlint-disable no-console */
import fs from "fs";
import { parse } from "csv-parse";

const parseOptions = {
    columns: false,
    skip_empty_lines: true,
    delimiter: "|",
    relax_quotes: true,
    quote: false,
    relax_column_count: true,
    from_line: 3,
};

async function parseCsv(filePath, rowProcessor, options) {
    const fileSize = fs.statSync(filePath).size;
    const fileStream = fs.createReadStream(filePath);
    const parser = fileStream.pipe(parse(parseOptions));
    
    let count = 0;
    for await (const record of parser) {
        rowProcessor(record);
        count++;
        
        if (options?.showProgress && count % 2000 === 0) {
            const percent = Math.min(100, Math.round((fileStream.bytesRead / fileSize) * 100));
            const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
            process.stdout.write(`\r  [${bar}] ${percent}% `);
        }
        
        // Yield all'event loop per non bloccare Express
        if (count % 500 === 0) {
            await new Promise(resolve => setImmediate(resolve));
        }
    }
    
    if (options?.showProgress) {
        process.stdout.write(`\r  [${'█'.repeat(20)}] 100%\n`);
    }
}

export async function processStationsDiff(filePath, existingStations, syncOperations, seenStationIds, options) {
    console.log(`Parsing stations...`);
    await parseCsv(filePath, (r) => {
        if (r.length < 10) return;
        const id = parseInt(r[0]) || 0;
        const gestore = r[1] || "";
        const bandiera = r[2] || "";
        const tipo_impianto = r[3] || "";
        const nome_impianto = r[4] || "";
        const indirizzo = r[5] || "";
        const comune = r[6] || "";
        const provincia = r[7] || "";
        const latitudine = parseFloat(r[r.length - 2]) || 0;
        const longitudine = parseFloat(r[r.length - 1]) || 0;

        seenStationIds.add(id);

        const old = existingStations.get(id);
        if (!old) {
            syncOps.upsertStations.push([id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine]);
        } else if (
            old.gestore !== gestore || old.bandiera !== bandiera || old.tipo_impianto !== tipo_impianto ||
            old.nome_impianto !== nome_impianto || old.indirizzo !== indirizzo || old.comune !== comune ||
            old.provincia !== provincia || old.latitudine !== latitudine || old.longitudine !== longitudine
        ) {
            syncOps.upsertStations.push([id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine]);
        }
    }, options);
}

export async function processPricesDiff(filePath, existingPrices, syncOperations, seenPriceIds, options) {
    console.log(`Parsing prices...`);
    await parseCsv(filePath, (r) => {
        if (r.length < 5) return;
        const id_impianto = parseInt(r[0]) || 0;
        const desc_carburante = r[1] || "";
        const prezzo = parseFloat(r[2]) || 0;
        const is_self = parseInt(r[3]) || 0;
        const dt_comunicazione = r[4] || "";

        const key = `${id_impianto}_${desc_carburante}_${is_self}`;
        seenPriceIds.add(key);

        const old = existingPrices.get(key);
        if (!old) {
            syncOps.upsertPrices.push([id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione]);
        } else if (old.prezzo !== prezzo || old.dt_comunicazione !== dt_comunicazione) {
            syncOps.upsertPrices.push([id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione]);
        }
    }, options);
}

export function processDeletions(existingStations, existingPrices, seenStationIds, seenPriceIds, syncOps) {
    console.log("Calculating deletions...");
    for (const id of existingStations.keys()) {
        if (!seenStationIds.has(id)) {
            syncOps.deleteStations.push([id]);
        }
    }
    for (const key of existingPrices.keys()) {
        if (!seenPriceIds.has(key)) {
            const old = existingPrices.get(key);
            syncOps.deletePrices.push([old.id_impianto, old.desc_carburante, old.is_self]);
        }
    }
}
