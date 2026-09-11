/* oxlint-disable no-console */

/**
 * Registers the Service Worker in production environments
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  // Register in production or when explicitly enabled
  if (process.env.NODE_ENV === 'production' || window.__ENABLE_SW__ === true) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.info('🚀 [PWA] New version available. Refresh to update.');
            }
          };
        }
      };

      return registration;
    } catch (error) {
      console.warn('⚠️ [PWA] Service Worker registration failed:', error);
      return null;
    }
  }

  return null;
}

/**
 * Unregisters any active Service Workers
 * @returns {Promise<boolean>}
 */
export async function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.unregister();
    } catch {
      return false;
    }
  }
  return false;
}
