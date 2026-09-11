import { sitemapController } from '../controllers/sitemapController.js';

export function setupSitemapRoutes(app) {
    app.get('/sitemap.xml', (req, res) => sitemapController.getSitemapIndex(req, res));
    app.get('/sitemaps/it.xml', (req, res) => sitemapController.getItSitemap(req, res));
    app.get('/sitemaps/en.xml', (req, res) => sitemapController.getEnSitemap(req, res));
    app.get('/sitemaps/fuels-it-:fuel.xml', (req, res) => sitemapController.getFuelItSitemap(req, res));
    app.get('/sitemaps/fuels-en-:fuel.xml', (req, res) => sitemapController.getFuelEnSitemap(req, res));
}
