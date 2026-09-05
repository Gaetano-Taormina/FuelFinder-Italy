/* oxlint-disable no-console */
import { describe, it, expect } from 'vitest';
import { formatStationName } from '../../../src/utils/formatters';

describe('formatStationName', () => {
    it('returns "Distributore" when station name is null or empty', () => {
        expect(formatStationName(null)).toBe('Distributore');
        expect(formatStationName('')).toBe('Distributore');
    });

    it('handles uppercase "POMPE BIANCHE" into title case', () => {
        expect(formatStationName('POMPE BIANCHE')).toBe('Pompe Bianche');
    });

    it('strips corporate suffixes (S.P.A., SRL)', () => {
        expect(formatStationName('Eni S.P.A.')).toBe('Eni');
        expect(formatStationName('Q8 SRL')).toBe('Q8');
    });

    it('converts uppercase text into title case while preserving prepositions', () => {
        expect(formatStationName('DISTRIBUTORE DI BENZINA')).toBe('Distributore di Benzina');
        expect(formatStationName('LA STAZIONE DELLA VALLE')).toBe('la Stazione della Valle');
    });

    it('returns "Distributore" fallback if cleaned name is empty', () => {
        expect(formatStationName('S.P.A.')).toBe('Distributore');
        expect(formatStationName(' ')).toBe('Distributore');
    });
});
