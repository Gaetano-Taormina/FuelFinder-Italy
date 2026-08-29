/* eslint-disable no-console */
export const timeoutMiddleware = (ms = 10000) => {
    return (req, res, next) => {
        // Express non ha un timeout nativo che interrompe l'esecuzione lato server,
        // ma possiamo rispondere 504 se supera la soglia.
        res.setTimeout(ms, () => {
            if (!res.headersSent) {
                res.status(504).json({ error: 'Gateway Timeout: La richiesta ha impiegato troppo tempo.' });
            }
        });
        next();
    };
};
