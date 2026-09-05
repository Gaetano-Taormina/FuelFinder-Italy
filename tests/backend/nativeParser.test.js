import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parsePipeDelimitedStream } from '../../server/sync/nativeParser.js';

describe('NativeParser Unit Tests - 100% Coverage', () => {
    const tmpFile = path.join(process.cwd(), 'tests', 'temp_parser_test.csv');

    beforeEach(() => {
        const lines = [
            'HEADER LINE 1',
            'HEADER LINE 2'
        ];
        // Generate > 2500 lines to trigger progress reporting and event-loop yields
        for (let i = 1; i <= 2600; i++) {
            lines.push(`${i}|Eni|ENI|Strada|Impianto ${i}|Via Roma|Roma|RM|41.9|12.5`);
        }
        lines.push('');
        lines.push('   ');
        fs.writeFileSync(tmpFile, lines.join('\n'), 'utf8');
    });

    afterEach(() => {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    });

    it('correctly parses pipe-delimited file skipping headers and empty lines with progress reporting', async () => {
        const rows = [];
        const count = await parsePipeDelimitedStream(tmpFile, (cols) => {
            rows.push(cols);
        }, { showProgress: true });

        expect(count).toBe(2600);
        expect(rows.length).toBe(2600);
        expect(rows[0][0]).toBe('1');
        expect(rows[0][1]).toBe('Eni');
    });

    it('handles empty or non-existent files gracefully without error', async () => {
        const rows = [];
        const count = await parsePipeDelimitedStream('non_existent_file.csv', (cols) => {
            rows.push(cols);
        });

        expect(count).toBe(0);
        expect(rows.length).toBe(0);
    });
});
