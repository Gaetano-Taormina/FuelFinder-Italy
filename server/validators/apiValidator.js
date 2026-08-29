/* oxlint-disable no-console */
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

    if (!lat || isNaN(lat)) {
        throw new ValidationError('Invalid or missing latitude.');
    }
    
    if (lat < -90 || lat > 90) {
        throw new ValidationError('Invalid latitude. Must be between -90 and 90.');
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new ValidationError('Invalid or missing longitude.');
    }
    if (isNaN(radius) || radius <= 0 || radius > 100) {
        throw new ValidationError('Invalid radius. Must be between 0 and 100 km.');
    }
    if (!fuelType || fuelType.length > 50) {
        throw new ValidationError('Invalid fuel type.');
    }
    if (serviceType !== '1' && serviceType !== '0' && serviceType !== 'all') {
        throw new ValidationError('Invalid service type. Allowed values: "1" (self), "0" (served), "all".');
    }

    return { lat, lng, radius, fuelType, serviceType };
};
