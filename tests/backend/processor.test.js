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

    it('correctly parses CSV and detects station diffs', async () => {
        const csvContent = `header1
header2
1|GestoreX|BandieraY|Self|Nome Impianto|Via Roma|Milano|MI|45.0|9.0|12.0|13.0
2|GestoreZ|BandieraW|Servito|Nuovo Impianto|Via Napoli|Roma|RM|41.0|12.0|0|0
`;
        const filePath = createTempCsv('stations.csv', csvContent);

        const existingStations = new Map([
            [1, { gestore: "GestoreX", bandiera: "BandieraY", tipo_impianto: "Self", nome_impianto: "Nome Impianto", indirizzo: "Via Roma", comune: "Milano", provincia: "MI", latitudine: 12.0, longitudine: 13.0 }]
        ]);

        const syncOps = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenStationIds = new Set();

        await processStationsDiff(filePath, existingStations, syncOps, seenStationIds, { showProgress: false });

        expect(seenStationIds.has(1)).toBe(true);
        expect(seenStationIds.has(2)).toBe(true);
        
        // Station 1 is identical, must not be upserted
        expect(syncOps.upsertStations.length).toBe(1);
        
        // Station 2 is new, must be upserted
        expect(syncOps.upsertStations[0][0]).toBe(2);
        expect(syncOps.upsertStations[0][1]).toBe("GestoreZ");
        expect(syncOps.upsertStations[0][8]).toBe(0);
    });

    it('updates station when data changes', async () => {
        const csvContent = `line1
line2
1|GestoreX|BandieraCHANGED|Self|Nome Impianto|Via Roma|Milano|MI|45.0|9.0|12.0|13.0
`;
        const filePath = createTempCsv('stations_update.csv', csvContent);

        const existingStations = new Map([
            [1, { gestore: "GestoreX", bandiera: "BandieraOLD", tipo_impianto: "Self", nome_impianto: "Nome Impianto", indirizzo: "Via Roma", comune: "Milano", provincia: "MI", latitudine: 12.0, longitudine: 13.0 }]
        ]);

        const syncOps = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenStationIds = new Set();

        await processStationsDiff(filePath, existingStations, syncOps, seenStationIds, { showProgress: false });

        expect(syncOps.upsertStations.length).toBe(1);
        expect(syncOps.upsertStations[0][2]).toBe("BandieraCHANGED");
    });

    it('detects price diffs while ignoring redundant dt_comunicazione changes', async () => {
        const csvContent = `line1
line2
1|Benzina|1.850|1|2023-10-10 12:00:00
2|Diesel|1.700|0|2023-10-10 12:00:00
3|GPL|0.700|1|2023-10-10 12:00:00
`;
        const filePath = createTempCsv('prices.csv', csvContent);

        const existingPrices = new Map([
            ["1_Benzina_1", { id_impianto: 1, desc_carburante: "Benzina", is_self: 1, prezzo: 1.850 }],
            ["2_Diesel_0", { id_impianto: 2, desc_carburante: "Diesel", is_self: 0, prezzo: 1.650 }],
        ]);

        const syncOps = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenPriceIds = new Set();

        await processPricesDiff(filePath, existingPrices, syncOps, seenPriceIds, { showProgress: false });

        expect(seenPriceIds.has("1_Benzina_1")).toBe(true);
        expect(seenPriceIds.has("2_Diesel_0")).toBe(true);
        expect(seenPriceIds.has("3_GPL_1")).toBe(true);
        
        expect(syncOps.upsertPrices.length).toBe(2);
        
        const updatedIds = syncOps.upsertPrices.map(op => op[0]);
        expect(updatedIds).toContain(2);
        expect(updatedIds).toContain(3);
        expect(updatedIds).not.toContain(1);
    });

    it('processes deletions accurately', () => {
        const existingStations = new Map([
            [1, {}],
            [2, {}]
        ]);
        const existingPrices = new Map([
            ["1_Benzina_1", { id_impianto: 1, desc_carburante: "Benzina", is_self: 1 }],
            ["2_Diesel_0", { id_impianto: 2, desc_carburante: "Diesel", is_self: 0 }]
        ]);

        const seenStationIds = new Set([1]); // Station 2 deleted
        const seenPriceIds = new Set(["2_Diesel_0"]); // Price 1_Benzina_1 deleted

        const syncOps = { deleteStations: [], deletePrices: [] };

        processDeletions(existingStations, existingPrices, seenStationIds, seenPriceIds, syncOps);

        expect(syncOps.deleteStations.length).toBe(1);
        expect(syncOps.deleteStations[0][0]).toBe(2);

        expect(syncOps.deletePrices.length).toBe(1);
        expect(syncOps.deletePrices[0]).toEqual([1, "Benzina", 1]);
    });

    it('handles large files displaying progress and yielding event loop', async () => {
        let csvContent = `line1\nline2\n`;
        for (let i = 1; i <= 2050; i++) {
            csvContent += `${i}|Gestore|Bandiera|Self|Nome|Indirizzo|Comune|Provincia|45.0|9.0\n`;
        }
        
        const filePath = createTempCsv('large_stations.csv', csvContent);
        const existingStations = new Map();
        const syncOps = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenStationIds = new Set();

        const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

        await processStationsDiff(filePath, existingStations, syncOps, seenStationIds, { showProgress: true });

        expect(seenStationIds.size).toBe(2050);
        expect(writeSpy).toHaveBeenCalled();
        const calls = writeSpy.mock.calls.map(c => c[0]);
        expect(calls.some(c => c.includes('%'))).toBe(true);

        writeSpy.mockRestore();
    });

    it('handles malformed rows and empty fields with fallbacks', async () => {
        const csvContentStations = `line1\nline2\n1|Gestore\nNaN|||||||||\n`;
        const filePathStations = createTempCsv('malformed_stations.csv', csvContentStations);
        const existingStations = new Map();
        const syncOpsSt = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenStationIds = new Set();
        
        await processStationsDiff(filePathStations, existingStations, syncOpsSt, seenStationIds, { showProgress: false });
        
        expect(seenStationIds.has(0)).toBe(true);
        expect(syncOpsSt.upsertStations.length).toBe(1);
        expect(syncOpsSt.upsertStations[0][0]).toBe(0);
        expect(syncOpsSt.upsertStations[0][1]).toBe("");

        const csvContentPrices = `line1\nline2\n1|Benz\nNaN|||||\n`;
        const filePathPrices = createTempCsv('malformed_prices.csv', csvContentPrices);
        const existingPrices = new Map();
        const syncOpsPr = { upsertStations: [], upsertPrices: [], deleteStations: [], deletePrices: [] };
        const seenPriceIds = new Set();
        
        await processPricesDiff(filePathPrices, existingPrices, syncOpsPr, seenPriceIds, { showProgress: false });
        
        expect(seenPriceIds.has("0__0")).toBe(true);
        expect(syncOpsPr.upsertPrices.length).toBe(1);
        expect(syncOpsPr.upsertPrices[0][0]).toBe(0);
        expect(syncOpsPr.upsertPrices[0][1]).toBe("");
        expect(syncOpsPr.upsertPrices[0][4]).toBe("");
    });
});
