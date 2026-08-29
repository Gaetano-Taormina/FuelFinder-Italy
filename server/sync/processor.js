/* eslint-disable no-console */
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

async function parseCsv(filePath, rowProcessor) {
    const fileStream = fs.createReadStream(filePath);
    const parser = fileStream.pipe(parse(parseOptions));

    let count = 0;
    for await (const record of parser) {
        rowProcessor(record);
        count++;
        
        // Yield al Node.js Event Loop ogni 500 righe
        // Questo è CRITICO per permettere ad Express di rispondere agli Health Check di Render
        // durante il parsing massivo dei CSV, altrimenti Render crederà che l'app sia morta e la riavvierà.
        if (count % 500 === 0) {
            await new Promise(resolve => setImmediate(resolve));
        }
    }
}

export async function processStationsDiff(filePath, existingStations, syncOperations, seenStationIds) {
    console.log(`Analisi anagrafica...`);
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
            syncOperations.push({
                sql: `INSERT INTO stations (id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [id, gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine]
            });
        } else if (
            old.gestore !== gestore || old.bandiera !== bandiera || old.tipo_impianto !== tipo_impianto ||
            old.nome_impianto !== nome_impianto || old.indirizzo !== indirizzo || old.comune !== comune ||
            old.provincia !== provincia || old.latitudine !== latitudine || old.longitudine !== longitudine
        ) {
            syncOperations.push({
                sql: `UPDATE stations SET gestore=?, bandiera=?, tipo_impianto=?, nome_impianto=?, indirizzo=?, comune=?, provincia=?, latitudine=?, longitudine=? WHERE id=?`,
                args: [gestore, bandiera, tipo_impianto, nome_impianto, indirizzo, comune, provincia, latitudine, longitudine, id]
            });
        }
    });
}

export async function processPricesDiff(filePath, existingPrices, syncOperations, seenPriceIds) {
    console.log(`Analisi prezzi...`);
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
            syncOperations.push({
                sql: `INSERT INTO prices (id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione) VALUES (?, ?, ?, ?, ?)`,
                args: [id_impianto, desc_carburante, prezzo, is_self, dt_comunicazione]
            });
        } else if (old.prezzo !== prezzo || old.dt_comunicazione !== dt_comunicazione) {
            syncOperations.push({
                sql: `UPDATE prices SET prezzo=?, dt_comunicazione=? WHERE id_impianto=? AND desc_carburante=? AND is_self=?`,
                args: [prezzo, dt_comunicazione, id_impianto, desc_carburante, is_self]
            });
        }
    });
}

export function processDeletions(existingStations, existingPrices, seenStationIds, seenPriceIds, syncOperations) {
    console.log("Calcolo cancellazioni...");
    for (const id of existingStations.keys()) {
        if (!seenStationIds.has(id)) {
            syncOperations.push({ sql: `DELETE FROM stations WHERE id=?`, args: [id] });
        }
    }
    for (const key of existingPrices.keys()) {
        if (!seenPriceIds.has(key)) {
            const old = existingPrices.get(key);
            syncOperations.push({ sql: `DELETE FROM prices WHERE id_impianto=? AND desc_carburante=? AND is_self=?`, args: [old.id_impianto, old.desc_carburante, old.is_self] });
        }
    }
}
