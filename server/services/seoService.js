import escapeHtml from 'escape-html';
import { 
    cities, 
    itToEnCities, 
    slugify 
} from '../utils/seoHelpers.js';

export class SeoService {
    generateMetadata({ isCityPage, isExplorePage, isHomePage, lang, displayFuel, cityCap, host, pathSegment }) {
        let title = '';
        let desc = '';

        if (isCityPage) {
            title = lang === 'it' 
                ? `FuelFinder Italia - Prezzi ${displayFuel} a ${cityCap}`
                : `FuelFinder Italy - Prices for ${displayFuel} in ${cityCap}`;
            
            desc = lang === 'it'
                ? `Trova i prezzi più bassi per ${displayFuel} a ${cityCap}. Mappa aggiornata in tempo reale con tutti i distributori.`
                : `Find the lowest prices for ${displayFuel} in ${cityCap}. Real-time map with all gas stations.`;
        } else if (isExplorePage) {
            title = lang === 'it' 
                ? `FuelFinder Italia - Esplora Prezzi Benzina per Città`
                : `FuelFinder Italy - Explore Gas Prices by City`;
                
            desc = lang === 'it'
                ? `Elenco alfabetico di tutti i comuni italiani per scoprire le stazioni di servizio e i prezzi del carburante aggiornati in tempo reale.`
                : `Alphabetical list of all Italian municipalities to discover service stations and fuel prices updated in real time.`;
        } else if (isHomePage) {
            title = lang === 'it' 
                ? `FuelFinder Italy - Prezzi ${displayFuel} in Tempo Reale`
                : `FuelFinder Italy - Real-time ${displayFuel} Prices`;
                
            desc = lang === 'it'
                ? `Trova i distributori di carburante più economici in Italia. Mappa interattiva con prezzi di ${displayFuel} aggiornati.`
                : `Find the cheapest fuel stations in Italy. Interactive map with updated ${displayFuel} prices.`;
        }

        const currentUrl = `${host}${pathSegment}`;
        return {
            title,
            desc,
            currentUrl,
            safeTitle: escapeHtml(title),
            safeDesc: escapeHtml(desc),
            safeCurrentUrl: escapeHtml(currentUrl),
            safeHost: escapeHtml(host)
        };
    }

    generateCrawlerHtml({ isExplorePage, isHomePage, safeTitle, safeDesc, safeHost, lang }) {
        let staticHtml = `<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; padding: 20px; text-align: center; background-color: #f9fafb;">
            <h1 style="font-size: 1.8rem; font-weight: bold; color: #111827; margin-bottom: 10px;">${safeTitle}</h1>
            <p style="font-size: 1rem; color: #4b5563; max-width: 600px; line-height: 1.5;">${safeDesc}</p>
        </div>`;
        
        if (isExplorePage) {
            let linksHtml = '<ul style="display:none;">';
            const cityBaseUrl = `${safeHost}/${lang}/${lang === 'it' ? 'citta' : 'city'}/`;
            for (const city of cities) {
                const enName = itToEnCities[city.toLowerCase()] || city.toLowerCase();
                const slug = slugify(lang === 'it' ? city.toLowerCase() : enName);
                linksHtml += `<li><a href="${cityBaseUrl}${encodeURIComponent(slug)}">${escapeHtml(city)}</a></li>`;
            }
            linksHtml += '</ul>';
            staticHtml += linksHtml;
        } else if (isHomePage) {
            staticHtml += `<div style="display:none;"><a href="${safeHost}/${lang}/${lang === 'it' ? 'esplora' : 'explore'}">Esplora Città</a></div>`;
        }

        return staticHtml;
    }

