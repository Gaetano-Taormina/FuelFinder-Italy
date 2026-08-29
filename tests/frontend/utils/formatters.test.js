/* oxlint-disable no-console */
import { describe, it, expect } from 'vitest';
import { formatStationName } from '../../../src/utils/formatters';

describe('formatStationName', () => {
    it('dovrebbe ritornare Distributore se nome è nullo o vuoto', () => {
        expect(formatStationName(null)).toBe('Distributore');
        expect(formatStationName('')).toBe('Distributore');
    });

    it('dovrebbe gestire POMPE BIANCHE', () => {
        expect(formatStationName('POMPE BIANCHE')).toBe('Pompe Bianche');
    });

    it('dovrebbe pulire sigle societarie', () => {
        expect(formatStationName('Eni S.P.A.')).toBe('Eni');
        expect(formatStationName('Q8 SRL')).toBe('Q8');
    });

    it('dovrebbe convertire testo tutto maiuscolo in title case, preservando preposizioni', () => {
        // Questo copre le righe 16-19
        expect(formatStationName('DISTRIBUTORE DI BENZINA')).toBe('Distributore di Benzina');
        expect(formatStationName('LA STAZIONE DELLA VALLE')).toBe('la Stazione della Valle');
    });

    it('dovrebbe ritornare Distributore se il nome pulito diventa vuoto', () => {
        // Questo copre la riga 23: return cleanName || 'Distributore'
        expect(formatStationName('S.P.A.')).toBe('Distributore');
        expect(formatStationName(' ')).toBe('Distributore');
    });
});
