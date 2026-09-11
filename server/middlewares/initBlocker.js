export function createInitBlockerMiddleware(isReadyGetter) {
    return (req, res, next) => {
        const isReady = typeof isReadyGetter === 'function' ? isReadyGetter() : Boolean(isReadyGetter);
        if (!isReady) {
            if (req.path.startsWith('/api/')) {
                return res.status(503).json({ 
                    success: false, 
                    error: 'Il database è in fase di inizializzazione (download stazioni). Riprova tra 1 minuto...' 
                });
            }
        }
        next();
    };
}
