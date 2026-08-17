export const globalErrorHandler = (err, req, res, next) => {
    console.error('[Error Handler] Errore imprevisto:', err);
    
    const errMsg = err.message || err.toString();
    if (errMsg.includes('SQLITE_CORRUPT') || errMsg.includes('malformed')) {
        console.error("☠️ FATAL: Database corrotto durante l'esecuzione di una query. Il server deve riavviarsi per l'auto-ripristino.");
        process.exit(1); // Questo forzerà PM2 / Render / Nodemon a riavviare l'app, attivando l'auto-ripristino
    }
    
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
