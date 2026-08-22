export const globalErrorHandler = (err, req, res, next) => {
    // 1. Log the error (with stack trace in development)
    /* v8 ignore start */
    if (process.env.NODE_ENV !== 'test') {
        console.error(`[Error] ${err.name || 'Error'}: ${err.message}`);
        if (process.env.NODE_ENV === 'development') {
            console.error(err.stack);
        }
    }
    /* v8 ignore stop */

    const errMsg = err.message || err.toString();
    
    // 2. Critical errors that require process restart
    /* v8 ignore start */
    if (errMsg.includes('SQLITE_CORRUPT') || errMsg.includes('malformed')) {
        console.error("[FATAL] Corrupted database detected. Closing process to trigger auto-recovery.");
        process.exit(1); // This will force PM2 / Render / Nodemon to restart the app
    }

    // 3. Check if HTTP headers are already sent
    if (res.headersSent) {
        return next(err);
    }
    /* v8 ignore stop */

    // 4. Handle known errors (e.g. HTTP codes, LibSQL / SQLite)
    let status = err.status || 500;
    let message = err.message || 'Internal server error.';

    /* v8 ignore start */
    if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
        status = 400; // Bad Request (Malformed JSON)
        message = 'Bad Request: Invalid or malformed payload.';
    } else if (err.name === 'UnauthorizedError') {
        status = 401; // Unauthorized
        message = 'Unauthorized: Authentication required.';
    } else if (err.name === 'ForbiddenError') {
        status = 403; // Forbidden
        message = 'Forbidden: Access denied.';
    } else if (err.name === 'NotFoundError') {
        status = 404; // Not Found
        message = 'Not Found: Resource does not exist.';
    } else if (err.code === 'ETIMEDOUT') {
        status = 408; // Request Timeout
        message = 'Request Timeout: The server timed out waiting for the request.';
    } else if (err.code === 'SQLITE_CONSTRAINT' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        status = 409; // Conflict
        message = 'Conflict: Resource already exists.';
    } else if (err.type === 'RateLimitError' || status === 429) {
        status = 429; // Too Many Requests
        message = 'Too Many Requests: Please try again later.';
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        status = 502; // Bad Gateway
        message = 'Bad Gateway: Upstream server is down.';
    } else if (err.code === 'SQLITE_BUSY') {
        status = 503; // Service Unavailable
        message = 'Service Unavailable: Database is busy.';
    } else if (status === 501 || err.name === 'NotImplementedError') {
        status = 501; // Not Implemented
        message = 'Not Implemented: The requested feature is not supported.';
    }
    /* v8 ignore stop */

    // 5. Protection in production (do not leak internal details on generic 500)
    if (status >= 500 && !err.expose) {
        message = 'Internal server error. Please try again later.';
    }

    // 6. Response to client
    res.status(status).json({
        success: false,
        error: message,
        /* v8 ignore start */
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        /* v8 ignore stop */
    });
};
