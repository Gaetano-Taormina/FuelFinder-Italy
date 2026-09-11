import { sitemapService } from '../services/sitemapService.js';
import { getSafeHost } from '../utils/seoHelpers.js';

export class SitemapController {
    getSitemapIndex(req, res) {
        const host = getSafeHost(req);
        const xml = sitemapService.getIndexSitemap(host);
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    }

    getItSitemap(req, res) {
        const host = getSafeHost(req);
        const xml = sitemapService.getLanguageSitemap(host, 'it');
        res.header('Content-Type', 'application/xml').send(xml);
    }

    getEnSitemap(req, res) {
        const host = getSafeHost(req);
        const xml = sitemapService.getLanguageSitemap(host, 'en');
        res.header('Content-Type', 'application/xml').send(xml);
    }

    getFuelItSitemap(req, res) {
        const host = getSafeHost(req);
        const xml = sitemapService.getFuelSitemap(host, 'it', req.params.fuel);
        if (!xml) {
            return res.status(404).send('Sitemap non trovata');
        }
        res.header('Content-Type', 'application/xml').send(xml);
    }

    getFuelEnSitemap(req, res) {
        const host = getSafeHost(req);
        const xml = sitemapService.getFuelSitemap(host, 'en', req.params.fuel);
        if (!xml) {
            return res.status(404).send('Sitemap non trovata');
        }
        res.header('Content-Type', 'application/xml').send(xml);
    }
}

export const sitemapController = new SitemapController();
