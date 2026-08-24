import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock globale di fetch per prevenire chiamate di rete reali e l'errore ECONNREFUSED ::1:3000
global.fetch = vi.fn((url) => {
    console.warn(`[WARN] Chiamata fetch non mockata intercettata in un test: ${url}`);
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
    });
});
