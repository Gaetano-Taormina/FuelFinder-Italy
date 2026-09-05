/* oxlint-disable no-console */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { vi, afterEach } from 'vitest';

afterEach(() => {
    cleanup();
});

// Mock globale di fetch per prevenire chiamate di rete reali e l'errore ECONNREFUSED ::1:3000
global.fetch = vi.fn((url) => {
    if (typeof url === 'string' && url.includes('/api/stations')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                data: [
                    {
                        id: 1,
                        nome_impianto: "Stazione Test",
                        prezzo: 1.859,
                        isSelf: 1,
                        latitudine: 45.0,
                        longitudine: 9.0
                    }
                ]
            })
        });
    }
    
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
    });
});
