/* oxlint-disable no-console */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { SitemapService } from '../../server/services/sitemapService.js';
import { SeoService } from '../../server/services/seoService.js';
import { slugify, escapeXml, getSafeHost } from '../../server/utils/seoHelpers.js';
import { setupSitemapRoutes } from '../../server/routes/sitemaps.js';

describe('SEO Helpers', () => {
    it('slugify transforms text accurately', () => {
        expect(slugify('Reggio nell\'Emilia')).toBe('reggio-nell-emilia');
        expect(slugify('Forlì-Cesena')).toBe('forli-cesena');
        expect(slugify('---test  slug---')).toBe('test-slug');
    });

    it('escapeXml handles special characters and non-string inputs', () => {
        expect(escapeXml('<script>"test" & \'var\'</script>')).toBe('&lt;script&gt;&quot;test&quot; &amp; &apos;var&apos;&lt;/script&gt;');
        expect(escapeXml(null)).toBe('');
        expect(escapeXml(undefined)).toBe('');
    });

    it('getSafeHost validates protocols and hosts', () => {
        expect(getSafeHost({ get: () => 'localhost:3000', protocol: 'http' })).toBe('http://localhost:3000');
        expect(getSafeHost({ get: () => 'example.com', protocol: 'https' })).toBe('https://example.com');
        expect(getSafeHost({ get: () => 'invalid host with spaces', protocol: 'https' })).toBe('https://fuelfinder-msn8.onrender.com');
        expect(getSafeHost(null)).toBe('https://fuelfinder-msn8.onrender.com');
    });
});

describe('Sitemap Service & Controller', () => {
    it('generates and caches index sitemap', () => {
        const service = new SitemapService();
        const xml1 = service.getIndexSitemap('https://example.com');
        expect(xml1).toContain('<sitemapindex');
        expect(xml1).toContain('https://example.com/sitemaps/it.xml');
        
        const xmlCached = service.getIndexSitemap('https://example.com');
        expect(xmlCached).toBe(xml1);
    });

    it('generates and caches language sitemaps (it / en)', () => {
        const service = new SitemapService();
        const xmlIt = service.getLanguageSitemap('https://example.com', 'it');
        expect(xmlIt).toContain('<urlset');
        expect(xmlIt).toContain('/it/esplora');
        expect(xmlIt).toContain('/en/explore');
        expect(service.getLanguageSitemap('https://example.com', 'it')).toBe(xmlIt);

        const xmlEn = service.getLanguageSitemap('https://example.com', 'en');
        expect(xmlEn).toContain('/en/explore');
        expect(xmlEn).toContain('/it/esplora');
    });

    it('generates and caches fuel sitemaps (it / en)', () => {
        const service = new SitemapService();
        const xmlFuelIt = service.getFuelSitemap('https://example.com', 'it', 'benzina');
        expect(xmlFuelIt).toContain('/it/benzina');
        expect(xmlFuelIt).toContain('/en/petrol');

        const xmlFuelEn = service.getFuelSitemap('https://example.com', 'en', 'diesel');
        expect(xmlFuelEn).toContain('/en/diesel');
        expect(xmlFuelEn).toContain('/it/gasolio');

        const invalidFuel = service.getFuelSitemap('https://example.com', 'it', 'unknown-fuel');
        expect(invalidFuel).toBeNull();
    });

    it('serves sitemap routes through express', async () => {
        const app = express();
        setupSitemapRoutes(app);

        const resIndex = await request(app).get('/sitemap.xml');
        expect(resIndex.status).toBe(200);
        expect(resIndex.headers['content-type']).toContain('xml');

        const resIt = await request(app).get('/sitemaps/it.xml');
        expect(resIt.status).toBe(200);

        const resEn = await request(app).get('/sitemaps/en.xml');
        expect(resEn.status).toBe(200);

        const resFuelIt = await request(app).get('/sitemaps/fuels-it-benzina.xml');
        expect(resFuelIt.status).toBe(200);

        const resFuelEn = await request(app).get('/sitemaps/fuels-en-diesel.xml');
        expect(resFuelEn.status).toBe(200);

        const resNotFound = await request(app).get('/sitemaps/fuels-it-nonexistent.xml');
        expect(resNotFound.status).toBe(404);

        const resNotFoundEn = await request(app).get('/sitemaps/fuels-en-nonexistent.xml');
        expect(resNotFoundEn.status).toBe(404);
    });
});

