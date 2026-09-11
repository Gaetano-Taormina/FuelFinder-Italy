/* oxlint-disable no-console */
export function createHealthcheckMiddleware({ isReadyGetter, onRecover }) {
    return (req, res, next) => {
        const ua = (req.headers['user-agent'] || '').toLowerCase();
        
        // Endpoint di RECOVERY MANUALE
        if (req.path === '/healthz/recover') {
            const passkey = req.query.token || req.headers['x-admin-passkey'];
            if (passkey && passkey === process.env.ADMIN_PASSKEY) {
                console.warn("[WARN] Manual recovery triggered via healthcheck.");
                if (typeof onRecover === 'function') {
                    onRecover();
                }
                return res.status(200).send('Recovery procedure started');
            }
        }

        // 1. Intercetta gli endpoint classici di health check
        if (req.path === '/health' || req.path === '/healthz' || req.path === '/ping') {
            return res.status(200).send('OK');
        }
        
        // 2. Intercetta il probing di Render o di altri load balancer tramite User-Agent
        if (ua.includes('render/1.0') || ua.includes('healthcheck') || ua.includes('kube-probe') || ua.includes('uptimerobot')) {
            return res.status(200).send('OK');
        }
        
        // 3. Durante l'inizializzazione DB, metti in attesa gli utenti ma rispondi OK sulla root.
        const isReady = typeof isReadyGetter === 'function' ? isReadyGetter() : Boolean(isReadyGetter);
        if (!isReady) {
            if (req.path === '/') return res.status(200).send('OK - Inizializzazione in corso');
            if (req.path === '/robots.txt' || req.path === '/sitemap.xml' || req.path.startsWith('/sitemaps/')) return next(); // Bypass per SEO
            return res.status(503).send('Servizio in fase di avvio, riprova tra qualche secondo...');
        }
        
        next();
    };
}
