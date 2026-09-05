/* oxlint-disable no-console */
import { parsePipeDelimitedStream } from "./nativeParser.js";

export async function processStationsDiff(filePath, existingStations, syncOps, seenStationIds, options) {
    console.log(`Parsing stations...`);
    await parsePipeDelimitedStream(filePath, (r) => {
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

export async function processPricesDiff(filePath, existingPrices, syncOps, seenPriceIds, options) {
    console.log(`Parsing prices...`);
    await parsePipeDelimitedStream(filePath, (r) => {
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
        } else if (old.prezzo !== prezzo) {
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
