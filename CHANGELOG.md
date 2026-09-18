# Changelog

Tutte le modifiche rilevanti a questo progetto sono documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e aderisce a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.2] - 2026-09-18

### Added

- **Pre-Indexed Map Lookups:** Mappa `citySlugMap` pre-calcolata per risoluzione $O(1)$ dei comuni su rotte API e SSR.
- **Release Manager Agent:** Ruolo specializzato per la gestione del ciclo di release e documentazione SemVer.
- **Full Metric 100% Coverage:** Copertura al 100.0% su Linee, Funzioni, Istruzioni e Rami per tutti i moduli.

### Changed

- **Service Worker Cache Throttling:** Algoritmo LRU con throttling per il trim della cache dei tile geografici in `sw.js`.
- **MIMIT Ingestion Stream:** Ottimizzazione consumo heap durante l'ingestione massiva dei dati carburante MIMIT.

### Fixed

- **OSRM Fetch Race Condition:** Implementato `AbortController` in `StationsContext.jsx` per annullare le richieste di rotta obsolete.
- **Debounce Timer Leak:** Aggiunto hook di cleanup al dismount del componente `LocationInput.jsx`.
- **SSR Redirection Edge Cases:** Risolta gestione degli slug con fallback deterministico.

## [1.5.1] - 2026-09-15

### Added

- **WebMCP Integration:** Servizio client e bridge MCP per querying stazioni e prezzi in tempo reale.
- **Modern Compression:** Middleware con supporto nativo Zstandard, Brotli e Gzip.

### Fixed

- **Geospatial Distance Queries:** Correzione formula Haversine e filtri per raggio geografico.

## [1.5.0] - 2026-09-10

### Added

- **Server-Side Rendering (SSR):** Motore SSR multilingua con supporto `/it/` ed `/en/` e metadati OpenGraph dinamici.
- **Dynamic Sitemaps:** Generazione sitemap XML suddivise per regione e toponimo con indicizzazione SEO.
