# FuelFinder Italia

[![Live Demo](https://img.shields.io/badge/Live_Demo-Click_Here-blue?style=for-the-badge)](https://fuelfinder-msn8.onrender.com)
[![Version](https://img.shields.io/badge/version-1.2.0-brightgreen?style=for-the-badge)](https://github.com/Gaetano-Taormina/FuelFinder-Italy/releases)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge)](https://github.com/Gaetano-Taormina/FuelFinder-Italy)

**Choose your language / Scegli la tua lingua:**

- [English Version](#english-version)
- [Versione Italiana](#versione-italiana)

---

## English Version

FuelFinder Italy is a modern full-stack Progressive Web App (PWA) that allows users to find the most convenient fuel stations in Italy.
The data shown is real and based on official Open Data from the Italian Ministry.

### Key Features

- **Geolocated Search:** Search for stations by entering a city/zip code or using the device's GPS.
- **Smart Autocomplete:** Instant location suggestions while typing, powered by OpenStreetMap Nominatim.
- **Route Calculation:** Integrated OSRM (Open Source Routing Machine) to automatically trace the optimal route on the map, calculating distance and travel time from the user to the selected station.
- **Advanced Filters:** Filter by radius (3, 5, 10, 20 km), fuel type (Gasoline, Diesel, LPG, Methane, HVO, LNG), and service type (Self-Service or Served).
- **Interactive Map:** Clear map visualization (powered by Leaflet) with dynamic point-of-interest clustering.
- **PWA Support:** The app can be installed directly on a mobile Home screen, hiding the browser UI for a native, full-screen standalone experience.
- **Multi-language:** Native support for both English and Italian.
- **Modern UX:** Features Optimistic UI rendering, Skeleton Loaders, CSS-only Tooltips, and SWR caching for a fluid, app-like feel.
- **Modern Compression:** Native Node 24 zero-dependency multi-format compression (`zstd`, `br`, `gzip`, `deflate`).
- **Dark/Light Theme:** Modern UI (React + TailwindCSS) that adapts to user preferences.
- **Zero Turso Quota Waste:** Pre-sync checks `Last-Modified` HTTP header before downloading, computing diffs strictly against local SQLite.
- **Privacy-Friendly Analytics:** Native backend counter utilizing irreversible IP hashing (SHA-256) to track daily visits without requiring GDPR cookie banners.
- **Security Hardened:** Integrated Rate Limiting against DDoS/Scraping attacks, React Error Boundaries for crash prevention, and protective HTTP Security Headers.
- **Advanced SEO:** Highly optimized for search engines featuring JSON-LD Structured Data, `sitemap.xml`, dynamic Meta Tags, and `robots.txt`.
- **Admin Dashboard:** Secure passkey-protected panel at `/admin-stats` for visualizing site traffic and usage stats.
- **Lighthouse Optimized:** Next-gen image formats (WebP) and optimized React chunks for maximum speed.
- **3-Tier Testing Architecture & 100% Coverage:** Comprehensive testing suite divided into Component/Unit, Group/Integration, and E2E (Playwright), achieving 100% global coverage across all metrics (Lines, Functions, Statements, Branches).
- **Automated Releases:** Git tag-based release workflow with GitHub Actions compiling release bundles and publishing GitHub Releases.

### Testing & Development Commands

All testing and release commands are powered by `pnpm`:

```bash
# Run all test suites (Unit, Integration, E2E)
pnpm test

# Run component & unit tests
pnpm test:unit

# Run integration flow tests
pnpm test:integration

# Run real browser end-to-end tests (Playwright)
pnpm test:e2e

# Run global code coverage analysis (100% target)
pnpm test:coverage

# Linting with Oxlint
pnpm lint

# Create a new release and Git tag (patch, minor, major)
pnpm run release:patch
pnpm run release:minor
pnpm run release:major
```

### Architecture and Structure

The project features a high-performance **Full-Stack** architecture with a modern, premium user interface.

- **Frontend (Client):** Developed in React (via Vite) with TailwindCSS for a fast, fluid, and 100% Mobile-responsive design.
- **Backend (API):** Managed by a Node.js server with the Express 5 framework.
- **Database:** The massive amount of data on stations and prices is stored in a **Turso (libSQL)** database. This allows the application to perform geometric calculations and filtering in fractions of a second without overloading the client.

### Data Flow (Synchronization)

The application relies on information released daily by the Ministry (Open Data). A background automated process handles:

1. Checking `HEAD` headers to skip downloading if no upstream updates exist.
2. Streaming and parsing data with zero external dependencies (`nativeParser.js`).
3. Calculating diffs locally using SQLite before updating Turso, preventing unnecessary remote operations.

---

## Versione Italiana

FuelFinder Italia è un'applicazione web full-stack moderna (Progressive Web App) che permette agli utenti di trovare i distributori di carburante più convenienti in Italia.
I dati mostrati sono reali e basati sugli Open Data ufficiali del Ministero.

### Caratteristiche Principali

- **Ricerca Georeferenziata:** Cerca distributori inserendo una città/CAP o utilizzando il GPS del dispositivo.
- **Completamento Automatico:** Suggerimenti intelligenti in tempo reale durante la digitazione delle località.
- **Calcolo del Percorso:** Integrazione con OSRM (Open Source Routing Machine) per tracciare automaticamente il tragitto ottimale sulla mappa, calcolando distanza e tempi di percorrenza dall'utente al distributore.
- **Filtri Avanzati:** Filtra per raggio di distanza (3, 5, 10, 20 km), tipo di carburante (Benzina, Gasolio, GPL, Metano, HVO, GNL) e tipologia di servizio (Self-Service o Servito).
- **Mappa Interattiva:** Visualizzazione chiara sulla mappa (grazie a Leaflet) con raggruppamento dinamico (clustering) dei punti di interesse.
- **Supporto PWA:** L'app può essere installata direttamente sulla schermata Home del cellulare, nascondendo l'interfaccia del browser per un'esperienza nativa (Standalone) a schermo intero.
- **Multilingua:** Supporto nativo per Italiano e Inglese.
- **UX Moderna:** Implementa rendering Optimistic UI, Skeleton Loaders, Tooltips in puro CSS e Caching SWR per eliminare i caricamenti a scatti.
- **Compressione Nativa Avanzata:** Compressione multi-formato a zero dipendenze su Node 24 (`zstd`, `br`, `gzip`, `deflate`).
- **Tema Scuro/Chiaro:** Interfaccia utente moderna (React + TailwindCSS) che si adatta alle preferenze visive dell'utente.
- **Protezione Quota Turso:** Controllo preventivo dell'header `Last-Modified` e calcolo differenziale basato su SQLite locale per azzerare le letture superflue.
- **Statistiche GDPR-Friendly:** Contatore visite nativo lato server basato su crittografia (hash irreversibile) per garantire il 100% dell'anonimato senza richiedere banner sui cookie.
- **Sicurezza e Affidabilità:** Rate Limiting integrato contro attacchi DDoS, Error Boundaries in React per prevenire crash totali, e intestazioni HTTP protettive.
- **SEO Strutturata:** Ottimizzazione profonda per Google tramite Dati Strutturati (JSON-LD), mappa `sitemap.xml`, `robots.txt` e Open Graph.
- **Dashboard Admin:** Pannello protetto da passkey sicura alla rotta `/admin-stats` per monitorare il traffico e l'utilizzo del sito.
- **Testing a 3 Livelli & 100% Coverage:** Suite completa di test suddivisa in Component/Unit, Group/Integration ed E2E (Playwright), con copertura globale del 100% su tutte le metriche (Linee, Funzioni, Statements, Branches).
- **Release Automatizzate:** Workflow basato su tag Git e GitHub Actions per generare automaticamente pacchetti di rilascio e GitHub Releases.

### Comandi di Testing e Release

Tutti i comandi sono gestiti tramite `pnpm`:

```bash
# Esegue tutte e 3 le suite di test (Unit, Integration, E2E)
pnpm test

# Esegue i test unitari e per componente
pnpm test:unit

# Esegue i test sui flussi di integrazione
pnpm test:integration

# Esegue i test End-to-End su browser reale (Playwright)
pnpm test:e2e

# Analisi di coverage globale (obiettivo 100%)
pnpm test:coverage

# Linting con Oxlint
pnpm lint

# Crea una nuova release e il relativo tag Git (patch, minor, major)
pnpm run release:patch
pnpm run release:minor
pnpm run release:major
```

### Architettura e Struttura

Il progetto è sviluppato su una solida architettura **Full-Stack** ad alte prestazioni:

- **Frontend (Client):** Sviluppato in React (tramite Vite) con TailwindCSS per un design rapido, fluido e responsivo al 100% su Mobile.
- **Backend (API):** Gestito da un server Node.js con framework Express 5.
- **Database:** La massiccia mole di dati sui distributori e sui prezzi viene conservata in un database **Turso (libSQL)**.
