/* oxlint-disable no-console */
import { describe, it, expect, vi } from 'vitest';
import { globalErrorHandler } from '../../server/middlewares/errorHandler.js';

describe('Global Error Handler', () => {
    it('handles default errors hiding stack trace and returning 500', () => {
        const req = {};
        const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();
        
        const err = new Error('Secret DB Error');
        globalErrorHandler(err, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error. Please try again later.' });
    });

    it('exposes original message when status is < 500 (e.g. 400)', () => {
        const req = {};
        const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();
        
        const err = new Error('Known validation error');
        err.status = 400;
        globalErrorHandler(err, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Known validation error' });
    });

    it('handles non-Error objects using toString (e.g. string throws)', () => {
        const req = {};
        const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();
        
        globalErrorHandler("String Error", req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error. Please try again later.' });
    });
});
