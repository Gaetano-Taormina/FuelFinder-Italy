import { 
    cities, 
    itToEnCities, 
    slugify, 
    escapeXml 
} from '../utils/seoHelpers.js';

export class SitemapService {
    constructor() {
        this.cacheByHost = new Map();
    }

    getHostCache(host) {
        if (!this.cacheByHost.has(host)) {
            this.cacheByHost.set(host, {
                index: null,
                it: null,
                en: null,
                fuelsIt: {},
                fuelsEn: {}
            });
        }
        return this.cacheByHost.get(host);
    }

    clearCache() {
        this.cacheByHost.clear();
    }

    getUrlsetStart() {
        return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
    }

    buildSingleLangUrl(host, locPath, altLang, altPath, freq, prio, currentLang) {
        const safeHost = escapeXml(host);
        const safeCurrentLang = encodeURIComponent(currentLang);
        const safeAltLang = encodeURIComponent(altLang);
        const locUrl = `${safeHost}/${safeCurrentLang}${locPath}`;
        const altUrl = `${safeHost}/${safeAltLang}${altPath}`;
        
        let xml = `  <url>\n    <loc>${locUrl}</loc>\n    <changefreq>${escapeXml(freq)}</changefreq>\n    <priority>${escapeXml(prio)}</priority>\n`;
        xml += `    <xhtml:link rel="alternate" hreflang="${escapeXml(altLang)}" href="${altUrl}" />\n`;
        xml += `    <xhtml:link rel="alternate" hreflang="${escapeXml(currentLang)}" href="${locUrl}" />\n  </url>\n`;
        return xml;
    }

    getIndexSitemap(host) {
        const hostCache = this.getHostCache(host);
        if (hostCache.index) return hostCache.index;

        const safeHost = escapeXml(host);
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        
        xml += `  <sitemap>\n    <loc>${safeHost}/sitemaps/it.xml</loc>\n  </sitemap>\n`;
        xml += `  <sitemap>\n    <loc>${safeHost}/sitemaps/en.xml</loc>\n  </sitemap>\n`;
        ['benzina', 'gasolio', 'gpl', 'metano', 'hvo', 'gnl'].forEach((fuel, index) => {
            const enFuels = ['petrol', 'diesel', 'lpg', 'methane', 'hvo', 'lng'];
            xml += `  <sitemap>\n    <loc>${safeHost}/sitemaps/fuels-it-${encodeURIComponent(fuel)}.xml</loc>\n  </sitemap>\n`;
            xml += `  <sitemap>\n    <loc>${safeHost}/sitemaps/fuels-en-${encodeURIComponent(enFuels[index])}.xml</loc>\n  </sitemap>\n`;
        });
        
        xml += `</sitemapindex>`;
        hostCache.index = xml;
        return xml;
    }

    getLanguageSitemap(host, lang) {
        const hostCache = this.getHostCache(host);
        if (hostCache[lang]) return hostCache[lang];

        let xml = this.getUrlsetStart();
        const isIt = lang === 'it';
        const altLang = isIt ? 'en' : 'it';
        const exploreSegment = isIt ? '/esplora' : '/explore';
        const altExploreSegment = isIt ? '/explore' : '/esplora';
        const cityPrefix = isIt ? '/citta' : '/city';
        const altCityPrefix = isIt ? '/city' : '/citta';

        xml += this.buildSingleLangUrl(host, '', altLang, '', 'daily', '1.0', lang);
        xml += this.buildSingleLangUrl(host, exploreSegment, altLang, altExploreSegment, 'daily', '0.9', lang);

        for (const city of cities) {
            const lowerCity = city.toLowerCase();
            const citySegmentIt = slugify(lowerCity);
            const citySegmentEn = slugify(itToEnCities[lowerCity] || lowerCity);
            const currentCitySegment = isIt ? citySegmentIt : citySegmentEn;
            const altCitySegment = isIt ? citySegmentEn : citySegmentIt;

            xml += this.buildSingleLangUrl(
                host, 
                `${cityPrefix}/${encodeURIComponent(currentCitySegment)}`, 
                altLang, 
                `${altCityPrefix}/${encodeURIComponent(altCitySegment)}`, 
                'daily', 
                '0.8', 
                lang
            );
        }

        xml += `</urlset>`;
        hostCache[lang] = xml;
        return xml;
    }

    getFuelSitemap(host, lang, requestedFuel) {
        const fuelsIt = ['benzina', 'gasolio', 'gpl', 'metano', 'hvo', 'gnl'];
        const fuelsEn = ['petrol', 'diesel', 'lpg', 'methane', 'hvo', 'lng'];
        const isIt = lang === 'it';
        const fuelIndex = isIt ? fuelsIt.indexOf(requestedFuel) : fuelsEn.indexOf(requestedFuel);
        
        if (fuelIndex === -1) return null;

        const hostCache = this.getHostCache(host);
        const cacheMap = isIt ? hostCache.fuelsIt : hostCache.fuelsEn;
        if (cacheMap[requestedFuel]) return cacheMap[requestedFuel];

        const altLang = isIt ? 'en' : 'it';
        const altFuel = isIt ? fuelsEn[fuelIndex] : fuelsIt[fuelIndex];
        const cityPrefix = isIt ? '/citta' : '/city';
        const altCityPrefix = isIt ? '/city' : '/citta';

        let xml = this.getUrlsetStart();
        xml += this.buildSingleLangUrl(host, `/${encodeURIComponent(requestedFuel)}`, altLang, `/${encodeURIComponent(altFuel)}`, 'daily', '0.9', lang);

        for (const city of cities) {
            const lowerCity = city.toLowerCase();
            const citySegmentIt = slugify(lowerCity);
            const citySegmentEn = slugify(itToEnCities[lowerCity] || lowerCity);
            const currentCitySegment = isIt ? citySegmentIt : citySegmentEn;
            const altCitySegment = isIt ? citySegmentEn : citySegmentIt;

            xml += this.buildSingleLangUrl(
                host, 
                `${cityPrefix}/${encodeURIComponent(currentCitySegment)}/${encodeURIComponent(requestedFuel)}`, 
                altLang, 
                `${altCityPrefix}/${encodeURIComponent(altCitySegment)}/${encodeURIComponent(altFuel)}`, 
                'daily', 
                '0.7', 
                lang
            );
        }

        xml += `</urlset>`;
        cacheMap[requestedFuel] = xml;
        return xml;
    }
}

export const sitemapService = new SitemapService();
