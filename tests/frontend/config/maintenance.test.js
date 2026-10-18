import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isMaintenanceActive } from '../../../client/src/config/maintenance.js';

describe('Maintenance Config Helper (isMaintenanceActive)', () => {
    const originalViteMode = import.meta.env.VITE_MAINTENANCE_MODE;
    const originalRawMode = import.meta.env.MAINTENANCE_MODE;

    beforeEach(() => {
        delete import.meta.env.VITE_MAINTENANCE_MODE;
        delete import.meta.env.MAINTENANCE_MODE;
    });

    afterEach(() => {
        import.meta.env.VITE_MAINTENANCE_MODE = originalViteMode;
        import.meta.env.MAINTENANCE_MODE = originalRawMode;
    });

    it('returns false when neither VITE_MAINTENANCE_MODE nor MAINTENANCE_MODE are set', () => {
        expect(isMaintenanceActive()).toBe(false);
    });

    it('returns true when VITE_MAINTENANCE_MODE is "true"', () => {
        import.meta.env.VITE_MAINTENANCE_MODE = 'true';
        expect(isMaintenanceActive()).toBe(true);
    });

    it('returns true when MAINTENANCE_MODE is "true"', () => {
        import.meta.env.MAINTENANCE_MODE = 'true';
        expect(isMaintenanceActive()).toBe(true);
    });

    it('handles uppercase and trimmed values correctly', () => {
        import.meta.env.VITE_MAINTENANCE_MODE = '  TRUE  ';
        expect(isMaintenanceActive()).toBe(true);
    });

    it('returns false when set to "false" or random string', () => {
        import.meta.env.VITE_MAINTENANCE_MODE = 'false';
        import.meta.env.MAINTENANCE_MODE = 'disabled';
        expect(isMaintenanceActive()).toBe(false);
    });
});
