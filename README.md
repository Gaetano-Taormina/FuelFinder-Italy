# FuelFinder Italia

[![Live Demo](https://img.shields.io/badge/Live_Demo-Click_Here-blue?style=for-the-badge)](https://fuelfinder-msn8.onrender.com)
[![Version](https://img.shields.io/badge/version-1.3.0-brightgreen?style=for-the-badge)](https://github.com/Gaetano-Taormina/FuelFinder-Italy/releases)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge)](https://github.com/Gaetano-Taormina/FuelFinder-Italy)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-informational?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-11.x-orange?style=for-the-badge&logo=pnpm)](https://pnpm.io/)

**Choose your language / Scegli la tua lingua:**

- [English Version](#english-version)
- [Versione Italiana](#versione-italiana)

---

## English Version

FuelFinder Italy is a modern full-stack Progressive Web App (PWA) that allows users to find the most convenient fuel stations in Italy.
The data shown is real and based on official Open Data from the Italian Ministry of Enterprises and Made in Italy (MIMIT).

### Key Features

- **Geolocated Search:** Search for stations by entering a city/zip code or using the device's GPS.
- **Smart Autocomplete:** Instant location suggestions while typing, powered by OpenStreetMap Nominatim.
- **Localized Station Routes & Sharing:** Direct localized URLs for each station (`/:lang/:cityPrefix/:city/:stationPrefix/:stationId/:fuel?`) with 1-click clipboard sharing and GasStation JSON-LD structured schema.
- **Station Detail API:** Dedicated endpoint (`GET /api/stations/:id`) providing full station metadata, pricing history, and breakdown by Self-Service / Served.
- **Route Calculation:** Integrated OSRM (Open Source Routing Machine) to automatically trace the optimal route on the map, calculating distance and travel time from the user to the selected station.
- **Advanced Filters:** Filter by radius (3, 5, 10, 20 km), fuel type (Petrol, Diesel, LPG, Methane, HVO, LNG), and service type (Self-Service or Served).
- **Interactive Map:** Clear map visualization (powered by Leaflet) with dynamic point-of-interest clustering and code-split chunks.
- **PWA Support:** The app can be installed directly on a mobile Home screen, hiding the browser UI for a native, full-screen standalone experience.
- **Multi-language:** Native internationalization (i18next) for both English and Italian.
- **Modern UX:** Features Optimistic UI rendering, Skeleton Loaders, CSS-only Tooltips, and SWR caching for a fluid, app-like feel.
- **Dual Pre-compression:** Vite-integrated Brotli and Gzip pre-compression along with runtime multi-format support (`zstd`, `br`, `gzip`, `deflate`).
- **Path Aliasing & IDE Support:** Native `@/*` path mapping across frontend and tests with clean editor configuration.
- **Dark/Light Theme:** Modern UI (React 19 + TailwindCSS v4) that adapts to user preferences.
- **Zero Cloud Costs & Fast Local DB:** Pre-compiled SQLite snapshot is downloaded automatically on startup from GitHub Releases, eliminating cloud fees and ensuring sub-millisecond query responses.
- **Privacy-Friendly Analytics:** Native backend counter utilizing irreversible SHA-256 hashing to track daily visits without requiring GDPR cookie banners.
- **Security Hardened:** Integrated Rate Limiting against DDoS/Scraping attacks, React Error Boundaries for crash prevention, and protective HTTP Security Headers.
- **Advanced SEO & Crawl Protection:** Highly optimized for search engines featuring JSON-LD Structured Data, `sitemap.xml`, dynamic Meta Tags, `robots.txt`, and smart `noindex, follow` crawl budget protection on single station routes.
- **Admin Dashboard:** Secure passkey-protected panel at `/admin-stats` for visualizing site traffic and usage stats.
- **Lighthouse 100/100:** Next-gen image formats (WebP), deferred CSS, and fine-tuned manual chunks.
- **3-Tier Testing Architecture & 100% Coverage:** Comprehensive testing suite divided into Component/Unit (Vitest), Integration Flow, and E2E in real browser (Playwright), achieving 100% global coverage across lines, statements, and functions.
- **Automated CI/CD & Dependabot:** GitHub Actions with automatic run cancellation (`concurrency`), Node 22 LTS environment, and smart Dependabot PR grouping.

### 📱 Quick Mobile Install (PWA)

Scan the QR Code below with your smartphone camera to open FuelFinder Italy and install it directly onto your Home Screen:

![FuelFinder Mobile QR Code](https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=https%3A%2F%2Ffuelfinder-msn8.onrender.com%2F)

### Scripts and Commands

All commands are powered by `pnpm`:

```bash
# Start development environment (Vite frontend + Express backend with auto-reload)
pnpm dev

# Start individual services
pnpm run dev:client
pnpm run dev:server

# Build and preview for production
pnpm run build
pnpm run preview

# Run all test suites (Unit, Integration, E2E)
pnpm test

# Run code coverage analysis (100% target)
pnpm run test:coverage

# Fast linting and auto-fix with Oxlint
pnpm run lint
pnpm run lint:fix

# Sync latest MIMIT open data locally
pnpm run sync

# Show local database stats
pnpm run stats

# Automatic semantic release and Git tag generation
pnpm run release
```

### Architecture and Structure

The project features a high-performance **Full-Stack** architecture:

- **Frontend (Client):** Developed in React 19 (via Vite 8) with TailwindCSS v4 for a fast, fluid, and 100% mobile-responsive design.
- **Backend (API):** Managed by a Node.js server with the Express 5 framework.
- **Database:** High-performance local **SQLite** database. On production/Render, a pre-compiled SQLite snapshot is downloaded automatically on startup from GitHub Releases.

---

## Versione Italiana

FuelFinder Italia è un'applicazione web full-stack moderna (Progressive Web App) che permette agli utenti di trovare i distributori di carburante più convenienti in Italia.
I dati mostrati sono reali e basati sugli Open Data ufficiali del Ministero delle Imprese e del Made in Italy (MIMIT).

### Caratteristiche Principali

- **Ricerca Georeferenziata:** Cerca distributori inserendo una città/CAP o utilizzando il GPS del dispositivo.
- **Completamento Automatico:** Suggerimenti intelligenti in tempo reale durante la digitazione delle località tramite OpenStreetMap Nominatim.
- **Schede Dettaglio Stazione & Condivisione:** URL dedicati e localizzati per ogni distributore (`/:lang/:cityPrefix/:city/:stationPrefix/:stationId/:fuel?`) con condivisione immediata del link e dati strutturati Schema.org GasStation.
- **API Dettaglio Stazione:** Endpoint dedicato (`GET /api/stations/:id`) con anagrafica completa, storico prezzi e suddivisione Self-Service e Servito.
- **Calcolo del Percorso:** Integrazione con OSRM (Open Source Routing Machine) per tracciare automaticamente il tragitto ottimale sulla mappa, calcolando distanza e tempi di percorrenza dall'utente al distributore.
- **Filtri Avanzati:** Filtra per raggio di distanza (3, 5, 10, 20 km), tipo di carburante (Benzina, Gasolio, GPL, Metano, HVO, GNL) e tipologia di servizio (Self-Service o Servito).
- **Mappa Interattiva:** Visualizzazione chiara sulla mappa (Leaflet) con raggruppamento dinamico (clustering) dei punti di interesse e chunking dedicato.
- **Supporto PWA:** L'app può essere installata direttamente sulla schermata Home del dispositivo, offrendo un'esperienza nativa (Standalone) a schermo intero.
- **Multilingua:** Supporto nativo (i18next) per Italiano e Inglese.
- **UX Moderna:** Rendering Optimistic UI, Skeleton Loaders, Tooltip in puro CSS e Caching SWR per navigazione istantanea senza scatti.
- **Doppia Pre-compressione:** Compressione statica integrata in build con Brotli e Gzip, unita al supporto runtime multi-formato (`zstd`, `br`, `gzip`, `deflate`).
- **Path Aliasing & Supporto IDE:** Alias `@/*` per import puliti e configurazione di File Nesting per VS Code.
- **Tema Scuro/Chiaro:** Interfaccia utente moderna (React 19 + TailwindCSS v4) che si adatta alle preferenze visive del sistema.
- **Zero Costi Cloud & SQLite Standalone:** Download automatico all'avvio su Render da GitHub Releases con query locali istantanee e zero costi fissi di database.
- **Statistiche GDPR-Friendly:** Contatore visite nativo lato server basato su hash crittografico SHA-256 irreversibile per garantire il 100% dell'anonimato senza richiedere banner sui cookie.
- **Sicurezza e Affidabilità:** Rate Limiting contro attacchi DDoS/scraping, Error Boundaries in React per prevenire crash totali e intestazioni HTTP protettive.
- **SEO Strutturata & Protezione Crawl Budget:** Ottimizzazione profonda per Google tramite Dati Strutturati (JSON-LD), mappa `sitemap.xml`, `robots.txt`, Open Graph e direttiva `noindex, follow` per preservare il crawl budget sui singoli distributori.
- **Dashboard Admin:** Pannello protetto da passkey sicura alla rotta `/admin-stats` per monitorare il traffico e l'utilizzo del sito.
- **Lighthouse 100/100:** Formati immagine di nuova generazione (WebP), CSS differito e chunking avanzato delle librerie.
- **Testing a 3 Livelli & 100% Coverage:** Suite completa di test suddivisa in Component/Unit (Vitest), Group/Integration ed E2E su browser reale (Playwright), con copertura globale del 100% su linee, statement e funzioni.
- **Workflow CI/CD & Dependabot:** Pipeline GitHub Actions con cancellazione automatica dei task obsoleti (`concurrency`), Node 22 LTS e raggruppamenti intelligenti per Dependabot.

### 📱 Installazione Rapida su Smartphone (PWA)

Inquadra il codice QR con la fotocamera del tuo smartphone per aprire FuelFinder Italia e aggiungerlo alla schermata Home:

![FuelFinder QR Code Mobile](https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=https%3A%2F%2Ffuelfinder-msn8.onrender.com%2F)

### Script e Comandi

Tutti i comandi sono gestiti tramite `pnpm`:

```bash
# Avvia l'ambiente di sviluppo completo (Vite frontend + Express backend con hot-reload)
pnpm dev

# Avvia i singoli servizi in sviluppo
pnpm run dev:client
pnpm run dev:server

# Compila e testa la build di produzione
pnpm run build
pnpm run preview

# Esegue tutte e 3 le suite di test (Unit, Integration, E2E)
pnpm test

# Analisi di code coverage globale (obiettivo 100%)
pnpm run test:coverage

# Controllo e correzione linting ultra-rapido con Oxlint
pnpm run lint
pnpm run lint:fix

# Sincronizza i dati aperti MIMIT in locale
pnpm run sync

# Visualizza statistiche sul database locale
pnpm run stats

# Creazione e rilascio automatico di versione semantica con tag Git
pnpm run release
```

### Architettura e Struttura

Il progetto è sviluppato su una solida architettura **Full-Stack** ad alte prestazioni:

- **Frontend (Client):** Sviluppato in React 19 (tramite Vite 8) con TailwindCSS v4 per un design rapido, fluido e responsivo al 100% su Mobile.
- **Backend (API):** Gestito da un server Node.js con framework Express 5.
- **Database:** Motore **SQLite** locale ad altissime prestazioni. Su Render il database viene scaricato automaticamente all'avvio da GitHub Releases, azzerando le latenze e i costi di terze parti.
