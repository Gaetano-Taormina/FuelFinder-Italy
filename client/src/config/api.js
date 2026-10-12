/**
 * Centralized API configuration for FuelFinder Italy.
 * Seamlessly resolves API endpoints for both local development (Vite proxy)
 * and production multi-service deployment on Render.
 */

export const getApiBaseUrl = () => {
    let rawEnv = (import.meta.env?.VITE_API_BASE_URL || '').trim();
    if (rawEnv) {
        // Se Render o l'ambiente inietta solo lo slug del servizio interno (es. 'fuelfinder-backend-sma6' senza TLD)
        const hostPart = rawEnv.replace(/^https?:\/\//, '').split('/')[0];
        if (hostPart && !hostPart.includes('.')) {
            rawEnv = `${rawEnv}.onrender.com`;
        }
        if (rawEnv.startsWith('http://') || rawEnv.startsWith('https://')) {
            return rawEnv.replace(/\/+$/, '');
        }
        return `https://${rawEnv}`.replace(/\/+$/, '');
    }

    // Fallback autonomo per produzione su Render: se siamo sul dominio statico Render,
    // e VITE_API_BASE_URL non è stato iniettato a build time, indirizziamo al backend su Render.
    if (
        typeof window !== 'undefined' &&
        window.location &&
        typeof window.location.hostname === 'string' &&
        (window.location.hostname === 'onrender.com' || window.location.hostname.endsWith('.onrender.com'))
    ) {
        return 'https://fuelfinder-backend-sma6.onrender.com';
    }

    // In ambiente locale (o container unificato), usiamo il path relativo per sfruttare il proxy Vite
    return '';
};

export const getApiUrl = (endpoint) => {
    const base = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${cleanEndpoint}`;
};
