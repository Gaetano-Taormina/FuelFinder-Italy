export const globalErrorHandler = (err, req, res, next) => {
    console.error('[Error Handler] Errore imprevisto:', err);
    
    // Controlliamo se gli header sono già stati inviati (es. durante un timeout o streaming)
    if (res.headersSent) {
        return next(err);
    }
    
    // Risposta standard e pulita, non mostriamo lo stack trace al client
    const status = err.status || 500;
    const message = err.expose || status < 500 ? err.message : 'Errore interno del server. Riprovare più tardi.';

    res.status(status).json({
        success: false,
        error: message
    });
};
