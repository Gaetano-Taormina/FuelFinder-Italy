export function maintenanceMiddleware(req, res, next) {
    const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    if (isMaintenanceMode) {
        if (req.path === '/robots.txt' || req.path === '/sitemap.xml' || req.path.startsWith('/sitemaps/')) {
            return next(); // Bypass per SEO
        }
        
        res.status(503);
        res.set('Retry-After', '259200'); // 3 giorni in secondi, fondamentale per non perdere posizionamento SEO su Google
        
        if (req.path.startsWith('/api/')) {
            return res.json({ success: false, error: 'FuelFinder Italy è in manutenzione. Riprova tra qualche giorno.' });
        }

        return res.send(`
            <!DOCTYPE html>
            <html lang="it">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sito in Manutenzione - FuelFinder Italy</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #0f172a; color: #f8fafc; text-align: center; margin: 0; padding: 20px; }
                    .container { max-width: 600px; }
                    h1 { color: #38bdf8; font-size: 2.5rem; margin-bottom: 1rem; }
                    p { font-size: 1.2rem; line-height: 1.6; color: #94a3b8; }
                    svg { width: 80px; height: 80px; margin-bottom: 20px; color: #38bdf8; }
                </style>
            </head>
            <body>
                <div class="container">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <h1>Sito in Manutenzione</h1>
                    <p>FuelFinder Italy è temporaneamente non disponibile per interventi di manutenzione programmata.</p>
                    <p>Il servizio tornerà presto disponibile. Grazie per la pazienza!</p>
                </div>
            </body>
            </html>
        `);
    }
    next();
}
