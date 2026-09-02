import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { processStationsDiff, processPricesDiff, processDeletions } from '../../server/sync/processor.js';

describe('Sync Processor', () => {
    let tempDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fuelfinder-test-'));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    const createTempCsv = (name, content) => {
        const filePath = path.join(tempDir, name);
        fs.writeFileSync(filePath, content);
        return filePath;
    };

    it('dovrebbe parsare correttamente e rilevare diff sulle stazioni', async () => {
        // Intestazioni + 1 stazione mock (come se saltasse 2 righe iniziali e partisse dalla 3 come dice parseOptions)
        const csvContent = `intestazione1
intestazione2
1|GestoreX|BandieraY|Self|Nome Impianto|Via Roma|Milano|MI|45.0|9.0|12.0|13.0
2|GestoreZ|BandieraW|Servito|Nuovo Impianto|Via Napoli|Roma|RM|41.0|12.0|0|0
`;
        const filePath = createTempCsv('stations.csv', csvContent);

        const existingStations = new Map([
            [1, { gestore: "GestoreX", bandiera: "BandieraY", tipo_impianto: "Self", nome_impianto: "Nome Impianto", indirizzo: "Via Roma", comune: "Milano", provincia: "MI", latitudine: 12.0, longitudine: 13.0 }] // Uguale
        ]);

        const syncOps = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenStationIds = new Set();

        await processStationsDiff(filePath, existingStations, syncOps, seenStationIds, { showProgress: false });

        expect(seenStationIds.has(1)).toBe(true);
        expect(seenStationIds.has(2)).toBe(true);
        
        // Stazione 1 è identica, non deve essere upsertata
        expect(syncOps.upsertStations.length).toBe(1);
        
        // Stazione 2 è nuova, deve essere upsertata
        expect(syncOps.upsertStations[0][0]).toBe(2);
        expect(syncOps.upsertStations[0][1]).toBe("GestoreZ");
        expect(syncOps.upsertStations[0][8]).toBe(0); // parse fallito usa 0 per latitudine (r.length - 2 dove la riga è più corta)
    });

    it('dovrebbe aggiornare la stazione se i dati cambiano', async () => {
        const csvContent = `line1
line2
1|GestoreX|BandieraCAMBIATA|Self|Nome Impianto|Via Roma|Milano|MI|45.0|9.0|12.0|13.0
`;
        const filePath = createTempCsv('stations_update.csv', csvContent);

        const existingStations = new Map([
            [1, { gestore: "GestoreX", bandiera: "BandieraVECCHIA", tipo_impianto: "Self", nome_impianto: "Nome Impianto", indirizzo: "Via Roma", comune: "Milano", provincia: "MI", latitudine: 12.0, longitudine: 13.0 }]
        ]);

        const syncOps = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenStationIds = new Set();

        await processStationsDiff(filePath, existingStations, syncOps, seenStationIds, { showProgress: false });

        expect(syncOps.upsertStations.length).toBe(1);
        expect(syncOps.upsertStations[0][2]).toBe("BandieraCAMBIATA");
    });

    it('dovrebbe rilevare diff sui prezzi ottimizzando dt_comunicazione', async () => {
        const csvContent = `line1
line2
1|Benzina|1.850|1|2023-10-10 12:00:00
2|Diesel|1.700|0|2023-10-10 12:00:00
3|GPL|0.700|1|2023-10-10 12:00:00
`;
        const filePath = createTempCsv('prices.csv', csvContent);

        const existingPrices = new Map([
            ["1_Benzina_1", { id_impianto: 1, desc_carburante: "Benzina", is_self: 1, prezzo: 1.850 }], // Prezzo identico, dt_comunicazione aggiornato ignorato!
            ["2_Diesel_0", { id_impianto: 2, desc_carburante: "Diesel", is_self: 0, prezzo: 1.650 }], // Prezzo cambiato
        ]); // Il prezzo 3 non esiste, quindi è nuovo.

        const syncOps = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenPriceIds = new Set();

        await processPricesDiff(filePath, existingPrices, syncOps, seenPriceIds, { showProgress: false });

        expect(seenPriceIds.has("1_Benzina_1")).toBe(true);
        expect(seenPriceIds.has("2_Diesel_0")).toBe(true);
        expect(seenPriceIds.has("3_GPL_1")).toBe(true);
        
        expect(syncOps.upsertPrices.length).toBe(2);
        
        // Deve aggiornare l'id 2 e inserire l'id 3
        const updatedIds = syncOps.upsertPrices.map(op => op[0]);
        expect(updatedIds).toContain(2);
        expect(updatedIds).toContain(3);
        expect(updatedIds).not.toContain(1); // Il prezzo 1 non cambia
    });

    it('dovrebbe processare correttamente le cancellazioni (deletions)', () => {
        const existingStations = new Map([
            [1, {}],
            [2, {}]
        ]);
        const existingPrices = new Map([
            ["1_Benzina_1", { id_impianto: 1, desc_carburante: "Benzina", is_self: 1 }],
            ["2_Diesel_0", { id_impianto: 2, desc_carburante: "Diesel", is_self: 0 }]
        ]);

        const seenStationIds = new Set([1]); // La stazione 2 è scomparsa
        const seenPriceIds = new Set(["2_Diesel_0"]); // Il prezzo 1_Benzina_1 è scomparso

        const syncOps = { deleteStations: [], deletePrices: [] };

        processDeletions(existingStations, existingPrices, seenStationIds, seenPriceIds, syncOps);

        expect(syncOps.deleteStations.length).toBe(1);
        expect(syncOps.deleteStations[0][0]).toBe(2);

        expect(syncOps.deletePrices.length).toBe(1);
        expect(syncOps.deletePrices[0]).toEqual([1, "Benzina", 1]);
    });

    it('dovrebbe gestire file grandi mostrando il progresso e facendo yield', async () => {
        // Generate a CSV with > 2000 lines to trigger the progress bar and setImmediate
        let csvContent = `line1\nline2\n`;
        for (let i = 1; i <= 2050; i++) {
            csvContent += `${i}|Gestore|Bandiera|Self|Nome|Indirizzo|Comune|Provincia|45.0|9.0\n`;
        }
        
        const filePath = createTempCsv('large_stations.csv', csvContent);
        const existingStations = new Map();
        const syncOps = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenStationIds = new Set();

        // Spy su process.stdout.write per testare l'output senza sporcare la console del test
        const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

        await processStationsDiff(filePath, existingStations, syncOps, seenStationIds, { showProgress: true });

        // Verifica che le righe siano state elaborate
        expect(seenStationIds.size).toBe(2050);
        
        // Verifica che process.stdout.write sia stato chiamato per l'avanzamento (count % 2000 === 0) e per la fine (100%)
        expect(writeSpy).toHaveBeenCalled();
        const calls = writeSpy.mock.calls.map(c => c[0]);
        expect(calls.some(c => c.includes('%'))).toBe(true); // Controllo generico che abbia stampato una %

        writeSpy.mockRestore();
    });

    it('dovrebbe gestire righe malformate e campi vuoti (fallback/branch coverage)', async () => {
        // Riga corta (< 10 campi)
        // Riga con campi vuoti o non validi per testare i fallback || 0 e || ""
        const csvContentStations = `line1\nline2\n1|Gestore\nNaN|||||||||\n`;
        const filePathStations = createTempCsv('malformed_stations.csv', csvContentStations);
        const existingStations = new Map();
        const syncOpsSt = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenStationIds = new Set();
        
        await processStationsDiff(filePathStations, existingStations, syncOpsSt, seenStationIds, { showProgress: false });
        
        // La riga corta viene ignorata. La riga NaN inserisce un id 0 (grazie al fallback)
        expect(seenStationIds.has(0)).toBe(true);
        expect(syncOpsSt.upsertStations.length).toBe(1);
        expect(syncOpsSt.upsertStations[0][0]).toBe(0); // ID fallback a 0
        expect(syncOpsSt.upsertStations[0][1]).toBe(""); // Gestore fallback a ""

        const csvContentPrices = `line1\nline2\n1|Benz\nNaN|||||\n`;
        const filePathPrices = createTempCsv('malformed_prices.csv', csvContentPrices);
        const existingPrices = new Map();
        const syncOpsPr = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenPriceIds = new Set();
        
        await processPricesDiff(filePathPrices, existingPrices, syncOpsPr, seenPriceIds, { showProgress: false });
        
        // Riga corta ignorata. Riga NaN fallbacka a 0 e ""
        expect(seenPriceIds.has("0__0")).toBe(true);
        expect(syncOpsPr.upsertPrices.length).toBe(1);
        expect(syncOpsPr.upsertPrices[0][0]).toBe(0); // id fallback a 0
        expect(syncOpsPr.upsertPrices[0][1]).toBe(""); // desc fallback a ""
        expect(syncOpsPr.upsertPrices[0][4]).toBe(""); // dt_comunicazione fallback a ""
    });
});
