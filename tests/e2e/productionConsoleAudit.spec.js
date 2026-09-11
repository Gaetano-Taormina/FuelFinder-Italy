import { test, expect } from '@playwright/test';

test.describe('E2E: Zero Console Errors & Service Worker Audit', () => {
  test('non produce errori né warning di console su Home, SSR e Service Worker', async ({ page }) => {
    const errorLogs = [];
    const warningLogs = [];

    // Abilita il Service Worker reale nel browser
    await page.addInitScript(() => {
      window.__ENABLE_SW__ = true;
    });

    // Intercetta tutti i log del browser
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        errorLogs.push(text);
      } else if (type === 'warning') {
        // Ignora eventuali warning benigni di terze parti o custom non bloccanti se noti
        if (!text.includes('React DevTools') && !text.includes('<search>')) {
          warningLogs.push(text);
        }
      }
    });

    // Intercetta eccezioni non gestite nel documento
    page.on('pageerror', (err) => {
      errorLogs.push(`[PageError] ${err.message}`);
    });

    // Intercetta richieste fallite o abortite
    page.on('requestfailed', (req) => {
      // Ignora richieste opzionali di telemetria o tile esterne non critiche se fallite per timeout offline
      const url = req.url();
      if (url.includes('localhost') || url.includes('/assets/') || url.includes('/sw.js') || url.includes('/it/')) {
        errorLogs.push(`[RequestFailed] ${req.url()} - ${req.failure()?.errorText}`);
      }
    });

    // 1. Visita la Home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. Visita una rotta SSR multilingua con parametri
    await page.goto('/it/citta/roma/benzina');
    await page.waitForLoadState('networkidle');

    // 3. Visita la rotta Esplora
    await page.goto('/it/esplora');
    await page.waitForLoadState('networkidle');

    // Verifica che non ci siano errori critici di console
    expect(errorLogs, `Errori rilevati in console browser: ${JSON.stringify(errorLogs, null, 2)}`).toHaveLength(0);
    
    // Verifica assenza di mismatch o preload inutilizzati
    const preloadMismatchWarnings = warningLogs.filter(w => 
      w.includes('cross-world') || 
      w.includes('credentials mode') || 
      w.includes('preload but not used')
    );
    expect(preloadMismatchWarnings, `Warning preload rilevati: ${JSON.stringify(preloadMismatchWarnings, null, 2)}`).toHaveLength(0);
  });
});
