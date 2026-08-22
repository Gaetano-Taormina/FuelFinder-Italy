# FuelFinder Italia

[![Live Demo](https://img.shields.io/badge/Live_Demo-Click_Here-blue?style=for-the-badge)](https://fuelfinder-msn8.onrender.com)
[![Version](https://img.shields.io/badge/version-1.1.0-brightgreen?style=for-the-badge)](https://github.com/Gaetano-Taormina/FuelFinder-Italy/releases)

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
- **Dark/Light Theme:** Modern UI (React + TailwindCSS) that adapts to user preferences.
- **Automated Cron Jobs:** Built-in daily synchronization with ministerial data running on an internal Node.js scheduler.
- **Privacy-Friendly Analytics:** Native backend counter utilizing irreversible IP hashing (SHA-256) to track daily visits without requiring GDPR cookie banners.
- **Security Hardened:** Integrated Rate Limiting against DDoS/Scraping attacks, React Error Boundaries for crash prevention, and protective HTTP Security Headers.
- **Advanced SEO:** Highly optimized for search engines featuring JSON-LD Structured Data, `sitemap.xml`, dynamic Meta Tags, and `robots.txt`.
- **Admin Dashboard:** Secure passkey-protected panel at `/admin-stats` for visualizing site traffic and usage stats.
- **Lighthouse Optimized:** Next-gen image formats (WebP) and optimized React chunks for maximum speed.
- **Robust Testing (v1.1):** 100% Code Coverage achieved through Vitest and Happy-DOM, ensuring enterprise-grade stability.

### Architecture and Structure

The project features a high-performance **Full-Stack** architecture with a modern, premium user interface.

- **Frontend (Client):** Developed in React (via Vite) with TailwindCSS for a fast, fluid, and 100% Mobile-responsive design.
- **Backend (API):** Managed by a Node.js server with the Express 5 framework.
- **Database:** The massive amount of data on stations and prices is stored in a **Turso (libSQL)** database. This allows the application to perform geometric calculations and filtering in fractions of a second without overloading the client.

### Data Flow (Synchronization)

The application relies on information released daily by the Ministry (Open Data). A background automated process handles:

1. Downloading the files containing registry and prices entirely into the server's RAM. This prevents the fragile MIMIT network from dropping connections during database transactions.
2. Parsing the data in memory and chunking it into safe batches.
3. Cross-referencing and saving the updated data into the Turso database, with an automated 8-retry fallback system for maximum stability.

*(Note: For security and integrity reasons, extraction occurs entirely on the backend and direct data sources are neither exposed nor manipulable from the client side).*

### Hosting and Deployment

The entire project (Frontend + Backend Server) is hosted as a single Web Service on **Render**.
Thanks to continuous integration (CI/CD), every new change (commit) on GitHub automatically triggers:

1. Dependency installation.
2. Optimized build of the React client.
3. Launch of the Express server.

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
- **Tema Scuro/Chiaro:** Interfaccia utente moderna (React + TailwindCSS) che si adatta alle preferenze visive dell'utente.
- **Sincronizzazione Automatica:** Cron job interno in Node.js che esegue un aggiornamento quotidiano dei prezzi in background.
- **Statistiche GDPR-Friendly:** Contatore visite nativo lato server basato su crittografia (hash irreversibile) per garantire il 100% dell'anonimato senza richiedere fastidiosi banner sui cookie.
- **Sicurezza e Affidabilità:** Rate Limiting integrato contro attacchi DDoS, Error Boundaries in React per prevenire crash totali, e intestazioni HTTP protettive.
- **SEO Strutturata:** Ottimizzazione profonda per Google tramite Dati Strutturati (JSON-LD), mappa `sitemap.xml`, `robots.txt`, tag `noscript` di fallback e Open Graph per i social.
- **Dashboard Admin:** Pannello protetto da passkey sicura alla rotta `/admin-stats` per monitorare il traffico e l'utilizzo del sito.
- **Ottimizzazione Lighthouse:** Immagini in formato WebP e caricamenti separati per massimizzare le prestazioni del browser.
- **Test Robusti (v1.1):** 100% di Code Coverage raggiunto tramite Vitest e Happy-DOM, per garantire una stabilità di livello enterprise.

### Architettura e Struttura

Il progetto è sviluppato su una solida architettura **Full-Stack** ad alte prestazioni, arricchita da un'interfaccia utente premium e curata nei dettagli.

- **Frontend (Client):** Sviluppato in React (tramite Vite) con TailwindCSS per un design rapido, fluido e responsivo al 100% su Mobile.
- **Backend (API):** Gestito da un server Node.js con framework Express 5.
- **Database:** La massiccia mole di dati sui distributori e sui prezzi viene conservata in un database **Turso (libSQL)**. Questo permette all'applicazione di eseguire calcoli geometrici e filtri in frazioni di secondo senza sovraccaricare il client.

### Flusso dei Dati (Sincronizzazione)

L'applicazione si basa sulle informazioni rilasciate giornalmente dal Ministero (Open Data). Un processo automatico in background si occupa di:

1. Scaricare per intero i file contenenti anagrafiche e prezzi direttamente nella RAM del server. Questo disaccoppia la rete dal database, evitando blocchi causati dall'instabilità dei server ministeriali.
2. Fare il parsing dei dati in memoria, dividendoli in chunk sicuri.
3. Incrociare e salvare i dati aggiornati nel database Turso, supportato da un sistema di retry automatico (fino a 8 tentativi) per garantire la massima operatività.

*(Nota: Per motivi di sicurezza e correttezza, l'estrazione avviene interamente sul backend e le fonti dirette dei dati non sono esposte o manipolabili dal lato client).*

### Hosting e Deploy

L'intero progetto (Frontend + Server Backend) è ospitato come Web Service unico su **Render**.
Grazie all'integrazione continua (CI/CD), ogni nuova modifica (commit) su GitHub innesca automaticamente:

1. L'installazione delle dipendenze.
2. La build ottimizzata del client React.
3. Il lancio del server Express.
