export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.status = 400; // Bad Request
        this.expose = true; // Mostra il messaggio al client
    }
}

export const validateStationsInput = (query) => {
    // Arrotonda a 3 decimali (circa 111 metri) per massimizzare le hit della cache 
    // quando l'utente si sposta leggermente sulla mappa
    const lat = Math.round(parseFloat(query.lat) * 1000) / 1000;
    const lng = Math.round(parseFloat(query.lng) * 1000) / 1000;
    const radius = parseFloat(query.radius) || 5;
    const fuelType = typeof query.fuelType === 'string' ? query.fuelType.trim() : 'Benzina';
    let serviceType = typeof query.serviceType === 'string' ? query.serviceType.trim().toLowerCase() : '1';

    if (serviceType === 'entrambi' || serviceType === 'both') {
        serviceType = 'all';
    }

    if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new ValidationError('Latitudine non valida o mancante.');
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new ValidationError('Longitudine non valida o mancante.');
    }
    if (isNaN(radius) || radius <= 0 || radius > 100) {
        throw new ValidationError('Raggio non valido. Deve essere compreso tra 0 e 100 km.');
    }
    if (!fuelType || fuelType.length > 50) {
        throw new ValidationError('Tipo di carburante non valido.');
    }
    if (serviceType !== '1' && serviceType !== '0' && serviceType !== 'all') {
        throw new ValidationError('Tipo di servizio non valido. Valori ammessi: "1" (self), "0" (servito), "all".');
    }

    return { lat, lng, radius, fuelType, serviceType };
};