describe('SEO Service & SSR Controller', () => {
    it('generates metadata for city, explore, and home pages', () => {
        const seo = new SeoService();
        
        const cityMeta = seo.generateMetadata({
            isCityPage: true,
            isExplorePage: false,
            isHomePage: false,
            lang: 'it',
            displayFuel: 'Benzina',
            cityCap: 'Roma',
            host: 'https://example.com',
            pathSegment: '/it/citta/roma'
        });
        expect(cityMeta.title).toContain('Prezzi Benzina a Roma');
        expect(cityMeta.currentUrl).toBe('https://example.com/it/citta/roma');

        const exploreMeta = seo.generateMetadata({
            isCityPage: false,
            isExplorePage: true,
            isHomePage: false,
            lang: 'en',
            displayFuel: 'Petrol',
            cityCap: '',
            host: 'https://example.com',
            pathSegment: '/en/explore'
        });
        expect(exploreMeta.title).toContain('Explore Gas Prices by City');

        const homeMeta = seo.generateMetadata({
            isCityPage: false,
            isExplorePage: false,
            isHomePage: true,
            lang: 'it',
            displayFuel: 'Benzina',
            cityCap: '',
            host: 'https://example.com',
            pathSegment: '/it'
        });
        expect(homeMeta.title).toContain('FuelFinder Italy - Prezzi Benzina');
    });

    it('generates JSON-LD schema with city prices aggregate offer', () => {
        const seo = new SeoService();
        const jsonLd = seo.generateJsonLd({
            isCityPage: true,
            isExplorePage: false,
            lang: 'it',
            displayFuel: 'Benzina',
            cityCap: 'Roma',
            currentUrl: 'https://example.com/it/citta/roma',
            host: 'https://example.com',
            title: 'Prezzi Roma',
            desc: 'Descrizione Roma',
            cityPrices: [
                { nome_impianto: 'Eni Stazione 1', indirizzo: 'Via Roma 1', latitudine: 41.9, longitudine: 12.5, prezzo: 1.75 },
                { nome_impianto: 'Q8 Stazione 2', indirizzo: 'Via Roma 2', latitudine: 41.91, longitudine: 12.51, prezzo: 1.85 }
            ]
        });

        expect(Array.isArray(jsonLd)).toBe(true);
        const product = jsonLd.find(item => item['@type'] === 'Product');
        expect(product).toBeDefined();
        expect(product.offers.lowPrice).toBe(1.75);
        expect(product.offers.highPrice).toBe(1.85);

        const localBiz = jsonLd.filter(item => item['@type'] === 'LocalBusiness');
        expect(localBiz.length).toBe(2);
    });

    it('injects SEO into HTML template', () => {
        const seo = new SeoService();
        const template = `<!DOCTYPE html><html><head><title>Original</title><link rel="canonical" href="old"><meta name="description" content="old"></head><body><div id="root"></div></body></html>`;
        const result = seo.injectSeoIntoHtml(template, {
            metadata: {
                safeTitle: 'Injected Title',
                safeDesc: 'Injected Desc',
                safeCurrentUrl: 'https://example.com/it',
                safeHost: 'https://example.com'
            },
            crawlerHtml: '<h1>Crawled</h1>',
            jsonLd: [{ '@type': 'WebSite' }]
        });

        expect(result).toContain('<title>Injected Title</title>');
        expect(result).toContain('<meta name="description" content="Injected Desc">');
        expect(result).toContain('<link rel="canonical" href="https://example.com/it">');
        expect(result).toContain('<div id="root"><h1>Crawled</h1></div>');
        expect(result).toContain('application/ld+json');
    });

    it('generates station metadata with fallbacks when name or address are missing', () => {
        const seo = new SeoService();
        const stationBrandOnly = { brand: 'Q8' };
        const metaBrand = seo.generateStationMetadata({
            station: stationBrandOnly,
            lang: 'it',
            displayFuel: 'Benzina',
            host: 'https://example.com',
            pathSegment: '/it/citta/roma/stazione/1/benzina'
        });
        expect(metaBrand.title).toContain('Prezzi Benzina - Q8');

        const stationEmpty = {};
        const metaEmpty = seo.generateStationMetadata({
            station: stationEmpty,
            lang: 'en',
            displayFuel: 'Petrol',
            host: 'https://example.com',
            pathSegment: '/en/city/rome/station/1/petrol'
        });
        expect(metaEmpty.title).toContain('Prices for Petrol - Distributore');
    });

    it('generates station crawler HTML and handles empty prices', () => {
        const seo = new SeoService();
        const htmlWithPrices = seo.generateStationCrawlerHtml({
            station: {
                priceList: [
                    { fuelType: 'Benzina', isSelf: 1, price: 1.759 },
                    { fuelType: 'Gasolio', isSelf: 0, price: 1.899 }
                ]
            },
            safeTitle: 'Station Title',
            safeDesc: 'Station Desc'
        });
        expect(htmlWithPrices).toContain('<strong>Benzina</strong> (Self): €1.759/L');
        expect(htmlWithPrices).toContain('<strong>Gasolio</strong> (Servito): €1.899/L');

        const htmlNoPrices = seo.generateStationCrawlerHtml({
            station: { priceList: [] },
            safeTitle: 'Station Title',
            safeDesc: 'Station Desc'
        });
        expect(htmlNoPrices).not.toContain('<ul');
    });

    it('generates station JSON-LD with brand fallback and breadcrumbs', () => {
        const seo = new SeoService();
        const jsonLd = seo.generateStationJsonLd({
            station: {
                brand: 'Esso',
                comune: 'Milano',
                address: 'Via Milano 10',
                provincia: 'MI',
                lat: 45.46,
                lng: 9.19,
                priceList: [{ fuelType: 'Benzina', isSelf: 1, price: 1.72 }]
            },
            currentUrl: 'https://example.com/it/citta/milano/stazione/1',
            host: 'https://example.com',
            title: 'Station Title',
            desc: 'Station Desc'
        });

        expect(Array.isArray(jsonLd)).toBe(true);
        const gasStation = jsonLd.find(i => i['@type'] === 'GasStation');
        expect(gasStation.name).toBe('Esso');
        expect(gasStation.makesOffer.length).toBe(1);

        const breadcrumbs = jsonLd.find(i => i['@type'] === 'BreadcrumbList');
        expect(breadcrumbs.itemListElement.length).toBe(3);
    });

    it('generates JSON-LD for city page with a single station', () => {
        const seo = new SeoService();
        const jsonLd = seo.generateJsonLd({
            isCityPage: true,
            isExplorePage: false,
            lang: 'en',
            displayFuel: 'Petrol',
            cityCap: 'Rome',
            currentUrl: 'https://example.com/en/city/rome',
            host: 'https://example.com',
            title: 'Rome Prices',
            desc: 'Rome Desc',
            cityPrices: [
                { nome_impianto: 'Eni Roma', indirizzo: 'Via Roma 1', latitudine: 41.9, longitudine: 12.5, prezzo: 1.75 }
            ]
        });

        const localBiz = jsonLd.filter(item => item['@type'] === 'LocalBusiness');
        expect(localBiz.length).toBe(1);
    });

    it('caches English fuel sitemaps correctly', () => {
        const service = new SitemapService();
        const xml1 = service.getFuelSitemap('https://example.com', 'en', 'petrol');
        const xml2 = service.getFuelSitemap('https://example.com', 'en', 'petrol');
        expect(xml1).toBe(xml2);
    });

    it('generates station metadata without displayFuel in IT and EN', () => {
        const seo = new SeoService();
        const station = { name: 'Eni Roma', address: 'Via Roma 1', comune: 'Roma' };
        const metaIt = seo.generateStationMetadata({
            station,
            lang: 'it',
            displayFuel: null,
            host: 'https://example.com',
            pathSegment: '/it/citta/roma/stazione/1'
        });
        expect(metaIt.title).toContain('Prezzi Carburante');

        const metaEn = seo.generateStationMetadata({
            station,
            lang: 'en',
            displayFuel: null,
            host: 'https://example.com',
            pathSegment: '/en/city/rome/station/1'
        });
        expect(metaEn.title).toContain('Fuel Prices');
    });

    it('handles station crawler HTML and JSON-LD when priceList is omitted', () => {
        const seo = new SeoService();
        const stationNoPrices = { name: 'Station Without Prices', comune: 'Roma', address: 'Via 1' };
        const html = seo.generateStationCrawlerHtml({
            station: stationNoPrices,
            safeTitle: 'Title',
            safeDesc: 'Desc'
        });
        expect(html).not.toContain('<ul');

        const jsonLd = seo.generateStationJsonLd({
            station: stationNoPrices,
            currentUrl: 'https://example.com/it/citta/roma/stazione/1',
            host: 'https://example.com',
            title: 'Title',
            desc: 'Desc'
        });
        const gasStation = jsonLd.find(i => i['@type'] === 'GasStation');
        expect(gasStation.makesOffer).toEqual([]);
    });

    it('generates JSON-LD for city page with empty cityPrices', () => {
        const seo = new SeoService();
        const jsonLd = seo.generateJsonLd({
            isCityPage: true,
            isExplorePage: false,
            lang: 'it',
            displayFuel: 'Benzina',
            cityCap: 'Roma',
            currentUrl: 'https://example.com/it/citta/roma',
            host: 'https://example.com',
            title: 'Roma Prezzi',
            desc: 'Roma Desc',
            cityPrices: []
        });
        const product = jsonLd.find(item => item['@type'] === 'Product');
        expect(product).toBeUndefined();
    });

    it('generates crawler HTML for home and generic pages', () => {
        const seo = new SeoService();
        const homeHtml = seo.generateCrawlerHtml({
            isExplorePage: false,
            isHomePage: true,
            safeTitle: 'Home',
            safeDesc: 'Home Desc',
            safeHost: 'https://example.com',
            lang: 'it'
        });
        expect(homeHtml).toContain('Esplora Città');

        const genericHtml = seo.generateCrawlerHtml({
            isExplorePage: false,
            isHomePage: false,
            safeTitle: 'Generic',
            safeDesc: 'Generic Desc',
            safeHost: 'https://example.com',
            lang: 'it'
        });
        expect(genericHtml).not.toContain('Esplora Città');

        const homeEnHtml = seo.generateCrawlerHtml({
            isExplorePage: false,
            isHomePage: true,
            safeTitle: 'Home EN',
            safeDesc: 'Home EN Desc',
            safeHost: 'https://example.com',
            lang: 'en'
        });
        expect(homeEnHtml).toContain('/en/explore');
    });

    it('generates English home page metadata and station JSON-LD with self and served prices', () => {
        const seo = new SeoService();
        const homeMetaEn = seo.generateMetadata({
            isCityPage: false,
            isExplorePage: false,
            isHomePage: true,
            lang: 'en',
            displayFuel: 'Petrol',
            cityCap: '',
            host: 'https://example.com',
            pathSegment: '/en/petrol'
        });
        expect(homeMetaEn.title).toContain('Real-time Petrol Prices');

        const station = {
            name: 'Station Mix',
            comune: 'Roma',
            address: 'Via 1',
            priceList: [
                { fuelType: 'Benzina', isSelf: 1, price: 1.70 },
                { fuelType: 'Benzina', isSelf: 0, price: 1.90 }
            ]
        };
        const jsonLd = seo.generateStationJsonLd({
            station,
            currentUrl: 'https://example.com/it/citta/roma/stazione/1',
            host: 'https://example.com',
            title: 'Station Title',
            desc: 'Station Desc'
        });
        const gasStation = jsonLd.find(i => i['@type'] === 'GasStation');
        expect(gasStation.makesOffer[0].name).toContain('Self');
        expect(gasStation.makesOffer[1].name).toContain('Servito');
    });

    it('generates default metadata for unmatched page types', () => {
        const seo = new SeoService();
        const meta = seo.generateMetadata({
            isCityPage: false,
            isExplorePage: false,
            isHomePage: false,
            lang: 'it',
            displayFuel: 'Benzina',
            cityCap: '',
            host: 'https://example.com',
            pathSegment: '/other'
        });
        expect(meta.title).toBe('');
        expect(meta.desc).toBe('');
    });
});






