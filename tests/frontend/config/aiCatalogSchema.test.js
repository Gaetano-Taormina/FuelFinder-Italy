import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('ARD Manifest Schema (ai-catalog.json & ard.json)', () => {
    const wellKnownCatalogPath = path.resolve(__dirname, '../../../client/public/.well-known/ai-catalog.json');
    const wellKnownArdPath = path.resolve(__dirname, '../../../client/public/.well-known/ard.json');
    const rootCatalogPath = path.resolve(__dirname, '../../../client/public/ai-catalog.json');

    it('contains valid JSON and conforms to ARD v1.0 specification', () => {
        [wellKnownCatalogPath, wellKnownArdPath, rootCatalogPath].forEach((filePath) => {
            expect(fs.existsSync(filePath), `File exists: ${filePath}`).toBe(true);
            const content = fs.readFileSync(filePath, 'utf-8');
            const json = JSON.parse(content);

            expect(json.specVersion).toBe('1.0');
            expect(json.host).toBeDefined();
            expect(json.host.displayName).toBe('FuelFinder Italy');
            expect(json.host.identifier).toBe('did:web:fuelfinder-italia.onrender.com');
            expect(Array.isArray(json.entries)).toBe(true);
            expect(json.entries.length).toBeGreaterThan(0);

            json.entries.forEach((entry) => {
                expect(entry.identifier).toMatch(/^urn:air:/);
                expect(entry.displayName).toBeTruthy();
                expect(entry.type).toBeTruthy();
                expect(entry.url).toMatch(/^https:\/\//);
                expect(Array.isArray(entry.representativeQueries)).toBe(true);
                expect(entry.representativeQueries.length).toBeGreaterThan(0);
            });
        });
    });
});
