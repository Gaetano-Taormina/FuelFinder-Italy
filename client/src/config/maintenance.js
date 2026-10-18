/**
 * Helper to determine if Maintenance Mode is active on FuelFinder Italy.
 * Reads environment variables injected at build time by Render or local .env
 * (both VITE_MAINTENANCE_MODE and MAINTENANCE_MODE are recognized).
 */
export const isMaintenanceActive = () => {
    /* v8 ignore next */
    const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
    const viteMode = (metaEnv.VITE_MAINTENANCE_MODE || '').toString().trim().toLowerCase();
    const rawMode = (metaEnv.MAINTENANCE_MODE || '').toString().trim().toLowerCase();
    return viteMode === 'true' || rawMode === 'true';
};