    generateJsonLd({ isCityPage, isExplorePage, lang, displayFuel, cityCap, currentUrl, host, title, desc, cityPrices = [] }) {
        const jsonLd = [
            {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "FuelFinder Italy",
                "operatingSystem": "Web",
                "applicationCategory": "UtilitiesApplication",
                "description": "App gratuita per confrontare i prezzi dei distributori di carburante in Italia.",
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": "4.9",
                    "ratingCount": "8920"
                },
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "EUR"
                }
            },
            {
                "@context": "https://schema.org",
                "@type": "WebPage",
                "name": title,
                "description": desc,
                "url": currentUrl
            },
            {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "FuelFinder Italy",
                "url": `${host}/`,
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": `${host}/${lang}/${lang === 'it' ? 'citta' : 'city'}/{search_term_string}`,
                    "query-input": "required name=search_term_string"
                }
            },
            {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "FuelFinder",
                "url": `${host}/`,
                "logo": `${host}/assets/img/icon-512.png`,
                "description": "Piattaforma gratuita per confrontare i prezzi del carburante in Italia."
            },
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": `${host}/`
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": lang === 'it' ? "Italia" : "Italy",
                        "item": `${host}/${lang}`
                    }
                ]
            }
        ];

        if (isCityPage || isExplorePage) {
            jsonLd[jsonLd.length - 1].itemListElement.push({
                "@type": "ListItem",
                "position": 3,
                "name": isCityPage ? cityCap : (lang === 'it' ? "Esplora" : "Explore"),
                "item": currentUrl
            });
        }

        if (isCityPage) {
            jsonLd.push({
                "@context": "https://schema.org",
                "@type": "Dataset",
                "name": `Prezzi Carburante a ${cityCap}`,
                "description": `Dataset dei prezzi di benzina, diesel, GPL e metano nei distributori di ${cityCap}.`,
                "url": currentUrl,
                "license": "https://creativecommons.org/licenses/by/4.0/",
                "creator": {
                    "@type": "Organization",
                    "name": "FuelFinder"
                },
                "provider": {
                    "@type": "Organization",
                    "name": "FuelFinder"
                }
            });

            jsonLd.push({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": lang === 'it' 
                            ? `Dove trovare il distributore di ${displayFuel} più economico a ${cityCap}?` 
                            : `Where to find the cheapest ${displayFuel} gas station in ${cityCap}?`,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": lang === 'it'
                                ? `I prezzi di ${displayFuel} a ${cityCap} sono aggiornati quotidianamente con i dati ufficiali MIMIT. Usa la mappa interattiva di FuelFinder per confrontare i prezzi in tempo reale e risparmiare.`
                                : `Prices for ${displayFuel} in ${cityCap} are updated daily from official open data. Use the FuelFinder interactive map to compare real-time prices and save.`
                        }
                    },
                    {
                        "@type": "Question",
                        "name": lang === 'it'
                            ? `Quali distributori sono presenti a ${cityCap}?`
                            : `Which fuel stations are available in ${cityCap}?`,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": lang === 'it'
                                ? `A ${cityCap} sono monitorati tutti i distributori di carburante (compagnie principali e pompe bianche indipendenti) con prezzi self e servito.`
                                : `In ${cityCap}, all fuel stations (major brands and independent stations) are tracked with self-service and full-service prices.`
                        }
                    }
                ]
            });

            if (cityPrices.length > 0) {
                const offerName = `${displayFuel} a ${cityCap}`;
                const minPrice = cityPrices[0].prezzo;
                const maxPrice = cityPrices[cityPrices.length - 1].prezzo;
                const minStation = cityPrices[0];
                const maxStation = cityPrices[cityPrices.length - 1];

                jsonLd.push({
                    "@context": "https://schema.org",
                    "@type": "Product",
                    "name": offerName,
                    "description": `Migliori prezzi per ${offerName}`,
                    "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": "4.8",
                        "ratingCount": "1250"
                    },
                    "offers": {
                        "@type": "AggregateOffer",
                        "priceCurrency": "EUR",
                        "lowPrice": minPrice,
                        "highPrice": maxPrice,
                        "offerCount": cityPrices.length
                    }
                });

                jsonLd.push({
                    "@context": "https://schema.org",
                    "@type": "LocalBusiness",
                    "name": minStation.nome_impianto,
                    "address": minStation.indirizzo,
                    "geo": {
                        "@type": "GeoCoordinates",
                        "latitude": minStation.latitudine,
                        "longitude": minStation.longitudine
                    },
                    "url": currentUrl,
                    "priceRange": "€",
                    "makesOffer": {
                        "@type": "Offer",
                        "name": offerName,
                        "price": minPrice,
                        "priceCurrency": "EUR"
                    }
                });

                if (maxStation && maxStation.nome_impianto !== minStation?.nome_impianto) {
                    jsonLd.push({
                        "@context": "https://schema.org",
                        "@type": "LocalBusiness",
                        "name": maxStation.nome_impianto,
                        "address": maxStation.indirizzo,
                        "geo": {
                            "@type": "GeoCoordinates",
                            "latitude": maxStation.latitudine,
                            "longitude": maxStation.longitudine
                        },
                        "url": currentUrl,
                        "priceRange": "€€€",
                        "makesOffer": {
                            "@type": "Offer",
                            "name": offerName,
                            "price": maxPrice,
                            "priceCurrency": "EUR"
                        }
                    });
                }
            }
        }

        return jsonLd;
    }

    generateStationMetadata({ station, lang, displayFuel, host, pathSegment }) {
        const stationName = station.name || station.brand || 'Distributore';
        const city = station.comune || '';
        const address = station.address || '';

        let title = '';
        let desc = '';

        if (displayFuel) {
            title = lang === 'it'
                ? `Prezzi ${displayFuel} - ${stationName} (${city})`
                : `Prices for ${displayFuel} - ${stationName} (${city})`;
        } else {
            title = lang === 'it'
                ? `${stationName} - ${address}, ${city} | Prezzi Carburante`
                : `${stationName} - ${address}, ${city} | Fuel Prices`;
        }

        desc = lang === 'it'
            ? `Prezzi carburante in tempo reale presso ${stationName} a ${city} (${address}). Confronta tariffe self e servito.`
            : `Real-time fuel prices at ${stationName} in ${city} (${address}). Compare self and full service rates.`;

        const currentUrl = `${host}${pathSegment}`;
        return {
            title,
            desc,
            currentUrl,
            noIndex: true, // Protezione crawl budget
            safeTitle: escapeHtml(title),
            safeDesc: escapeHtml(desc),
            safeCurrentUrl: escapeHtml(currentUrl),
            safeHost: escapeHtml(host)
        };
    }

    generateStationCrawlerHtml({ station, safeTitle, safeDesc }) {
        const pricesList = (station.priceList || []).map(p => 
            `<li><strong>${escapeHtml(p.fuelType)}</strong> (${p.isSelf ? 'Self' : 'Servito'}): €${Number(p.price).toFixed(3)}/L</li>`
        ).join('');

        return `<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; padding: 20px; text-align: center; background-color: #f9fafb;">
            <h1 style="font-size: 1.8rem; font-weight: bold; color: #111827; margin-bottom: 10px;">${safeTitle}</h1>
            <p style="font-size: 1rem; color: #4b5563; max-width: 600px; line-height: 1.5;">${safeDesc}</p>
            ${pricesList ? `<ul style="margin-top: 15px; list-style: none; padding: 0;">${pricesList}</ul>` : ''}
        </div>`;
    }

    generateStationJsonLd({ station, currentUrl, host, title, desc }) {
        const offers = (station.priceList || []).map(p => ({
            "@type": "Offer",
            "name": `${p.fuelType} (${p.isSelf ? 'Self' : 'Servito'})`,
            "price": p.price,
            "priceCurrency": "EUR"
        }));

        return [
            {
                "@context": "https://schema.org",
                "@type": "GasStation",
                "name": station.name || station.brand,
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": station.address,
                    "addressLocality": station.comune,
                    "addressRegion": station.provincia,
                    "addressCountry": "IT"
                },
                "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": station.lat,
                    "longitude": station.lng
                },
                "url": currentUrl,
                "priceRange": "€€",
                "makesOffer": offers
            },
            {
                "@context": "https://schema.org",
                "@type": "WebPage",
                "name": title,
                "description": desc,
                "url": currentUrl
            },
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": `${host}/`
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": station.comune,
                        "item": `${host}/it/citta/${slugify(station.comune)}`
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": station.name || station.brand,
                        "item": currentUrl
                    }
                ]
            }
        ];
    }

    injectSeoIntoHtml(templateHtml, { metadata, crawlerHtml, jsonLd }) {
        let html = templateHtml;
        const { safeTitle, safeDesc, safeCurrentUrl, safeHost, noIndex } = metadata;

        html = html.replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`);
        html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${safeCurrentUrl}">`);
        html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${safeDesc}">`);
        html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${safeTitle}">`);
        html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${safeDesc}">`);
        html = html.replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="website">\n    <meta property="og:image" content="${safeHost}/assets/img/icon-512.png">\n    <meta property="og:url" content="${safeCurrentUrl}">`);
        
        if (noIndex) {
            html = html.replace('</head>', `    <meta name="robots" content="noindex, follow" />\n</head>`);
        }

        html = html.replace('<div id="root"></div>', `<div id="root">${crawlerHtml}</div>`);

        const safeJsonLdString = JSON.stringify(jsonLd).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
        const jsonLdScript = `<script type="application/ld+json">${safeJsonLdString}</script>`;
        html = html.replace('</head>', `${jsonLdScript}\n</head>`);

        return html;
    }
}

export const seoService = new SeoService();

