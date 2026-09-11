/* oxlint-disable no-console */
import { describe, it, expect, vi } from 'vitest';
import { securityHeaders, rateLimiter, shouldSkipRateLimit } from '../../server/middlewares/security.js';

describe('Security Middlewares', () => {
    it('sets all security headers on response', () => {
        const headers = {};
        const req = {};
        const res = {
            setHeader: vi.fn((key, value) => { headers[key] = value; }),
            removeHeader: vi.fn()
        };
        const next = vi.fn();

        securityHeaders(req, res, next);

        expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
        expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
        expect(res.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', expect.stringContaining('max-age'));
        expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
        expect(next).toHaveBeenCalled();
    });

    it('shouldSkipRateLimit skips verified search engine bots', () => {
        const reqBot = { headers: { 'user-agent': 'Googlebot/2.1' } };
        expect(shouldSkipRateLimit(reqBot)).toBe(true);

        const reqBing = { headers: { 'user-agent': 'Mozilla/5.0 (compatible; bingbot/2.0)' } };
        expect(shouldSkipRateLimit(reqBing)).toBe(true);

        const reqUser = { headers: { 'user-agent': 'Mozilla/5.0 Chrome/120' } };
        expect(shouldSkipRateLimit(reqUser)).toBe(false);

        const reqNoAgent = { headers: {} };
        expect(shouldSkipRateLimit(reqNoAgent)).toBe(false);
    });

    it('rateLimiter is an express middleware function', () => {
        expect(typeof rateLimiter).toBe('function');
    });
});
