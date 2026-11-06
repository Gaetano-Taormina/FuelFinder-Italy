import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const importScript = path.join(repoRoot, 'server', 'import-csv.js');

const runImport = (tempDir, stationRows, priceRows) => {
    const stationsCsv = path.join(tempDir, 'stations.csv');
    const pricesCsv = path.join(tempDir, 'prices.csv');
    fs.writeFileSync(stationsCsv, `Estrazione del 2026-11-06\nidImpianto|Gestore|Bandiera|Tipo Impianto|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine\n${stationRows}`);
    fs.writeFileSync(pricesCsv, `Estrazione del 2026-11-06\nidImpianto|descCarburante|prezzo|isSelf|dtComu\n${priceRows}`);

    return spawnSync(process.execPath, [importScript, stationsCsv, pricesCsv], {
        cwd: repoRoot,
        env: { ...process.env, DATA_DIR: tempDir },
        encoding: 'utf8'
    });
};

describe('CSV database import', () => {
    let tempDir;

    afterEach(() => {
        if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('fails instead of succeeding when source CSVs contain no data rows', () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fuelfinder-empty-import-'));
        const result = runImport(tempDir, '', '');

        expect(result.error).toBeUndefined();
        expect(result.status).not.toBe(0);
        expect(`${result.stdout}\n${result.stderr}`).toContain('Refusing to publish an empty database');
    });

    it('imports valid station and price rows', () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fuelfinder-valid-import-'));
        const result = runImport(
            tempDir,
            '1|Gestore|Bandiera|Stradale|Nome|Via Roma|Milano|MI|45.0|9.0\n',
            '1|Benzina|1.750|1|06/11/2026 10:00:00\n'
        );

        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('CSV import completed successfully');
    });
});
