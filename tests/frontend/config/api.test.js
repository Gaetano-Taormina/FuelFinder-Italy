import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getApiBaseUrl, getApiUrl } from '../../../client/src/config/api.js';

describe('API Config Helper (getApiBaseUrl & getApiUrl)', () => {
    const originalEnv = import.meta.env.VITE_API_BASE_URL;
    const originalLocation = window.location;

    beforeEach(() => {
        import.meta.env.VITE_API_BASE_URL = '';
    });

    afterEach(() => {
        import.meta.env.VITE_API_BASE_URL = originalEnv;
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true,
            configurable: true
        });
    });

    it('returns empty string in local/default environment without VITE_API_BASE_URL', () => {
        import.meta.env.VITE_API_BASE_URL = '';
        expect(getApiBaseUrl()).toBe('');
        expect(getApiUrl('/api/stations')).toBe('/api/stations');
        expect(getApiUrl('api/stations')).toBe('/api/stations');
    });

    it('formats custom VITE_API_BASE_URL with https prefix if missing', () => {
        import.meta.env.VITE_API_BASE_URL = 'my-custom-backend.render.com/';
        expect(getApiBaseUrl()).toBe('https://my-custom-backend.render.com');
        expect(getApiUrl('/api/stations')).toBe('https://my-custom-backend.render.com/api/stations');
    });

    it('preserves existing protocol in VITE_API_BASE_URL', () => {
        import.meta.env.VITE_API_BASE_URL = 'https://fuelfinder-backend.example.com/';
        expect(getApiBaseUrl()).toBe('https://fuelfinder-backend.example.com');
        expect(getApiUrl('/api/stats')).toBe('https://fuelfinder-backend.example.com/api/stats');
    });

    it('resolves bare internal service slug by appending onrender.com', () => {
        import.meta.env.VITE_API_BASE_URL = 'fuelfinder-backend-sma6';
        expect(getApiBaseUrl()).toBe('https://fuelfinder-backend-sma6.onrender.com');

        import.meta.env.VITE_API_BASE_URL = 'https://fuelfinder-backend-sma6';
        expect(getApiBaseUrl()).toBe('https://fuelfinder-backend-sma6.onrender.com');
    });

    it('falls back to production Render backend if hostname includes onrender.com and env is empty', () => {
        import.meta.env.VITE_API_BASE_URL = '';
        Object.defineProperty(window, 'location', {
            value: new URL('https://fuelfinder-italia.onrender.com'),
            writable: true,
            configurable: true
        });

        expect(getApiBaseUrl()).toBe('https://fuelfinder-backend-sma6.onrender.com');
        expect(getApiUrl('/api/stations')).toBe('https://fuelfinder-backend-sma6.onrender.com/api/stations');
    });
});
