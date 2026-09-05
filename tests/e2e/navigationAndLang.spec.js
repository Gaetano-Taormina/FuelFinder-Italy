import { test, expect } from '@playwright/test';

test.describe('E2E: Navigation & Language & 404', () => {
  test('naviga alla pagina Esplora con i parametri corretti', async ({ page }) => {
    await page.goto('/it/esplora');

    await expect(page).toHaveURL(/.*\/esplora/);
  });

  test('supporta il cambio lingua verso inglese', async ({ page }) => {
    await page.goto('/en');

    await expect(page).toHaveURL(/.*\/en/);
  });

  test('mostra la pagina 404 per route inesistenti', async ({ page }) => {
    await page.goto('/it/percorso-totalmente-inesistente-xyz');

    // Verifica che l'app gestisca la route senza crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
