/* oxlint-disable no-console */
import { describe, it, expect } from 'vitest';
import { ROUTES, getCityPath, getExplorePath, getStationPath } from '../../../src/config/routes';

describe('routes config', () => {
  it('ROUTES should contain it and en configurations', () => {
    expect(ROUTES.it.cityPrefix).toBe('citta');
    expect(ROUTES.en.cityPrefix).toBe('city');
    expect(ROUTES.it.stationPrefix).toBe('stazione');
    expect(ROUTES.en.stationPrefix).toBe('station');
    expect(ROUTES.it.explore).toBe('esplora');
    expect(ROUTES.en.explore).toBe('explore');
  });

  describe('getCityPath', () => {
    it('should return correct path for IT', () => {
      expect(getCityPath('it', 'Roma')).toBe('/it/citta/Roma');
    });

    it('should return correct path for EN', () => {
      expect(getCityPath('en', 'Rome')).toBe('/en/city/Rome');
    });

    it('should fallback to IT prefix if lang is unknown', () => {
      expect(getCityPath('fr', 'Paris')).toBe('/fr/citta/Paris');
    });

    it('should encode city name correctly', () => {
      expect(getCityPath('it', 'San Gimignano')).toBe('/it/citta/San%20Gimignano');
    });
  });

  describe('getStationPath', () => {
    it('should return localized station path in IT without fuel', () => {
      expect(getStationPath('it', 'Roma', 123)).toBe('/it/citta/Roma/stazione/123');
    });

    it('should return localized station path in IT with fuel', () => {
      expect(getStationPath('it', 'Roma', 123, 'Benzina')).toBe('/it/citta/Roma/stazione/123/benzina');
    });

    it('should return localized station path in EN with fuel', () => {
      expect(getStationPath('en', 'Rome', 123, 'Petrol')).toBe('/en/city/Rome/station/123/petrol');
    });

    it('should fallback to IT prefixes if lang is unknown', () => {
      expect(getStationPath('de', 'Milano', 456)).toBe('/de/citta/Milano/stazione/456');
    });
  });

  describe('getExplorePath', () => {
    it('should return correct path for IT', () => {
      expect(getExplorePath('it')).toBe('/it/esplora');
    });

    it('should return correct path for EN', () => {
      expect(getExplorePath('en')).toBe('/en/explore');
    });

    it('should fallback to IT explore if lang is unknown', () => {
      expect(getExplorePath('fr')).toBe('/fr/esplora');
    });
  });
});
