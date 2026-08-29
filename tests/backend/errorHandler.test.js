/* oxlint-disable no-console */
import { describe, it, expect, vi } from 'vitest';
import { globalErrorHandler } from '../../server/middlewares/errorHandler.js';

describe('Global Error Handler', () => {
    it('dovrebbe gestire gli errori di default nascondendo lo stack trace e restituendo 500', () => {
        const req = {};
        const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();
        
        const err = new Error('Secret DB Error');
        globalErrorHandler(err, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error. Please try again later.' });
    });

    it('dovrebbe esporre il messaggio originale se lo status è < 500 (es. 400)', () => {
        const req = {};
        const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();
        
        const err = new Error('Known validation error');
        err.status = 400;
        globalErrorHandler(err, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Known validation error' });
    });

    it('dovrebbe gestire oggetti non Error usando toString (es. stringhe)', () => {
        const req = {};
        const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();
        
        // Simula un'eccezione lanciata come stringa: throw "String error"
        globalErrorHandler("String Error", req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error. Please try again later.' });
    });
});
