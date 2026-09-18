# Changelog

Tutte le modifiche rilevanti a questo progetto sono documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e aderisce a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.3] - 2026-09-18

### Added

- **Dynamic Active Station Sitemap Pruning:** Sfoltimento automatico delle sitemap che include solo i comuni e carburanti con distributori attivi ($>0$), abbattendo le URL da 110.000 a ~18.000 ad alta qualità.
- **Thin Content Protection:** Direttiva automatica `<meta name="robots" content="noindex, follow">` per pagine comunali prive di distributori per preservare il Crawl Budget.
- **Server Keep-Alive Heartbeat:** Meccanismo periodico anti-sleep e pre-riscaldamento sitemap all'avvio per eliminare timeout 504 su Render.
- **Security Audit Rule SEC-006:** Aggiunta regola per rilevamento statico di unvalidated open redirect in `scripts/security-audit.js`.

### Changed

- **Anti-Cloaking Markup:** Sostituzione dei link nascosti `display:none` con container `<nav>` semantici e visibili nella pagina Esplora SSR.
- **Canonical Routing Badges & Tech Stack:** Aggiornamento approfondito di `README.md` e `public/llms.txt` con versioni specifiche dei framework e badge di certificazione.

### Fixed

- **Trailing Slash 301 Normalization:** Redirect deterministico automatico per le varianti con slash finale, eliminando gli avvisi di canonical duplicate in Google Search Console.
- **Shareable URL Canonicalization:** Auto-slugificazione dei toponimi e traduzione bilingue automatica dei carburanti per i link condivisibili delle schede distributore (`routes.js`).
- **Open Redirect Mitigation (Security):** Validazione regex perimetrale su route relative e sanitizzazione query params in `seoRedirect.js` per risolvere l'avviso di sicurezza CodeQL.

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
